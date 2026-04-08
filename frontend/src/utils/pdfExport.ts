import jsPDF from 'jspdf';

import type {

  Audit,

  AuditResults,

  RadarData,

  CorrectiveActionData,

  AuditItem,

  NonConformitySeverity,

} from '../types';

import { buildCorrectiveActionsTableData } from './correctiveActionsFromAudit';

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

 * Charger le logo Alexann' depuis le dossier public

 */

async function loadLogo(): Promise<string | null> {

  try {

    const response = await fetch('/logo.jpeg');

    if (!response.ok) {

      console.warn('Logo non trouvé, utilisation du texte par défaut');

      return null;

    }

    const blob = await response.blob();

    return new Promise((resolve) => {

      const reader = new FileReader();

      reader.onloadend = () => {

        const base64 = reader.result as string;

        resolve(base64);

      };

      reader.onerror = () => {

        console.warn('Erreur lors de la lecture du logo');

        resolve(null);

      };

      reader.readAsDataURL(blob);

    });

  } catch (error) {

    console.warn('Erreur lors du chargement du logo:', error);

    return null;

  }

}



/**

 * Dessiner l'en-tête commun à toutes les pages

 */

function drawPageHeader(pdf: jsPDF, title: string, logoData: string | null = null, headerMargin: number = 15): number {

  const pageWidth = pdf.internal.pageSize.getWidth();

  const margin = headerMargin;

  let yPosition = margin;



  // Logo Alexann à gauche

  if (logoData) {

    try {

      // Déterminer le format de l'image

      let imageFormat: 'JPEG' | 'PNG' = 'JPEG';

      if (logoData.startsWith('data:image/png')) {

        imageFormat = 'PNG';

      }



      // Extraire le base64 pur

      let base64Data = logoData;

      if (logoData.startsWith('data:image/')) {

        const base64Index = logoData.indexOf(',');

        if (base64Index !== -1) {

          base64Data = logoData.substring(base64Index + 1);

        }

      }



      // Dimensions du logo (hauteur max 12mm pour l'en-tête)

      const logoHeight = 12;

      const logoWidth = logoHeight * 2; // Ratio approximatif, ajusté automatiquement par jsPDF



      // Ajouter le logo

      pdf.addImage(base64Data, imageFormat, margin, yPosition - 2, logoWidth, logoHeight);

      

      // Tagline sous le logo

      pdf.setFontSize(7);

      pdf.setFont('helvetica', 'normal');

      pdf.setTextColor(0, 0, 0);

      pdf.text('Hygiène et qualité agroalimentaire', margin, yPosition + logoHeight + 2);

      

      yPosition += logoHeight + 4;

    } catch (error) {

      console.warn('Erreur lors de l\'ajout du logo au PDF:', error);

      // Fallback sur le texte

      pdf.setFontSize(14);

      pdf.setFont('helvetica', 'bold');

      pdf.setTextColor(20, 130, 183); // #1482B7

      pdf.text('ALEXANN', margin, yPosition);

      pdf.setFontSize(8);

      pdf.setFont('helvetica', 'normal');

      pdf.setTextColor(0, 0, 0);

      pdf.text('Hygiène et qualité agroalimentaire', margin, yPosition + 5);

      yPosition += 8;

    }

  } else {

    // Fallback : texte si le logo n'est pas disponible

    pdf.setFontSize(14);

    pdf.setFont('helvetica', 'bold');

    pdf.setTextColor(20, 130, 183); // #1482B7

    pdf.text('ALEXANN', margin, yPosition);

    pdf.setFontSize(8);

    pdf.setFont('helvetica', 'normal');

    pdf.setTextColor(0, 0, 0);

    pdf.text('Hygiène et qualité agroalimentaire', margin, yPosition + 5);

    yPosition += 8;

  }



  // Titre au centre

  pdf.setFontSize(11);

  pdf.setFont('helvetica', 'bold');

  pdf.setTextColor(0, 0, 0);

  pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });



  // Contact à droite

  pdf.setFontSize(8);

  pdf.setFont('helvetica', 'normal');

  const contactLines = ['Anne SUQUET', 'anne@alexann.fr', '06 46 45 67 33'];

  contactLines.forEach((line, idx) => {

    pdf.text(line, pageWidth - margin, margin + (idx * 4), { align: 'right' });

  });



  return Math.max(yPosition + 10, margin + 18);

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

function generateRadarChartPage(pdf: jsPDF, audit: Audit, results: AuditResults, logoData: string | null = null): void {

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 15;



  let yPosition = drawPageHeader(pdf, 'CARTOGRAPHIE RADAR\nLES BONNES PRATIQUES D\'HYGIENE', logoData);



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



  // Dimensions du graphique radar (paysage : page moins haute â†’ radar plus compact)

  const landscapeRadar = pageWidth > pageHeight;

  const chartCenterX = pageWidth / 2;

  const chartRadius = landscapeRadar ? 28 : 45;

  const chartCenterY = yPosition + (landscapeRadar ? 28 : 55);

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

    const labelRadius = chartRadius + (landscapeRadar ? 12 : 15);

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

  const totalScoreText = results.totalScore !== null ? `${formatNumber(results.totalScore, 2)} %` : '–” %';



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



/** Couleurs alignées sur la page Actions correctives (web) */

const CORRECTIVE_SEVERITY_RGB: Record<NonConformitySeverity, [number, number, number]> = {

  rouge: [198, 40, 40],

  orange: [237, 108, 2],

  bleu: [20, 130, 183],

  vert: [140, 179, 58],

};



function drawCorrectiveSeverityFill(

  pdf: jsPDF,

  severity: NonConformitySeverity | undefined,

  x: number,

  y: number,

  w: number,

  h: number

): void {

  if (!severity) return;

  const rgb = CORRECTIVE_SEVERITY_RGB[severity];

  if (!rgb) return;

  pdf.setFillColor(rgb[0], rgb[1], rgb[2]);

  pdf.rect(x, y, w, h, 'F');

}



/** Même logique que la page Actions correctives ; complète si `severity` absent en base */

function severityFromItemNote(note: number | undefined): NonConformitySeverity | undefined {

  if (note === 1 || note === 1.0) return 'vert';

  if (note === 0) return 'rouge';

  if (note === 0.3) return 'orange';

  if (note === 0.7) return 'bleu';

  return undefined;

}



function resolveCorrectiveRowSeverity(row: CorrectiveActionData, audit: Audit): NonConformitySeverity | undefined {

  if (row.severity) return row.severity;

  const m = row.id.match(/^cat-(\d+)-item-(\d+)-(\d+)-obs-/);

  if (!m) return undefined;

  const catIdx = parseInt(m[1], 10);

  const itemCat = parseInt(m[2], 10);

  const itemIdx = parseInt(m[3], 10);

  const cat = audit.categories[catIdx];

  if (!cat) return undefined;

  const itemId = `item-${itemCat}-${itemIdx}`;

  const item = cat.items.find((it) => it.id === itemId);

  return severityFromItemNote(item?.note);

}



// ========================================================================

// PAGE 2 : ACTIONS CORRECTIVES ATTENDUES

// ========================================================================

function generateCorrectiveActionsPage(pdf: jsPDF, audit: Audit, logoData: string | null = null): void {

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 15;



  let yPosition = drawPageHeader(pdf, 'ACTIONS CORRECTIVES ATTENDUES', logoData);



  yPosition += 10;



  // Titre du tableau

  pdf.setFontSize(13);

  pdf.setFont('helvetica', 'bold');

  pdf.setTextColor(0, 0, 0);

  pdf.text('ACTIONS CORRECTIVES ATTENDUES', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;



  // Même jeu de lignes que la page « Actions correctives » (observations + sauvegardes + tri)

  const correctiveActionsData = buildCorrectiveActionsTableData(audit).filter((ca) =>

    Boolean(ca.ecart?.trim())

  );



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



  // Colonne "Écarts constatés" (rowspan 2)

  pdf.rect(currentX, yPosition, colWidths.ecart, headerHeight + subHeaderHeight);

  pdf.setFontSize(8);

  pdf.setFont('helvetica', 'bold');

  pdf.setTextColor(0, 0, 0);

  pdf.text('Écarts constatés', currentX + colWidths.ecart / 2, yPosition + (headerHeight + subHeaderHeight) / 2 + 1, { align: 'center' });

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

  const minEmptyRows = 3;

  const totalRowsToShow = Math.max(correctiveActionsData.length + 2, minEmptyRows);



  for (let i = 0; i < totalRowsToShow; i++) {

    const rowData = i < correctiveActionsData.length ? correctiveActionsData[i] : null;



    const linesEcart = rowData?.ecart?.trim()

      ? pdf.splitTextToSize(rowData.ecart.trim(), colWidths.ecart - 4)

      : [];

    const linesAction = rowData?.actionCorrective?.trim()

      ? pdf.splitTextToSize(rowData.actionCorrective.trim(), colWidths.actionCorrective - 4)

      : [];

    const maxTextLines = Math.max(linesEcart.length, linesAction.length, rowData ? 1 : 0);

    const rowHeight = rowData ? Math.max(12, 6 + maxTextLines * 3) : 12;





    if (yPosition + rowHeight > pageHeight - 20) {

      if (!rowData) break;

      pdf.addPage('a4', 'l');

      yPosition = drawPageHeader(pdf, 'ACTIONS CORRECTIVES ATTENDUES (suite)', logoData);

      yPosition += 5;

      // Redraw column headers on new page

      let hX = margin;

      pdf.setFillColor(255, 255, 255); pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.5);

      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);

      pdf.rect(hX, yPosition, colWidths.ecart, headerHeight + subHeaderHeight);

      pdf.text('Ecarts constates', hX + colWidths.ecart / 2, yPosition + (headerHeight + subHeaderHeight) / 2 + 1, { align: 'center' });

      hX += colWidths.ecart;

      pdf.rect(hX, yPosition, colWidths.actionCorrective, headerHeight + subHeaderHeight);

      pdf.text('Actions correctives', hX + colWidths.actionCorrective / 2, yPosition + (headerHeight + subHeaderHeight) / 2 + 1, { align: 'center' });

      hX += colWidths.actionCorrective;

      pdf.rect(hX, yPosition, colWidths.delai, headerHeight + subHeaderHeight);

      pdf.text('Delai', hX + colWidths.delai / 2, yPosition + (headerHeight + subHeaderHeight) / 2 + 1, { align: 'center' });

      hX += colWidths.delai;

      pdf.rect(hX, yPosition, colWidths.quand + colWidths.visa, headerHeight);

      pdf.text('Realisation', hX + (colWidths.quand + colWidths.visa) / 2, yPosition + headerHeight / 2 + 2, { align: 'center' });

      pdf.setFontSize(7);

      pdf.rect(hX, yPosition + headerHeight, colWidths.quand, subHeaderHeight);

      pdf.text('Quand', hX + colWidths.quand / 2, yPosition + headerHeight + subHeaderHeight / 2 + 1, { align: 'center' });

      hX += colWidths.quand;

      pdf.rect(hX, yPosition + headerHeight, colWidths.visa, subHeaderHeight);

      pdf.text('Visa', hX + colWidths.visa / 2, yPosition + headerHeight + subHeaderHeight / 2 + 1, { align: 'center' });

      hX += colWidths.visa;

      pdf.setFontSize(8);

      pdf.rect(hX, yPosition, colWidths.verification, headerHeight + subHeaderHeight);

      pdf.text('Verification', hX + colWidths.verification / 2, yPosition + (headerHeight + subHeaderHeight) / 2 + 1, { align: 'center' });

      yPosition += headerHeight + subHeaderHeight;

    }



    currentX = margin;



    pdf.setDrawColor(0, 0, 0);

    pdf.setLineWidth(0.5);

    pdf.setFontSize(7);

    pdf.setFont('helvetica', 'normal');



    const sev =

      rowData ? rowData.severity ?? resolveCorrectiveRowSeverity(rowData, audit) : undefined;



    // Écarts (fond coloré si sévérité, comme sur l’écran)

    drawCorrectiveSeverityFill(pdf, sev, currentX, yPosition, colWidths.ecart, rowHeight);

    pdf.setDrawColor(0, 0, 0);

    pdf.rect(currentX, yPosition, colWidths.ecart, rowHeight);

    pdf.setTextColor(sev ? 255 : 0, sev ? 255 : 0, sev ? 255 : 0);

    linesEcart.forEach((line: string, idx: number) => {

      pdf.text(line, currentX + 2, yPosition + 3.5 + (idx * 3));

    });

    currentX += colWidths.ecart;



    // Actions correctives (fond blanc, texte noir)

    pdf.setTextColor(0, 0, 0);

    pdf.rect(currentX, yPosition, colWidths.actionCorrective, rowHeight);

    linesAction.forEach((line: string, idx: number) => {

      pdf.text(line, currentX + 2, yPosition + 3.5 + (idx * 3));

    });

    currentX += colWidths.actionCorrective;



    // Délai (fond coloré si sévérité)

    drawCorrectiveSeverityFill(pdf, sev, currentX, yPosition, colWidths.delai, rowHeight);

    pdf.setDrawColor(0, 0, 0);

    pdf.rect(currentX, yPosition, colWidths.delai, rowHeight);

    pdf.setTextColor(sev ? 255 : 0, sev ? 255 : 0, sev ? 255 : 0);

    if (rowData?.delai?.trim()) {

      pdf.text(rowData.delai.trim(), currentX + colWidths.delai / 2, yPosition + rowHeight / 2 + 1, { align: 'center' });

    }

    currentX += colWidths.delai;



    // Quand

    pdf.setTextColor(0, 0, 0);

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



    pdf.setTextColor(0, 0, 0);

    yPosition += rowHeight;

  }

}



// ========================================================================

// PAGES D'AUDIT : Tableau détaillé par catégorie

// ========================================================================



/** Largeurs de colonnes pour la page courante (paysage = plus d'espace texte) */

function computeAuditColumnWidths(availableWidth: number) {

  const colWidths = {

    itemName: availableWidth * 0.12,  // Réduit pour plus d'espace aux photos

    ko: 8,                             // Légèrement plus large

    star: 8,                           // Légèrement plus large

    note: 12,

    comments: availableWidth * 0.20,   // Plus d'espace pour les commentaires

    actions: availableWidth * 0.18,    // Plus d'espace pour les actions

    photos: 0,

  };

  colWidths.photos =

    availableWidth -

    colWidths.itemName -

    colWidths.ko -

    colWidths.star -

    colWidths.note -

    colWidths.comments -

    colWidths.actions;

  return colWidths;

}





/**

 * Aplatit les observations en lignes parallèles (commentaire / action) pour pouvoir

 * découper le texte sur plusieurs pages sans coupure au milieu d'une ligne.

 */

function buildFlatObservationLines(

  commentLineArrays: string[][],

  actionLineArrays: string[][],

  commentTexts: string[],

  rawNote: number | null

): { commentFlat: string[]; actionFlat: string[]; alertFlat: boolean[] } {

  const commentFlat: string[] = [];

  const actionFlat: string[] = [];

  const alertFlat: boolean[] = [];



  for (let obsIdx = 0; obsIdx < commentLineArrays.length; obsIdx++) {

    const cl = commentLineArrays[obsIdx] || [];

    const al = actionLineArrays[obsIdx] || [];

    const m = Math.max(cl.length, al.length);

    const orig = commentTexts[obsIdx] || '';

    const isAlert =

      (orig.toLowerCase().includes('dlc dépassée') ||

        orig.toLowerCase().includes('amendes') ||

        orig.toLowerCase().includes('salissures anciennes')) &&

      rawNote !== null &&

      rawNote !== undefined &&

      (rawNote === 0 || rawNote === 0.3);



    for (let i = 0; i < m; i++) {

      commentFlat.push(cl[i] ?? '');

      actionFlat.push(al[i] ?? '');

      alertFlat.push(isAlert);

    }

    if (obsIdx < commentLineArrays.length - 1) {

      commentFlat.push('');

      actionFlat.push('');

      alertFlat.push(false);

    }

  }

  return { commentFlat, actionFlat, alertFlat };

}



async function generateAuditDetailPages(pdf: jsPDF, audit: Audit, results: AuditResults, logoData: string | null = null, onProgress?: (step: string, percent: number) => void): Promise<void> {

  const margin = 10;

  const bottomMargin = 18;

  const lineHeight = 3.5;

  const photoGap = 2;

  const photosPerRow = 4;



  let pageWidth = pdf.internal.pageSize.getWidth();

  let pageHeight = pdf.internal.pageSize.getHeight();

  let availableWidth = pageWidth - 2 * margin;

  let colWidths = computeAuditColumnWidths(availableWidth);

  let yPosition = margin;



  const maxPhotoWidth = (colWidths.photos - photoGap * 5) / photosPerRow;

  const maxPhotoSize = Math.min(28, maxPhotoWidth);



  // Dessine l'en-tête de page + colonnes + bannière catégorie

  const startNewPage = (catIndex: number, categoryTitle: string, categoryScoreText: string, isContinuation: boolean) => {

    pdf.addPage('a4', 'l');

    pageWidth = pdf.internal.pageSize.getWidth();

    pageHeight = pdf.internal.pageSize.getHeight();

    availableWidth = pageWidth - 2 * margin;

    colWidths = computeAuditColumnWidths(availableWidth);



    // En-tête page

    const pw = pdf.internal.pageSize.getWidth();

    let y = drawPageHeader(pdf, 'AUDIT\nLES BONNES PRATIQUES D\'HYGIENE', logoData, margin);

    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0,0,0);

    pdf.text(`Date de l'exécution :`, margin, y);

    pdf.setFont('helvetica', 'normal');

    pdf.text(new Date(audit.dateExecution).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }), margin + 35, y);

    pdf.setFont('helvetica', 'bold');

    pdf.text(`Adresse :`, margin + 70, y);

    pdf.setFont('helvetica', 'normal');

    const adresseLines = pdf.splitTextToSize(audit.adresse || '', pw - margin - 85 - 10);

    adresseLines.forEach((line: string, idx: number) => pdf.text(line, margin + 85, y + idx * 3.5));

    y += Math.max(5, adresseLines.length * 3.5 + 2);



    // En-tête colonnes

    const hh = 8; let x = margin;

    pdf.setFillColor(220,220,220); pdf.setDrawColor(0,0,0); pdf.setLineWidth(0.5);

    pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(0,0,0);

    pdf.rect(x, y, colWidths.itemName, hh); x += colWidths.itemName;

    pdf.rect(x, y, colWidths.ko, hh); pdf.setTextColor(220,53,69);

    pdf.text('KO', x + colWidths.ko/2, y + hh/2 + 1.5, {align:'center'}); pdf.setTextColor(0,0,0); x += colWidths.ko;

    pdf.rect(x, y, colWidths.star, hh); pdf.text('*', x + colWidths.star/2, y + hh/2 + 1.5, {align:'center'}); x += colWidths.star;

    pdf.rect(x, y, colWidths.note, hh); pdf.text('Note', x + colWidths.note/2, y + hh/2 + 1.5, {align:'center'}); x += colWidths.note;

    pdf.rect(x, y, colWidths.comments, hh); pdf.text('Commentaires', x + colWidths.comments/2, y + hh/2 + 1.5, {align:'center'}); x += colWidths.comments;

    pdf.rect(x, y, colWidths.actions, hh); pdf.text('Actions correctives', x + colWidths.actions/2, y + hh/2 + 1.5, {align:'center'}); x += colWidths.actions;

    pdf.rect(x, y, colWidths.photos, hh); pdf.text('Photo(s)', x + colWidths.photos/2, y + hh/2 + 1.5, {align:'center'});

    y += hh;



    // Bannière catégorie

    const bh = 10;

    pdf.setFillColor(240,240,240); pdf.setDrawColor(0,0,0); pdf.setLineWidth(0.5);

    pdf.rect(margin, y, pw - 2*margin, bh, 'FD');

    pdf.setFontSize(10); pdf.setFont('helvetica','bold'); pdf.setTextColor(25,118,210);

    const bannerText = `${catIndex + 1}. ${categoryTitle.toUpperCase()}${isContinuation ? ' (suite)' : ''}`;

    pdf.text(bannerText, margin + 3, y + bh/2 + 2);

    if (categoryScoreText) {

      pdf.setFontSize(9); pdf.setTextColor(0,0,0);

      pdf.text(categoryScoreText, pw - margin - 5, y + bh/2 + 2, {align:'right'});

    }

    y += bh + 2;

    yPosition = y;

  };



  // Dessine une ligne complète pour un item

  const drawItemRow = async (

    item: AuditItem,

    rawNote: number | null,

    contribution: number,

    isKO: boolean,

    commentFlat: string[],

    actionFlat: string[],

    alertFlat: boolean[],

    itemNameLines: string[],

    rowHeight: number,

    isFirstPart: boolean,

    drawPhotos: boolean

  ) => {

    const numPhotos = item.photos ? item.photos.length : 0;

    let x = margin;

    pdf.setDrawColor(0,0,0); pdf.setLineWidth(0.5);



    // Nom item

    pdf.rect(x, yPosition, colWidths.itemName, rowHeight);

    pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(0,0,0);

    if (isFirstPart) {

      itemNameLines.forEach((line, idx) => pdf.text(line, x + 3, yPosition + 4 + idx * lineHeight));

    } else {

      pdf.setTextColor(100,100,100);

      pdf.text('(suite)', x + 3, yPosition + 8);

      pdf.setTextColor(0,0,0);

    }

    x += colWidths.itemName;



    // KO

    pdf.rect(x, yPosition, colWidths.ko, rowHeight);

    if (isFirstPart) {

      const koValue = item.ko ?? 0;

      if (koValue > 0) {

        pdf.setFillColor(220,53,69); pdf.rect(x, yPosition, colWidths.ko, rowHeight, 'F');

        pdf.setFontSize(7); pdf.setFont('helvetica','bold'); pdf.setTextColor(255,255,255);

        pdf.text(koValue.toString(), x + colWidths.ko/2, yPosition + rowHeight/2 + 1, {align:'center'});

      } else if (isKO) {

        pdf.setFillColor(220,53,69); pdf.rect(x, yPosition, colWidths.ko, rowHeight, 'F');

      }

    }

    pdf.setDrawColor(0,0,0); pdf.setLineWidth(0.5);

    pdf.rect(x, yPosition, colWidths.ko, rowHeight);

    x += colWidths.ko;



    // *

    pdf.rect(x, yPosition, colWidths.star, rowHeight);

    if (isFirstPart && rawNote !== null && rawNote !== undefined) {

      pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(0,0,0);

      pdf.text(formatRawNote(rawNote), x + colWidths.star/2, yPosition + rowHeight/2 + 1, {align:'center'});

    }

    x += colWidths.star;



    // Note

    pdf.rect(x, yPosition, colWidths.note, rowHeight);

    if (isFirstPart && contribution > 0) {

      pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(0,0,0);

      pdf.text(`${contribution}%`, x + colWidths.note/2, yPosition + rowHeight/2 + 1, {align:'center'});

    }

    x += colWidths.note;



    // Commentaires

    pdf.rect(x, yPosition, colWidths.comments, rowHeight);

    pdf.setFontSize(7); pdf.setFont('helvetica','normal');

    let cy = yPosition + 4;

    for (let i = 0; i < commentFlat.length; i++) {

      if (alertFlat[i]) {

        pdf.setFillColor(255,200,200);

        pdf.rect(x+1, cy-2, colWidths.comments-2, lineHeight+1, 'F');

        pdf.setTextColor(180,0,0);

      } else { pdf.setTextColor(0,0,0); }

      if (commentFlat[i]?.trim()) pdf.text(commentFlat[i], x+2, cy+2.5);

      cy += lineHeight;

      pdf.setTextColor(0,0,0);

    }

    x += colWidths.comments;



    // Actions

    pdf.rect(x, yPosition, colWidths.actions, rowHeight);

    pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(0,0,0);

    let ay = yPosition + 4;

    for (let i = 0; i < actionFlat.length; i++) {

      if (actionFlat[i]?.trim()) pdf.text(actionFlat[i], x+2, ay+2.5);

      ay += lineHeight;

    }

    x += colWidths.actions;



    // Photos

    pdf.rect(x, yPosition, colWidths.photos, rowHeight);

    if (drawPhotos && numPhotos > 0 && item.photos) {

      const imgs = await Promise.all(item.photos.slice(0, 12).map(p => loadImage(p)));

      let px = x + photoGap, py = yPosition + photoGap, placed = 0;

      for (const imgInfo of imgs) {

        if (!imgInfo) continue;

        const ar = imgInfo.width / imgInfo.height;

        const fw = ar > 1 ? maxPhotoSize : maxPhotoSize * ar;

        const fh = ar > 1 ? maxPhotoSize / ar : maxPhotoSize;

        if (placed > 0 && placed % photosPerRow === 0) { px = x + photoGap; py += maxPhotoSize + photoGap; }

        if (py + fh <= yPosition + rowHeight - photoGap) {

          pdf.addImage(imgInfo.data, imgInfo.format, px, py, fw, fh);

          px += maxPhotoSize + photoGap; placed++;

        }

      }

    } else if (numPhotos === 0) {

      pdf.setFontSize(7); pdf.setTextColor(128,128,128);

      pdf.text('-', x + colWidths.photos/2, yPosition + rowHeight/2 + 1, {align:'center'});

      pdf.setTextColor(0,0,0);

    }



    yPosition += rowHeight;

  };



  // ---- Parcourir les catégories ----

  for (let catIndex = 0; catIndex < audit.categories.length; catIndex++) {

    const category = audit.categories[catIndex];

    const auditedItems = category.items.filter(item => item.isAudited);

    if (auditedItems.length === 0) continue;

    // Report progress per category (25% to 90% range)
    if (onProgress) {
      const categoryProgress = 25 + Math.round((catIndex / audit.categories.length) * 65);
      const catName = category.name.replace(/^\d+\.\s*/, '');
      onProgress(`Catégorie : ${catName}`, categoryProgress);
    }



    const categoryScore = results.categoryScores[category.id];

    const categoryScoreText = categoryScore != null ? `${formatNumber(categoryScore, 0)}%` : '';

    const categoryTitle = category.name.replace(/^\d+\.\s*/, '');



    // Nouvelle page pour chaque catégorie

    startNewPage(catIndex, categoryTitle, categoryScoreText, false);



    // ---- Items ----

    for (const item of auditedItems) {

      const rawNote = item.numberOfNonConformities !== null

        ? convertNonConformitiesToNote(item.classification, item.numberOfNonConformities)

        : null;

      const contribution = rawNote != null

        ? calculateItemContribution({ ...item, note: rawNote }, category.items)

        : 0;

      const isKO = rawNote === null || rawNote === undefined || (rawNote !== 1 && rawNote !== 0.7);



      // Préparer textes

      const commentTexts: string[] = [];

      const actionTexts: string[] = [];

      (item.observations || []).forEach(obs => {

        if (obs?.text?.trim()) commentTexts.push(obs.text.trim());

        actionTexts.push(obs?.correctiveAction?.trim() || '');

      });



      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);

      const commentLineArrays = commentTexts.map(t => pdf.splitTextToSize(t, colWidths.comments - 4) as string[]);

      const actionLineArrays = actionTexts.map(t => t ? pdf.splitTextToSize(t, colWidths.actions - 4) as string[] : []);

      const { commentFlat, actionFlat, alertFlat } = buildFlatObservationLines(commentLineArrays, actionLineArrays, commentTexts, rawNote);

      const totalLines = Math.max(commentFlat.length, actionFlat.length);



      const numPhotos = item.photos ? item.photos.length : 0;

      const photoRows = numPhotos > 0 ? Math.ceil(Math.min(numPhotos, 12) / photosPerRow) : 0;

      const photoContentHeight = photoRows > 0 ? photoRows * (maxPhotoSize + photoGap) + 6 : 0;



      const itemNameLines = pdf.splitTextToSize(item.name || '', colWidths.itemName - 6) as string[];

      const itemNameHeight = itemNameLines.length * lineHeight + 6;

      const textContentHeight = totalLines > 0 ? totalLines * lineHeight + 8 : 12;

      const totalRowHeight = Math.max(itemNameHeight, textContentHeight, photoContentHeight, 20);



      const avail = pageHeight - yPosition - bottomMargin;



      if (totalRowHeight <= avail) {

        // Tout tient â†’ dessiner d'un coup

        await drawItemRow(item, rawNote, contribution, isKO, commentFlat, actionFlat, alertFlat, itemNameLines, totalRowHeight, true, true);

      } else {

        // Ne tient pas sur espace restant - decouper intelligemment

        const minH = Math.max(itemNameHeight, numPhotos > 0 ? photoContentHeight : 0, 20);



        // Creer une nouvelle page seulement si pas assez d espace pour commencer l item

        if (avail < minH) {

          startNewPage(catIndex, categoryTitle, categoryScoreText, true);

        }



        // Decouper l item sur plusieurs pages en partant de la position courante

        let remComments = [...commentFlat];

        let remActions = [...actionFlat];

        let remAlerts = [...alertFlat];

        let isFirstPart = true;

        let safety = 0;



        while ((remComments.length > 0 || remActions.length > 0 || isFirstPart) && safety++ < 50) {

          const a = pageHeight - yPosition - bottomMargin;

          const curMinH = Math.max(itemNameHeight, numPhotos > 0 && isFirstPart ? photoContentHeight : 0, 20);



          if (a < curMinH) {

            startNewPage(catIndex, categoryTitle, categoryScoreText, true);

            continue;

          }



          if (isFirstPart) {

            const extraLines = Math.max(0, Math.floor((a - curMinH) / lineHeight));

            const take = Math.min(extraLines, Math.max(remComments.length, remActions.length));

            const cS = remComments.splice(0, take);

            const aS = remActions.splice(0, take);

            const alS = remAlerts.splice(0, take);

            const h = Math.max(curMinH, take > 0 ? take * lineHeight + 8 : 0);

            await drawItemRow(item, rawNote, contribution, isKO,

              cS.length ? cS : [],

              aS.length ? aS : [],

              alS.length ? alS : [],

              itemNameLines, h, true, true);

            isFirstPart = false;

          } else {

            if (!remComments.length && !remActions.length) break;

            startNewPage(catIndex, categoryTitle, categoryScoreText, true);

            const a2 = pageHeight - yPosition - bottomMargin;

            const maxLines = Math.max(1, Math.floor((a2 - 8) / lineHeight));

            const take = Math.min(maxLines, Math.max(remComments.length, remActions.length));

            const cS = remComments.splice(0, take);

            const aS = remActions.splice(0, take);

            const alS = remAlerts.splice(0, take);

            await drawItemRow(item, rawNote, contribution, isKO,

              cS.length ? cS : ['-'],

              aS.length ? aS : ['-'],

              alS.length ? alS : [false],

              itemNameLines, take * lineHeight + 8, false, false);

          }

        }

      }

    }

  }



  // ---- Footer note totale ----

  const lastPage = pdf.getNumberOfPages();

  pdf.setPage(lastPage);

  const fpW = pdf.internal.pageSize.getWidth();

  const fpH = pdf.internal.pageSize.getHeight();

  const fh = 22;

  let footerY = fpH - 30;

  if (footerY < yPosition + 5) {

    footerY = yPosition + 5;

    if (footerY + fh > fpH - 5) {

      pdf.addPage('a4', 'l');

      footerY = pdf.internal.pageSize.getHeight() - fh - 10;

    }

  }



  const ftW = fpW - 2 * margin;

  const col1W = ftW * 0.35, col2W = ftW * 0.12, col3W = ftW * 0.12, col4W = ftW * 0.10, col5W = ftW * 0.31;

  const totalScoreValue = results.totalScore !== null ? formatNumber(results.totalScore, 2) : '–”';



  pdf.setDrawColor(0,0,0); pdf.setLineWidth(0.5);

  pdf.rect(margin, footerY, col1W, fh);

  pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(0,0,0);

  pdf.splitTextToSize('NOTE TOTALE obtenue pour l\'ensemble des Bonnes Pratiques d\'Hygiène :', col1W - 4)

    .forEach((line: string, i: number) => pdf.text(line, margin + 2, footerY + 4 + i * 3.5));



  pdf.rect(margin + col1W, footerY, col2W, fh);

  const sX = margin + col1W + col2W/2;

  const sY = footerY + fh/2 + 2;

  if (results.totalScore !== null) drawScoreBadge(pdf, sX - 12, sY - 1, results.totalScore, 5);

  pdf.setFontSize(10); pdf.setFont('helvetica','bold'); pdf.setTextColor(0,0,0);

  pdf.text(`${totalScoreValue}%`, sX, sY, {align:'center'});



  pdf.rect(margin + col1W + col2W, footerY, col3W, fh);

  pdf.setFontSize(7); pdf.setFont('helvetica','normal');

  pdf.text('nombre de KO :', margin + col1W + col2W + col3W/2, footerY + fh/2 + 1, {align:'center'});



  pdf.setFillColor(220,53,69);

  pdf.rect(margin + col1W + col2W + col3W, footerY, col4W, fh, 'FD');

  pdf.setFontSize(11); pdf.setFont('helvetica','bold'); pdf.setTextColor(255,255,255);

  pdf.text(`${results.numberOfKO}`, margin + col1W + col2W + col3W + col4W/2, footerY + fh/2 + 2, {align:'center'});



  pdf.rect(margin + col1W + col2W + col3W + col4W, footerY, col5W, fh);

  pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(0,0,0);

  const legendText = '* 1 : conforme ; 0,7 : non-conformité mineure ; 0,3 : non-conformité moyenne ; 0 : non-conformité majeure. Pour une impression fidèle aux couleurs, utiliser une imprimante couleur.';

  pdf.splitTextToSize(legendText, col5W - 4)

    .forEach((line: string, i: number) => pdf.text(line, margin + col1W + col2W + col3W + col4W + 2, footerY + 4 + i * 3));

}

// FONCTION PRINCIPALE : Génération du PDF complet

// ========================================================================

export async function generatePDFReport(audit: Audit, results: AuditResults, onProgress?: (step: string, percent: number) => void): Promise<void> {

  console.log('Génération PDF - Audit:', audit);



  // Charger le logo une seule fois au début

  const logoData = await loadLogo();



  const pdf = new jsPDF('l', 'mm', 'a4');

  pdf.setProperties({

    title: `Audit hygiène –” ${audit.adresse || 'Alexann'}`,

    subject: 'Rapport paysage A4 –” lisibilité optimisée',

  });



  // Page 1 : Cartographie Radar

  generateRadarChartPage(pdf, audit, results, logoData);



  // Page 2 : Actions Correctives Attendues

  pdf.addPage('a4', 'l');

  generateCorrectiveActionsPage(pdf, audit, logoData);



  // Pages suivantes : Audit détaillé par catégorie

  await generateAuditDetailPages(pdf, audit, results, logoData, onProgress);

  // Numéro de page sur toutes les pages

  const totalPages = pdf.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {

    pdf.setPage(i);

    const pageWidth = pdf.internal.pageSize.getWidth();

    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFontSize(8);

    pdf.setTextColor(128, 128, 128);

    pdf.text(`${i}/${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

  }



  // Télécharger le PDF

  pdf.save(`audit-hygiene-${audit.dateExecution}-${Date.now()}.pdf`);

}



/**

 * Générer le PDF et retourner son contenu en base64

 */

export async function generatePDFReportAsBase64(audit: Audit, results: AuditResults, onProgress?: (step: string, percent: number) => void): Promise<string> {

  console.log('Génération PDF (base64) - Audit:', audit);



  // Charger le logo une seule fois au début

  const logoData = await loadLogo();



  const pdf = new jsPDF('l', 'mm', 'a4');

  pdf.setProperties({

    title: `Audit hygiène –” ${audit.adresse || 'Alexann'}`,

    subject: 'Rapport paysage A4 –” lisibilité optimisée',

  });



  // Page 1 : Cartographie Radar

  generateRadarChartPage(pdf, audit, results, logoData);



  // Page 2 : Actions Correctives Attendues

  pdf.addPage('a4', 'l');

  generateCorrectiveActionsPage(pdf, audit, logoData);



  // Pages suivantes : Audit détaillé par catégorie

  await generateAuditDetailPages(pdf, audit, results, logoData, onProgress);

  // Numéro de page sur toutes les pages

  const totalPages = pdf.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {

    pdf.setPage(i);

    const pageWidth = pdf.internal.pageSize.getWidth();

    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFontSize(8);

    pdf.setTextColor(128, 128, 128);

    pdf.text(`${i}/${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

  }



  // Retourner le PDF en base64 (sans le préfixe data:application/pdf;base64,)

  const pdfBase64 = pdf.output('datauristring').split(',')[1];

  return pdfBase64;

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

