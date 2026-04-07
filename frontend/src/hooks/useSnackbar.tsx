import { useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';
import type { AlertProps } from '@mui/material/Alert';

type AlertSeverity = NonNullable<AlertProps['severity']>;

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertSeverity;
}

export function useSnackbar() {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showSnackbar = useCallback((message: string, severity: AlertSeverity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const SnackbarComponent = (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={6000}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ maxWidth: { xs: 'calc(100vw - 32px)', sm: '100%' } }}
    >
      <Alert
        onClose={hideSnackbar}
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );

  return {
    showSnackbar,
    hideSnackbar,
    showSuccess: (message: string) => showSnackbar(message, 'success'),
    showError: (message: string) => showSnackbar(message, 'error'),
    showWarning: (message: string) => showSnackbar(message, 'warning'),
    showInfo: (message: string) => showSnackbar(message, 'info'),
    SnackbarComponent,
  };
}

