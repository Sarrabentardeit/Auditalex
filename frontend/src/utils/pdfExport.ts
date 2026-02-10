import jsPDF from 'jspdf';
import type { Audit, AuditResults, RadarData, CorrectiveActionData, AuditItem } from '../types';
import { convertNonConformitiesToNote } from './calculations';

/**
 * Mapping des catégories vers les 6 catégories du radar
 */
const RADAR_CATEGORIES = [
  'LOCAUX ET EQUIPEMENTS',
  'MAITRISE DES TEMPERATURES',
  'MAITRISE DES MATIERES',
  'TRACABILITE ET GESTION DES NON-CONFORMITES',
  'GESTION DES DECHETS ET DES SOUS-PRODUITS ANIMAUX',
  'GESTION DU PERSONNEL'
];

/**
 * Normaliser le nom de catégorie pour le mapping
 */
function normalizeCategoryName(name: string): string {
  const normalized = name
    .replace(/^\d+\.\s*/, '')
    .trim()
    .toUpperCase()
    .replace(/É/g, 'E')
    .replace(/È/g, 'E')
    .replace(/Ê/g, 'E')
    .replace(/À/g, 'A')
    .replace(/\s+/g, ' ');
  return normalized;
}

/**
 * Mapping direct des noms de catégories normalisés vers les indices du radar
 */
function getRadarIndexForCategory(normalizedName: string): number {
  if (normalizedName.includes('LOCAUX ET EQUIPEMENTS')) return 0;
  if (normalizedName.includes('MAITRISE DES TEMPERATURES')) return 1;
  if (normalizedName.includes('MAITRISE DES MATIERES')) return 2;
  if (normalizedName.includes('TRACABILITE ET GESTION DES NON-CONFORMITES')) return 3;
  if (normalizedName.includes('GESTION DES DECHETS ET DES SOUS-PRODUITS ANIMAUX')) return 4;
  if (normalizedName.includes('GESTION DU PERSONNEL')) return 5;
  return -1;
}

/**
 * Mapper les catégories de l'audit vers les catégories du radar
 */
function mapCategoriesToRadar(audit: Audit, results: AuditResults): RadarData[] {
  const radarData: RadarData[] = new Array(6).fill(null).map((_, index) => ({
    category: RADAR_CATEGORIES[index],
    score: 0,
  }));

  audit.categories.forEach((auditCategory) => {
    const normalized = normalizeCategoryName(auditCategory.name);
    const categoryScore = results.categoryScores[auditCategory.id];
    const radarIndex = getRadarIndexForCategory(normalized);

    if (radarIndex >= 0) {
      if (categoryScore !== null && categoryScore !== undefined && typeof categoryScore === 'number') {
        radarData[radarIndex].score = categoryScore;
      }
    }
  });

  return radarData;
}

/**
 * Formater un nombre avec virgule pour décimales et espace pour milliers (format français)
 */
function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Dessiner une pastille de couleur selon la note
 * < 80% = Rouge avec croix
 * 80% - 90% = Orange avec point d'exclamation
 * >= 90% = Vert avec encoche "validé"
 */
function drawScoreBadge(pdf: jsPDF, x: number, y: number, score: number, size: number = 5): void {
  const radius = size;

  if (score < 80) {
    // Rouge avec croix
    pdf.setFillColor(220, 53, 69);
    pdf.circle(x, y, radius, 'F');
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(1.2);
    const offset = radius * 0.5;
    pdf.line(x - offset, y - offset, x + offset, y + offset);
    pdf.line(x + offset, y - offset, x - offset, y + offset);
  } else if (score >= 80 && score < 90) {
    // Orange avec point d'exclamation
    pdf.setFillColor(255, 152, 0);
    pdf.circle(x, y, radius, 'F');
    pdf.setFontSize(Math.max(8, size * 1.6));
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('!', x, y + size * 0.4, { align: 'center' });
  } else {
    // Vert avec encoche "validé"
    pdf.setFillColor(76, 175, 80);
    pdf.circle(x, y, radius, 'F');
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(1.5);
    const s = radius * 0.5;
    pdf.line(x - s, y, x - s * 0.2, y + s * 0.8);
    pdf.line(x - s * 0.2, y + s * 0.8, x + s, y - s * 0.6);
  }

  // Réinitialiser
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
}

/**
 * Calculer la contribution en % d'un item au score de sa catégorie
 */
function calculateItemContribution(item: AuditItem, categoryItems: AuditItem[]): number {
  if (item.note === undefined || item.note === null) return 0;

  const totalPonderation = categoryItems
    .filter(i => i.isAudited && i.numberOfNonConformities !== null)
    .reduce((sum, i) => sum + i.ponderation, 0);

  if (totalPonderation === 0) return 0;

  return Math.round((item.note * item.ponderation / totalPonderation) * 100);
}

/**
 * Formater la note brute pour affichage (1, 0,7, 0,3, 0)
 */
function formatRawNote(note: number | null | undefined): string {
  if (note === null || note === undefined) return '';
  if (note === 1.0) return '1';
  if (note === 0.7) return '0,7';
  if (note === 0.3) return '0,3';
  if (note === 0.0) return '0';
  return note.toString().replace('.', ',');
}

/**
 * Dessiner l'en-tête commun à toutes les pages
 */
function drawPageHeader(pdf: jsPDF, title: string, headerMargin: number = 15): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = headerMargin;
  let yPosition = margin;

  // Logo Alexann à gauche
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(25, 118, 210);
  pdf.text('ALEXANN', margin, yPosition);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Hygiène et qualité agroalimentaire', margin, yPosition + 5);

  // Titre au centre
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(title, pageWidth / 2, yPosition + 3, { align: 'center' });

  // Contact à droite
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const contactLines = ['Anne SUQUET', 'anne@alexann.fr', '06 46 45 67 33'];
  contactLines.forEach((line, idx) => {
    pdf.text(line, pageWidth - margin, yPosition + (idx * 4), { align: 'right' });
  });

  return yPosition + 18;
}

/**
 * Charger une image et retourner ses dimensions
 */
function loadImage(photoData: string): Promise<{ width: number; height: number; data: string; format: 'JPEG' | 'PNG' } | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('Timeout chargement photo');
      resolve(null);
    }, 15000);

    try {
      const img = new Image();

      const processImage = () => {
        clearTimeout(timeout);
        try {
          if (!img.width || !img.height) {
            resolve(null);
            return;
          }

          let imageFormat: 'JPEG' | 'PNG' = 'JPEG';
          if (photoData.startsWith('data:image/png')) {
            imageFormat = 'PNG';
          }

          // Extraire le base64 pur
          let base64Data = photoData;
          if (photoData.startsWith('data:image/')) {
            const base64Index = photoData.indexOf(',');
            if (base64Index !== -1) {
              base64Data = photoData.substring(base64Index + 1);
            }
          }

          resolve({
            width: img.width,
            height: img.height,
            data: base64Data,
            format: imageFormat,
          });
        } catch (error) {
          console.error('Erreur traitement image:', error);
          resolve(null);
        }
      };

      img.onload = processImage;
      img.onerror = () => {
        clearTimeout(timeout);
        console.error('Erreur chargement image');
        resolve(null);
      };

      img.crossOrigin = 'anonymous';
      img.src = photoData;

      if (img.complete && img.naturalWidth > 0) {
        processImage();
      }
    } catch (error) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

// ========================================================================
// PAGE 1 : CARTOGRAPHIE RADAR
// ========================================================================
function generateRadarChartPage(pdf: jsPDF, audit: Audit, results: AuditResults): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  let yPosition = drawPageHeader(pdf, 'CARTOGRAPHIE RADAR\nLES BONNES PRATIQUES D\'HYGIENE');

  yPosition += 5;

  // Sous-titre
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CARTOGRAPHIE RADAR DES "BONNES PRATIQUES HYGIENIQUES"', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Informations de l'audit
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Adresse :`, margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${audit.adresse}`, margin + 22, yPosition);
  yPosition += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Date de l'exécution :`, margin, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${new Date(audit.dateExecution).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, margin + 42, yPosition);
  yPosition += 15;

  // Préparer les données du radar
  const radarData = mapCategoriesToRadar(audit, results);

  // Dimensions du graphique radar
  const chartCenterX = pageWidth / 2;
  const chartCenterY = yPosition + 55;
  const chartRadius = 45;
  const numCategories = 6;
  const angleStep = (2 * Math.PI) / numCategories;

  // Dessiner les hexagones concentriques (niveaux 25%, 50%, 75%, 100%)
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  const levels = [25, 50, 75, 100];
  for (const level of levels) {
    const radius = (chartRadius * level) / 100;
    const points: number[][] = [];
    for (let i = 0; i < numCategories; i++) {
      const angle = (i * angleStep) - (Math.PI / 2);
      points.push([
        chartCenterX + radius * Math.cos(angle),
        chartCenterY + radius * Math.sin(angle)
      ]);
    }
    points.push(points[0]);
    for (let i = 0; i < points.length - 1; i++) {
      pdf.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    }
  }

  // Labels de pourcentage sur l'axe vertical (en haut)
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  levels.forEach((level) => {
    const radius = (chartRadius * level) / 100;
    const labelX = chartCenterX + 2;
    const labelY = chartCenterY - radius - 1;
    pdf.text(`${level}%`, labelX, labelY);
  });
  pdf.text('0%', chartCenterX + 2, chartCenterY + 3);

  // Dessiner les axes
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.3);
  for (let i = 0; i < numCategories; i++) {
    const angle = (i * angleStep) - (Math.PI / 2);
    const x = chartCenterX + chartRadius * Math.cos(angle);
    const y = chartCenterY + chartRadius * Math.sin(angle);
    pdf.line(chartCenterX, chartCenterY, x, y);
  }

  // Dessiner le polygone des données (rempli avec transparence)
  const dataPoints: number[][] = [];
  radarData.forEach((data, index) => {
    const angle = (index * angleStep) - (Math.PI / 2);
    const radius = (chartRadius * data.score) / 100;
    dataPoints.push([
      chartCenterX + radius * Math.cos(angle),
      chartCenterY + radius * Math.sin(angle)
    ]);
  });

  if (dataPoints.length > 2) {
    // Remplissage semi-transparent bleu
    pdf.setFillColor(25, 118, 210);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
    
    // Fallback: juste les lignes épaisses
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    pdf.setDrawColor(25, 118, 210);
    pdf.setLineWidth(2);
    for (let i = 0; i < dataPoints.length; i++) {
      const nextIndex = (i + 1) % dataPoints.length;
      pdf.line(dataPoints[i][0], dataPoints[i][1], dataPoints[nextIndex][0], dataPoints[nextIndex][1]);
    }

    // Points de données
    pdf.setFillColor(25, 118, 210);
    dataPoints.forEach((point) => {
      pdf.circle(point[0], point[1], 1.8, 'F');
    });
  }

  // Labels des catégories autour du graphique
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);

  radarData.forEach((data, index) => {
    const angle = (index * angleStep) - (Math.PI / 2);
    const labelRadius = chartRadius + 15;
    const labelX = chartCenterX + labelRadius * Math.cos(angle);
    const labelY = chartCenterY + labelRadius * Math.sin(angle);

    let align: 'left' | 'center' | 'right' = 'center';
    if (Math.abs(Math.cos(angle)) > 0.3) {
      align = Math.cos(angle) > 0 ? 'left' : 'right';
    }

    // Découper les labels longs sur plusieurs lignes
    const maxLabelWidth = 35;
    const lines = pdf.splitTextToSize(data.category, maxLabelWidth);
    lines.forEach((line: string, lineIdx: number) => {
      pdf.text(line, labelX, labelY + (lineIdx * 3.5), { align });
    });
  });

  // ---- Résumé en bas de page ----
  yPosition = pageHeight - 45;

  // Nombre de KO et amendes (gauche)
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(211, 47, 47);
  pdf.text('Nombre de', margin, yPosition);
  pdf.setFont('helvetica', 'bold');
  // KO barré
  const koX = margin + pdf.getTextWidth('Nombre de ');
  pdf.text('KO', koX, yPosition);
  // Barre sur KO
  const koWidth = pdf.getTextWidth('KO');
  pdf.setDrawColor(211, 47, 47);
  pdf.setLineWidth(0.8);
  pdf.line(koX, yPosition - 1, koX + koWidth, yPosition - 1);

  pdf.text(` =     ${results.numberOfKO}`, koX + koWidth, yPosition);
  yPosition += 7;
  pdf.text(`Amendes potentielles =     ${formatNumber(results.potentialFines)} €`, margin, yPosition);

  // Score total (droite)
  const totalScoreText = results.totalScore !== null ? `${formatNumber(results.totalScore, 2)} %` : '— %';

  // Ligne "Maîtrise de l'hygiène à :"
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const labelText = 'Maîtrise de l\'hygiène à :';
  const labelWidth = pdf.getTextWidth(labelText);
  const scoreTextWidth = pdf.getTextWidth(totalScoreText);
  const badgeSize = 7;
  const totalWidth = labelWidth + badgeSize * 2 + 8 + scoreTextWidth;
  const startX = pageWidth - margin - totalWidth;

  pdf.text(labelText, startX, yPosition);

  // Pastille de couleur
  if (results.totalScore !== null) {
    drawScoreBadge(pdf, startX + labelWidth + badgeSize + 4, yPosition - 3, results.totalScore, badgeSize);
  }

  // Score
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(totalScoreText, pageWidth - margin, yPosition, { align: 'right' });
}

// ========================================================================
// PAGE 2 : ACTIONS CORRECTIVES ATTENDUES
// ========================================================================
function generateCorrectiveActionsPage(pdf: jsPDF, audit: Audit): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  let yPosition = drawPageHeader(pdf, 'CARTOGRAPHIE RADAR\nLES BONNES PRATIQUES D\'HYGIENE');

  yPosition += 10;

  // Titre du tableau
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('ACTIONS CORRECTIVES ATTENDUES', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Données des actions correctives
  let correctiveActionsData: CorrectiveActionData[] = [];
  if (audit.correctiveActions && audit.correctiveActions.length > 0) {
    correctiveActionsData = audit.correctiveActions.filter(ca => ca.ecart && ca.ecart.trim());
  }

  // Largeurs des colonnes
  const availableWidth = pageWidth - 2 * margin;
  const colWidths = {
    ecart: availableWidth * 0.28,
    actionCorrective: availableWidth * 0.27,
    delai: availableWidth * 0.08,
    quand: availableWidth * 0.10,
    visa: availableWidth * 0.10,
    verification: availableWidth * 0.17,
  };

  const headerHeight = 10;
  const subHeaderHeight = 6;

  // En-tête du tableau
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);

  let currentX = margin;

  // Colonne "Ecarts constatés" (rowspan 2)
  pdf.rect(currentX, yPosition, colWidths.ecart, headerHeight + subHeaderHeight);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Ecarts constatés', currentX + colWidths.ecart / 2, yPosition + (headerHeight + subHeaderHeight) / 2 + 1, { align: 'center' });
  currentX += colWidths.ecart;

  // Colonne "Actions correctives définies par le responsable" (rowspan 2)
  pdf.rect(currentX, yPosition, colWidths.actionCorrective, headerHeight + subHeaderHeight);
  const actionHeaderLines = pdf.splitTextToSize('Actions correctives définies par le responsable', colWidths.actionCorrective - 4);
  actionHeaderLines.forEach((line: string, idx: number) => {
    pdf.text(line, currentX + colWidths.actionCorrective / 2, yPosition + 4 + (idx * 3.5), { align: 'center' });
  });
  currentX += colWidths.actionCorrective;

  // Colonne "Délai" (rowspan 2)
  pdf.rect(currentX, yPosition, colWidths.delai, headerHeight + subHeaderHeight);
  pdf.text('Délai', currentX + colWidths.delai / 2, yPosition + (headerHeight + subHeaderHeight) / 2 + 1, { align: 'center' });
  currentX += colWidths.delai;

  // Colonne "Réalisation" (colspan 2)
  pdf.rect(currentX, yPosition, colWidths.quand + colWidths.visa, headerHeight);
  pdf.text('Réalisation', currentX + (colWidths.quand + colWidths.visa) / 2, yPosition + headerHeight / 2 + 2, { align: 'center' });

  // Sous-colonnes "Quand" et "Visa"
  pdf.setFontSize(7);
  pdf.rect(currentX, yPosition + headerHeight, colWidths.quand, subHeaderHeight);
  pdf.text('Quand', currentX + colWidths.quand / 2, yPosition + headerHeight + subHeaderHeight / 2 + 1, { align: 'center' });
  currentX += colWidths.quand;

  pdf.rect(currentX, yPosition + headerHeight, colWidths.visa, subHeaderHeight);
  pdf.text('Visa', currentX + colWidths.visa / 2, yPosition + headerHeight + subHeaderHeight / 2 + 1, { align: 'center' });
  currentX += colWidths.visa;

  // Colonne "Vérification" (rowspan 2)
  pdf.setFontSize(8);
  pdf.rect(currentX, yPosition, colWidths.verification, headerHeight + subHeaderHeight);
  pdf.text('Vérification', currentX + colWidths.verification / 2, yPosition + (headerHeight + subHeaderHeight) / 2 + 1, { align: 'center' });

  yPosition += headerHeight + subHeaderHeight;

  // Lignes de données + lignes vides
  const minEmptyRows = 8;
  const rowHeight = 12;
  const totalRowsToShow = Math.max(correctiveActionsData.length + 2, minEmptyRows);

  for (let i = 0; i < totalRowsToShow; i++) {
    // Nouvelle page si nécessaire
    if (yPosition + rowHeight > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }

    const rowData = i < correctiveActionsData.length ? correctiveActionsData[i] : null;
    currentX = margin;

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    // Ecarts
    pdf.rect(currentX, yPosition, colWidths.ecart, rowHeight);
    if (rowData?.ecart?.trim()) {
      const lines = pdf.splitTextToSize(rowData.ecart.trim(), colWidths.ecart - 4);
      lines.forEach((line: string, idx: number) => {
        if (idx < 3) pdf.text(line, currentX + 2, yPosition + 3.5 + (idx * 3));
      });
    }
    currentX += colWidths.ecart;

    // Actions correctives
    pdf.rect(currentX, yPosition, colWidths.actionCorrective, rowHeight);
    if (rowData?.actionCorrective?.trim()) {
      const lines = pdf.splitTextToSize(rowData.actionCorrective.trim(), colWidths.actionCorrective - 4);
      lines.forEach((line: string, idx: number) => {
        if (idx < 3) pdf.text(line, currentX + 2, yPosition + 3.5 + (idx * 3));
      });
    }
    currentX += colWidths.actionCorrective;

    // Délai
    pdf.rect(currentX, yPosition, colWidths.delai, rowHeight);
    if (rowData?.delai?.trim()) {
      pdf.text(rowData.delai.trim(), currentX + colWidths.delai / 2, yPosition + rowHeight / 2 + 1, { align: 'center' });
    }
    currentX += colWidths.delai;

    // Quand
    pdf.rect(currentX, yPosition, colWidths.quand, rowHeight);
    if (rowData?.quand?.trim()) {
      pdf.text(rowData.quand.trim(), currentX + 2, yPosition + rowHeight / 2 + 1);
    }
    currentX += colWidths.quand;

    // Visa
    pdf.rect(currentX, yPosition, colWidths.visa, rowHeight);
    if (rowData?.visa?.trim()) {
      pdf.text(rowData.visa.trim(), currentX + 2, yPosition + rowHeight / 2 + 1);
    }
    currentX += colWidths.visa;

    // Vérification
    pdf.rect(currentX, yPosition, colWidths.verification, rowHeight);
    if (rowData?.verification?.trim()) {
      pdf.text(rowData.verification.trim(), currentX + 2, yPosition + rowHeight / 2 + 1);
    }

    yPosition += rowHeight;
  }
}

// ========================================================================
// PAGES D'AUDIT : Tableau détaillé par catégorie
// ========================================================================

/**
 * Générer les pages d'audit détaillées avec le format de référence :
 * [Nom item] | KO | * | Note | Commentaires | Actions correctives | Photo(s)
 */
async function generateAuditDetailPages(pdf: jsPDF, audit: Audit, results: AuditResults): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10; // Marges réduites pour maximiser l'espace tableau
  const availableWidth = pageWidth - 2 * margin;

  // Colonnes selon le format de référence PDF — Photo(s) prend ~40% de la largeur
  const colWidths = {
    itemName: availableWidth * 0.14,  // Nom de l'item (compact)
    ko: 5,                            // Colonne KO (barre rouge fine)
    star: 8,                          // * (note brute : 1, 0.7, 0.3, 0)
    note: 12,                         // Note (contribution %)
    comments: availableWidth * 0.15,  // Commentaires
    actions: availableWidth * 0.13,   // Actions correctives
    photos: 0,                        // Photo(s) - calculé ci-dessous (~40%)
  };
  // La colonne photos prend tout le reste de la largeur (~40%)
  colWidths.photos = availableWidth - colWidths.itemName - colWidths.ko - colWidths.star - colWidths.note - colWidths.comments - colWidths.actions;

  let yPosition = margin;

  // Fonction pour dessiner l'en-tête de page
  const drawAuditPageHeader = (): number => {
    let y = drawPageHeader(pdf, 'AUDIT\nLES BONNES PRATIQUES D\'HYGIENE', margin);

    // Ligne info : Date + Adresse
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Date de l'exécution :`, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${new Date(audit.dateExecution).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, margin + 35, y);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`Adresse :`, margin + 70, y);
    pdf.setFont('helvetica', 'normal');
    const adresseMaxWidth = pageWidth - margin - 70 - 20;
    const adresseLines = pdf.splitTextToSize(audit.adresse, adresseMaxWidth);
    adresseLines.forEach((line: string, idx: number) => {
      pdf.text(line, margin + 85, y + (idx * 3.5));
    });

    y += Math.max(5, adresseLines.length * 3.5 + 2);
    return y;
  };

  // Fonction pour dessiner l'en-tête de colonnes du tableau
  const drawTableColumnHeaders = (y: number): number => {
    const headerHeight = 8;
    let x = margin;

    pdf.setFillColor(220, 220, 220);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);

    // Vide (espace pour le nom de la catégorie)
    pdf.rect(x, y, colWidths.itemName, headerHeight);
    x += colWidths.itemName;

    // KO
    pdf.rect(x, y, colWidths.ko, headerHeight);
    pdf.setTextColor(220, 53, 69);
    pdf.text('KO', x + colWidths.ko / 2, y + headerHeight / 2 + 1.5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    x += colWidths.ko;

    // *
    pdf.rect(x, y, colWidths.star, headerHeight);
    pdf.text('*', x + colWidths.star / 2, y + headerHeight / 2 + 1.5, { align: 'center' });
    x += colWidths.star;

    // Note
    pdf.rect(x, y, colWidths.note, headerHeight);
    pdf.text('Note', x + colWidths.note / 2, y + headerHeight / 2 + 1.5, { align: 'center' });
    x += colWidths.note;

    // Commentaires
    pdf.rect(x, y, colWidths.comments, headerHeight);
    pdf.text('Commentaires', x + colWidths.comments / 2, y + headerHeight / 2 + 1.5, { align: 'center' });
    x += colWidths.comments;

    // Actions correctives
    pdf.rect(x, y, colWidths.actions, headerHeight);
    pdf.text('Actions correctives', x + colWidths.actions / 2, y + headerHeight / 2 + 1.5, { align: 'center' });
    x += colWidths.actions;

    // Photo(s)
    pdf.rect(x, y, colWidths.photos, headerHeight);
    pdf.text('Photo(s)', x + colWidths.photos / 2, y + headerHeight / 2 + 1.5, { align: 'center' });

    return y + headerHeight;
  };


  // Parcourir les catégories - CHAQUE CATÉGORIE SUR SA PROPRE PAGE
  for (let catIndex = 0; catIndex < audit.categories.length; catIndex++) {
    const category = audit.categories[catIndex];
    const auditedItems = category.items.filter(item => item.isAudited);
    if (auditedItems.length === 0) continue;

    const categoryScore = results.categoryScores[category.id];
    const categoryScoreText = categoryScore !== null && categoryScore !== undefined
      ? `${formatNumber(categoryScore, 0)}%`
      : '';
    const categoryTitle = category.name.replace(/^\d+\.\s*/, '');

    // ---- NOUVELLE PAGE POUR CHAQUE CATÉGORIE ----
    pdf.addPage();
    yPosition = drawAuditPageHeader();

    // En-tête colonnes du tableau
    yPosition = drawTableColumnHeaders(yPosition);

    // Bandeau catégorie (professionnel avec fond gris clair)
    const categoryHeaderHeight = 10;
    pdf.setFillColor(240, 240, 240);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, availableWidth, categoryHeaderHeight, 'FD');

    // Titre de la catégorie (gauche, en bleu) - bien espacé
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(25, 118, 210);
    const categoryTitleText = `${catIndex + 1}. ${categoryTitle.toUpperCase()}`;
    const titleY = yPosition + categoryHeaderHeight / 2 + 2;
    pdf.text(categoryTitleText, margin + 3, titleY);

    // Score de la catégorie (droite, aligné avec la colonne Note) - bien séparé du titre
    if (categoryScoreText) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      // Positionner le score à droite, aligné avec la colonne Note, avec espace suffisant
      const scoreX = margin + colWidths.itemName + colWidths.ko + colWidths.star + colWidths.note / 2;
      // Vérifier qu'il n'y a pas de chevauchement avec le titre
      const titleWidth = pdf.getTextWidth(categoryTitleText);
      const minSpace = 10; // Espace minimum entre titre et score
      if (scoreX - (margin + 3 + titleWidth) < minSpace) {
        // Si pas assez d'espace, mettre le score sur une nouvelle ligne ou à droite
        pdf.text(categoryScoreText, pageWidth - margin - 5, titleY, { align: 'right' });
      } else {
        pdf.text(categoryScoreText, scoreX, titleY, { align: 'center' });
      }
    }

    yPosition += categoryHeaderHeight + 2;

    // ---- Lignes des items ----
    for (const item of auditedItems) {
      const rawNote = item.numberOfNonConformities !== null
        ? convertNonConformitiesToNote(item.classification, item.numberOfNonConformities)
        : null;
      const contribution = rawNote !== null && rawNote !== undefined
        ? calculateItemContribution({ ...item, note: rawNote }, category.items)
        : 0;

      // Déterminer si c'est un KO (pas de note ou note très basse)
      const isKO = rawNote === null || rawNote === undefined || (rawNote !== 1 && rawNote !== 0.7);

      // Préparer les lignes de texte pour commentaires et actions
      const commentTexts: string[] = [];
      const actionTexts: string[] = [];

      if (item.observations && item.observations.length > 0) {
        item.observations.forEach((obs) => {
          if (obs?.text?.trim()) {
            commentTexts.push(obs.text.trim());
          }
          if (obs?.correctiveAction?.trim()) {
            actionTexts.push(obs.correctiveAction.trim());
          } else if (obs?.text?.trim()) {
            actionTexts.push(''); // Garder l'alignement
          }
        });
      }

      // Calculer le nombre de lignes pour les commentaires
      let totalCommentLines = 0;
      const commentLineArrays: string[][] = [];
      commentTexts.forEach(text => {
        const lines = pdf.splitTextToSize(text, colWidths.comments - 4);
        commentLineArrays.push(lines);
        totalCommentLines += lines.length + 0.5; // espacement entre observations
      });

      let totalActionLines = 0;
      const actionLineArrays: string[][] = [];
      actionTexts.forEach(text => {
        if (text) {
          const lines = pdf.splitTextToSize(text, colWidths.actions - 4);
          actionLineArrays.push(lines);
          totalActionLines += lines.length + 0.5;
        } else {
          actionLineArrays.push([]);
          totalActionLines += 1;
        }
      });

      // Calculer la hauteur pour les photos
      const numPhotos = item.photos ? item.photos.length : 0;
      // Photos : grande taille, jusqu'à 2 par ligne côte à côte
      const photoGap = 3;
      const maxPhotoWidth = (colWidths.photos - photoGap * 3) / 2; // 2 photos par ligne avec marges
      const maxPhotoSize = Math.min(45, maxPhotoWidth); // Taille max 45mm
      const photosPerRow = 2;
      const photoRows = numPhotos > 0 ? Math.ceil(Math.min(numPhotos, 6) / photosPerRow) : 0;
      const photoContentHeight = photoRows > 0 ? photoRows * (maxPhotoSize + photoGap) + 6 : 0;

      // Calculer la hauteur du nom de l'item
      pdf.setFontSize(7);
      const itemNameLines = pdf.splitTextToSize(item.name || '', colWidths.itemName - 6);
      const itemNameHeight = itemNameLines.length * 3.5 + 6;

      // Hauteur de la ligne = max de tous les contenus
      const textHeight = Math.max(totalCommentLines, totalActionLines) * 3.5 + 6;
      let rowHeight = Math.max(
        20, // Hauteur minimale augmentée
        itemNameHeight,
        textHeight,
        photoContentHeight
      );

      // Vérifier saut de page (si la ligne ne rentre pas, on continue sur la même page pour cette catégorie)
      if (yPosition + rowHeight > pageHeight - 30) {
        // Si on dépasse, on réduit la hauteur de la ligne ou on tronque les photos
        const availableHeight = pageHeight - yPosition - 30;
        if (availableHeight < 15) {
          // Pas assez de place, on passe à la ligne suivante en réduisant
          rowHeight = Math.max(15, availableHeight);
        }
      }

      let x = margin;

      // ---- Colonne Nom de l'item ----
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(x, yPosition, colWidths.itemName, rowHeight);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      const nameY = yPosition + rowHeight / 2 - (itemNameLines.length * 3.5) / 2 + 3;
      itemNameLines.forEach((line: string, idx: number) => {
        pdf.text(line, x + 3, nameY + (idx * 3.5));
      });
      x += colWidths.itemName;

      // ---- Colonne KO (barre rouge) ----
      pdf.rect(x, yPosition, colWidths.ko, rowHeight);
      
      // Barre rouge qui remplit TOUTE la colonne si KO (comme dans les images de référence)
      if (isKO || (rawNote !== null && rawNote !== undefined && rawNote !== 1 && rawNote !== 0.7)) {
        // Remplir toute la colonne en rouge
        pdf.setFillColor(220, 53, 69);
        pdf.rect(x, yPosition, colWidths.ko, rowHeight, 'F');
        
        // Afficher "1" en blanc si c'est un vrai KO (item.ko > 0)
        if (item.ko > 0) {
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.text('1', x + colWidths.ko / 2, yPosition + rowHeight / 2 + 1, { align: 'center' });
        }
      } else {
        // Si pas de KO, juste la bordure
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(x, yPosition, colWidths.ko, rowHeight);
      }
      
      // Toujours dessiner la bordure
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(x, yPosition, colWidths.ko, rowHeight);
      x += colWidths.ko;

      // ---- Colonne * (note brute) ----
      pdf.rect(x, yPosition, colWidths.star, rowHeight);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      if (rawNote !== null && rawNote !== undefined) {
        pdf.text(formatRawNote(rawNote), x + colWidths.star / 2, yPosition + rowHeight / 2 + 1, { align: 'center' });
      }
      x += colWidths.star;

      // ---- Colonne Note (contribution %) ----
      pdf.rect(x, yPosition, colWidths.note, rowHeight);
      if (contribution > 0) {
        pdf.text(`${contribution}%`, x + colWidths.note / 2, yPosition + rowHeight / 2 + 1, { align: 'center' });
      }
      x += colWidths.note;

      // ---- Colonne Commentaires ----
      pdf.rect(x, yPosition, colWidths.comments, rowHeight);
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      let commentY = yPosition + 4;
      if (commentLineArrays.length > 0) {
        commentLineArrays.forEach((lines, obsIdx) => {
          // Vérifier si c'est un KO/alerte (texte en rouge dans le PDF de référence)
          const originalText = commentTexts[obsIdx] || '';
          const isAlert = originalText.toLowerCase().includes('dlc dépassée') ||
                          originalText.toLowerCase().includes('amendes') ||
                          originalText.toLowerCase().includes('salissures anciennes');

          if (isAlert && rawNote !== null && rawNote !== undefined && (rawNote === 0 || rawNote === 0.3)) {
            pdf.setFillColor(255, 200, 200);
            const alertHeight = lines.length * 3.5 + 1;
            pdf.rect(x + 1, commentY - 2, colWidths.comments - 2, alertHeight, 'F');
            pdf.setTextColor(180, 0, 0);
          } else {
            pdf.setTextColor(0, 0, 0);
          }

          lines.forEach((line: string, lineIdx: number) => {
            pdf.text(line, x + 2, commentY + (lineIdx * 3.5));
          });
          commentY += lines.length * 3.5 + 2;
          pdf.setTextColor(0, 0, 0);
        });
      } else {
        pdf.setTextColor(128, 128, 128);
        pdf.text('-', x + colWidths.comments / 2, yPosition + rowHeight / 2 + 1, { align: 'center' });
      }
      x += colWidths.comments;

      // ---- Colonne Actions correctives ----
      pdf.rect(x, yPosition, colWidths.actions, rowHeight);
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      let actionY = yPosition + 4;
      let hasActions = false;
      actionLineArrays.forEach((lines) => {
        if (lines.length > 0) {
          hasActions = true;
          lines.forEach((line: string, lineIdx: number) => {
            pdf.text(line, x + 2, actionY + (lineIdx * 3.5));
          });
          actionY += lines.length * 3.5 + 2;
        } else {
          actionY += 3.5 + 2;
        }
      });
      if (!hasActions && commentLineArrays.length === 0) {
        pdf.setTextColor(128, 128, 128);
        pdf.text('-', x + colWidths.actions / 2, yPosition + rowHeight / 2 + 1, { align: 'center' });
      }
      x += colWidths.actions;

      // ---- Colonne Photos ----
      pdf.rect(x, yPosition, colWidths.photos, rowHeight);
      if (numPhotos > 0) {
        let photoX = x + photoGap;
        let photoY = yPosition + photoGap;
        let photosPlaced = 0;
        const maxPhotosToShow = Math.min(6, numPhotos);

        for (let i = 0; i < maxPhotosToShow; i++) {
          try {
            const imgInfo = await loadImage(item.photos[i]);
            if (imgInfo) {
              // Calculer les dimensions en préservant le ratio
              const aspectRatio = imgInfo.width / imgInfo.height;
              let finalWidth: number;
              let finalHeight: number;

              if (aspectRatio > 1) {
                // Image horizontale
                finalWidth = maxPhotoSize;
                finalHeight = maxPhotoSize / aspectRatio;
              } else {
                // Image verticale ou carrée
                finalHeight = maxPhotoSize;
                finalWidth = maxPhotoSize * aspectRatio;
              }

              // Vérifier si on doit passer à la ligne suivante
              if (photosPlaced > 0 && photosPlaced % photosPerRow === 0) {
                photoX = x + photoGap;
                photoY += maxPhotoSize + photoGap;
              }

              // Ne pas dépasser la cellule
              if (photoY + finalHeight <= yPosition + rowHeight - 2) {
                pdf.addImage(imgInfo.data, imgInfo.format, photoX, photoY, finalWidth, finalHeight);
              }

              photoX += maxPhotoSize + photoGap;
              photosPlaced++;
            }
          } catch (error) {
            console.error('Erreur ajout photo au PDF:', error);
          }
        }

        // Indicateur "+N" si plus de photos que le max affiché
        if (numPhotos > maxPhotosToShow) {
          pdf.setFontSize(6);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`+${numPhotos - maxPhotosToShow}`, x + colWidths.photos - 8, yPosition + rowHeight - 3);
          pdf.setTextColor(0, 0, 0);
        }
      } else {
        pdf.setFontSize(7);
        pdf.setTextColor(128, 128, 128);
        pdf.text('-', x + colWidths.photos / 2, yPosition + rowHeight / 2 + 1, { align: 'center' });
      }

      yPosition += rowHeight;
    }

    // Fin de la catégorie - la prochaine catégorie commencera sur une nouvelle page
  }

  // ---- Pied de page : NOTE TOTALE + légende (sur la dernière page) ----
  // Utiliser la dernière page de la dernière catégorie
  const lastPage = pdf.getNumberOfPages();
  pdf.setPage(lastPage);
  
  // Calculer la position Y sur cette page - placer le footer en bas
  let footerY = pageHeight - 30;
  
  // Si la dernière page est trop remplie, ajouter une nouvelle page pour le footer
  if (footerY < 60) {
    pdf.addPage();
    footerY = pageHeight - 30;
  }

  // Note totale - affichage raffiné comme dans les images de référence
  const totalScoreValue = results.totalScore !== null ? formatNumber(results.totalScore, 2) : '—';

  // Tableau de note totale en bas - mieux organisé
  const footerTableWidth = availableWidth;
  const footerRowHeight = 14; // Hauteur augmentée pour meilleure lisibilité

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);

  // Répartition des colonnes optimisée
  const col1W = footerTableWidth * 0.35; // Plus large pour le texte
  const col2W = footerTableWidth * 0.12; // Score
  const col3W = footerTableWidth * 0.12; // "nombre de KO"
  const col4W = footerTableWidth * 0.10; // Nombre KO
  const col5W = footerTableWidth * 0.31; // Légende

  // Ligne du total - texte bien formaté
  pdf.rect(margin, footerY, col1W, footerRowHeight);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const totalLabel = pdf.splitTextToSize('NOTE TOTALE obtenue pour l\'ensemble des Bonnes Pratiques d\'Hygiène :', col1W - 4);
  totalLabel.forEach((line: string, idx: number) => {
    pdf.text(line, margin + 2, footerY + 4 + (idx * 3.5));
  });

  // Score avec pastille - bien positionné
  pdf.rect(margin + col1W, footerY, col2W, footerRowHeight);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const scoreX = margin + col1W + col2W / 2;
  const scoreY = footerY + footerRowHeight / 2 + 2;
  
  // Pastille de score total AVANT le texte (comme dans les images de référence)
  if (results.totalScore !== null) {
    drawScoreBadge(pdf, scoreX - 12, scoreY - 1, results.totalScore, 5);
  }
  
  pdf.text(`${totalScoreValue}%`, scoreX, scoreY, { align: 'center' });

  // "nombre de KO :"
  pdf.rect(margin + col1W + col2W, footerY, col3W, footerRowHeight);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('nombre de KO :', margin + col1W + col2W + col3W / 2, footerY + footerRowHeight / 2 + 1, { align: 'center' });

  // Nombre KO (fond rouge) - bien visible
  pdf.rect(margin + col1W + col2W + col3W, footerY, col4W, footerRowHeight);
  pdf.setFillColor(220, 53, 69);
  pdf.rect(margin + col1W + col2W + col3W, footerY, col4W, footerRowHeight, 'FD');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(`${results.numberOfKO}`, margin + col1W + col2W + col3W + col4W / 2, footerY + footerRowHeight / 2 + 2, { align: 'center' });

  // Légende - bien formatée
  pdf.rect(margin + col1W + col2W + col3W + col4W, footerY, col5W, footerRowHeight);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  const legendText = '* 1 : conforme ; 0,7 : non-conformité mineur ; 0,3 : non-conformité moyenne ; 0 : non-conformité majeur';
  const legendLines = pdf.splitTextToSize(legendText, col5W - 4);
  legendLines.forEach((line: string, idx: number) => {
    pdf.text(line, margin + col1W + col2W + col3W + col4W + 2, footerY + 4 + (idx * 3));
  });
}

// ========================================================================
// FONCTION PRINCIPALE : Génération du PDF complet
// ========================================================================
export async function generatePDFReport(audit: Audit, results: AuditResults): Promise<void> {
  console.log('Génération PDF - Audit:', audit);

  const pdf = new jsPDF('p', 'mm', 'a4');

  // Page 1 : Cartographie Radar
  generateRadarChartPage(pdf, audit, results);

  // Page 2 : Actions Correctives Attendues
  pdf.addPage();
  generateCorrectiveActionsPage(pdf, audit);

  // Pages suivantes : Audit détaillé par catégorie
  await generateAuditDetailPages(pdf, audit, results);

  // Numéro de page sur toutes les pages
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`${i}/${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // Télécharger le PDF
  pdf.save(`audit-hygiene-${audit.dateExecution}-${Date.now()}.pdf`);
}

/**
 * Préparer les données pour le graphique radar
 */
export function prepareRadarData(audit: Audit, results: AuditResults): RadarData[] {
  return audit.categories.map((category) => ({
    category: category.name,
    score: results.categoryScores[category.id] || 0,
  }));
}