import { Snackbar, Alert } from '@mui/material';
import { useOffline } from '../hooks/useOffline';

export default function OfflineIndicator() {
  const { isOnline, wasOffline } = useOffline();

  return (
    <>
      {/* Notification de reconnexion */}
      <Snackbar
        open={wasOffline && isOnline}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Connexion rétablie
        </Alert>
      </Snackbar>

      {/* Notification de déconnexion */}
      <Snackbar
        open={!isOnline}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="warning" sx={{ width: '100%' }}>
          Mode hors ligne - Les données sont sauvegardées localement
        </Alert>
      </Snackbar>
    </>
  );
}




