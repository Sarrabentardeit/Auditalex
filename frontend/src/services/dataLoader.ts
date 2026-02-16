import type { AuditCategory, AuditItem, Observation, ItemClassification } from '../types';

// Mapping des items avec leur classification selon le document PDF
const ITEM_CLASSIFICATIONS: Record<string, ItemClassification> = {
  'Déclaration d\'activité': 'binary',
  'Lutte contre les nuisibles': 'binary',
  'Maintenance des locaux et équipements': 'multiple',
  'Nettoyage et désinfection des locaux et équipements': 'multiple',
  'Maîtrise du froid positif et négatif (enregistrement de températures, températures effectives, joints, givre…)': 'multiple',
  'Maîtrise du chaud (Bain-marie, friteuses, grilles de four…)': 'multiple',
  'Contrôle à réception': 'multiple',
  'Gestions des conditionnements et emballages': 'multiple',
  'Affichage': 'multiple',
  'Système de traçabilité (Réalisation, qualité des photos, traçabilité fonctionnelle…)': 'binary',
  'Gestion des non-conformités': 'binary',
  'Gestion des actions correctives de l\'audit précédent': 'binary',
  'Gestion des déchets': 'binary',
  'Gestions des poubelles': 'multiple',
  'Hygiène et équipements du personnel (lave-mains et consommables, sanitaires, vestiaires…)': 'multiple',
  'Formation et instructions à disposition du personnel': 'binary',
};

// Type pour les données JSON importées
interface JSONCategory {
  name: string;
  items: Array<{
    name: string;
    ponderation: number;
    note: number;
    comments: string[];
    actions: string[];
  }>;
}

interface JSONData {
  categories: JSONCategory[];
  observations: Record<string, Array<{ observation: string; action: string }>>;
}

// Cache pour éviter de recharger le JSON à chaque fois
let cachedData: JSONData | null = null;

// Charger les données depuis le fichier public avec mise en cache
async function loadJSONData(): Promise<JSONData> {
  if (cachedData !== null) {
    console.log('[DataLoader] Utilisation du cache pour data_structure.json');
    return cachedData;
  }
  
  console.log('[DataLoader] Chargement de data_structure.json depuis le serveur...');
  const response = await fetch('/data_structure.json');
  const data: JSONData = await response.json();
  cachedData = data;
  return data;
}

/**
 * Convertir les données JSON en structure AuditCategory
 */
export async function loadCategoriesFromJSON(): Promise<AuditCategory[]> {
  const auditData = await loadJSONData();
  const categories: AuditCategory[] = [];

  auditData.categories.forEach((cat, catIndex) => {
    const items: AuditItem[] = cat.items.map((item, itemIndex) => {
      // Charger les observations possibles depuis la section "observations" du JSON
      const observationOptions = auditData.observations[item.name] || [];
      
      // Extraire toutes les observations uniques (pour la liste déroulante)
      const observationsSet = new Set<string>();
      observationOptions.forEach(opt => {
        if (opt.observation && opt.observation.trim() !== '') {
          observationsSet.add(opt.observation.trim());
        }
      });
      const availableObservations = Array.from(observationsSet).sort();
      
      // Extraire toutes les actions correctives uniques (pour la liste déroulante)
      const actionsSet = new Set<string>();
      observationOptions.forEach(opt => {
        if (opt.action && opt.action.trim() !== '') {
          actionsSet.add(opt.action.trim());
        }
      });
      const availableCorrectiveActions = Array.from(actionsSet).sort();
      
      // Initialiser les observations sélectionnées (vide par défaut)
      const observations: Observation[] = [];

      // Déterminer la classification (par défaut 'multiple' si non trouvée)
      const classification: ItemClassification = ITEM_CLASSIFICATIONS[item.name] || 'multiple';

      return {
        id: `item-${catIndex}-${itemIndex}`,
        name: item.name,
        ponderation: item.ponderation,
        classification,
        numberOfNonConformities: null, // Par défaut null (EN ATTENTE)
        note: undefined, // Sera calculée automatiquement quand audité
        ko: 0, // Par défaut 0 KO (champ manuel, indépendant des notes)
        isAudited: false, // Pas encore audité par défaut
        observations, // Liste vide par défaut, l'auditeur sélectionnera
        observationOptions, // Toutes les options possibles (depuis JSON)
        availableObservations, // Liste de toutes les observations uniques (pour dropdown)
        availableCorrectiveActions, // Liste de toutes les actions uniques (pour dropdown)
        photos: [],
        comments: '',
      };
    });

    categories.push({
      id: `cat-${catIndex}`,
      name: cat.name,
      items,
    });
  });

  return categories;
}

