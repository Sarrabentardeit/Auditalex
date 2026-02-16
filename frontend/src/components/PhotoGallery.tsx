import { useState } from 'react';
import {
  Box,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

interface PhotoGalleryProps {
  photos: string[]; // Array de base64 strings
  onDelete: (index: number) => void;
}

export default function PhotoGallery({ photos, onDelete }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (photos.length === 0) {
    return null;
  }

  const handleDelete = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    // Note: Pour PhotoGallery, on utilise directement onDelete car c'est un composant enfant
    // La confirmation peut être gérée au niveau parent si nécessaire
    onDelete(index);
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Photos ({photos.length})
      </Typography>
      
      <ImageList cols={3} gap={8} sx={{ mb: 2 }}>
        {photos.map((photo, index) => (
          <ImageListItem
            key={index}
            sx={{
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8,
              },
            }}
            onClick={() => setSelectedPhoto(photo)}
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <ImageListItemBar
              title={`Photo ${index + 1}`}
              actionIcon={
                <IconButton
                  sx={{ color: 'white' }}
                  onClick={(e) => handleDelete(index, e)}
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            />
          </ImageListItem>
        ))}
      </ImageList>

      {/* Dialog pour voir la photo en grand */}
      <Dialog
        open={selectedPhoto !== null}
        onClose={() => setSelectedPhoto(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Photo</Typography>
            <IconButton onClick={() => setSelectedPhoto(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Photo agrandie"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}


