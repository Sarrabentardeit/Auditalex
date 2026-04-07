import { useState } from 'react';
import { Button, Box, Typography, CircularProgress } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { useCamera } from '../hooks/useCamera';
import { compressAndConvertToBase64 } from '../utils/imageCompression';

interface PhotoUploadProps {
  onPhotoAdded: (photoBase64: string) => void;
  disabled?: boolean;
}

export default function PhotoUpload({ onPhotoAdded, disabled = false }: PhotoUploadProps) {
  const { takePhoto, importFromGallery, isCameraAvailable } = useCamera();
  const [uploading, setUploading] = useState(false);

  const handleTakePhoto = async () => {
    if (disabled || uploading) return;
    
    setUploading(true);
    try {
      const file = await takePhoto();
      if (file) {
        const base64 = await compressAndConvertToBase64(file);
        onPhotoAdded(base64);
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleImportFromGallery = async () => {
    if (disabled || uploading) return;
    
    setUploading(true);
    try {
      const file = await importFromGallery();
      if (file) {
        const base64 = await compressAndConvertToBase64(file);
        onPhotoAdded(base64);
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Ajouter une photo :
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {isCameraAvailable && (
          <Button
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={16} /> : <CameraAltIcon />}
            onClick={handleTakePhoto}
            disabled={disabled || uploading}
            fullWidth
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
          >
            Prendre une photo
          </Button>
        )}
        
        <Button
          variant="outlined"
          startIcon={uploading ? <CircularProgress size={16} /> : <PhotoLibraryIcon />}
          onClick={handleImportFromGallery}
          disabled={disabled || uploading}
          fullWidth
          sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
        >
          Importer depuis la galerie
        </Button>
      </Box>
    </Box>
  );
}




