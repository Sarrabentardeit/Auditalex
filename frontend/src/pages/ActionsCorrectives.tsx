import { useState, useMemo, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  InputBase,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuditStore } from '../store/auditStore';
import Layout from '../components/Layout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { generatePDFReport } from '../utils/pdfExport';
import { CircularProgress } from '@mui/material';
import type { CorrectiveActionData } from '../types';

type CorrectiveActionRow = CorrectiveActionData;

// Nombre de lignes vides supplémentaires à afficher
const EMPTY_VISIBLE_ROWS = 5;

// Styles communs pour les cellules
const cellBorder = {
  border: '1px solid #000',
  padding: '6px 8px',
  verticalAlign: 'top' as const,
};

const headerCell = {
  ...cellBorder,
  backgroundColor: '#fff',
  fontWeight: 700,
  fontSize: '0.8rem',
  textAlign: 'center' as const,
  color: '#000',
  padding: '8px 6px',
};

const inputStyle = {
  fontSize: '0.82rem',
  color: '#000',
  lineHeight: 1.4,
  padding: 0,
  '& input': {
    padding: 0,
  },
  '& textarea': {
    padding: 0,
  },
};

export default function ActionsCorrectives() {
  const navigate = useNavigate();
  const { currentAudit, results, updateCorrectiveActions } = useAuditStore();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const initialRows = useMemo(() => {
    if (!currentAudit) {
      console.log('[ActionsCorrectives] Pas d\'audit chargé');
      return [];
    }

    console.log('[ActionsCorrectives] Génération des lignes depuis l\'audit:', currentAudit);

    // Générer automatiquement les lignes à partir des observations de l'audit
    const rows: CorrectiveActionRow[] = [];
    const existingRowsMap = new Map<string, CorrectiveActionRow>();
    
    // Si l'auditeur a déjà enregistré des actions correctives, les garder en mémoire
    if (currentAudit.correctiveActions && currentAudit.correctiveActions.length > 0) {
      console.log('[ActionsCorrectives] Actions correctives existantes:', currentAudit.correctiveActions.length);
      currentAudit.correctiveActions.forEach((row) => {
        existingRowsMap.set(row.id, row);
      });
    }
    
    // Parcourir toutes les catégories et items pour générer les lignes
    let totalObservations = 0;
    currentAudit.categories.forEach((category) => {
      category.items.forEach((item) => {
        // Prendre tous les items qui ont des observations
        if (item.observations && item.observations.length > 0) {
          totalObservations += item.observations.length;
          console.log(`[ActionsCorrectives] Item "${item.name}" a ${item.observations.length} observation(s)`);
          
          item.observations.forEach((obs) => {
            if (obs && obs.text && obs.text.trim()) {
              const rowId = `${category.id}-${item.id}-${obs.id}`;
              
              // Si la ligne existe déjà (sauvegardée), utiliser les données sauvegardées
              // Sinon, créer une nouvelle ligne avec les données de l'audit
              if (existingRowsMap.has(rowId)) {
                rows.push(existingRowsMap.get(rowId)!);
              } else {
                // Construire le texte de l'écart : Catégorie - Item - Observation
                const categoryName = category.name.replace(/^\d+\.\s*/, '');
                const ecartText = `${categoryName} - ${item.name}\n${obs.text}`;
                
                rows.push({
                  id: rowId,
                  ecart: ecartText,
                  actionCorrective: obs.correctiveAction || '',
                  delai: '',
                  quand: '',
                  visa: '',
                  verification: '',
                });
              }
            }
          });
        }
      });
    });
    
    console.log(`[ActionsCorrectives] Total observations trouvées: ${totalObservations}`);
    console.log(`[ActionsCorrectives] Lignes générées: ${rows.length}`);
    
    // Ajouter les lignes sauvegardées qui ne correspondent à aucune observation actuelle
    // (pour garder les lignes ajoutées manuellement par l'auditeur)
    existingRowsMap.forEach((row) => {
      if (!rows.find((r) => r.id === row.id)) {
        rows.push(row);
      }
    });
    
    console.log(`[ActionsCorrectives] Lignes finales (avec lignes manuelles): ${rows.length}`);
    
    return rows;
  }, [currentAudit]);

  const [rows, setRows] = useState<CorrectiveActionRow[]>(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const handleAddRow = () => {
    const newRow: CorrectiveActionRow = {
      id: `new-${Date.now()}-${Math.random()}`,
      ecart: '',
      actionCorrective: '',
      delai: '',
      quand: '',
      visa: '',
      verification: '',
    };
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const handleFieldChange = (id: string, field: keyof CorrectiveActionRow, value: string) => {
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = async () => {
    if (!currentAudit) return;
    await updateCorrectiveActions(rows);
    alert('Actions correctives enregistrées avec succès');
  };

  const handleExportPDF = async () => {
    if (!currentAudit || !results) {
      alert('Impossible de générer le PDF : audit ou résultats manquants.');
      return;
    }
    setIsGeneratingPDF(true);
    try {
      await generatePDFReport(currentAudit, results);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert(
        `Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!currentAudit) {
    return (
      <Layout>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Aucun audit en cours
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 2 }}
          >
            Retour à l'accueil
          </Button>
        </Box>
      </Layout>
    );
  }

  // Générer des lignes vides pour compléter le tableau
  const emptyRows = Array.from({ length: EMPTY_VISIBLE_ROWS }, (_, i) => ({
    id: `empty-placeholder-${i}`,
    ecart: '',
    actionCorrective: '',
    delai: '',
    quand: '',
    visa: '',
    verification: '',
    isEmpty: true,
  }));

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 2,
            }}
          >
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/audit')}>
              Retour
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddRow}
                size="small"
              >
                Ajouter une ligne
              </Button>
              <Button variant="outlined" onClick={handleSave}>
                Enregistrer
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={
                  isGeneratingPDF ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <PictureAsPdfIcon />
                  )
                }
                onClick={handleExportPDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? 'Génération...' : 'Exporter en PDF'}
              </Button>
            </Box>
          </Box>

          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 1,
              mt: 2,
              mb: 3,
            }}
          >
            Actions Correctives Attendues
          </Typography>
        </Box>

        {/* Table */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1px solid #000',
            borderRadius: 0,
            '& .MuiTable-root': {
              borderCollapse: 'collapse',
            },
          }}
        >
          <Table size="small">
            {/* Définition des largeurs de colonnes */}
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '3%' }} />
            </colgroup>

            <TableHead>
              {/* Ligne principale de header */}
              <TableRow>
                <TableCell
                  rowSpan={2}
                  sx={{
                    ...headerCell,
                    borderRight: '1px solid #000',
                  }}
                >
                  Ecarts constatés
                </TableCell>
                <TableCell
                  rowSpan={2}
                  sx={{
                    ...headerCell,
                    borderRight: '1px solid #000',
                  }}
                >
                  Actions correctives définies par le responsable
                </TableCell>
                <TableCell
                  rowSpan={2}
                  sx={{
                    ...headerCell,
                    borderRight: '1px solid #000',
                  }}
                >
                  Délai
                </TableCell>
                <TableCell
                  colSpan={2}
                  sx={{
                    ...headerCell,
                    borderRight: '1px solid #000',
                    borderBottom: '1px solid #000',
                  }}
                >
                  Réalisation
                </TableCell>
                <TableCell
                  rowSpan={2}
                  sx={{
                    ...headerCell,
                    borderRight: '1px solid #000',
                  }}
                >
                  Vérification
                </TableCell>
                {/* Colonne invisible pour le bouton supprimer */}
                <TableCell
                  rowSpan={2}
                  sx={{
                    ...headerCell,
                    border: 'none',
                    backgroundColor: 'transparent',
                    padding: 0,
                    width: 32,
                    minWidth: 32,
                  }}
                />
              </TableRow>
              {/* Sous-header Réalisation */}
              <TableRow>
                <TableCell
                  sx={{
                    ...headerCell,
                    borderRight: '1px solid #000',
                    fontSize: '0.75rem',
                    py: '4px',
                  }}
                >
                  Quand
                </TableCell>
                <TableCell
                  sx={{
                    ...headerCell,
                    borderRight: '1px solid #000',
                    fontSize: '0.75rem',
                    py: '4px',
                  }}
                >
                  Visa
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {/* Lignes remplies */}
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.015)',
                    },
                  }}
                >
                  <TableCell sx={{ ...cellBorder, minHeight: 40 }}>
                    <InputBase
                      fullWidth
                      multiline
                      value={row.ecart}
                      onChange={(e) => handleFieldChange(row.id, 'ecart', e.target.value)}
                      placeholder=""
                      sx={inputStyle}
                    />
                  </TableCell>
                  <TableCell sx={cellBorder}>
                    <InputBase
                      fullWidth
                      multiline
                      value={row.actionCorrective}
                      onChange={(e) =>
                        handleFieldChange(row.id, 'actionCorrective', e.target.value)
                      }
                      placeholder=""
                      sx={inputStyle}
                    />
                  </TableCell>
                  <TableCell sx={cellBorder}>
                    <InputBase
                      fullWidth
                      value={row.delai}
                      onChange={(e) => handleFieldChange(row.id, 'delai', e.target.value)}
                      placeholder=""
                      sx={inputStyle}
                    />
                  </TableCell>
                  <TableCell sx={cellBorder}>
                    <InputBase
                      fullWidth
                      value={row.quand}
                      onChange={(e) => handleFieldChange(row.id, 'quand', e.target.value)}
                      placeholder=""
                      sx={inputStyle}
                    />
                  </TableCell>
                  <TableCell sx={cellBorder}>
                    <InputBase
                      fullWidth
                      value={row.visa}
                      onChange={(e) => handleFieldChange(row.id, 'visa', e.target.value)}
                      placeholder=""
                      sx={inputStyle}
                    />
                  </TableCell>
                  <TableCell sx={cellBorder}>
                    <InputBase
                      fullWidth
                      value={row.verification}
                      onChange={(e) => handleFieldChange(row.id, 'verification', e.target.value)}
                      placeholder=""
                      sx={inputStyle}
                    />
                  </TableCell>
                  {/* Bouton supprimer, visible au hover */}
                  <TableCell
                    sx={{
                      border: 'none',
                      padding: '0 2px',
                      width: 32,
                      minWidth: 32,
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRow(row.id)}
                      sx={{
                        opacity: hoveredRow === row.id ? 1 : 0,
                        transition: 'opacity 0.15s',
                        color: '#d32f2f',
                        padding: '4px',
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {/* Lignes vides pour compléter le tableau */}
              {emptyRows.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.015)',
                    },
                  }}
                  onClick={() => {
                    // Cliquer sur une ligne vide ajoute une nouvelle ligne éditable
                    handleAddRow();
                  }}
                >
                  <TableCell sx={{ ...cellBorder, height: 36 }}>&nbsp;</TableCell>
                  <TableCell sx={{ ...cellBorder, height: 36 }}>&nbsp;</TableCell>
                  <TableCell sx={{ ...cellBorder, height: 36 }}>&nbsp;</TableCell>
                  <TableCell sx={{ ...cellBorder, height: 36 }}>&nbsp;</TableCell>
                  <TableCell sx={{ ...cellBorder, height: 36 }}>&nbsp;</TableCell>
                  <TableCell sx={{ ...cellBorder, height: 36 }}>&nbsp;</TableCell>
                  <TableCell sx={{ border: 'none', width: 32, minWidth: 32 }} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Layout>
  );
}