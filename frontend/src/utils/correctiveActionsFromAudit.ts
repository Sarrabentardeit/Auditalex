import type { Audit, CorrectiveActionData, NonConformitySeverity } from '../types';
import { sortCorrectiveActionRows } from './correctiveActionsOrder';

/** Aligné sur ActionsCorrectives.tsx — une seule source de vérité pour l’app et le PDF */
function getSeverityFromNote(note: number | undefined): NonConformitySeverity | undefined {
  if (note === 1 || note === 1.0) return 'vert';
  if (note === 0) return 'rouge';
  if (note === 0.3) return 'orange';
  if (note === 0.7) return 'bleu';
  return undefined;
}

function getDefaultDelai(severity: NonConformitySeverity): string {
  if (severity === 'vert') return '';
  if (severity === 'rouge') return 'Immédiatement';
  if (severity === 'orange') return '72h00';
  return 'Prochain Audit';
}

/**
 * Même tableau que sur la page « Actions correctives » : observations + fusion des lignes enregistrées + tri.
 */
export function buildCorrectiveActionsTableData(audit: Audit): CorrectiveActionData[] {
  const rows: CorrectiveActionData[] = [];
  const existingRowsMap = new Map<string, CorrectiveActionData>();

  if (audit.correctiveActions && audit.correctiveActions.length > 0) {
    audit.correctiveActions.forEach((row) => {
      existingRowsMap.set(row.id, row);
    });
  }

  audit.categories.forEach((category) => {
    category.items.forEach((item) => {
      if (item.observations && item.observations.length > 0) {
        item.observations.forEach((obs) => {
          if (obs && obs.text && obs.text.trim()) {
            const actionText = (obs.correctiveAction || '').trim();
            if (actionText.toLowerCase() === 'conforme') {
              return;
            }

            const rowId = `${category.id}-${item.id}-${obs.id}`;

            if (existingRowsMap.has(rowId)) {
              const existing = existingRowsMap.get(rowId)!;
              const severity = existing.severity ?? getSeverityFromNote(item.note);
              rows.push({ ...existing, severity });
            } else {
              const categoryName = category.name.replace(/^\d+\.\s*/, '');
              const ecartText = `${categoryName} - ${item.name}\n${obs.text}`;
              const severity = getSeverityFromNote(item.note);
              const defaultDelai = severity ? getDefaultDelai(severity) : '';
              rows.push({
                id: rowId,
                ecart: ecartText,
                actionCorrective: obs.correctiveAction || '',
                delai: defaultDelai,
                quand: '',
                visa: '',
                verification: '',
                severity,
              });
            }
          }
        });
      }
    });
  });

  existingRowsMap.forEach((row) => {
    if (!rows.find((r) => r.id === row.id)) {
      rows.push(row);
    }
  });

  return sortCorrectiveActionRows(rows, audit);
}
