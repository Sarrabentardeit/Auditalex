import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function useConfirmDialog() {
  const [dialog, setDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void
    ) => {
      setDialog({
        open: true,
        title,
        message,
        onConfirm,
        onCancel,
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    setDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    dialog.onConfirm();
    handleClose();
  }, [dialog, handleClose]);

  const handleCancel = useCallback(() => {
    if (dialog.onCancel) {
      dialog.onCancel();
    }
    handleClose();
  }, [dialog, handleClose]);

  const ConfirmDialogComponent = (
    <Dialog
      open={dialog.open}
      onClose={handleCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      PaperProps={{
        sx: {
          borderRadius: 2,
          minWidth: { xs: '90vw', sm: 400 },
          maxWidth: { xs: '95vw', sm: 500 },
          mx: { xs: 1, sm: 2 },
        },
      }}
    >
      <DialogTitle id="confirm-dialog-title" sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
        {dialog.title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description" sx={{ fontFamily: 'Montserrat, sans-serif' }}>
          {dialog.message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          sx={{ textTransform: 'none', fontFamily: 'Montserrat, sans-serif' }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          autoFocus
          sx={{ textTransform: 'none', fontFamily: 'Montserrat, sans-serif' }}
        >
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );

  return {
    showConfirm,
    ConfirmDialogComponent,
  };
}

