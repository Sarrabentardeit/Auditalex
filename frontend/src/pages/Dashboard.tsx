import { useEffect, useState } from 'react';
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
  CircularProgress,
  Alert,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
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
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSnackbar } from '../hooks/useSnackbar';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { logger } from '../utils/logger';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, logout, isAdmin, users, loadAllUsers } = useAuthStore();
  const { audits, loadAllAudits, deleteAudit } = useAuditStore();
  const { showSuccess, showError, SnackbarComponent } = useSnackbar();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

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
  
  // Un audit est complété SI ET SEULEMENT SI status === 'completed'
  // Le status est la source de vérité (géré par le backend)
  const completedAudits = audits.filter(audit => audit.status === 'completed').length;
  const inProgressAudits = audits.filter(audit => audit.status === 'in_progress').length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {SnackbarComponent}
      {ConfirmDialogComponent}
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {/* Header élégant avec séparateur */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                fontWeight={700}
                sx={{
                  mb: 0.5,
                  color: 'text.primary',
                  letterSpacing: '-0.03em',
                  fontSize: { xs: '1.75rem', md: '2rem' },
                }}
              >
                Tableau de bord
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 1, fontSize: '0.95rem' }}
              >
                Bienvenue, <strong>{currentUser.name}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {isAdmin() && (
                <Button
                  variant="outlined"
                  startIcon={<AdminPanelSettingsIcon />}
                  onClick={handleAdminPanel}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 2.5,
                    py: 1,
                    borderWidth: 1.5,
                    fontWeight: 500,
                    '&:hover': {
                      borderWidth: 1.5,
                    },
                  }}
                >
                  Administration
                </Button>
              )}
              <Chip
                label={currentUser.role === 'admin' ? 'Administrateur' : 'Auditeur'}
                color={currentUser.role === 'admin' ? 'primary' : 'default'}
                size="small"
                sx={{
                  fontWeight: 600,
                  height: 32,
                  '& .MuiChip-label': {
                    px: 2,
                  },
                }}
              />
              <IconButton
                onClick={handleLogout}
                color="error"
                sx={{
                  ml: 0.5,
                  '&:hover': {
                    bgcolor: alpha('#f44336', 0.08),
                  },
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Box>
          </Box>
          <Box
            sx={{
              height: 1,
              bgcolor: 'divider',
              opacity: 0.3,
            }}
          />
        </Box>

      {/* Message d'erreur */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Statistiques - Design premium */}
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={3} 
            sx={{ mb: 5 }}
          >
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  border: '1px solid',
                  borderColor: alpha('#1482B7', 0.2),
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: `0 8px 24px ${alpha('#1482B7', 0.15)}`,
                    transform: 'translateY(-2px)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    bgcolor: 'primary.main',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h3"
                      fontWeight={700}
                      color="primary.main"
                      sx={{ mb: 0.5, lineHeight: 1.2 }}
                    >
                      {totalAudits}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Total des audits
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: alpha('#1482B7', 0.08),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ml: 2,
                    }}
                  >
                    <AssessmentIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                  </Box>
                </Box>
              </Paper>
            <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  border: '1px solid',
                  borderColor: alpha('#8CB33A', 0.2),
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: 'success.main',
                    boxShadow: `0 8px 24px ${alpha('#8CB33A', 0.15)}`,
                    transform: 'translateY(-2px)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    bgcolor: 'success.main',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h3"
                      fontWeight={700}
                      color="success.main"
                      sx={{ mb: 0.5, lineHeight: 1.2 }}
                    >
                      {completedAudits}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Audits complétés
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: alpha('#8CB33A', 0.08),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ml: 2,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 28, color: 'success.main' }} />
                  </Box>
                </Box>
              </Paper>
            <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  border: '1px solid',
                  borderColor: alpha('#ed6c02', 0.2),
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: 'warning.main',
                    boxShadow: `0 8px 24px ${alpha('#ed6c02', 0.15)}`,
                    transform: 'translateY(-2px)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    bgcolor: 'warning.main',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h3"
                      fontWeight={700}
                      color="warning.main"
                      sx={{ mb: 0.5, lineHeight: 1.2 }}
                    >
                      {inProgressAudits}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      En cours
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: alpha('#ed6c02', 0.08),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ml: 2,
                    }}
                  >
                    <PendingIcon sx={{ fontSize: 28, color: 'warning.main' }} />
                  </Box>
                </Box>
              </Paper>
          </Stack>

        {/* Actions */}
        <Box sx={{ mb: 5, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateAudit}
            size="large"
            sx={{
              px: 5,
              py: 1.75,
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: 3,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${alpha('#1482B7', 0.3)}`,
              background: 'linear-gradient(135deg, #1482B7 0%, #0F6A94 100%)',
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha('#1482B7', 0.4)}`,
                transform: 'translateY(-2px)',
                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            + CRÉER UN NOUVEL AUDIT
          </Button>
        </Box>

        {/* Liste des audits */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ color: 'text.primary', letterSpacing: '-0.01em' }}
          >
            Mes audits {isAdmin() && '(Tous les audits)'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {audits.length} {audits.length > 1 ? 'audits' : 'audit'}
          </Typography>
        </Box>

        {audits.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 8,
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
                const auditsByAuditor = audits.reduce((acc, audit) => {
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
                      defaultExpanded
                      elevation={0}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        overflow: 'hidden',
                        '&:before': {
                          display: 'none',
                        },
                        '&.Mui-expanded': {
                          margin: 0,
                        },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          bgcolor: alpha('#1482B7', 0.03),
                          px: 3,
                          py: 2,
                          '&:hover': {
                            bgcolor: alpha('#1482B7', 0.05),
                          },
                          '& .MuiAccordionSummary-content': {
                            my: 1,
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1.5,
                              bgcolor: alpha('#1482B7', 0.1),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                              {group.name}
                            </Typography>
                            {group.email && (
                              <Typography variant="caption" color="text.secondary">
                                {group.email}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mr: 2 }}>
                            <Chip
                              label={`${completedCount} complété${completedCount > 1 ? 's' : ''}`}
                              color="success"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                            <Chip
                              label={`${inProgressCount} en cours`}
                              color="warning"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {group.audits.length} {group.audits.length > 1 ? 'audits' : 'audit'}
                            </Typography>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0, pt: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, p: 2 }}>
                          {group.audits.map((audit) => {
                            const isCompleted = audit.status === 'completed';

                            return (
                              <Box key={audit.id}>
                                <Paper
                                  elevation={0}
                                  sx={{
                                    height: '100%',
                                    p: 3,
                                    border: '1px solid',
                                    borderColor: alpha('#000', 0.08),
                                    borderRadius: 3,
                                    bgcolor: 'background.paper',
                                    position: 'relative',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                      borderColor: isCompleted ? 'success.main' : 'warning.main',
                                      boxShadow: `0 8px 24px ${alpha(isCompleted ? '#8CB33A' : '#ed6c02', 0.12)}`,
                                      transform: 'translateY(-4px)',
                                    },
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                                    <Typography
                                      variant="subtitle1"
                                      fontWeight={700}
                                      sx={{
                                        flex: 1,
                                        fontSize: '1.05rem',
                                        lineHeight: 1.3,
                                        cursor: 'pointer',
                                      }}
                                      onClick={() => handleViewAudit(audit.id)}
                                    >
                                      Audit du {format(new Date(audit.dateExecution), 'dd/MM/yyyy', { locale: fr })}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                      <Chip
                                        label={isCompleted ? 'Complété' : 'En cours'}
                                        color={isCompleted ? 'success' : 'warning'}
                                        size="small"
                                        sx={{
                                          fontWeight: 600,
                                          height: 28,
                                          '& .MuiChip-label': {
                                            px: 1.5,
                                          },
                                        }}
                                      />
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAudit(audit.id, audit.dateExecution);
                                        }}
                                        sx={{
                                          '&:hover': {
                                            bgcolor: alpha('#f44336', 0.1),
                                          },
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1.5,
                                      mb: 2,
                                      py: 1,
                                      px: 1.5,
                                      borderRadius: 1.5,
                                      bgcolor: alpha('#000', 0.02),
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => handleViewAudit(audit.id)}
                                  >
                                    <LocationOnIcon sx={{ fontSize: 18, color: 'text.secondary', opacity: 0.6 }} />
                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                      {audit.adresse || 'Adresse non renseignée'}
                                    </Typography>
                                  </Box>
                                  <Box 
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
                                    onClick={() => handleViewAudit(audit.id)}
                                  >
                                    <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.5 }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                      Créé le {format(new Date(audit.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                    </Typography>
                                  </Box>
                                </Paper>
                              </Box>
                            );
                          })}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                });
              })()}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {audits.map((audit) => {
                // Le statut est la source de vérité
                const isCompleted = audit.status === 'completed';

                return (
                  <Box key={audit.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        height: '100%',
                        p: 3,
                        border: '1px solid',
                        borderColor: alpha('#000', 0.08),
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                        position: 'relative',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          borderColor: isCompleted ? 'success.main' : 'warning.main',
                          boxShadow: `0 8px 24px ${alpha(isCompleted ? '#8CB33A' : '#ed6c02', 0.12)}`,
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          sx={{
                            flex: 1,
                            fontSize: '1.05rem',
                            lineHeight: 1.3,
                            cursor: 'pointer',
                          }}
                          onClick={() => handleViewAudit(audit.id)}
                        >
                          Audit du {format(new Date(audit.dateExecution), 'dd/MM/yyyy', { locale: fr })}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip
                            label={isCompleted ? 'Complété' : 'En cours'}
                            color={isCompleted ? 'success' : 'warning'}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              height: 28,
                              '& .MuiChip-label': {
                                px: 1.5,
                              },
                            }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAudit(audit.id, audit.dateExecution);
                            }}
                            sx={{
                              '&:hover': {
                                bgcolor: alpha('#f44336', 0.1),
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          mb: 2,
                          py: 1,
                          px: 1.5,
                          borderRadius: 1.5,
                          bgcolor: alpha('#000', 0.02),
                        }}
                      >
                        <LocationOnIcon sx={{ fontSize: 18, color: 'text.secondary', opacity: 0.6 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {audit.adresse || 'Adresse non renseignée'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.5 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Créé le {format(new Date(audit.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
            </Box>
          )
        )}
        </>
      )}
      </Container>
    </Box>
  );
}
