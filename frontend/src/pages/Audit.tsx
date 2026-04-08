import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Box, Paper, Button, CircularProgress, TextField, Tooltip, Skeleton, alpha } from '@mui/material';
import { useAuditStore } from '../store/auditStore';
import { useAuthStore } from '../store/authStore';
import CategoryCard from '../components/CategoryCard';
import Layout from '../components/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EuroIcon from '@mui/icons-material/Euro';
import { loadCategoriesFromJSON } from '../services/dataLoader';
import { calculateResults } from '../utils/calculations';
import { logger } from '../utils/logger';
import { useSnackbar } from '../hooks/useSnackbar';
import { usePDFExport } from '../hooks/usePDFExport';

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
  const { openPDFPreview, isGenerating: isGeneratingPDF, PDFExportModal } = usePDFExport();
  // Skeleton immédiat à l'ouverture d'un audit (id présent = on charge)
  const [loading, setLoading] = useState(!!(id && id !== 'new'));
  const [expandedItemKey, setExpandedItemKey] = useState<string | null>(null);
  const { showError, SnackbarComponent } = useSnackbar();
  
  // États locaux pour les champs de texte (réactivité immédiate)
  const [localDate, setLocalDate] = useState<string>('');
  const [localAddress, setLocalAddress] = useState<string>('');
  
  // Synchroniser les états locaux avec currentAudit (format yyyy-MM-dd pour input date)
  useEffect(() => {
    if (currentAudit) {
      const raw = currentAudit.dateExecution || '';
      const dateStr = raw ? (raw.includes('T') ? raw.split('T')[0] : raw.substring(0, 10)) : '';
      setLocalDate(dateStr);
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
  const hasInitialized = React.useRef(false);
  const lastLoadedId = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    // Scroll to top à chaque ouverture d'audit
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    // Réinitialiser quand on change d'audit (navigation vers un autre)
    if (id !== lastLoadedId.current) {
      hasInitialized.current = false;
      lastLoadedId.current = id;
    }
    if (hasInitialized.current) return;

    const initializeAudit = async () => {
      if (id) {
        // Déjà chargé (ex: préchargement au survol) → affichage immédiat
        const { currentAudit: cur } = useAuditStore.getState();
        if (cur?.id === id) {
          setLoading(false);
          hasInitialized.current = true;
          lastLoadedId.current = id;
          return;
        }
        setLoading(true);
        hasInitialized.current = true;
        try {
          await loadAudit(id);
        } catch (error) {
          logger.error('Erreur chargement audit:', error);
          showError('Impossible de charger l\'audit. Vérifiez votre connexion ou que l\'audit existe.');
          navigate('/dashboard');
        } finally {
          setLoading(false);
        }
      } else {
        // Créer un nouvel audit UNE SEULE FOIS
        const { currentAudit } = useAuditStore.getState();
        const { currentUser } = useAuthStore.getState();

        if (currentAudit && currentAudit.id) {
          const belongsToCurrentUser =
            !currentUser || currentAudit.auditorId === currentUser.id;

          if (belongsToCurrentUser && currentAudit.status !== 'completed') {
            navigate(`/audit/${currentAudit.id}`);
            return;
          }

          useAuditStore.setState({ currentAudit: null });
        }
        
        setLoading(true);
        hasInitialized.current = true;
        try {
          const categories = await loadCategoriesFromJSON();
          const today = new Date().toISOString().split('T')[0];
          await createAudit(today, '', categories);
        } catch (error) {
          logger.error('Erreur création audit:', error);
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
      showError('Impossible de générer le PDF : audit ou résultats manquants.');
      return;
    }
    try {
      await openPDFPreview(currentAudit, pdfResults);
    } catch (error) {
      logger.error('Erreur génération PDF:', error);
      showError(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading && id) {
    // Skeleton pour donner l'impression de chargement immédiat
    return (
      <Layout>
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Skeleton variant="rounded" width={80} height={36} />
            <Skeleton variant="rounded" width={120} height={36} />
            <Skeleton variant="rounded" width={100} height={36} />
          </Box>
          <Typography variant="h4" sx={{ mb: 2 }}>Audit d'Hygiène</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Skeleton variant="rounded" width={200} height={56} />
            <Skeleton variant="rounded" sx={{ flex: 1 }} height={56} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            <Skeleton variant="rounded" height={100} />
            <Skeleton variant="rounded" height={100} />
            <Skeleton variant="rounded" height={100} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        </Box>
      </Layout>
    );
  }

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
      {PDFExportModal}
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
                  variant="contained"
                  color="primary"
                  startIcon={isGeneratingPDF ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
                  onClick={handleExportPDF}
                  disabled={isGeneratingPDF}
                  size="small"
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    background: 'linear-gradient(135deg, #1482B7 0%, #0F6A94 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #1482B7 0%, #0a5070 100%)' },
                  }}
                >
                  {isGeneratingPDF ? 'Génération...' : 'Exporter PDF'}
                </Button>
              )}
              <Tooltip
                title={!allItemsControlled ? "Tous les items doivent être contrôlés avant de terminer l'audit" : ''}
              >
                <span>
                  <Button
                    variant={allItemsControlled ? 'contained' : 'outlined'}
                    color="success"
                    size="small"
                    disabled={!allItemsControlled}
                    onClick={async () => {
                      try {
                        await markAuditAsCompleted();
                        await new Promise(resolve => setTimeout(resolve, 300));
                        navigate('/dashboard');
                      } catch (error) {
                        logger.error('Erreur finalisation audit:', error);
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
                fontSize: '0.75rem',
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
        {displayResults && (() => {
          const scoreColor = '#1482B7';
          const koColor = displayResults.numberOfKO > 0 ? '#d32f2f' : '#8CB33A';
          const fineColor = displayResults.potentialFines > 0 ? '#ed6c02' : '#8CB33A';

          const statCard = (
            icon: React.ReactNode,
            label: string,
            value: React.ReactNode,
            accentColor: string,
            sub?: string
          ) => (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                border: '1px solid',
                borderColor: alpha(accentColor, 0.2),
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 3,
                  bgcolor: accentColor,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {label}
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    sx={{ color: accentColor, lineHeight: 1.2, fontSize: { xs: '1.6rem', sm: '2rem' } }}
                  >
                    {value}
                  </Typography>
                  {sub && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {sub}
                    </Typography>
                  )}
                </Box>
                <Box sx={{
                  width: 44, height: 44, borderRadius: 2, flexShrink: 0, ml: 1.5,
                  bgcolor: alpha(accentColor, 0.1),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {icon}
                </Box>
              </Box>
            </Paper>
          );

          return (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 3,
            }}>
              {statCard(
                <AssessmentIcon sx={{ fontSize: 24, color: scoreColor }} />,
                'Score Total',
                displayResults.totalScore !== null ? `${displayResults.totalScore.toFixed(1)}%` : '— %',
                scoreColor,
                displayResults.auditedCount !== undefined && displayResults.totalCount !== undefined
                  ? `${displayResults.auditedCount} / ${displayResults.totalCount} items contrôlés`
                  : undefined,
              )}
              {statCard(
                <WarningAmberIcon sx={{ fontSize: 24, color: koColor }} />,
                'Non-conformités KO',
                displayResults.numberOfKO,
                koColor,
                displayResults.numberOfKO > 0 ? 'Violations engendrant une amende' : 'Aucun KO détecté',
              )}
              {statCard(
                <EuroIcon sx={{ fontSize: 24, color: fineColor }} />,
                'Amendes Potentielles',
                `${displayResults.potentialFines.toFixed(0)} €`,
                fineColor,
                displayResults.potentialFines > 0 ? `${displayResults.numberOfKO} KO × 2 250 €` : 'Aucune amende',
              )}
            </Box>
          );
        })()}

        {/* Categories */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {currentAudit.categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              expandedItemKey={expandedItemKey}
              onExpandedChange={setExpandedItemKey}
            />
          ))}
        </Box>
      </Box>
    </Layout>
  );
}
