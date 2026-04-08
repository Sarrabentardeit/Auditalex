import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  LinearProgress,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { generatePDFReport, generatePDFReportAsBase64 } from '../utils/pdfExport';
import type { Audit, AuditResults } from '../types';

interface PDFState {
  open: boolean;
  phase: 'generating' | 'preview' | 'idle';
  step: string;
  percent: number;
  pdfUrl: string | null;
  pdfBase64: string | null;
  fileName: string;
}

export function usePDFExport() {
  const [state, setState] = useState<PDFState>({
    open: false,
    phase: 'idle',
    step: '',
    percent: 0,
    pdfUrl: null,
    pdfBase64: null,
    fileName: '',
  });

  const blobUrlRef = useRef<string | null>(null);

  const handleClose = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setState({
      open: false,
      phase: 'idle',
      step: '',
      percent: 0,
      pdfUrl: null,
      pdfBase64: null,
      fileName: '',
    });
  }, []);

  const handleDownload = useCallback(() => {
    if (!state.pdfBase64 || !state.fileName) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${state.pdfBase64}`;
    link.download = state.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [state.pdfBase64, state.fileName]);

  const openPDFPreview = useCallback(async (audit: Audit, results: AuditResults) => {
    const fileName = `audit-hygiene-${audit.dateExecution}-${Date.now()}.pdf`;

    setState({
      open: true,
      phase: 'generating',
      step: 'Initialisation...',
      percent: 0,
      pdfUrl: null,
      pdfBase64: null,
      fileName,
    });

    try {
      const onProgress = (step: string, percent: number) => {
        setState((prev) => ({ ...prev, step, percent }));
      };

      const base64 = await generatePDFReportAsBase64(audit, results, onProgress);

      // Create blob URL for iframe preview
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = url;

      setState((prev) => ({
        ...prev,
        phase: 'preview',
        step: 'Terminé !',
        percent: 100,
        pdfUrl: url,
        pdfBase64: base64,
      }));
    } catch (error) {
      handleClose();
      throw error;
    }
  }, [handleClose]);

  const PDFExportModal = (
    <Dialog
      open={state.open}
      onClose={state.phase === 'generating' ? undefined : handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: state.phase === 'preview' ? '90vh' : 'auto',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PictureAsPdfIcon color="error" />
          <Typography variant="h6" fontWeight={700}>
            {state.phase === 'generating' ? 'Génération du PDF...' : 'Prévisualisation du PDF'}
          </Typography>
        </Box>
        {state.phase !== 'generating' && (
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          p: state.phase === 'preview' ? 0 : 3,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {state.phase === 'generating' && (
          <Box sx={{ py: 4, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CircularProgress size={24} />
              <Typography variant="body1" color="text.secondary">
                {state.step}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={state.percent}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: 'linear-gradient(90deg, #1482B7 0%, #8CB33A 100%)',
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Traitement en cours...
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {state.percent}%
              </Typography>
            </Box>
          </Box>
        )}

        {state.phase === 'preview' && state.pdfUrl && (
          <iframe
            src={state.pdfUrl}
            style={{ width: '100%', flex: 1, border: 'none', minHeight: 0 }}
            title="Prévisualisation PDF"
          />
        )}
      </DialogContent>

      {state.phase === 'preview' && (
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ textTransform: 'none' }}>
            Fermer
          </Button>
          <Button
            onClick={handleDownload}
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #1482B7 0%, #0F6A94 100%)',
            }}
          >
            Télécharger le PDF
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );

  return {
    openPDFPreview,
    isGenerating: state.phase === 'generating',
    PDFExportModal,
  };
}
