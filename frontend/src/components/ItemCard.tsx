import { 
  Box, 
  Button, 
  ButtonGroup, 
  TextField, 
  Typography,
  Divider,
  Chip,
  Paper,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { AuditItem } from '../types';
import { NOTE_LABELS } from '../types';
import { useAuditStore } from '../store/auditStore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhotoUpload from './PhotoUpload';
import PhotoGallery from './PhotoGallery';
import { useMemo, useState } from 'react';

interface ItemCardProps {
  item: AuditItem;
  categoryId: string;
  categoryItems: AuditItem[]; // Tous les items de la catégorie (conservé pour compatibilité)
}

export default function ItemCard({ item, categoryId, categoryItems: _categoryItems }: ItemCardProps) {
  const { 
    updateItemNonConformities, 
    updateItemKO, 
    addObservation,
    removeObservation,
    updateObservationAction,
    addPhoto, 
    removePhoto 
  } = useAuditStore();

  const [selectedObservationText, setSelectedObservationText] = useState<string>('');
  const [selectedActionForNewObservation, setSelectedActionForNewObservation] = useState<string>('');
  const [customObservationText, setCustomObservationText] = useState<string>('');
  const [showCustomObservationField, setShowCustomObservationField] = useState(false);

  const handleNonConformitiesChange = async (numberOfNonConformities: number | null) => {
    await updateItemNonConformities(categoryId, item.id, numberOfNonConformities);
  };

  const handleKOChange = async (ko: number) => {
    await updateItemKO(categoryId, item.id, ko);
  };

  const handleAddObservation = async () => {
    if (selectedObservationText && selectedObservationText !== '__CUSTOM__') {
      await addObservation(categoryId, item.id, selectedObservationText, selectedActionForNewObservation || undefined);
      setSelectedObservationText(''); // Réinitialiser la sélection
      setSelectedActionForNewObservation(''); // Réinitialiser l'action
    } else if (customObservationText.trim()) {
      await addObservation(categoryId, item.id, customObservationText.trim());
      setCustomObservationText('');
      setShowCustomObservationField(false);
    }
  };

  const handleRemoveObservation = async (observationId: string) => {
    await removeObservation(categoryId, item.id, observationId);
  };

  const handleUpdateObservationAction = async (observationId: string, action: string) => {
    await updateObservationAction(categoryId, item.id, observationId, action);
  };

  const getNoteColor = (note?: number) => {
    if (note === undefined) return 'default';
    if (note === 1.0) return 'success';
    if (note === 0.7) return 'info';
    if (note === 0.3) return 'warning';
    return 'error';
  };

  // Obtenir les observations déjà sélectionnées pour filtrer la liste
  const selectedObservationTexts = useMemo(() => {
    return new Set(item.observations.map(obs => obs.text));
  }, [item.observations]);

  // Filtrer les observations disponibles (exclure celles déjà sélectionnées)
  const availableObservations = useMemo(() => {
    return item.availableObservations.filter(obs => !selectedObservationTexts.has(obs));
  }, [item.availableObservations, selectedObservationTexts]);

  // Obtenir toutes les actions correctives disponibles
  const availableActions = useMemo(() => {
    return item.availableCorrectiveActions;
  }, [item.availableCorrectiveActions]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Info Section - Afficher seulement la note finale (résultat) */}
      {item.note !== undefined && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Note: ${item.note} (${NOTE_LABELS[item.note]})`}
            color={getNoteColor(item.note) as any}
            size="small"
          />
        </Box>
      )}

      {/* Non-Conformités Selection - Cacher la mécanique (classification, nombres) */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          État de l'item :
        </Typography>
        {item.classification === 'binary' ? (
          <ButtonGroup variant="outlined" fullWidth>
            <Button
              variant={item.numberOfNonConformities === 0 ? 'contained' : 'outlined'}
              onClick={() => handleNonConformitiesChange(0)}
              color="success"
            >
              Conforme (1)
            </Button>
            <Button
              variant={item.numberOfNonConformities === 1 ? 'contained' : 'outlined'}
              onClick={() => handleNonConformitiesChange(1)}
              color="error"
            >
              Non-conforme (0)
            </Button>
          </ButtonGroup>
        ) : (
          <ButtonGroup variant="outlined" fullWidth>
            <Button
              variant={item.numberOfNonConformities === 0 ? 'contained' : 'outlined'}
              onClick={() => handleNonConformitiesChange(0)}
              color="success"
            >
              Conforme (1)
            </Button>
            <Button
              variant={item.numberOfNonConformities === 1 ? 'contained' : 'outlined'}
              onClick={() => handleNonConformitiesChange(1)}
              color="info"
            >
              Mineur (0,7)
            </Button>
            <Button
              variant={item.numberOfNonConformities === 2 ? 'contained' : 'outlined'}
              onClick={() => handleNonConformitiesChange(2)}
              color="warning"
            >
              Moyen (0,3)
            </Button>
            <Button
              variant={item.numberOfNonConformities !== null && item.numberOfNonConformities >= 3 ? 'contained' : 'outlined'}
              onClick={() => handleNonConformitiesChange(3)}
              color="error"
            >
              Majeur (0)
            </Button>
          </ButtonGroup>
        )}
        {item.numberOfNonConformities === null && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
            Sélectionnez un état pour cet item
          </Typography>
        )}
      </Box>

      <Divider />

      {/* KO (Knock-Out) - Champ manuel indépendant des notes */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <WarningAmberIcon color="warning" fontSize="small" />
          <Typography variant="subtitle2">
            Nombre de KO (violations spécifiques engendrant une amende) :
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Les KO sont indépendants des notes. Saisissez manuellement le nombre de violations spécifiques qui engendrent une amende.
        </Typography>
        <TextField
          type="number"
          value={item.ko}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 0;
            handleKOChange(Math.max(0, value));
          }}
          inputProps={{ min: 0, step: 1 }}
          InputProps={{
            endAdornment: <InputAdornment position="end">KO</InputAdornment>,
          }}
          fullWidth
          variant="outlined"
          size="small"
          helperText={item.ko > 0 ? `Amende potentielle pour cet item : ${(item.ko * 2250).toLocaleString('fr-FR')} €` : 'Aucune amende'}
        />
      </Box>

      <Divider />

      {/* Commentaires (Observations) avec Actions Correctives liées */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Commentaires :
        </Typography>
        
        {/* Ajouter un commentaire via liste déroulante */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          {showCustomObservationField ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={customObservationText}
                onChange={(e) => setCustomObservationText(e.target.value)}
                placeholder="Saisissez votre commentaire personnalisé..."
                variant="outlined"
                autoFocus
              />
              {/* Action corrective pour le commentaire personnalisé */}
              {item.availableCorrectiveActions.length > 0 && (
                <FormControl fullWidth size="small">
                  <InputLabel>Action corrective (optionnelle)</InputLabel>
                  <Select
                    value={selectedActionForNewObservation}
                    onChange={(e) => setSelectedActionForNewObservation(e.target.value)}
                    label="Action corrective (optionnelle)"
                  >
                    <MenuItem value="">
                      <em>Aucune action</em>
                    </MenuItem>
                    {availableActions.map((action) => (
                      <MenuItem key={action} value={action}>
                        {action}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleAddObservation}
                  disabled={!customObservationText.trim()}
                >
                  Ajouter
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowCustomObservationField(false);
                    setCustomObservationText('');
                    setSelectedActionForNewObservation('');
                  }}
                >
                  Annuler
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {item.availableObservations.length > 0 ? (
                <>
                  <FormControl fullWidth size="small">
                    <InputLabel>Commentaire (sélectionner)</InputLabel>
                    <Select
                      value={selectedObservationText}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setShowCustomObservationField(true);
                        } else {
                          setSelectedObservationText(e.target.value);
                        }
                      }}
                      label="Commentaire (sélectionner)"
                    >
                      <MenuItem value="">
                        <em>Aucune sélection</em>
                      </MenuItem>
                      {availableObservations.map((observation) => (
                        <MenuItem key={observation} value={observation}>
                          {observation}
                        </MenuItem>
                      ))}
                      <MenuItem value="__CUSTOM__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                        + Ajouter un commentaire personnalisé...
                      </MenuItem>
                    </Select>
                  </FormControl>
                  
                  {/* Action corrective pour le nouveau commentaire */}
                  {selectedObservationText && selectedObservationText !== '__CUSTOM__' && item.availableCorrectiveActions.length > 0 && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Action corrective (optionnelle)</InputLabel>
                      <Select
                        value={selectedActionForNewObservation}
                        onChange={(e) => setSelectedActionForNewObservation(e.target.value)}
                        label="Action corrective (optionnelle)"
                      >
                        <MenuItem value="">
                          <em>Aucune action</em>
                        </MenuItem>
                        {availableActions.map((action) => (
                          <MenuItem key={action} value={action}>
                            {action}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddObservation}
                    disabled={!selectedObservationText || selectedObservationText === '__CUSTOM__'}
                  >
                    Ajouter
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setShowCustomObservationField(true)}
                    fullWidth
                  >
                    Ajouter un commentaire personnalisé
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>

        {/* Liste des commentaires sélectionnés avec leurs actions correctives */}
        {item.observations.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {item.observations.map((obs) => (
              <Box key={obs.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <Paper variant="outlined" sx={{ p: 1, flex: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {obs.text}
                    </Typography>
                  </Paper>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveObservation(obs.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                {/* Action corrective liée à ce commentaire */}
                {item.availableCorrectiveActions.length > 0 && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Action corrective</InputLabel>
                    <Select
                      value={obs.correctiveAction || ''}
                      onChange={(e) => handleUpdateObservationAction(obs.id, e.target.value)}
                      label="Action corrective"
                    >
                      <MenuItem value="">
                        <em>Aucune action</em>
                      </MenuItem>
                      {availableActions.map((action) => (
                        <MenuItem key={action} value={action}>
                          {action}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Divider />

      {/* Photos */}
      <Box>
        <PhotoUpload
          onPhotoAdded={(photoBase64) => addPhoto(categoryId, item.id, photoBase64)}
        />
        {item.photos.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <PhotoGallery
              photos={item.photos}
              onDelete={(index) => removePhoto(categoryId, item.id, index)}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
