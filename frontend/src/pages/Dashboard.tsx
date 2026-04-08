import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  IconButton,
  Alert,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton,
  TextField,
  InputAdornment,
  LinearProgress,
  Avatar,
  Tooltip,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useAuthStore } from '../store/authStore';
import { useAuditStore } from '../store/auditStore';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import BarChartIcon from '@mui/icons-material/BarChart';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Audit } from '../types';

/** Calcule le pourcentage d'items audités sur le total */
function computeAuditProgress(audit: Audit): number | null {
  const allItems = audit.categories.flatMap(c => c.items);
  if (allItems.length === 0) return null;
  const audited = allItems.filter(item => item.isAudited).length;
  return Math.round((audited / allItems.length) * 100);
}

/** Initiales depuis un nom */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Grouper les audits par jour (date d'exécution), triés du plus récent au plus ancien */
function groupAuditsByDay(auditsList: Audit[]): Array<{ dayKey: string; dayLabel: string; audits: Audit[] }> {
  const sorted = [...auditsList].sort((a, b) => {
    const dateA = new Date(a.dateExecution || a.createdAt).getTime();
    const dateB = new Date(b.dateExecution || b.createdAt).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const byDay = new Map<string, Audit[]>();
  for (const audit of sorted) {
    const raw = audit.dateExecution || audit.createdAt;
    const dayKey = raw.includes('T') ? raw.split('T')[0] : raw.substring(0, 10);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(audit);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, audits]) => ({
      dayKey,
      dayLabel: format(new Date(dayKey), 'd MMMM yyyy', { locale: fr }),
      audits,
    }));
}
import { useSnackbar } from '../hooks/useSnackbar';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { logger } from '../utils/logger';
import { loadCategoriesFromJSON } from '../services/dataLoader';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, logout, isAdmin, users, loadAllUsers } = useAuthStore();
  const { audits, loadAllAudits, deleteAudit, loadAudit } = useAuditStore();
  const { showSuccess, showError, SnackbarComponent } = useSnackbar();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Précharger le JSON pour accélérer l'ouverture des audits
    loadCategoriesFromJSON().catch(() => {});

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          loadAllAudits(),
          isAdmin() ? loadAllUsers() : Promise.resolve(), // Charger les utilisateurs seulement pour l'admin
        ]);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Recharger les audits à chaque fois qu'on arrive sur le dashboard
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateAudit = () => {
    navigate('/audit/new');
  };

  const handleViewAudit = (auditId: string) => {
    navigate(`/audit/${auditId}`);
  };

  const handlePrefetchAudit = (auditId: string) => {
    if (!auditId || auditId.startsWith('temp_')) return;
    loadAudit(auditId).catch(() => {});
  };

  const handleAdminPanel = () => {
    navigate('/admin');
  };

  const handleDeleteAudit = (auditId: string, auditDate: string) => {
    showConfirm(
      'Supprimer l\'audit',
      `Êtes-vous sûr de vouloir supprimer l'audit du ${format(new Date(auditDate), 'dd/MM/yyyy', { locale: fr })} ? Cette action est irréversible.`,
      async () => {
        try {
          await deleteAudit(auditId);
          showSuccess('Audit supprimé avec succès');
          // Recharger la liste des audits
          await loadAllAudits();
        } catch (error) {
          logger.error('Erreur lors de la suppression de l\'audit:', error);
          showError('Erreur lors de la suppression de l\'audit. Veuillez réessayer.');
        }
      }
    );
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  // Calculer les statistiques basées sur le status réel
  const totalAudits = audits.length;
  const completedAudits = audits.filter(audit => audit.status === 'completed').length;
  const inProgressAudits = audits.filter(audit => audit.status === 'in_progress').length;

  // Audits filtrés par recherche + statut
  const filteredAudits = useMemo(() => {
    let result = audits;
    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(a =>
        (a.adresse || '').toLowerCase().includes(q) ||
        (a.dateExecution || '').includes(q) ||
        (a.auditorName || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [audits, statusFilter, searchQuery]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {SnackbarComponent}
      {ConfirmDialogComponent}

      {/* ─── Hero Banner ─── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0F6A94 0%, #1482B7 60%, #6F8F2E 100%)',
          pt: { xs: 2.5, sm: 3 },
          pb: { xs: 2.5, sm: 3 },
          px: { xs: 2, sm: 4 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -60,
            right: -60,
            width: 280,
            height: 280,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.05),
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -40,
            left: -30,
            width: 180,
            height: 180,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.04),
          },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 3,
            position: 'relative',
            zIndex: 1,
          }}>
            <Box>
              <Typography
                variant="overline"
                sx={{ color: alpha('#fff', 0.7), letterSpacing: 2, fontSize: '0.7rem', fontWeight: 600 }}
              >
                Espace Auditeur
              </Typography>
              <Typography
                variant="h4"
                component="h1"
                fontWeight={800}
                sx={{
                  color: '#fff',
                  letterSpacing: '-0.03em',
                  fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2.1rem' },
                  lineHeight: 1.2,
                  mt: 0.5,
                }}
              >
                Tableau de bord
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.75), mt: 1 }}>
                Bienvenue, <strong style={{ color: '#fff' }}>{currentUser.name}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {isAdmin() && (
                <Button
                  variant="outlined"
                  startIcon={<AdminPanelSettingsIcon />}
                  onClick={handleAdminPanel}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 2,
                    py: 0.9,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#fff',
                    borderColor: alpha('#fff', 0.5),
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: alpha('#fff', 0.1),
                    },
                  }}
                >
                  Administration
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateAudit}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: { xs: 2.5, sm: 3 },
                  py: 1,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  bgcolor: '#fff',
                  color: '#0F6A94',
                  boxShadow: `0 4px 14px ${alpha('#000', 0.2)}`,
                  '&:hover': {
                    bgcolor: alpha('#fff', 0.9),
                    boxShadow: `0 6px 20px ${alpha('#000', 0.25)}`,
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s',
                }}
              >
                Nouvel audit
              </Button>
              <Tooltip title="Se déconnecter">
                <IconButton
                  onClick={handleLogout}
                  sx={{
                    color: alpha('#fff', 0.8),
                    bgcolor: alpha('#fff', 0.1),
                    '&:hover': { bgcolor: alpha('#fff', 0.2), color: '#fff' },
                  }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 }, mt: 0, pt: { xs: 2, sm: 3 }, position: 'relative', zIndex: 2 }}>

      {/* Message d'erreur */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {[1, 2, 3].map((i) => (
              <Paper key={i} elevation={2} sx={{ p: 3, flex: 1, borderRadius: 3 }}>
                <Skeleton variant="text" width={40} height={50} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="70%" height={24} />
                <Skeleton variant="rounded" height={4} sx={{ mt: 2, borderRadius: 2 }} />
              </Paper>
            ))}
          </Stack>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Paper key={i} elevation={2} sx={{ p: 3, flex: '1 1 280px', maxWidth: 400, borderRadius: 3 }}>
                <Skeleton variant="text" width="60%" height={28} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="100%" height={24} sx={{ mb: 1 }} />
                <Skeleton variant="rounded" height={4} sx={{ mt: 2, borderRadius: 2 }} />
              </Paper>
            ))}
          </Box>
        </Box>
      ) : (
        <>
          {/* ─── Statistiques flottantes ─── */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: { xs: 3, sm: 4 } }}
          >
            {/* Total */}
            {[
              {
                value: totalAudits,
                label: 'Total des audits',
                sub: `${totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0}% complétés`,
                icon: <AssessmentIcon sx={{ fontSize: 26, color: 'primary.main' }} />,
                color: '#1482B7',
                progress: totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0,
                progressColor: 'primary' as const,
              },
              {
                value: completedAudits,
                label: 'Audits complétés',
                sub: `sur ${totalAudits} au total`,
                icon: <CheckCircleIcon sx={{ fontSize: 26, color: 'success.main' }} />,
                color: '#8CB33A',
                progress: totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0,
                progressColor: 'success' as const,
              },
              {
                value: inProgressAudits,
                label: 'En cours',
                sub: inProgressAudits === 0 ? 'Aucun en attente' : `${inProgressAudits} à finaliser`,
                icon: <PendingIcon sx={{ fontSize: 26, color: 'warning.main' }} />,
                color: '#ed6c02',
                progress: totalAudits > 0 ? Math.round((inProgressAudits / totalAudits) * 100) : 0,
                progressColor: 'warning' as const,
              },
            ].map((stat) => (
              <Paper
                key={stat.label}
                elevation={3}
                sx={{
                  flex: 1,
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  borderTop: `4px solid ${stat.color}`,
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 10px 28px ${alpha(stat.color, 0.18)}`,
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography
                      variant="h3"
                      fontWeight={800}
                      sx={{ lineHeight: 1, fontSize: { xs: '2.2rem', sm: '2.6rem' }, color: stat.color }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
                      {stat.label}
                    </Typography>
                  </Box>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: 2,
                    bgcolor: alpha(stat.color, 0.1),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {stat.icon}
                  </Box>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">{stat.sub}</Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: stat.color }}>
                      {stat.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stat.progress}
                    color={stat.progressColor}
                    sx={{ height: 5, borderRadius: 3, bgcolor: alpha(stat.color, 0.12) }}
                  />
                </Box>
              </Paper>
            ))}
          </Stack>

        {/* ─── Recherche + Filtres ─── */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: { xs: 2, sm: 2.5 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <TextField
            placeholder="Rechercher par adresse, date ou auditeur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: alpha('#000', 0.02),
              },
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <FilterListIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 600 }}>
              Filtrer :
            </Typography>
            {(['all', 'in_progress', 'completed'] as const).map((filter) => (
              <Chip
                key={filter}
                label={
                  filter === 'all'
                    ? `Tous (${totalAudits})`
                    : filter === 'in_progress'
                    ? `En cours (${inProgressAudits})`
                    : `Complétés (${completedAudits})`
                }
                onClick={() => setStatusFilter(filter)}
                color={
                  statusFilter === filter
                    ? filter === 'completed'
                      ? 'success'
                      : filter === 'in_progress'
                      ? 'warning'
                      : 'primary'
                    : 'default'
                }
                variant={statusFilter === filter ? 'filled' : 'outlined'}
                size="small"
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Paper>

        {/* Titre section */}
        <Box sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}>
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
            {isAdmin() ? 'Tous les audits' : 'Mes audits'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>{filteredAudits.length}</strong> {filteredAudits.length > 1 ? 'audits' : 'audit'}
            {(searchQuery || statusFilter !== 'all') && ` sur ${totalAudits}`}
          </Typography>
        </Box>

        {filteredAudits.length === 0 && audits.length > 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              textAlign: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 3,
            }}
          >
            <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              Aucun audit ne correspond à votre recherche
            </Typography>
            <Button
              sx={{ mt: 2, textTransform: 'none' }}
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            >
              Réinitialiser les filtres
            </Button>
          </Paper>
        ) : audits.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 8 },
              textAlign: 'center',
              border: '2px dashed',
              borderColor: alpha('#1482B7', 0.2),
              borderRadius: 3,
              bgcolor: alpha('#1482B7', 0.02),
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                bgcolor: alpha('#1482B7', 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.6 }} />
            </Box>
            <Typography variant="h6" color="text.primary" sx={{ mb: 1, fontWeight: 600 }}>
              Aucun audit pour le moment
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              Commencez par créer votre premier audit d'hygiène pour gérer vos inspections efficacement
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateAudit}
              sx={{
                px: 4,
                py: 1.5,
                fontWeight: 600,
                borderRadius: 3,
                textTransform: 'none',
                boxShadow: `0 4px 12px ${alpha('#1482B7', 0.3)}`,
              }}
            >
              Créer votre premier audit
            </Button>
          </Paper>
        ) : (
          // Si admin : grouper par auditeur avec accordéons
          // Sinon : affichage normal
          isAdmin() ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(() => {
                // Créer un map des utilisateurs pour enrichir les audits
                const usersMap = new Map(users.map(user => [user.id, user]));
                
                // Grouper les audits par auditeur
                // Normaliser les auditorId pour éviter les doublons (string vs ObjectId)
                const auditsByAuditor = filteredAudits.reduce((acc, audit) => {
                  // Normaliser l'ID de l'auditeur (toujours en string)
                  const auditorId = String(audit.auditorId || 'unknown');
                  
                  // Essayer de récupérer les infos depuis l'audit, sinon depuis la liste des utilisateurs
                  let auditorName = audit.auditorName;
                  let auditorEmail = audit.auditorEmail;
                  
                  // Chercher dans la map des utilisateurs avec l'ID normalisé
                  // Essayer aussi avec tous les formats possibles de l'ID
                  let user = usersMap.get(auditorId);
                  if (!user) {
                    // Essayer de trouver l'utilisateur par email si l'ID ne correspond pas
                    const userByEmail = Array.from(usersMap.values()).find(u => 
                      u.email === auditorEmail || 
                      (auditorEmail && u.email?.toLowerCase() === auditorEmail.toLowerCase())
                    );
                    if (userByEmail) {
                      user = userByEmail;
                      // Mettre à jour les infos avec celles de l'utilisateur trouvé
                      auditorName = auditorName || user.name;
                      auditorEmail = auditorEmail || user.email;
                    }
                  } else {
                    auditorName = auditorName || user.name;
                    auditorEmail = auditorEmail || user.email;
                  }
                  
                  // Si toujours pas de nom, utiliser l'ID comme fallback
                  if (!auditorName) {
                    auditorName = `Auditeur ${auditorId.substring(0, 8)}...`;
                  }
                  
                  // Utiliser le nom et l'email comme clé de groupement pour éviter les doublons
                  // Si deux audits ont le même nom/email mais des IDs différents, les regrouper
                  const groupKey = auditorName && auditorEmail 
                    ? `${auditorName.toLowerCase().trim()}_${auditorEmail.toLowerCase().trim()}` 
                    : auditorId;
                  
                  if (!acc[groupKey]) {
                    acc[groupKey] = {
                      id: auditorId,
                      name: auditorName,
                      email: auditorEmail,
                      audits: [],
                    };
                  }
                  acc[groupKey].audits.push(audit);
                  return acc;
                }, {} as Record<string, { id: string; name: string; email?: string; audits: typeof audits }>);

                const auditorGroups = Object.values(auditsByAuditor).sort((a, b) => 
                  a.name.localeCompare(b.name)
                );

                return auditorGroups.map((group) => {
                  const completedCount = group.audits.filter(a => a.status === 'completed').length;
                  const inProgressCount = group.audits.filter(a => a.status === 'in_progress').length;

                  return (
                    <Accordion
                      key={group.id}
                      elevation={2}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '12px !important',
                        overflow: 'hidden',
                        '&:before': { display: 'none' },
                        '&.Mui-expanded': { margin: 0 },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          px: 3,
                          py: 1.5,
                          '&:hover': { bgcolor: alpha('#1482B7', 0.04) },
                          '& .MuiAccordionSummary-content': { my: 1 },
                        }}
                      >
                        <Box sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: { xs: 1.5, sm: 2 },
                          width: '100%',
                          minWidth: 0,
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: { xs: 'none', sm: 1 } }}>
                            <Avatar
                              sx={{
                                width: 44,
                                height: 44,
                                flexShrink: 0,
                                bgcolor: alpha('#1482B7', 0.12),
                                color: 'primary.main',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                              }}
                            >
                              {getInitials(group.name)}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }} title={group.name}>
                                {group.name}
                              </Typography>
                              {group.email && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={group.email}>
                                  {group.email}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip label={`${completedCount} complété${completedCount > 1 ? 's' : ''}`} color="success" size="small" sx={{ fontWeight: 600 }} />
                            <Chip label={`${inProgressCount} en cours`} color="warning" size="small" sx={{ fontWeight: 600 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {group.audits.length} audit{group.audits.length > 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 2, pt: 0 }}>
                        {groupAuditsByDay(group.audits).map(({ dayKey, dayLabel, audits: dayAudits }) => (
                          <Box key={dayKey} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
                              <Divider sx={{ flex: 1 }} />
                              <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                                {dayLabel}
                              </Typography>
                              <Divider sx={{ flex: 1 }} />
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                              {dayAudits.map((audit) => {
                                const isCompleted = audit.status === 'completed';
                                const progress = computeAuditProgress(audit);
                                return (
                                  <AuditCard
                                    key={audit.id}
                                    audit={audit}
                                    isCompleted={isCompleted}
                                    progress={progress}
                                    onView={handleViewAudit}
                                    onDelete={handleDeleteAudit}
                                    onPrefetch={handlePrefetchAudit}
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  );
                });
              })()}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {groupAuditsByDay(filteredAudits).map(({ dayKey, dayLabel, audits: dayAudits }) => (
                <Box key={dayKey} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Divider sx={{ flex: 1 }} />
                    <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                      {dayLabel}
                    </Typography>
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                    {dayAudits.map((audit) => {
                      const isCompleted = audit.status === 'completed';
                      const progress = computeAuditProgress(audit);
                      return (
                        <AuditCard
                          key={audit.id}
                          audit={audit}
                          isCompleted={isCompleted}
                          progress={progress}
                          onView={handleViewAudit}
                          onDelete={handleDeleteAudit}
                          onPrefetch={handlePrefetchAudit}
                        />
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          )
        )}
        </>
      )}
      </Container>
    </Box>
  );
}

// ─── Composant carte d'audit réutilisable ───
interface AuditCardProps {
  audit: Audit;
  isCompleted: boolean;
  progress: number | null;
  onView: (id: string) => void;
  onDelete: (id: string, date: string) => void;
  onPrefetch: (id: string) => void;
}

function AuditCard({ audit, isCompleted, progress, onView, onDelete, onPrefetch }: AuditCardProps) {
  const statusColor = isCompleted ? '#8CB33A' : '#ed6c02';
  const allItems = audit.categories.flatMap(c => c.items);
  const auditedCount = allItems.filter(i => i.isAudited).length;
  const totalCount = allItems.length;

  return (
    <Paper
      elevation={0}
      onMouseEnter={() => onPrefetch(audit.id)}
      onClick={() => onView(audit.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onView(audit.id)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: `4px solid ${statusColor}`,
        borderRadius: 3,
        bgcolor: 'background.paper',
        cursor: 'pointer',
        outline: 'none',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        '&:hover': {
          boxShadow: `0 8px 28px ${alpha(statusColor, 0.18)}`,
          transform: 'translateY(-3px)',
          borderColor: statusColor,
          '& .audit-arrow': { opacity: 1, transform: 'translateX(0)' },
        },
        '&:focus-visible': { outline: `2px solid #1482B7`, outlineOffset: 2 },
      }}
    >
      {/* Header carte */}
      <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 1.5, flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="caption" fontWeight={600} sx={{ color: statusColor, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
              {isCompleted ? '✓ Complété' : '⏳ En cours'}
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ fontSize: '0.95rem', lineHeight: 1.3, color: 'text.primary', mt: 0.25 }}
            >
              Audit du {format(new Date(audit.dateExecution), 'dd MMM yyyy', { locale: fr })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ArrowForwardIosIcon
              className="audit-arrow"
              sx={{ fontSize: 12, color: statusColor, opacity: 0, transform: 'translateX(-4px)', transition: 'all 0.2s' }}
            />
            <Tooltip title="Supprimer" arrow>
              <IconButton
                size="small"
                color="error"
                aria-label={`Supprimer l'audit du ${format(new Date(audit.dateExecution), 'dd/MM/yyyy', { locale: fr })}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(audit.id, audit.dateExecution);
                }}
                sx={{
                  opacity: 0.5,
                  '&:hover': { opacity: 1, bgcolor: alpha('#f44336', 0.1) },
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Adresse */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <LocationOnIcon sx={{ fontSize: 15, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
            {audit.adresse || 'Adresse non renseignée'}
          </Typography>
        </Box>

        {/* Date création */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.disabled">
            {format(new Date(audit.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
          </Typography>
        </Box>
      </Box>

      {/* Footer avec barre de progression */}
      {progress !== null && (
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2, pt: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <BarChartIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {auditedCount}/{totalCount} contrôles
              </Typography>
            </Box>
            <Typography variant="caption" fontWeight={700} sx={{ color: statusColor }}>
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: alpha(statusColor, 0.12),
              '& .MuiLinearProgress-bar': { bgcolor: statusColor, borderRadius: 2 },
            }}
          />
        </Box>
      )}
    </Paper>
  );
}
