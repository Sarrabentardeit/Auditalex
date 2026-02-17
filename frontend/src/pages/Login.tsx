import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, checkAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Rediriger si déjà authentifié
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
      // Validation basique
      if (!email.trim() || !password) {
        setError('Veuillez remplir tous les champs');
        setLoading(false);
        return;
      }

      const success = await login(email.trim(), password);
      
      if (success) {
        navigate('/dashboard');
      } else {
        // Le message d'erreur sera géré par le catch ci-dessous
        setError('Email ou mot de passe incorrect, ou compte désactivé.');
      }
    } catch (err: any) {
      console.error('Erreur de connexion:', err);
      
      // Gérer l'erreur 429 (Too Many Requests)
      if (err?.status === 429) {
        const retrySeconds = err?.data?.retryAfter || 900; // 15 minutes par défaut
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
    <Container maxWidth="sm" sx={{ px: { xs: 1, sm: 2 } }}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, sm: 4 },
            width: '100%',
            maxWidth: 400,
            borderRadius: 3,
            mx: { xs: 1, sm: 0 },
          }}
        >
          {/* Logo Alexann' */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <Box
              component="img"
              src="/logo.jpeg"
              alt="Alexann'"
              sx={{
                height: { xs: 50, sm: 60 },
                objectFit: 'contain',
                display: 'block',
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </Box>
          
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            align="center" 
            sx={{ 
              mb: 2,
              fontFamily: "'Bebas Neue', sans-serif",
              color: '#1482B7',
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
            }}
          >
            Connexion
          </Typography>

          {error && (
            <Alert 
              severity={retryAfter ? "warning" : "error"} 
              sx={{ mb: 2 }}
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
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              margin="normal"
              autoComplete="email"
              autoFocus
            />

            <TextField
              fullWidth
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              margin="normal"
              autoComplete="current-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Se connecter'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}

