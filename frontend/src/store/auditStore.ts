import { create } from 'zustand';
import type { Audit, AuditCategory, AuditResults, Observation } from '../types';
import { saveAudit, getAudit, getAllAudits } from '../services/db';
import { calculateResults, convertNonConformitiesToNote } from '../utils/calculations';
import { loadCategoriesFromJSON } from '../services/dataLoader';

interface AuditState {
  currentAudit: Audit | null;
  audits: Audit[];
  results: AuditResults | null;
  
  // Actions
  createAudit: (dateExecution: string, adresse: string, categories: AuditCategory[]) => Promise<void>;
  loadAudit: (id: string) => Promise<void>;
  loadAllAudits: () => Promise<void>;
  updateItemNonConformities: (categoryId: string, itemId: string, numberOfNonConformities: number | null) => Promise<void>;
  // Observations (avec action corrective liée)
  addObservation: (categoryId: string, itemId: string, observationText: string, correctiveAction?: string) => Promise<void>;
  removeObservation: (categoryId: string, itemId: string, observationId: string) => Promise<void>;
  updateObservationAction: (categoryId: string, itemId: string, observationId: string, correctiveAction: string) => Promise<void>;
  updateItemKO: (categoryId: string, itemId: string, ko: number) => Promise<void>;
  updateItemComment: (categoryId: string, itemId: string, comment: string) => Promise<void>;
  addPhoto: (categoryId: string, itemId: string, photoUrl: string) => Promise<void>;
  removePhoto: (categoryId: string, itemId: string, photoIndex: number) => Promise<void>;
  updateCorrectiveActions: (correctiveActions: Array<{ id: string; ecart: string; actionCorrective: string; delai: string; quand: string; visa: string; verification: string }>) => Promise<void>;
  updateAuditDate: (dateExecution: string) => Promise<void>;
  updateAuditAddress: (adresse: string) => Promise<void>;
  calculateResults: () => void;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  currentAudit: null,
  audits: [],
  results: null,

  createAudit: async (dateExecution, adresse, categories) => {
    const newAudit: Audit = {
      id: crypto.randomUUID(),
      dateExecution,
      adresse,
      categories,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(newAudit);
    
    set({ currentAudit: newAudit });
    get().calculateResults();
  },

  loadAudit: async (id) => {
    const audit = await getAudit(id);
    if (audit) {
      // Recharger les données depuis le JSON pour avoir les dernières mises à jour
      const freshCategories = await loadCategoriesFromJSON();
      
      // Créer un map pour retrouver rapidement les items par nom
      const freshItemsMap = new Map<string, AuditCategory['items'][0]>();
      freshCategories.forEach((cat: AuditCategory) => {
        cat.items.forEach((item) => {
          freshItemsMap.set(item.name, item);
        });
      });
      
      // Migration : s'assurer que tous les items ont les champs nécessaires et les dernières données du JSON
      const migratedAudit: Audit = {
        ...audit,
        categories: audit.categories.map(category => ({
          ...category,
          items: category.items.map(item => {
            // Récupérer les données fraîches depuis le JSON pour cet item
            const freshItem = freshItemsMap.get(item.name);
            const observationOptions = freshItem?.observationOptions || item.observationOptions || [];
            
            // TOUJOURS recalculer les observations disponibles depuis observationOptions (pour s'assurer qu'elles sont à jour)
            const observationsSet = new Set<string>();
            observationOptions.forEach((opt: { observation: string; action: string }) => {
              if (opt.observation && opt.observation.trim() !== '') {
                observationsSet.add(opt.observation.trim());
              }
            });
            const availableObservations = Array.from(observationsSet).sort();
            
            // TOUJOURS recalculer les actions disponibles depuis observationOptions (pour s'assurer qu'elles sont à jour)
            const actionsSet = new Set<string>();
            observationOptions.forEach((opt: { observation: string; action: string }) => {
              if (opt.action && opt.action.trim() !== '') {
                actionsSet.add(opt.action.trim());
              }
            });
            const availableCorrectiveActions = Array.from(actionsSet).sort();
            
            // Migrer les anciennes observations (avec leurs actions correctives si elles existent)
            const migratedObservations = (item.observations || []).map((obs: any) => ({
              id: obs.id || `obs-${Date.now()}-${Math.random()}`,
              text: obs.text || obs.observation || '',
              correctiveAction: obs.correctiveAction || obs.userAction || obs.action || undefined,
            }));
            
            return {
              ...item,
              ko: item.ko !== undefined ? item.ko : 0,
              numberOfNonConformities: item.numberOfNonConformities !== undefined && item.numberOfNonConformities !== null 
                ? item.numberOfNonConformities 
                : null,
              observationOptions, // Utiliser les données fraîches du JSON
              observations: migratedObservations,
              availableObservations, // Recalculées depuis le JSON
              availableCorrectiveActions, // Recalculées depuis le JSON
            };
          }),
        })),
      };
      
      // Toujours sauvegarder pour mettre à jour les listes disponibles depuis le JSON
      await saveAudit(migratedAudit);
      
      set({ currentAudit: migratedAudit });
      get().calculateResults();
    }
  },

  loadAllAudits: async () => {
    const audits = await getAllAudits();
    set({ audits });
  },

  updateItemNonConformities: async (categoryId, itemId, numberOfNonConformities) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedCategories = currentAudit.categories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id === itemId) {
              // Calculer automatiquement la note à partir du nombre de non-conformités
              const note = convertNonConformitiesToNote(item.classification, numberOfNonConformities);
              return {
                ...item,
                numberOfNonConformities,
                note: note !== null ? note : undefined, // null devient undefined, mais 0.0 reste 0.0
                isAudited: numberOfNonConformities !== null, // Audité seulement si pas EN ATTENTE
              };
            }
            return item;
          }),
        };
      }
      return cat;
    });

    const updatedAudit: Audit = {
      ...currentAudit,
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
    get().calculateResults();
  },

  // Ajouter une observation (avec action corrective optionnelle)
  addObservation: async (categoryId, itemId, observationText, correctiveAction) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedCategories = currentAudit.categories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id === itemId) {
              const newObservation: Observation = {
                id: `obs-${Date.now()}-${Math.random()}`,
                text: observationText,
                correctiveAction: correctiveAction || undefined,
              };
              return {
                ...item,
                observations: [...item.observations, newObservation],
                isAudited: true,
              };
            }
            return item;
          }),
        };
      }
      return cat;
    });

    const updatedAudit: Audit = {
      ...currentAudit,
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
  },

  // Supprimer une observation
  removeObservation: async (categoryId, itemId, observationId) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedCategories = currentAudit.categories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id === itemId) {
              return {
                ...item,
                observations: item.observations.filter(obs => obs.id !== observationId),
              };
            }
            return item;
          }),
        };
      }
      return cat;
    });

    const updatedAudit: Audit = {
      ...currentAudit,
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
  },

  // Mettre à jour l'action corrective d'une observation
  updateObservationAction: async (categoryId, itemId, observationId, correctiveAction) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedCategories = currentAudit.categories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id === itemId) {
              return {
                ...item,
                observations: item.observations.map(obs =>
                  obs.id === observationId 
                    ? { ...obs, correctiveAction: correctiveAction || undefined }
                    : obs
                ),
              };
            }
            return item;
          }),
        };
      }
      return cat;
    });

    const updatedAudit: Audit = {
      ...currentAudit,
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
  },

  updateItemKO: async (categoryId, itemId, ko) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedCategories = currentAudit.categories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id === itemId) {
              return {
                ...item,
                ko: Math.max(0, Math.floor(ko)), // S'assurer que c'est un entier positif
                isAudited: true, // Marquer comme audité dès qu'on modifie
              };
            }
            return item;
          }),
        };
      }
      return cat;
    });

    const updatedAudit: Audit = {
      ...currentAudit,
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
    get().calculateResults();
  },

  updateItemComment: async (categoryId, itemId, comment) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedCategories = currentAudit.categories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, comments: comment } : item
          ),
        };
      }
      return cat;
    });

    const updatedAudit: Audit = {
      ...currentAudit,
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
  },

  addPhoto: async (categoryId, itemId, photoUrl) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedCategories = currentAudit.categories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId
              ? { ...item, photos: [...item.photos, photoUrl] }
              : item
          ),
        };
      }
      return cat;
    });

    const updatedAudit: Audit = {
      ...currentAudit,
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
  },

  removePhoto: async (categoryId, itemId, photoIndex) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedCategories = currentAudit.categories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id === itemId) {
              const newPhotos = [...item.photos];
              newPhotos.splice(photoIndex, 1);
              return { ...item, photos: newPhotos };
            }
            return item;
          }),
        };
      }
      return cat;
    });

    const updatedAudit: Audit = {
      ...currentAudit,
      categories: updatedCategories,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
  },

  updateCorrectiveActions: async (correctiveActions) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedAudit: Audit = {
      ...currentAudit,
      correctiveActions,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
  },

  updateAuditDate: async (dateExecution) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedAudit: Audit = {
      ...currentAudit,
      dateExecution,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
  },

  updateAuditAddress: async (adresse) => {
    const { currentAudit } = get();
    if (!currentAudit) return;

    const updatedAudit: Audit = {
      ...currentAudit,
      adresse,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await saveAudit(updatedAudit);
    set({ currentAudit: updatedAudit });
  },

  calculateResults: () => {
    const { currentAudit } = get();
    if (!currentAudit) {
      set({ results: null });
      return;
    }

    const results = calculateResults(currentAudit);
    set({ results });
  },
}));

