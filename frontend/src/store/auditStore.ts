import { create } from 'zustand';
import type { Audit, AuditCategory, AuditResults, Observation } from '../types';
import { auditApi, ApiError } from '../services/api';
import { calculateResults, convertNonConformitiesToNote } from '../utils/calculations';
import { loadCategoriesFromJSON } from '../services/dataLoader';
import { debounce } from '../utils/debounce';
import { logger } from '../utils/logger';

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
  markAuditAsCompleted: () => Promise<void>;
  deleteAudit: (id: string) => Promise<void>;
}

// Helper function pour sauvegarder l'audit en local (localStorage)
function saveAuditToLocal(audit: Audit): void {
  try {
    const key = `audit_${audit.id}`;
    localStorage.setItem(key, JSON.stringify(audit));
    logger.log('[AuditStore] 💾 Audit sauvegardé en local:', audit.id);
  } catch (error) {
    logger.error('[AuditStore] Erreur lors de la sauvegarde locale:', error);
  }
}

// Helper function pour charger un audit depuis le localStorage
function loadAuditFromLocal(auditId: string): Audit | null {
  try {
    const key = `audit_${auditId}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data) as Audit;
    }
    return null;
  } catch (error) {
    logger.error('[AuditStore] Erreur lors du chargement local:', error);
    return null;
  }
}

// Helper function pour charger tous les audits en cours depuis le localStorage
function loadAllLocalAudits(): Audit[] {
  try {
    const audits: Audit[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('audit_temp_')) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const audit = JSON.parse(data) as Audit;
            // Ne charger que les audits en cours (non terminés)
            if (audit.status !== 'completed') {
              audits.push(audit);
            }
          } catch (e) {
            logger.warn('[AuditStore] Erreur lors du parsing d\'un audit local:', key);
          }
        }
      }
    }
    return audits;
  } catch (error) {
    logger.error('[AuditStore] Erreur lors du chargement des audits locaux:', error);
    return [];
  }
}

// Helper function pour supprimer un audit du localStorage
function removeAuditFromLocal(auditId: string): void {
  try {
    const key = `audit_${auditId}`;
    localStorage.removeItem(key);
    logger.log('[AuditStore] 🗑️ Audit supprimé du localStorage:', auditId);
  } catch (error) {
    logger.error('[AuditStore] Erreur lors de la suppression locale:', error);
  }
}

// Helper function pour sauvegarder l'audit via l'API
// IMPORTANT: Sauvegarder TOUS les audits dans le backend (en cours ET terminés)
// NOTE: Le PDF n'est pas inclus ici pour éviter les problèmes de taille de payload
async function saveAuditToBackend(audit: Audit, immediate = false): Promise<string | null> {
  // Toujours sauvegarder en local comme backup
  saveAuditToLocal(audit);

  // Pour les audits terminés, créer ou mettre à jour dans le backend
  try {
    // Normaliser la date au format ISO si nécessaire
    let dateExecution = audit.dateExecution;
    if (dateExecution && typeof dateExecution === 'string') {
      try {
        const date = new Date(dateExecution);
        if (!isNaN(date.getTime())) {
          dateExecution = date.toISOString();
        }
      } catch (e) {
        // Garder la date originale si la conversion échoue
      }
    }

    const auditData: any = {
      dateExecution,
      adresse: audit.adresse || null,
      categories: audit.categories,
      correctiveActions: audit.correctiveActions || [],
      status: audit.status || 'in_progress', // Utiliser le statut réel
      completedAt: audit.completedAt,
    };
    
    // Calculer la taille approximative du payload pour le debug
    const payloadSize = JSON.stringify(auditData).length;
    const payloadSizeMB = (payloadSize / 1024 / 1024).toFixed(2);
    logger.log(`[AuditStore] 📦 Taille du payload: ${payloadSizeMB} MB (${payloadSize} bytes)`);
    
    // Si le payload est trop volumineux, logger un avertissement
    if (payloadSize > 50 * 1024 * 1024) { // 50MB
      logger.warn(`[AuditStore] ⚠️ Payload très volumineux (${payloadSizeMB} MB). Cela peut causer des problèmes.`);
    }

    // Si l'audit a un ID temporaire (commence par "temp_"), créer un nouvel audit
    if (audit.id && audit.id.startsWith('temp_')) {
      const statusText = audit.status === 'completed' ? 'terminé' : 'en cours';
      logger.log(`[AuditStore] 📤 Création de l'audit ${statusText} dans le backend...`);
      const response = await auditApi.createAudit(auditData);
      const newId = response.id || response._id;
      
      if (!newId) {
        throw new Error('L\'audit créé n\'a pas d\'ID dans la réponse');
      }

      // Supprimer l'ancien audit local
      removeAuditFromLocal(audit.id);
      
      logger.log(`[AuditStore] ✅ Audit ${statusText} créé dans le backend avec ID:`, newId);
      
      // Retourner le nouvel ID pour que l'appelant puisse mettre à jour currentAudit
      return newId;
    }

    // Sinon, mettre à jour l'audit existant
    if (!audit.id) {
      logger.error('[AuditStore] ⚠️ ERREUR CRITIQUE: Tentative de sauvegarde d\'un audit sans ID !');
      return null;
    }

    const statusText = audit.status === 'completed' ? 'terminé' : 'en cours';
    logger.log(`[AuditStore] 📤 Mise à jour de l'audit ${statusText} dans le backend...`);
    logger.log('[AuditStore] ID de l\'audit à mettre à jour:', audit.id);
    logger.log('[AuditStore] Données à envoyer:', JSON.stringify(auditData, null, 2));
    
    try {
      const response = await auditApi.updateAudit(audit.id, auditData);
      
      logger.log('[AuditStore] ✅ Réponse de mise à jour:', response);
    } catch (updateError) {
      logger.error('[AuditStore] ❌ Erreur lors de la mise à jour de l\'audit:', updateError);
      throw updateError; // Propager l'erreur pour que l'UI puisse l'afficher
    }
    
    // Supprimer l'audit du localStorage maintenant qu'il est dans le backend
    if (audit.id.startsWith('temp_')) {
      removeAuditFromLocal(audit.id);
    }
    
    if (immediate) {
      logger.log('[AuditStore] ✅ Audit sauvegardé dans le backend avec succès');
    }
    
    // Retourner l'ID existant (pas de changement)
    return audit.id;
  } catch (error) {
    logger.error('[AuditStore] Erreur lors de la sauvegarde de l\'audit:', error);
    if (error instanceof ApiError) {
      logger.error('[AuditStore] Erreur API:', error.status, error.message);
    }
    throw error; // Propager l'erreur pour que l'UI puisse l'afficher
  }
}

// Debounced save pour les modifications fréquentes
// - 2.5 secondes pour l'adresse (saisie de texte)
// - 1 seconde pour les autres champs
let debouncedSave: (() => void) | null = null;
let debouncedSaveAddress: (() => void) | null = null;
let pendingAudit: Audit | null = null;

// Debounced calculateResults pour éviter les recalculs à chaque frappe
// Stocker les références get et set pour les utiliser dans la fonction debounced
let debouncedCalculateResults: (() => void) | null = null;
let debouncedGet: (() => any) | null = null;
let debouncedSet: any = null;

function getDebouncedCalculateResults(get: () => any, set: any) {
  // Mettre à jour les références à chaque appel
  debouncedGet = get;
  debouncedSet = set;
  
  if (!debouncedCalculateResults) {
    debouncedCalculateResults = debounce(() => {
      if (!debouncedGet || !debouncedSet) return;
      
      const { currentAudit } = debouncedGet();
      if (!currentAudit) {
        debouncedSet({ results: null });
        return;
      }
      // Calculer les résultats de manière non-bloquante
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          if (!debouncedGet || !debouncedSet) return;
          const { currentAudit } = debouncedGet();
          if (currentAudit) {
            const results = calculateResults(currentAudit);
            debouncedSet({ results });
          }
        }, { timeout: 100 });
      } else {
        setTimeout(() => {
          if (!debouncedGet || !debouncedSet) return;
          const { currentAudit } = debouncedGet();
          if (currentAudit) {
            const results = calculateResults(currentAudit);
            debouncedSet({ results });
          }
        }, 0);
      }
    }, 300); // 300ms de délai pour éviter les recalculs trop fréquents
  }
  return debouncedCalculateResults;
}

function getDebouncedSave() {
  if (!debouncedSave) {
    debouncedSave = debounce(async () => {
      if (pendingAudit) {
        // Vérifier que l'audit a un ID avant de sauvegarder
        if (!pendingAudit.id) {
          logger.error('[AuditStore] ⚠️ Debounced save: L\'audit n\'a pas d\'ID. Impossible de sauvegarder.');
          pendingAudit = null;
          return;
        }
        // Sauvegarde non-bloquante (pas d'await dans le handler)
        saveAuditToBackend(pendingAudit).catch(err => {
          logger.error('[AuditStore] Erreur lors de la sauvegarde debounced:', err);
        });
        pendingAudit = null;
      }
    }, 1000); // 1 seconde de délai pour les champs normaux
  }
  return debouncedSave;
}

function getDebouncedSaveAddress() {
  if (!debouncedSaveAddress) {
    debouncedSaveAddress = debounce(async () => {
      if (pendingAudit) {
        // Vérifier que l'audit a un ID avant de sauvegarder
        if (!pendingAudit.id) {
          logger.error('[AuditStore] ⚠️ Debounced save address: L\'audit n\'a pas d\'ID. Impossible de sauvegarder.');
          pendingAudit = null;
          return;
        }
        // Sauvegarde non-bloquante (pas d'await dans le handler)
        saveAuditToBackend(pendingAudit).catch(err => {
          logger.error('[AuditStore] Erreur lors de la sauvegarde debounced (adresse):', err);
        });
        pendingAudit = null;
      }
    }, 2500); // 2.5 secondes de délai pour l'adresse (saisie de texte)
  }
  return debouncedSaveAddress;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  currentAudit: null,
  audits: [],
  results: null,

  createAudit: async (dateExecution, adresse, categories) => {
    // PROTECTION: Vérifier qu'un audit n'est pas déjà en cours de création
    // MAIS permettre la création si l'audit existant est terminé
    const { currentAudit } = get();
    if (currentAudit && currentAudit.id) {
      // Si l'audit est terminé, on peut créer un nouvel audit
      if (currentAudit.status === 'completed') {
        logger.log('[AuditStore] Audit précédent terminé, création d\'un nouvel audit autorisée');
        // Réinitialiser currentAudit pour permettre la création
        set({ currentAudit: null });
      } else {
        logger.warn('[AuditStore] ⚠️ Un audit existe déjà. ID:', currentAudit.id);
        logger.warn('[AuditStore] Pour créer un nouvel audit, retournez au dashboard.');
        return; // Ne pas créer un nouvel audit si un existe déjà et n'est pas terminé
      }
    }

    // Récupérer l'ID de l'auditeur connecté depuis le store d'authentification
    const { useAuthStore } = await import('./authStore');
    const currentUser = useAuthStore.getState().currentUser;
    
    if (!currentUser) {
      throw new Error('Vous devez être connecté pour créer un audit');
    }

    try {
      logger.log('[AuditStore] 🆕 Création d\'un nouvel audit dans le backend...');
      
      // Créer l'audit directement dans le backend avec status 'in_progress'
      const auditData = {
        dateExecution,
        adresse: adresse || undefined,
        categories,
        correctiveActions: [],
        status: 'in_progress' as const,
      };
      
      try {
        const response = await auditApi.createAudit(auditData);
        const newId = response.id || response._id;
        
        if (!newId) {
          throw new Error('L\'audit créé n\'a pas d\'ID dans la réponse');
        }
        
        const newAudit: Audit = {
          id: newId,
          auditorId: currentUser.id,
          auditorName: currentUser.name,
          auditorEmail: currentUser.email,
          dateExecution,
          adresse,
          categories,
          status: 'in_progress',
          completedAt: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: true, // Déjà dans le backend
        };

        // Sauvegarder aussi en local comme backup
        saveAuditToLocal(newAudit);

        logger.log('[AuditStore] ✅ Audit créé dans le backend avec ID:', newId);
        set({ currentAudit: newAudit });
      } catch (backendError) {
        // Si le backend échoue, créer localement avec ID temporaire
        logger.warn('[AuditStore] ⚠️ Erreur backend, création locale:', backendError);
        
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newAudit: Audit = {
          id: tempId,
          auditorId: currentUser.id,
          auditorName: currentUser.name,
          auditorEmail: currentUser.email,
          dateExecution,
          adresse,
          categories,
          status: 'in_progress',
          completedAt: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false,
        };

        saveAuditToLocal(newAudit);
        logger.log('[AuditStore] ✅ Audit créé localement (fallback). ID temporaire:', tempId);
        set({ currentAudit: newAudit });
      }
      getDebouncedCalculateResults(get, set)();
    } catch (error) {
      logger.error('Erreur lors de la création de l\'audit:', error);
      throw error;
    }
  },

  loadAudit: async (id) => {
    try {
      // Si l'ID commence par "temp_", charger depuis le localStorage
      if (id.startsWith('temp_')) {
        const localAudit = loadAuditFromLocal(id);
        if (localAudit) {
          set({ currentAudit: localAudit });
          getDebouncedCalculateResults(get, set)();
          return;
        } else {
          logger.error('Audit local non trouvé:', id);
          return;
        }
      }
      
      // Sinon, charger depuis le backend
      const response = await auditApi.getAuditById(id);
      
      if (!response) {
        logger.error('Audit non trouvé');
        return;
      }

      // Convertir la réponse API en format Audit
      const audit: Audit = {
        id: response.id || response._id,
        auditorId: response.auditorId,
        auditorName: response.auditorName,
        auditorEmail: response.auditorEmail,
        dateExecution: response.dateExecution,
        adresse: response.adresse,
        categories: response.categories || [],
        correctiveActions: response.correctiveActions || [],
        status: response.status,
        completedAt: response.completedAt,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        synced: true,
      };

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
      try {
        await auditApi.updateAudit(migratedAudit.id, {
          dateExecution: migratedAudit.dateExecution,
          adresse: migratedAudit.adresse,
          categories: migratedAudit.categories,
          correctiveActions: migratedAudit.correctiveActions,
        });
      } catch (error) {
        logger.error('Erreur lors de la sauvegarde de l\'audit:', error);
      }
      
      set({ currentAudit: migratedAudit });
      getDebouncedCalculateResults(get, set)();
      }
    } catch (error) {
      logger.error('Erreur lors du chargement de l\'audit:', error);
      if (error instanceof ApiError) {
        logger.error('Erreur API:', error.status, error.message);
      }
    }
  },

  loadAllAudits: async () => {
    // Récupérer l'utilisateur connecté
    const { useAuthStore } = await import('./authStore');
    const currentUser = useAuthStore.getState().currentUser;
    
    if (!currentUser) {
      set({ audits: [] });
      return;
    }

    try {
      const response = await auditApi.getAllAudits();
      
      // Le backend retourne { audits: [...] } ou directement [...]
      let allAuditsData: any[];
      if (Array.isArray(response)) {
        allAuditsData = response;
      } else if (response && typeof response === 'object' && 'audits' in response) {
        allAuditsData = Array.isArray((response as any).audits) ? (response as any).audits : [];
      } else {
        allAuditsData = [];
      }
      
      // Convertir les réponses API en format Audit
      // CHARGER TOUS LES AUDITS (completed ET in_progress) depuis le backend
      // Les audits in_progress dans le backend sont ceux qui ont été créés par erreur ou qui sont en cours de finalisation
      const backendAudits: Audit[] = allAuditsData
        .filter((response: any) => response.status === 'completed' || response.status === 'in_progress')
        .map((response: any) => {
          // Normaliser l'ID (peut être _id ou id)
          const auditId = response.id || response._id;
          const auditorId = response.auditorId?.toString() || response.auditorId;
          
        return {
          id: auditId,
          auditorId: auditorId,
          auditorName: response.auditorName,
          auditorEmail: response.auditorEmail,
          dateExecution: response.dateExecution,
          adresse: response.adresse || '',
          categories: response.categories || [],
          correctiveActions: response.correctiveActions || [],
          status: response.status, // Conserver le statut réel (completed ou in_progress)
          completedAt: response.completedAt,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          synced: true,
        };
        });
      
      // Séparer les audits terminés et en cours
      const completedAudits = backendAudits.filter(a => a.status === 'completed');
      
      // Récupérer les audits in_progress depuis le backend (ceux qui ont été créés par erreur ou qui sont en cours)
      const backendInProgressAudits = backendAudits.filter(a => a.status === 'in_progress');
      
      // Charger aussi les audits en cours depuis le localStorage
      const localAudits = loadAllLocalAudits();
      
      // Enrichir les audits locaux avec les informations de l'auditeur si disponibles
      // (pour l'affichage admin, on a besoin du nom de l'auditeur)
      const enrichedLocalAudits = localAudits.map(audit => {
        // Si l'audit n'a pas les infos de l'auditeur, on les laisse vides
        // Elles seront enrichies côté Dashboard si nécessaire
        return audit;
      });
      
      // Filtrer les audits locaux selon l'utilisateur connecté
      const userLocalAudits = enrichedLocalAudits.filter(audit => 
        audit.auditorId?.toString() === currentUser.id?.toString()
      );
      
      // Combiner les audits backend et locaux en évitant les doublons
      // STRATÉGIE : Prioriser les audits backend (source de vérité)
      // Ne garder les audits locaux QUE s'ils n'ont pas d'équivalent backend
      
      const allAuditsMap = new Map<string, Audit>();
      
      // Ajouter TOUS les audits backend en priorité (completed et in_progress)
      completedAudits.forEach(audit => allAuditsMap.set(audit.id, audit));
      backendInProgressAudits.forEach(audit => allAuditsMap.set(audit.id, audit));
      
      // Nettoyer les audits locaux obsolètes
      // Les audits locaux ne sont plus nécessaires car tout est maintenant dans le backend
      // On ne garde que les audits locaux qui n'ont vraiment pas été synchronisés (très rare)
      const backendAuditKeys = new Set<string>();
      backendAudits.forEach(audit => {
        const key = `${audit.auditorId}_${audit.dateExecution}_${audit.adresse || 'no-address'}_${audit.status}`;
        backendAuditKeys.add(key);
      });
      
      // Supprimer TOUS les audits locaux obsolètes (ceux qui existent dans le backend)
      userLocalAudits.forEach(audit => {
        const key = `${audit.auditorId}_${audit.dateExecution}_${audit.adresse || 'no-address'}_${audit.status}`;
        // Supprimer l'audit local s'il existe dans le backend
        if (backendAuditKeys.has(key)) {
          logger.log('[AuditStore] 🗑️ Suppression audit local obsolète (existe dans backend):', audit.id);
          removeAuditFromLocal(audit.id);
        }
      });
      
      // Ne pas ajouter d'audits locaux - tout doit être dans le backend maintenant
      // Les audits locaux ne sont qu'un backup temporaire en cas d'échec backend
      
      const allAudits = Array.from(allAuditsMap.values());
      
      // Filtrer selon le rôle de l'utilisateur
      let filteredAudits: Audit[];
      if (currentUser.role === 'admin') {
        // L'admin voit tous les audits (terminés + en cours du backend + en cours locaux)
        filteredAudits = allAudits;
      } else {
        // Les auditeurs ne voient que leurs propres audits
        filteredAudits = allAudits.filter(audit => 
          audit.auditorId?.toString() === currentUser.id?.toString()
        );
      }
      
      logger.log(`[AuditStore] Chargé ${filteredAudits.length} audit(s) pour l'utilisateur ${currentUser.name} (${currentUser.id})`);
      logger.log(`[AuditStore] Rôle: ${currentUser.role}, Terminés: ${completedAudits.length}, En cours backend: ${backendInProgressAudits.length}, En cours local: ${userLocalAudits.length}`);
      
      set({ audits: filteredAudits });
    } catch (error) {
      logger.error('Erreur lors du chargement des audits:', error);
      if (error instanceof ApiError) {
        logger.error('Erreur API:', error.status, error.message);
      }
      set({ audits: [] });
    }
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

    // Mise à jour immédiate de l'UI (non-bloquant)
    set({ currentAudit: { ...updatedAudit, synced: false } });
    
    // Sauvegarde avec debounce (non-bloquant)
    pendingAudit = updatedAudit;
    getDebouncedSave()();
    
    // Recalculer les résultats avec debounce (non-bloquant)
    getDebouncedCalculateResults(get, set)();
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

    // Mise à jour immédiate de l'UI
    set({ currentAudit: updatedAudit });

    // Sauvegarde avec debounce
    pendingAudit = updatedAudit;
    getDebouncedSave()();
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

    // Mise à jour immédiate de l'UI
    set({ currentAudit: updatedAudit });

    // Sauvegarde avec debounce
    pendingAudit = updatedAudit;
    getDebouncedSave()();
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

    // Sauvegarde immédiate pour les actions critiques
    await saveAuditToBackend(updatedAudit, true);
    set({ currentAudit: { ...updatedAudit, synced: true } });
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

    // Mise à jour immédiate de l'UI (non-bloquant)
    set({ currentAudit: updatedAudit });

    // Sauvegarde avec debounce (non-bloquant)
    pendingAudit = updatedAudit;
    getDebouncedSave()();
    
    // Recalculer les résultats avec debounce (non-bloquant)
    getDebouncedCalculateResults(get, set)();
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

    // Sauvegarde immédiate pour les actions critiques
    await saveAuditToBackend(updatedAudit, true);
    set({ currentAudit: { ...updatedAudit, synced: true } });
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

    // Mise à jour immédiate de l'UI
    set({ currentAudit: updatedAudit });

    // Sauvegarde avec debounce
    pendingAudit = updatedAudit;
    getDebouncedSave()();
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

    // Mise à jour immédiate de l'UI
    set({ currentAudit: updatedAudit });

    // Sauvegarde avec debounce
    pendingAudit = updatedAudit;
    getDebouncedSave()();
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

    // Mise à jour immédiate de l'UI
    set({ currentAudit: updatedAudit });

    // Sauvegarde immédiate pour les actions critiques
    await saveAuditToBackend(updatedAudit, true);
    set({ currentAudit: { ...updatedAudit, synced: true } });
  },

  updateAuditDate: async (dateExecution) => {
    const { currentAudit } = get();
    if (!currentAudit) {
      logger.warn('[AuditStore] updateAuditDate: Aucun audit en cours');
      return;
    }

    // Vérifier que l'audit a un ID (doit être créé avant)
    if (!currentAudit.id) {
      logger.error('[AuditStore] updateAuditDate: L\'audit n\'a pas d\'ID. Impossible de mettre à jour.');
      return;
    }

    const updatedAudit: Audit = {
      ...currentAudit,
      dateExecution,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    // Mise à jour immédiate de l'UI (non-bloquant)
    // NE PAS recalculer les résultats ici - la date n'affecte pas les calculs
    set({ currentAudit: updatedAudit });

    // Sauvegarde avec debounce (non-bloquant)
    pendingAudit = updatedAudit;
    getDebouncedSave()();
  },

  updateAuditAddress: async (adresse) => {
    const { currentAudit } = get();
    if (!currentAudit) {
      logger.warn('[AuditStore] updateAuditAddress: Aucun audit en cours');
      return;
    }

    // Vérifier que l'audit a un ID (doit être créé avant)
    if (!currentAudit.id) {
      logger.error('[AuditStore] updateAuditAddress: L\'audit n\'a pas d\'ID. Impossible de mettre à jour.');
      return;
    }

    const updatedAudit: Audit = {
      ...currentAudit,
      adresse,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    // Mise à jour immédiate de l'UI (non-bloquant)
    set({ currentAudit: updatedAudit });

    // Sauvegarde avec debounce plus long pour l'adresse (non-bloquant)
    pendingAudit = updatedAudit;
    getDebouncedSaveAddress()();
    
    // NOTE: Pas besoin de recalculer les résultats quand on change juste l'adresse
    // Les résultats ne dépendent pas de l'adresse
  },

  calculateResults: () => {
    // Utiliser la version debounced pour éviter les recalculs trop fréquents
    getDebouncedCalculateResults(get, set)();
  },

  markAuditAsCompleted: async () => {
    const { currentAudit } = get();
    if (!currentAudit || !currentAudit.id) {
      logger.warn('[AuditStore] markAuditAsCompleted: Aucun audit en cours ou pas d\'ID');
      return;
    }

    logger.log('[AuditStore] 🎯 Début de la finalisation de l\'audit:', {
      id: currentAudit.id,
      status: currentAudit.status,
      isTempId: currentAudit.id.startsWith('temp_')
    });

    // Préparer l'audit à finaliser
    // Si l'audit a un ID temporaire, vérifier s'il existe déjà dans le backend
    let auditToFinalize = { ...currentAudit };
    
    if (currentAudit.id.startsWith('temp_')) {
      // Chercher un audit existant dans le backend avec les mêmes données
      // (même date, même adresse, même auditorId)
      try {
        const { useAuthStore } = await import('./authStore');
        const currentUser = useAuthStore.getState().currentUser;
        if (currentUser) {
          logger.log('[AuditStore] 🔍 Recherche d\'un audit existant dans le backend...');
          const allAuditsResponse = await auditApi.getAllAudits();
          let auditsArray: any[] = [];
          if (Array.isArray(allAuditsResponse)) {
            auditsArray = allAuditsResponse;
          } else if (allAuditsResponse && typeof allAuditsResponse === 'object' && 'audits' in allAuditsResponse) {
            auditsArray = Array.isArray((allAuditsResponse as any).audits) ? (allAuditsResponse as any).audits : [];
          }
          
          const existingAudit = auditsArray.find((a: any) => {
            const auditId = a.id || a._id;
            const sameDate = a.dateExecution === currentAudit.dateExecution;
            const sameAddress = (a.adresse || '') === (currentAudit.adresse || '');
            const sameAuditor = (a.auditorId?.toString() || a.auditorId) === currentUser.id?.toString();
            const isInProgress = a.status === 'in_progress';
            logger.log('[AuditStore] Comparaison audit:', {
              auditId,
              sameDate,
              sameAddress,
              sameAuditor,
              isInProgress,
              status: a.status
            });
            return sameDate && sameAddress && sameAuditor && isInProgress;
          });
          
          if (existingAudit) {
            const existingId = existingAudit.id || existingAudit._id;
            logger.log('[AuditStore] ✅ Audit existant trouvé dans le backend avec ID:', existingId);
            auditToFinalize = {
              ...currentAudit,
              id: existingId,
              synced: true,
            };
          } else {
            logger.log('[AuditStore] ℹ️ Aucun audit existant trouvé, utilisation de l\'ID temporaire');
          }
        }
      } catch (err) {
        logger.warn('[AuditStore] Erreur lors de la recherche d\'un audit existant:', err);
        // Continuer avec l'ID temporaire
      }
    }

    // Créer l'audit avec le statut completed
    const updatedAudit: Audit = {
      ...auditToFinalize,
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    
    logger.log('[AuditStore] 📝 Audit à finaliser:', {
      id: updatedAudit.id,
      status: updatedAudit.status,
      isTempId: updatedAudit.id.startsWith('temp_')
    });

    // Mise à jour immédiate de l'UI
    set({ currentAudit: updatedAudit });

    // Sauvegarde immédiate (BLOQUANTE pour s'assurer que c'est sauvegardé)
    let finalAuditId: string | null = null;
    try {
      logger.log('[AuditStore] 📤 Envoi de la mise à jour du statut:', { 
        id: updatedAudit.id, 
        status: updatedAudit.status, 
        completedAt: updatedAudit.completedAt 
      });
      
      // Sauvegarder l'audit dans le backend
      finalAuditId = await saveAuditToBackend(updatedAudit, true);
      
      if (!finalAuditId) {
        throw new Error('Erreur lors de la sauvegarde : aucun ID retourné');
      }
      
      logger.log('[AuditStore] ✅ Audit marqué comme terminé et sauvegardé. ID final:', finalAuditId);
      
      // Mettre à jour updatedAudit avec l'ID final si nécessaire
      if (finalAuditId !== updatedAudit.id) {
        updatedAudit.id = finalAuditId;
        updatedAudit.synced = true;
        logger.log('[AuditStore] ✅ ID mis à jour:', finalAuditId);
      }
      
      // Vérifier que l'audit a bien été sauvegardé avec le statut completed
      // En récupérant l'audit depuis le backend pour confirmer
      try {
        const savedAudit = await auditApi.getAuditById(finalAuditId);
        if (savedAudit && savedAudit.status === 'completed') {
          logger.log('[AuditStore] ✅ Vérification: Audit confirmé comme terminé dans le backend');
        } else {
          logger.warn('[AuditStore] ⚠️ Vérification: Le statut dans le backend n\'est pas "completed":', savedAudit?.status);
          // Ne pas réinitialiser currentAudit si la vérification échoue
          throw new Error('L\'audit n\'a pas été correctement marqué comme terminé dans le backend');
        }
      } catch (verifyError) {
        logger.error('[AuditStore] ❌ Erreur lors de la vérification de l\'audit:', verifyError);
        throw verifyError; // Propager l'erreur pour que l'UI puisse l'afficher
      }
      
    } catch (err) {
      logger.error('[AuditStore] ❌ Erreur lors de la sauvegarde de l\'état terminé:', err);
      // NE PAS réinitialiser currentAudit en cas d'erreur
      throw err; // Propager l'erreur pour que l'UI puisse l'afficher
    }

    // Mettre à jour la liste des audits dans le store
    const { audits, loadAllAudits } = get();
    const updatedAudits = audits.map(audit => 
      audit.id === updatedAudit.id ? { ...updatedAudit, status: 'completed' as const } : audit
    );
    set({ audits: updatedAudits });
    logger.log('[AuditStore] ✅ Liste des audits mise à jour localement');

    // Réinitialiser currentAudit pour permettre la création d'un nouvel audit
    // SEULEMENT si tout s'est bien passé
    set({ currentAudit: null });
    logger.log('[AuditStore] ✅ currentAudit réinitialisé après finalisation réussie');

    // Recharger les audits depuis le serveur pour s'assurer de la synchronisation
    // IMPORTANT: Attendre le rechargement pour que le dashboard affiche l'audit terminé
    if (finalAuditId) {
      try {
        logger.log('[AuditStore] 🔄 Rechargement des audits depuis le serveur...');
        await loadAllAudits();
        logger.log('[AuditStore] ✅ Audits rechargés après finalisation');
        
        // Vérifier que l'audit terminé est bien dans la liste
        const { audits: reloadedAudits } = get();
        const completedAudit = reloadedAudits.find(a => a.id === finalAuditId && a.status === 'completed');
        if (completedAudit) {
          logger.log('[AuditStore] ✅ Audit terminé trouvé dans la liste rechargée:', completedAudit.id);
        } else {
          logger.warn('[AuditStore] ⚠️ Audit terminé non trouvé dans la liste rechargée. ID recherché:', finalAuditId);
        }
      } catch (err) {
        logger.error('[AuditStore] ❌ Erreur lors du rechargement des audits après complétion:', err);
      }
    }
  },

  deleteAudit: async (id: string) => {
    logger.log('[AuditStore] 🗑️ Suppression de l\'audit:', id);
    
    try {
      // Supprimer du backend si l'ID n'est pas temporaire
      if (!id.startsWith('temp_')) {
        await auditApi.deleteAudit(id);
        logger.log('[AuditStore] ✅ Audit supprimé du backend:', id);
      }
      
      // Supprimer du localStorage
      removeAuditFromLocal(id);
      
      // Supprimer de la liste des audits dans le store
      set((state) => ({
        audits: state.audits.filter((audit) => audit.id !== id),
      }));
      
      // Si l'audit supprimé est l'audit en cours, le réinitialiser
      const { currentAudit } = get();
      if (currentAudit && currentAudit.id === id) {
        set({ currentAudit: null });
        logger.log('[AuditStore] ✅ Audit en cours réinitialisé');
      }
      
      logger.log('[AuditStore] ✅ Audit supprimé avec succès:', id);
    } catch (error) {
      logger.error('[AuditStore] ❌ Erreur lors de la suppression de l\'audit:', error);
      throw error;
    }
  },
}));

