import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Box, Paper, Button, CircularProgress, TextField, Tooltip } from '@mui/material';
import { useAuditStore } from '../store/auditStore';
import CategoryCard from '../components/CategoryCard';
import Layout from '../components/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { generatePDFReport } from '../utils/pdfExport';
import { loadCategoriesFromJSON } from '../services/dataLoader';
import { calculateResults } from '../utils/calculations';
import { logger } from '../utils/logger';
import { useSnackbar } from '../hooks/useSnackbar';

export default function Audit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  // Sélecteurs optimisés pour éviter les re-renders inutiles
  const currentAudit = useAuditStore((state) => state.currentAudit);
  const results = useAuditStore((state) => state.results);
  const updateAuditDate = useAuditStore((state) => state.updateAuditDate);
  const updateAuditAddress = useAuditStore((state) => state.updateAuditAddress);
  const loadAudit = useAuditStore((state) => state.loadAudit);
  const createAudit = useAuditStore((state) => state.createAudit);
  const markAuditAsCompleted = useAuditStore((state) => state.markAuditAsCompleted);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError, SnackbarComponent } = useSnackbar();
  
  // États locaux pour les champs de texte (réactivité immédiate)
  const [localDate, setLocalDate] = useState<string>('');
  const [localAddress, setLocalAddress] = useState<string>('');
  
  // Synchroniser les états locaux avec currentAudit
  useEffect(() => {
    if (currentAudit) {
      setLocalDate(currentAudit.dateExecution || '');
      setLocalAddress(currentAudit.adresse || '');
    }
  }, [currentAudit?.id, currentAudit?.dateExecution, currentAudit?.adresse]);

  // Mémoriser les résultats en ne dépendant QUE des données qui affectent les calculs
  // (pas l'adresse ni la date, seulement les catégories et leurs items)
  // Utiliser une clé de dépendance simple et efficace
  const calculationDeps = useMemo(() => {
    if (!currentAudit) return '';
    // Créer une clé simple basée uniquement sur les données qui affectent les calculs
    return currentAudit.categories.map(cat => 
      cat.items.map(item => 
        `${item.id}:${item.numberOfNonConformities ?? 'null'}:${item.isAudited ? '1' : '0'}:${item.ko}`
      ).join('|')
    ).join('||');
  }, [currentAudit?.categories]);

  const memoizedResults = useMemo(() => {
    if (!currentAudit) return null;
    return calculateResults(currentAudit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationDeps]);

  // Utiliser les résultats du store en priorité (ils sont déjà debounced)
  const displayResults = results || memoizedResults;

  // Tous les items doivent être contrôlés pour pouvoir terminer l'audit
  const allItemsControlled = useMemo(() => {
    if (!currentAudit) return false;
    return currentAudit.categories.every(cat =>
      cat.items.every(item => item.isAudited)
    );
  }, [currentAudit?.categories]);

  // Charger l'audit si un ID est fourni, sinon créer un nouvel audit
  // IMPORTANT: Utiliser useRef pour éviter les créations multiples
  const hasInitialized = React.useRef(false);
  
  useEffect(() => {
    // Protection contre les appels multiples
    if (hasInitialized.current) {
      return;
    }

    const initializeAudit = async () => {
      if (id) {
        // Charger un audit existant
        setLoading(true);
        hasInitialized.current = true;
        try {
          await loadAudit(id);
        } catch (error) {
          logger.error('Erreur lors du chargement de l\'audit:', error);
          navigate('/dashboard');
        } finally {
          setLoading(false);
        }
      } else {
        // Créer un nouvel audit UNE SEULE FOIS
        // IMPORTANT: Vérifier qu'il n'y a pas d'audit en cours non terminé
        const { currentAudit } = useAuditStore.getState();
        if (currentAudit && currentAudit.id && currentAudit.status !== 'completed') {
          logger.warn('[Audit] Un audit en cours existe déjà. Redirection vers cet audit:', currentAudit.id);
          navigate(`/audit/${currentAudit.id}`);
          return;
        }
        
        // Si un audit terminé existe, le réinitialiser pour permettre la création d'un nouveau
        if (currentAudit && currentAudit.status === 'completed') {
          logger.log('[Audit] Audit précédent terminé, réinitialisation pour créer un nouvel audit');
          useAuditStore.setState({ currentAudit: null });
        }
        
        setLoading(true);
        hasInitialized.current = true;
        try {
          logger.log('[Audit] Création d\'un nouvel audit...');
          const categories = await loadCategoriesFromJSON();
          const today = new Date().toISOString().split('T')[0];
          await createAudit(today, '', categories);
          logger.log('[Audit] Audit créé avec succès');
        } catch (error) {
          logger.error('Erreur lors de la création de l\'audit:', error);
          hasInitialized.current = false; // Permettre de réessayer en cas d'erreur
          navigate('/dashboard');
        } finally {
          setLoading(false);
        }
      }
    };

    initializeAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Seulement 'id' dans les dépendances pour éviter les re-créations

  const handleExportPDF = async () => {
    const pdfResults = results || memoizedResults;
    if (!currentAudit || !pdfResults) {
      logger.error('Erreur: currentAudit ou results est null', { currentAudit, results: pdfResults });
      showError('Impossible de générer le PDF : audit ou résultats manquants.');
      return;
    }
    
    setIsGeneratingPDF(true);
    try {
      logger.log('Début de la génération du PDF...', { audit: currentAudit, results: pdfResults });
      await generatePDFReport(currentAudit, pdfResults);
      logger.log('PDF généré avec succès');
      showSuccess('PDF généré avec succès !');
    } catch (error) {
      logger.error('Erreur lors de la génération du PDF:', error);
      showError(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

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

  return (
    <Layout>
      {SnackbarComponent}
      <Box>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            gap: 2,
            mb: 2 
          }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/dashboard')}
              sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
            >
              Retour
            </Button>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {displayResults && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={isGeneratingPDF ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
                  onClick={handleExportPDF}
                  disabled={isGeneratingPDF}
                  size="small"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  {isGeneratingPDF ? 'Génération...' : 'Exporter en PDF'}
                </Button>
              )}
              <Tooltip
                title={!allItemsControlled ? "Tous les items doivent être contrôlés avant de terminer l'audit" : ''}
              >
                <span>
                  <Button
                    variant="outlined"
                    color="success"
                    size="small"
                    disabled={!allItemsControlled}
                    onClick={async () => {
                      try {
                        await markAuditAsCompleted();
                        await new Promise(resolve => setTimeout(resolve, 300));
                        navigate('/dashboard');
                      } catch (error) {
                        logger.error('Erreur lors de la finalisation de l\'audit:', error);
                        showError('Erreur lors de la finalisation de l\'audit. Veuillez réessayer.');
                      }
                    }}
                  >
                    Terminer
                  </Button>
                </span>
              </Tooltip>
              <Button
                variant="contained"
                color="primary"
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/actions-correctives')}
              >
                Suivant
              </Button>
            </Box>
          </Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            Audit d'Hygiène
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 2, alignItems: 'stretch' }}>
            <TextField
              label="Date de l'exécution"
              type="date"
              value={localDate}
              onChange={(e) => {
                const newValue = e.target.value;
                // Mise à jour immédiate de l'état local (réactivité instantanée)
                setLocalDate(newValue);
                // Vérifier que l'audit a un ID avant de sauvegarder
                if (currentAudit?.id) {
                  // Sauvegarde en arrière-plan (non-bloquant)
                  updateAuditDate(newValue);
                }
              }}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ minWidth: { xs: '100%', sm: 200 } }}
              size="small"
              disabled={!currentAudit?.id || loading}
            />
            <TextField
              label="Adresse"
              value={localAddress}
              onChange={(e) => {
                const newValue = e.target.value;
                // Mise à jour immédiate de l'état local (réactivité instantanée)
                setLocalAddress(newValue);
                // Vérifier que l'audit a un ID avant de sauvegarder
                if (currentAudit?.id) {
                  // Sauvegarde en arrière-plan (non-bloquant)
                  updateAuditAddress(newValue);
                }
              }}
              placeholder="Saisissez l'adresse"
              sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { xs: 'none', sm: 1 } }}
              size="small"
              disabled={!currentAudit?.id || loading}
            />
          </Box>
          <Box 
            sx={{ 
              mt: 1.5, 
              mb: 1,
              px: 1.5,
              py: 0.75,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              display: 'inline-block'
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '0.7rem',
                display: 'block',
                lineHeight: 1.5,
                letterSpacing: '0.01em'
              }}
            >
              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>*</Box> 1 : conforme ; 0,7 : non-conformité mineure ; 0,3 : non-conformité moyenne ; 0 : non-conformité majeure
            </Typography>
          </Box>
        </Box>

        {/* Results Dashboard */}
        {displayResults && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 3 
          }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Score Total
              </Typography>
              <Typography variant="h4" fontWeight="bold" color={displayResults.totalScore !== null ? 'primary' : 'text.secondary'}>
                {displayResults.auditedCount !== undefined && displayResults.totalCount !== undefined
                  ? `${displayResults.auditedCount}/${displayResults.totalCount} · `
                  : ''}
                {displayResults.totalScore !== null ? `${displayResults.totalScore.toFixed(1)}%` : '— %'}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Nombre de KO
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={displayResults.numberOfKO > 0 ? 'error' : 'success'}
              >
                {displayResults.numberOfKO}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Amendes Potentielles
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={displayResults.potentialFines > 0 ? 'warning.main' : 'success'}
              >
                {displayResults.potentialFines.toFixed(0)} €
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Categories */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {currentAudit.categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </Box>
      </Box>
    </Layout>
  );
}
