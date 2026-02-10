// Types pour l'application d'audit d'hygiène

/**
 * Note d'audit possible
 */
export type AuditNote = 1.0 | 0.7 | 0.3 | 0.0;

/**
 * Libellé de la note
 */
export type NoteLabel = 'Conforme' | 'Mineur' | 'Moyen' | 'Majeur';

/**
 * Mapping note -> libellé
 */
export const NOTE_LABELS: Record<AuditNote, NoteLabel> = {
  1.0: 'Conforme',
  0.7: 'Mineur',
  0.3: 'Moyen',
  0.0: 'Majeur',
};

/**
 * Mapping libellé -> note
 */
export const LABEL_NOTES: Record<NoteLabel, AuditNote> = {
  Conforme: 1.0,
  Mineur: 0.7,
  Moyen: 0.3,
  Majeur: 0.0,
};

/**
 * Classification d'un item (binaire ou multiple)
 */
export type ItemClassification = 'binary' | 'multiple';

/**
 * Observation sélectionnée pour un item (avec action corrective liée)
 */
export interface Observation {
  id: string;
  text: string; // Texte de l'observation sélectionnée
  correctiveAction?: string; // Action corrective associée à cette observation (optionnelle)
}

/**
 * Option d'observation possible pour un item (depuis JSON)
 */
export interface ObservationOption {
  observation: string;
  action: string; // Utilisé uniquement pour extraire les actions possibles
}

/**
 * Item d'audit (sous-catégorie)
 */
export interface AuditItem {
  id: string;
  name: string;
  ponderation: number; // Poids dans le calcul (ex: 0.333, 0.5) - utilisé uniquement pour le calcul, pas affiché
  classification: ItemClassification; // Classification binaire ou multiple
  numberOfNonConformities: number | null; // Nombre de non-conformités (null = EN ATTENTE, 0 = conforme)
  note?: AuditNote; // Note calculée automatiquement selon classification et numberOfNonConformities
  ko: number; // Nombre de KO (champ manuel, indépendant des notes) - violations spécifiques qui engendrent une amende
  isAudited: boolean; // Indique si l'utilisateur a interagi avec cet item
  observations: Observation[]; // Observations sélectionnées par l'auditeur (chacune peut avoir une action corrective)
  observationOptions: ObservationOption[]; // Toutes les observations possibles pour cet item (depuis JSON)
  availableObservations: string[]; // Liste de toutes les observations uniques possibles (pour dropdown)
  availableCorrectiveActions: string[]; // Liste de toutes les actions correctives uniques possibles (pour dropdown)
  photos: string[]; // URLs ou base64 des photos
  comments: string; // Commentaires libres
}

/**
 * Catégorie principale d'audit
 */
export interface AuditCategory {
  id: string;
  name: string;
  items: AuditItem[];
}

/**
 * Données d'un audit complet
 */
export interface CorrectiveActionData {
  id: string;
  ecart: string;
  actionCorrective: string;
  delai: string;
  quand: string;
  visa: string;
  verification: string;
}

export interface Audit {
  id: string;
  dateExecution: string; // Format: YYYY-MM-DD
  adresse: string;
  categories: AuditCategory[];
  correctiveActions?: CorrectiveActionData[]; // Actions correctives remplissables
  createdAt: string;
  updatedAt: string;
  synced: boolean; // Si synchronisé avec le serveur
}

/**
 * Résultats calculés d'un audit
 */
export interface AuditResults {
  totalScore: number | null; // Score total en pourcentage (null si pas encore calculé ou aucune catégorie auditées)
  numberOfKO: number; // Nombre de KO (somme des KO manuels)
  potentialFines: number; // Amendes potentielles en euros
  categoryScores: Record<string, number | null>; // Score par catégorie (null si non auditées)
  hasAuditedItems: boolean; // Indique si au moins un item a été audité
}

/**
 * Données pour le graphique radar
 */
export interface RadarData {
  category: string;
  score: number; // 0-100
}

/**
 * Action corrective
 */
export interface CorrectiveAction {
  id: string;
  itemId: string;
  deviation: string; // Écart constaté
  action: string; // Action corrective définie
  deadline: string; // Délai
  completionDate?: string; // Date de réalisation
  status: 'pending' | 'completed' | 'verified';
}



