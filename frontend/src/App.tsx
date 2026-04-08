import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { CircularProgress, Box, Snackbar, Alert } from '@mui/material';
import { useState } from 'react';
import OfflineIndicator from './components/OfflineIndicator';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy loading des pages pour améliorer la performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const Audit = lazy(() => import('./pages/Audit'));
const ActionsCorrectives = lazy(() => import('./pages/ActionsCorrectives'));

// Composant de chargement
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </Box>
);

function App() {
  const navigate = useNavigate();
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpiredOpen(true);
      // Redirection douce après 3 secondes pour laisser le temps de lire le message
      setTimeout(() => {
        setSessionExpiredOpen(false);
        navigate('/login', { replace: true });
      }, 3000);
    };

    window.addEventListener('auth:sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('auth:sessionExpired', handleSessionExpired);
  }, [navigate]);

  return (
    <>
      {/* Notification de session expirée */}
      <Snackbar
        open={sessionExpiredOpen}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" variant="filled" sx={{ width: '100%', fontWeight: 600 }}>
          Votre session a expiré. Redirection vers la page de connexion...
        </Alert>
      </Snackbar>

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Route publique */}
          <Route path="/login" element={<Login />} />
        
        {/* Routes protégées */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit/new"
          element={
            <ProtectedRoute>
              <Audit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit/:id"
          element={
            <ProtectedRoute>
              <Audit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/actions-correctives"
          element={
            <ProtectedRoute>
              <ActionsCorrectives />
            </ProtectedRoute>
          }
        />
        
          {/* Redirection par défaut */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <OfflineIndicator />
    </>
  );
}

export default App;

