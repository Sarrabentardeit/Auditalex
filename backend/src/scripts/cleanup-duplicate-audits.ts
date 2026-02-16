/**
 * Script pour nettoyer les audits en double
 * À exécuter manuellement si nécessaire
 */

import { connectDatabase, closeDatabase } from '../config/mongodb';
import { Audit } from '../models/Audit.model';
import { logger } from '../utils/logger';
import 'dotenv/config';

async function cleanupDuplicateAudits() {
  try {
    await connectDatabase();

    // Trouver tous les audits
    const allAudits = await Audit.find().sort({ createdAt: 1 });

    logger.info(`Total audits trouvés: ${allAudits.length}`);

    // Grouper par auditorId et dateExecution
    const auditGroups = new Map<string, any[]>();

    allAudits.forEach((audit) => {
      const key = `${audit.auditorId.toString()}_${audit.dateExecution.toISOString().split('T')[0]}`;
      if (!auditGroups.has(key)) {
        auditGroups.set(key, []);
      }
      auditGroups.get(key)!.push(audit);
    });

    let duplicatesRemoved = 0;

    // Pour chaque groupe, garder le plus récent et supprimer les autres
    for (const [key, audits] of auditGroups.entries()) {
      if (audits.length > 1) {
        logger.info(`Groupe avec doublons: ${key} (${audits.length} audits)`);
        
        // Trier par createdAt (le plus récent en dernier)
        audits.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Garder le dernier (le plus récent)
        const toKeep = audits[audits.length - 1];
        const toDelete = audits.slice(0, -1);

        logger.info(`  → Garder: ${toKeep._id} (créé le ${toKeep.createdAt})`);
        
        for (const audit of toDelete) {
          logger.info(`  → Supprimer: ${audit._id} (créé le ${audit.createdAt})`);
          await Audit.findByIdAndDelete(audit._id);
          duplicatesRemoved++;
        }
      }
    }

    logger.info(`✅ Nettoyage terminé. ${duplicatesRemoved} audit(s) en double supprimé(s).`);

    await closeDatabase();
  } catch (error) {
    logger.error('Erreur lors du nettoyage:', error);
    await closeDatabase();
    process.exit(1);
  }
}

cleanupDuplicateAudits();



