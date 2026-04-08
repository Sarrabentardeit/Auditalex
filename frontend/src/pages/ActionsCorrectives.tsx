import { useState, useMemo, useEffect, useRef } from 'react';
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
import type { CorrectiveActionData, NonConformitySeverity } from '../types';
import { useSnackbar } from '../hooks/useSnackbar';
import { buildCorrectiveActionsTableData } from '../utils/correctiveActionsFromAudit';
import { sortCorrectiveActionRows } from '../utils/correctiveActionsOrder';

type CorrectiveActionRow = CorrectiveActionData;

/** Délai par défaut selon la sévérité (demande client) */
function getDefaultDelai(severity: NonConformitySeverity): string {
  if (severity === 'vert') return '';
  if (severity === 'rouge') return 'Immédiatement';
  if (severity === 'orange') return '72h00';
  return 'Prochain Audit'; // bleu
}

const SEVERITY_COLORS: Record<NonConformitySeverity, { bg: string; text: string }> = {
  rouge: { bg: '#c62828', text: '#fff' },
  orange: { bg: '#ed6c02', text: '#fff' },
  bleu: { bg: '#1482B7', text: '#fff' },
  vert: { bg: '#8CB33A', text: '#fff' },
};

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
  const { showSuccess, showError, SnackbarComponent } = useSnackbar();

  const initialRows = useMemo(() => {
    if (!currentAudit) {
      console.log('[ActionsCorrectives] Pas d\'audit chargé');
      return [];
    }
    return buildCorrectiveActionsTableData(currentAudit);
  }, [currentAudit]);

  const [rows, setRows] = useState<CorrectiveActionRow[]>(() => initialRows);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const initialRowsRef = useRef(initialRows);
  initialRowsRef.current = initialRows;

  // Ne resynchroniser que lors d'un changement d'audit : sinon chaque mise à jour
  // du store (sauvegarde différée, etc.) réinitialisait le tableau et effaçait la saisie en cours.
  useEffect(() => {
    if (!currentAudit) return;
    setRows(initialRowsRef.current);
  }, [currentAudit?.id]);

  const handleAddRow = () => {
    const newRow: CorrectiveActionRow = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ecart: '',
      actionCorrective: '',
      delai: '',
      quand: '',
      visa: '',
      verification: '',
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleFieldChange = (id: string, field: keyof CorrectiveActionRow, value: string) => {
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = async () => {
    if (!currentAudit) return;
    const ordered = sortCorrectiveActionRows(rowsRef.current, currentAudit);
    await updateCorrectiveActions(ordered);
    setRows(ordered);
    showSuccess('Actions correctives enregistrées avec succès');
  };

  const handleExportPDF = async () => {
    if (!currentAudit || !results) {
      showError('Impossible de générer le PDF : audit ou résultats manquants.');
      return;
    }
    setIsGeneratingPDF(true);
    try {
      await generatePDFReport(currentAudit, results);
      showSuccess('PDF généré avec succès !');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      showError(
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
            onClick={() => navigate('/dashboard')}
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 2 }}
          >
            Retour au tableau de bord
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
      {SnackbarComponent}
      <Box>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'flex-start' },
              gap: 2,
              mb: 2,
            }}
          >
            <Button 
              startIcon={<ArrowBackIcon />} 
              onClick={() => {
                // Naviguer vers l'audit en cours si disponible, sinon vers le dashboard
                if (currentAudit?.id) {
                  navigate(`/audit/${currentAudit.id}`);
                } else {
                  navigate('/dashboard');
                }
              }}
            >
              Retour
            </Button>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            '& .MuiTable-root': {
              borderCollapse: 'collapse',
              minWidth: 700,
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
                  Écarts constatés
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
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.015)',
                    },
                  }}
                >
                  <TableCell
                    sx={{
                      ...cellBorder,
                      minHeight: 40,
                      ...(row.severity && SEVERITY_COLORS[row.severity]
                        ? {
                            backgroundColor: SEVERITY_COLORS[row.severity].bg,
                            color: SEVERITY_COLORS[row.severity].text,
                            '& .MuiInputBase-input': { color: SEVERITY_COLORS[row.severity].text },
                            '& .MuiInputBase-input::placeholder': { opacity: 0.8 },
                          }
                        : {}),
                    }}
                  >
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
                  <TableCell
                    sx={{
                      ...cellBorder,
                      ...(row.severity && SEVERITY_COLORS[row.severity]
                        ? {
                            backgroundColor: SEVERITY_COLORS[row.severity].bg,
                            color: SEVERITY_COLORS[row.severity].text,
                            '& .MuiInputBase-input': { color: SEVERITY_COLORS[row.severity].text },
                          }
                        : {}),
                    }}
                  >
                    <InputBase
                      fullWidth
                      value={row.delai}
                      onChange={(e) => handleFieldChange(row.id, 'delai', e.target.value)}
                      placeholder={
                        row.severity ? getDefaultDelai(row.severity) : ''
                      }
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
                      aria-label="Supprimer cette ligne"
                      onClick={() => handleDeleteRow(row.id)}
                      sx={{
                        color: '#d32f2f',
                        padding: '4px',
                        opacity: 0.6,
                        '&:hover': { opacity: 1 },
                        transition: 'opacity 0.15s',
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