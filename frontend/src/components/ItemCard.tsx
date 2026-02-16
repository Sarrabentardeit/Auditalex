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
import React, { useMemo, useState, useCallback } from 'react';
import { shallow } from 'zustand/shallow';

interface ItemCardProps {
  item: AuditItem;
  categoryId: string;
  categoryItems: AuditItem[]; // Tous les items de la catégorie (conservé pour compatibilité)
}

function ItemCard({ item, categoryId, categoryItems: _categoryItems }: ItemCardProps) {
  // Sélecteurs optimisés : ne s'abonnent qu'aux actions nécessaires, pas à tout le store
  const updateItemNonConformities = useAuditStore((state) => state.updateItemNonConformities);
  const updateItemKO = useAuditStore((state) => state.updateItemKO);
  const addObservation = useAuditStore((state) => state.addObservation);
  const removeObservation = useAuditStore((state) => state.removeObservation);
  const updateObservationAction = useAuditStore((state) => state.updateObservationAction);
  const addPhoto = useAuditStore((state) => state.addPhoto);
  const removePhoto = useAuditStore((state) => state.removePhoto);

  const [selectedObservationText, setSelectedObservationText] = useState<string>('');
  const [selectedActionForNewObservation, setSelectedActionForNewObservation] = useState<string>('');
  const [customObservationText, setCustomObservationText] = useState<string>('');
  const [showCustomObservationField, setShowCustomObservationField] = useState(false);
  const [customActionText, setCustomActionText] = useState<string>('');
  const [showCustomActionField, setShowCustomActionField] = useState<{ [key: string]: boolean }>({});

  // Mémoriser les handlers pour éviter les re-renders
  const handleNonConformitiesChange = useCallback(async (numberOfNonConformities: number | null) => {
    await updateItemNonConformities(categoryId, item.id, numberOfNonConformities);
  }, [categoryId, item.id, updateItemNonConformities]);

  const handleKOChange = useCallback(async (ko: number) => {
    await updateItemKO(categoryId, item.id, ko);
  }, [categoryId, item.id, updateItemKO]);

  const handleAddObservation = useCallback(async () => {
    if (selectedObservationText && selectedObservationText !== '__CUSTOM__') {
      await addObservation(categoryId, item.id, selectedObservationText, selectedActionForNewObservation || undefined);
      setSelectedObservationText(''); // Réinitialiser la sélection
      setSelectedActionForNewObservation(''); // Réinitialiser l'action
    } else if (customObservationText.trim()) {
      await addObservation(categoryId, item.id, customObservationText.trim());
      setCustomObservationText('');
      setShowCustomObservationField(false);
    }
  }, [categoryId, item.id, selectedObservationText, selectedActionForNewObservation, customObservationText, addObservation]);

  const handleRemoveObservation = useCallback(async (observationId: string) => {
    await removeObservation(categoryId, item.id, observationId);
  }, [categoryId, item.id, removeObservation]);

  const handleUpdateObservationAction = useCallback(async (observationId: string, action: string) => {
    // Si l'action est "__CUSTOM__", afficher le champ texte personnalisé
    if (action === '__CUSTOM__') {
      setShowCustomActionField(prev => ({ ...prev, [observationId]: true }));
      return;
    }
    await updateObservationAction(categoryId, item.id, observationId, action);
  }, [categoryId, item.id, updateObservationAction]);

  const handleSaveCustomAction = useCallback(async (observationId: string, customAction: string) => {
    if (customAction.trim()) {
      await updateObservationAction(categoryId, item.id, observationId, customAction.trim());
      setShowCustomActionField(prev => ({ ...prev, [observationId]: false }));
      setCustomActionText('');
    }
  }, [categoryId, item.id, updateObservationAction]);

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
                <>
                  {showCustomActionField['__NEW__'] ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={customActionText}
                        onChange={(e) => setCustomActionText(e.target.value)}
                        placeholder="Saisissez votre action corrective personnalisée..."
                        variant="outlined"
                        autoFocus
                      />
                      <Button
                        variant="contained"
                        onClick={() => {
                          setSelectedActionForNewObservation(customActionText.trim());
                          setShowCustomActionField(prev => ({ ...prev, '__NEW__': false }));
                          setCustomActionText('');
                        }}
                        disabled={!customActionText.trim()}
                      >
                        OK
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setShowCustomActionField(prev => ({ ...prev, '__NEW__': false }));
                          setCustomActionText('');
                        }}
                      >
                        Annuler
                      </Button>
                    </Box>
                  ) : (
                    <FormControl fullWidth size="small">
                      <InputLabel>Action corrective (optionnelle)</InputLabel>
                      <Select
                        value={selectedActionForNewObservation}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setShowCustomActionField(prev => ({ ...prev, '__NEW__': true }));
                          } else {
                            setSelectedActionForNewObservation(e.target.value);
                          }
                        }}
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
                        <MenuItem value="__CUSTOM__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                          + Ajouter une action corrective personnalisée...
                        </MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </>
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
                    <>
                      {showCustomActionField['__NEW_OBS__'] ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            value={customActionText}
                            onChange={(e) => setCustomActionText(e.target.value)}
                            placeholder="Saisissez votre action corrective personnalisée..."
                            variant="outlined"
                            autoFocus
                          />
                          <Button
                            variant="contained"
                            onClick={() => {
                              setSelectedActionForNewObservation(customActionText.trim());
                              setShowCustomActionField(prev => ({ ...prev, '__NEW_OBS__': false }));
                              setCustomActionText('');
                            }}
                            disabled={!customActionText.trim()}
                          >
                            OK
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setShowCustomActionField(prev => ({ ...prev, '__NEW_OBS__': false }));
                              setCustomActionText('');
                            }}
                          >
                            Annuler
                          </Button>
                        </Box>
                      ) : (
                        <FormControl fullWidth size="small">
                          <InputLabel>Action corrective (optionnelle)</InputLabel>
                          <Select
                            value={selectedActionForNewObservation}
                            onChange={(e) => {
                              if (e.target.value === '__CUSTOM__') {
                                setShowCustomActionField(prev => ({ ...prev, '__NEW_OBS__': true }));
                              } else {
                                setSelectedActionForNewObservation(e.target.value);
                              }
                            }}
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
                            <MenuItem value="__CUSTOM__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                              + Ajouter une action corrective personnalisée...
                            </MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </>
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
                  <>
                    {showCustomActionField[obs.id] ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={customActionText}
                          onChange={(e) => setCustomActionText(e.target.value)}
                          placeholder="Saisissez votre action corrective personnalisée..."
                          variant="outlined"
                          autoFocus
                        />
                        <Button
                          variant="contained"
                          onClick={() => handleSaveCustomAction(obs.id, customActionText)}
                          disabled={!customActionText.trim()}
                        >
                          OK
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setShowCustomActionField(prev => ({ ...prev, [obs.id]: false }));
                            setCustomActionText('');
                          }}
                        >
                          Annuler
                        </Button>
                      </Box>
                    ) : (
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
                          <MenuItem value="__CUSTOM__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                            + Ajouter une action corrective personnalisée...
                          </MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </>
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

// Mémoriser le composant pour éviter les re-renders inutiles
export default React.memo(ItemCard);
