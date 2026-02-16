/**
 * Système de logging conditionnel
 * Les logs ne s'affichent qu'en mode développement
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Les erreurs sont toujours affichées, même en production
    console.error(...args);
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  // Pour les logs API (trop verbeux, désactivés même en dev sauf si nécessaire)
  api: (...args: any[]) => {
    // Désactivé par défaut pour améliorer les performances
    // Activer seulement si nécessaire pour le debug
    if (isDevelopment && false) { // Changez false en true pour activer les logs API
      console.log('[API]', ...args);
    }
  }
};



