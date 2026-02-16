import type { Audit, AuditResults, AuditNote, ItemClassification } from '../types';

/**
 * Convertir le nombre de non-conformités en note selon la classification
 * 
 * Binaire:
 * - null = EN ATTENTE (pas de note)
 * - 0 non-conformité = 1.0 (100%)
 * - 1 non-conformité = 0.0 (0%)
 * 
 * Multiple:
 * - null = EN ATTENTE (pas de note)
 * - 0 = 1.0 (100%)
 * - 1 = 0.7 (70%)
 * - 2 = 0.3 (30%)
 * - >=3 = 0.0 (0%)
 */
export function convertNonConformitiesToNote(
  classification: ItemClassification,
  numberOfNonConformities: number | null
): AuditNote | null {
  // Si EN ATTENTE, retourner null
  if (numberOfNonConformities === null) return null;
  
  if (classification === 'binary') {
    // Binaire: 0 non-conformité = 1.0, 1 non-conformité = 0.0
    return numberOfNonConformities === 0 ? 1.0 : 0.0;
  } else {
    // Multiple: 0 = 1.0, 1 = 0.7, 2 = 0.3, >=3 = 0.0
    if (numberOfNonConformities === 0) return 1.0;
    if (numberOfNonConformities === 1) return 0.7;
    if (numberOfNonConformities === 2) return 0.3;
    return 0.0; // >= 3
  }
}

/**
 * Calculer le score d'une catégorie
 * Formule : (Σ(note × pondération) / Σ(pondération)) × 100
 * 
 * La note est calculée automatiquement à partir du nombre de non-conformités
 * Les items avec numberOfNonConformities === null (EN ATTENTE) sont exclus du calcul
 */
export function calculateCategoryScore(items: { 
  classification: ItemClassification;
  numberOfNonConformities: number | null;
  ponderation: number;
  isAudited: boolean;
}[]): number | null {
  if (items.length === 0) return null;

  let totalPonderation = 0;
  let totalScore = 0;
  let hasAuditedItems = false;

  items.forEach((item) => {
    // Ne calculer que pour les items audités ET qui ne sont pas EN ATTENTE
    if (!item.isAudited || item.numberOfNonConformities === null) return;
    
    hasAuditedItems = true;
    
    // Calculer la note à partir du nombre de non-conformités
    const note = convertNonConformitiesToNote(item.classification, item.numberOfNonConformities);
    if (note !== null) {
      totalScore += note * item.ponderation;
      totalPonderation += item.ponderation;
    }
  });

  // Si aucun item audité (non EN ATTENTE), retourner null
  if (!hasAuditedItems || totalPonderation === 0) return null;
  
  return (totalScore / totalPonderation) * 100;
}

/**
 * Calculer le nombre de KO (non-conformités)
 * 
 * Selon le document: "Les KO sont le nombre de non-conformités qui engendre une amende"
 * "Les KO sont indépendants des notes attribuées aux items"
 * "Le KO n'est PAS la somme automatique de toutes les non-conformités. 
 *  C'est un champ séparé que l'auditeur remplit manuellement pour les violations 
 *  spécifiques qui engendrent une amende."
 * 
 * Les KO = somme des KO manuels de tous les items audités
 */
export function calculateNumberOfKO(items: { ko: number; isAudited: boolean }[]): number {
  return items.reduce((total, item) => {
    // Ne compter que les items audités
    if (!item.isAudited) return total;
    return total + item.ko;
  }, 0);
}

/**
 * Calculer les amendes potentielles
 * Formule Excel (cartographie, ligne 31, colonne C): =C30*450*5
 * Où C30 = Nombre de KO (somme des KO manuels)
 * Donc: Nombre de KO × 2250€
 * 
 * Chaque KO coûte 2250€
 */
export function calculatePotentialFines(items: { ko: number; isAudited: boolean }[]): number {
  const numberOfKO = calculateNumberOfKO(items);
  // Formule Excel: Nombre de KO × 450 × 5 = Nombre de KO × 2250
  return numberOfKO * 2250;
}

/**
 * Calculer tous les résultats d'un audit
 */
export function calculateResults(audit: Audit): AuditResults {
  const categoryScores: Record<string, number | null> = {};
  let totalScore: number | null = null;
  let totalKO = 0;
  let hasAuditedItems = false;

  // Vérifier si au moins un item a été audité (l'utilisateur a interagi avec)
  audit.categories.forEach((category) => {
    category.items.forEach((item) => {
      if (item.isAudited) {
        hasAuditedItems = true;
      }
    });
  });

  // Si aucun item n'a été audité, retourner des résultats par défaut
  if (!hasAuditedItems) {
    return {
      totalScore: null, // Non calculé
      numberOfKO: 0,
      potentialFines: 0,
      categoryScores: {},
      hasAuditedItems: false,
    };
  }

  // Calculer les scores par catégorie et le nombre total de KO
  audit.categories.forEach((category) => {
    // Calculer le score de la catégorie (peut être null si tous les items sont EN ATTENTE)
    const categoryScore = calculateCategoryScore(category.items);
    categoryScores[category.id] = categoryScore;
    
    // Calculer les KO pour cette catégorie (somme des KO manuels des items audités)
    totalKO += calculateNumberOfKO(category.items.map(item => ({ ko: item.ko, isAudited: item.isAudited })));
  });

  // Calculer le score total (moyenne uniquement des catégories dont le score !== null)
  const categoryScoreValues = Object.values(categoryScores).filter((score): score is number => score !== null);
  if (categoryScoreValues.length > 0) {
    totalScore = categoryScoreValues.reduce((a, b) => a + b, 0) / categoryScoreValues.length;
    totalScore = Math.round(totalScore * 100) / 100;
  } else {
    totalScore = null; // Aucune catégorie n'a été audité
  }

  // Calculer les amendes sur le nombre total de KO (selon formule Excel)
  // Formule Excel: =C30*450*5 où C30 = Nombre total de KO
  const totalFines = totalKO * 2250;

  return {
    totalScore,
    numberOfKO: totalKO,
    potentialFines: totalFines,
    categoryScores,
    hasAuditedItems: true,
  };
}
