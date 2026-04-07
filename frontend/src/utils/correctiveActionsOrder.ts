import type { Audit, CorrectiveActionData } from '../types';

/**
 * Tri des lignes d'actions correctives selon l'ordre du questionnaire :
 * cat-0 (Locaux) → cat-1 → … → cat-5 (Personnel), puis lignes manuelles / orphelines.
 */
const ROW_ID_OBS = /^cat-(\d+)-item-(\d+)-(\d+)-obs-(.+)$/;

function categoryIndexFromEcart(row: CorrectiveActionData, audit: Audit): number {
  const head = (row.ecart.split('\n')[0] || '').trim();
  if (!head) return 999;
  for (let i = 0; i < audit.categories.length; i++) {
    const label = audit.categories[i].name.replace(/^\d+\.\s*/, '').trim();
    if (head.startsWith(label)) return i;
  }
  return 999;
}

function sortKey(row: CorrectiveActionData, audit: Audit): string {
  const m = row.id.match(ROW_ID_OBS);
  if (m) {
    const cat = m[1].padStart(2, '0');
    const p1 = m[2].padStart(3, '0');
    const p2 = m[3].padStart(3, '0');
    return `0-${cat}-${p1}-${p2}-${m[4]}`;
  }
  const orphanCat = categoryIndexFromEcart(row, audit);
  const oc = String(orphanCat).padStart(3, '0');
  return `1-${oc}-${row.id}`;
}

export function sortCorrectiveActionRows(rows: CorrectiveActionData[], audit: Audit): CorrectiveActionData[] {
  if (rows.length <= 1) return rows;
  return [...rows].sort((a, b) => {
    const ka = sortKey(a, audit);
    const kb = sortKey(b, audit);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return a.id.localeCompare(b.id);
  });
}
