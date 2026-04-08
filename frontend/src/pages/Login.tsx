import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  alpha,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useAuthStore } from '../store/authStore';
import { loadCategoriesFromJSON } from '../services/dataLoader';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, checkAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
    loadCategoriesFromJSON().catch(() => {});
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRetryAfter(null);
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        setError('Veuillez remplir tous les champs');
        setLoading(false);
        return;
      }

      const success = await login(email.trim(), password);

      if (success) {
        navigate('/dashboard');
      } else {
        setError('Email ou mot de passe incorrect, ou compte désactivé.');
      }
    } catch (err: any) {
      console.error('Erreur de connexion:', err);
      if (err?.status === 429) {
        const retrySeconds = err?.data?.retryAfter || 900;
        setRetryAfter(retrySeconds);
        setError(`Trop de tentatives de connexion. Veuillez attendre ${Math.ceil(retrySeconds / 60)} minutes avant de réessayer.`);
      } else if (err?.message?.includes('connecter au serveur')) {
        setError('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:3000');
      } else {
        setError(err?.message || 'Une erreur est survenue lors de la connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0F6A94 0%, #1482B7 45%, #6F8F2E 100%)',
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Cercles décoratifs en arrière-plan */}
      <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{
          position: 'absolute', top: '-15%', right: '-10%',
          width: { xs: 260, md: 400 }, height: { xs: 260, md: 400 },
          borderRadius: '50%',
          background: alpha('#8CB33A', 0.15),
        }} />
        <Box sx={{
          position: 'absolute', bottom: '-10%', left: '-8%',
          width: { xs: 200, md: 320 }, height: { xs: 200, md: 320 },
          borderRadius: '50%',
          background: alpha('#ffffff', 0.07),
        }} />
        <Box sx={{
          position: 'absolute', top: '40%', left: '5%',
          width: 120, height: 120,
          borderRadius: '50%',
          background: alpha('#8CB33A', 0.1),
        }} />
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 420,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
      >
        {/* Bandeau couleur en haut */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1482B7 0%, #0F6A94 100%)',
            py: { xs: 3, sm: 4 },
            px: { xs: 3, sm: 4 },
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#ffffff',
              borderRadius: 3,
              px: 2.5,
              py: 1.25,
              mb: 2,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            }}
          >
            <Box
              component="img"
              src="/logo.jpeg"
              alt="Alexann'"
              sx={{
                height: { xs: 44, sm: 54 },
                objectFit: 'contain',
                display: 'block',
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const wrapper = target.parentElement;
                if (wrapper) wrapper.style.display = 'none';
                const fallback = wrapper?.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'block';
              }}
            />
          </Box>
          {/* Fallback texte logo */}
          <Typography
            sx={{
              display: 'none',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '2rem',
              color: '#fff',
              letterSpacing: '0.06em',
              mb: 2,
            }}
          >
            Alex<Box component="span" sx={{ color: '#8CB33A' }}>ann'</Box>
          </Typography>

          <Typography
            variant="h5"
            sx={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: '#ffffff',
              letterSpacing: '0.08em',
              fontSize: { xs: '1.4rem', sm: '1.6rem' },
              opacity: 0.95,
            }}
          >
            Espace Auditeur
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: alpha('#ffffff', 0.7), mt: 0.5, fontSize: '0.8rem' }}
          >
            Hygiène et qualité agroalimentaire
          </Typography>
        </Box>

        {/* Formulaire */}
        <Box sx={{ p: { xs: 3, sm: 4 }, bgcolor: 'background.paper' }}>
          {error && (
            <Alert
              severity={retryAfter ? 'warning' : 'error'}
              sx={{ mb: 3, borderRadius: 2 }}
              action={
                retryAfter && (
                  <Typography variant="caption" color="text.secondary">
                    Réessayer dans {Math.ceil(retryAfter / 60)} min
                  </Typography>
                )
              }
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Adresse email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  mt: 1,
                  py: 1.5,
                  gap: 1,
                  fontWeight: 700,
                  fontSize: '1rem',
                  letterSpacing: '0.03em',
                  background: 'linear-gradient(135deg, #1482B7 0%, #0F6A94 100%)',
                  boxShadow: `0 4px 14px ${alpha('#1482B7', 0.4)}`,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1482B7 0%, #0a5070 100%)',
                    boxShadow: `0 6px 20px ${alpha('#1482B7', 0.5)}`,
                    transform: 'translateY(-1px)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #1482B7 0%, #0F6A94 100%)',
                    opacity: 0.7,
                  },
                }}
                disabled={loading}
                aria-busy={loading}
              >
                {loading && <CircularProgress size={20} color="inherit" />}
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
            </Box>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}
