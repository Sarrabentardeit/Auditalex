import Dexie, { type Table } from 'dexie';
import type { Audit } from '../types';

/**
 * Base de données IndexedDB pour le stockage local
 */
class AuditDatabase extends Dexie {
  audits!: Table<Audit, string>;
  syncQueue!: Table<{ id: string; auditId: string; action: string; data: any; timestamp: number }, string>;

  constructor() {
    super('AuditHygieneDB');
    
    this.version(2).stores({
      audits: 'id, auditorId, dateExecution, synced, createdAt',
      syncQueue: 'id, auditId, timestamp',
    }).upgrade(async (tx) => {
      // Migration : ajouter auditorId aux audits existants si nécessaire
      const audits = await tx.table('audits').toArray();
      for (const audit of audits) {
        if (!audit.auditorId) {
          await tx.table('audits').update(audit.id, { auditorId: 'default' });
        }
      }
    });
  }
}

export const db = new AuditDatabase();

/**
 * Sauvegarder un audit localement
 */
export async function saveAudit(audit: Audit): Promise<void> {
  await db.audits.put(audit);
}

/**
 * Récupérer un audit par son ID
 */
export async function getAudit(id: string): Promise<Audit | undefined> {
  return await db.audits.get(id);
}

/**
 * Récupérer tous les audits
 */
export async function getAllAudits(): Promise<Audit[]> {
  return await db.audits.toArray();
}

/**
 * Supprimer un audit
 */
export async function deleteAudit(id: string): Promise<void> {
  await db.audits.delete(id);
}

/**
 * Ajouter une action à la queue de synchronisation
 */
export async function addToSyncQueue(auditId: string, action: string, data: any): Promise<void> {
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    auditId,
    action,
    data,
    timestamp: Date.now(),
  });
}

/**
 * Récupérer la queue de synchronisation
 */
export async function getSyncQueue(): Promise<any[]> {
  return await db.syncQueue.toArray();
}

/**
 * Supprimer une action de la queue après synchronisation
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  await db.syncQueue.delete(id);
}

