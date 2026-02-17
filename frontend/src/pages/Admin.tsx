import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useAuthStore } from '../store/authStore';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { User, UserRole } from '../types';
import { useSnackbar } from '../hooks/useSnackbar';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

export default function Admin() {
  const navigate = useNavigate();
  const {
    currentUser,
    isAuthenticated,
    isAdmin,
    users,
    loadAllUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserActive,
  } = useAuthStore();
  const { showSuccess, showError, SnackbarComponent } = useSnackbar();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'auditor' as UserRole,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !isAdmin()) {
      navigate('/dashboard');
      return;
    }

    loadAllUsers();
  }, [isAuthenticated, isAdmin, navigate, loadAllUsers]);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        name: user.name,
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        name: '',
        password: '',
        role: 'auditor',
      });
    }
    setError('');
    setSuccess('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'auditor',
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.email || !formData.name) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('Le mot de passe est obligatoire pour créer un utilisateur');
      return;
    }

    try {
      let success = false;
      if (editingUser) {
        // Mise à jour
        const updates: Partial<User> = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
        };
        if (formData.password) {
          updates.password = formData.password;
        }
        success = await updateUser(editingUser.id, updates);
      } else {
        // Création
        success = await createUser(
          formData.email,
          formData.name,
          formData.password,
          formData.role
        );
      }

      if (success) {
        setSuccess(editingUser ? 'Utilisateur mis à jour avec succès' : 'Utilisateur créé avec succès');
        setTimeout(() => {
          handleCloseDialog();
          loadAllUsers();
        }, 1000);
      } else {
        setError(editingUser ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création (email peut-être déjà utilisé)');
      }
    } catch (err) {
      setError('Une erreur est survenue');
    }
  };

  const handleDelete = async (userId: string) => {
    showConfirm(
      'Supprimer l\'utilisateur',
      'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.',
      async () => {
        const success = await deleteUser(userId);
        if (success) {
          showSuccess('Utilisateur supprimé avec succès');
          loadAllUsers();
        } else {
          showError('Erreur lors de la suppression');
        }
      }
    );
  };

  const handleToggleActive = async (userId: string) => {
    await toggleUserActive(userId);
    loadAllUsers();
  };

  if (!isAuthenticated || !isAdmin()) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      {SnackbarComponent}
      {ConfirmDialogComponent}
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mb: 4 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ minWidth: 44, minHeight: 44 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            Gestion des utilisateurs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
        >
          Créer un utilisateur
        </Button>
      </Box>

      {/* Liste des utilisateurs */}
      <TableContainer component={Paper} sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table sx={{ minWidth: { xs: 500, sm: undefined } }}>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role === 'admin' ? 'Administrateur' : 'Auditeur'}
                    color={user.role === 'admin' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={user.isActive}
                        onChange={() => handleToggleActive(user.id)}
                        disabled={user.id === currentUser?.id}
                      />
                    }
                    label={user.isActive ? 'Actif' : 'Inactif'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(user)}
                    disabled={user.id === currentUser?.id}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(user.id)}
                    disabled={user.id === currentUser?.id}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de création/édition */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Nom"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!editingUser}
            />

            <FormControl fullWidth>
              <InputLabel>Rôle</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                label="Rôle"
                disabled={editingUser?.id === currentUser?.id}
              >
                <MenuItem value="auditor">Auditeur</MenuItem>
                <MenuItem value="admin">Administrateur</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={editingUser ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}


