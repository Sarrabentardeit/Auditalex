import {
  Box,
  Button,
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
  IconButton,
  alpha,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { AuditItem } from '../types';
import { NOTE_LABELS } from '../types';
import { useAuditStore } from '../store/auditStore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhotoUpload from './PhotoUpload';
import PhotoGallery from './PhotoGallery';
import React, { useMemo, useState, useCallback, useRef } from 'react';

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
  const itemCardRef = useRef<HTMLDivElement>(null);

  // Garder l'item visible après ajout de commentaire ou photo (éviter oublis)
  const scrollItemIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      itemCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

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
      setSelectedObservationText('');
      setSelectedActionForNewObservation('');
      scrollItemIntoView();
      // Ne pas replier l'item : le client veut voir la saisie apparaître tout de suite dans la liste
    } else if (customObservationText.trim()) {
      await addObservation(categoryId, item.id, customObservationText.trim(), selectedActionForNewObservation || undefined);
      setCustomObservationText('');
      setShowCustomObservationField(false);
      setSelectedActionForNewObservation('');
      scrollItemIntoView();
      // Ne pas replier l'item : le client veut voir la saisie apparaître tout de suite dans la liste
    }
  }, [categoryId, item.id, selectedObservationText, selectedActionForNewObservation, customObservationText, addObservation, scrollItemIntoView]);

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

  const getNoteColor = (note?: number): 'default' | 'success' | 'info' | 'warning' | 'error' => {
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

  const handlePhotoAdded = useCallback(async (photoBase64: string) => {
    await addPhoto(categoryId, item.id, photoBase64);
    scrollItemIntoView(); // Rester positionné sur l'item après photo (important sur mobile)
  }, [categoryId, item.id, addPhoto, scrollItemIntoView]);

  return (
    <Box ref={itemCardRef} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Info Section - Afficher seulement la note finale (résultat) */}
      {item.note !== undefined && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Note: ${item.note} (${NOTE_LABELS[item.note]})`}
            color={getNoteColor(item.note)}
            size="small"
          />
        </Box>
      )}

      {/* Non-Conformités Selection */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          État de l'item :
        </Typography>
        {item.classification === 'binary' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            {[
              { value: 0, label: 'Conforme', sublabel: 'Note : 1', icon: <CheckCircleIcon />, color: '#8CB33A', activeText: '#fff' },
              { value: 1, label: 'Non-conforme', sublabel: 'Note : 0', icon: <CancelIcon />, color: '#d32f2f', activeText: '#fff' },
            ].map(({ value, label, sublabel, icon, color, activeText }) => {
              const isSelected = item.numberOfNonConformities === value;
              return (
                <Box
                  key={value}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNonConformitiesChange(isSelected ? null : value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNonConformitiesChange(isSelected ? null : value)}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 0.75, p: { xs: 1.5, sm: 2 },
                    border: '2px solid',
                    borderColor: isSelected ? color : alpha(color, 0.25),
                    borderRadius: 2.5,
                    cursor: 'pointer',
                    bgcolor: isSelected ? alpha(color, 0.08) : 'background.paper',
                    transition: 'all 0.18s ease',
                    outline: 'none',
                    '&:hover': { borderColor: color, bgcolor: alpha(color, 0.05) },
                    '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 2 },
                    userSelect: 'none',
                  }}
                >
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '50%',
                    bgcolor: isSelected ? color : alpha(color, 0.1),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.18s ease',
                  }}>
                    {React.cloneElement(icon, {
                      sx: { fontSize: 22, color: isSelected ? activeText : color },
                    })}
                  </Box>
                  <Typography variant="body2" fontWeight={isSelected ? 700 : 500} sx={{ color: isSelected ? color : 'text.primary', lineHeight: 1.2, textAlign: 'center' }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: isSelected ? alpha(color, 0.8) : 'text.secondary' }}>
                    {sublabel}
                  </Typography>
                  {isSelected && (
                    <CheckCircleOutlineIcon sx={{ fontSize: 14, color, position: 'absolute', top: 8, right: 8 }} />
                  )}
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            {[
              { value: 0, label: 'Conforme', sublabel: 'Note : 1', icon: <CheckCircleIcon />, color: '#8CB33A' },
              { value: 1, label: 'Mineur', sublabel: 'Note : 0,7', icon: <InfoIcon />, color: '#1482B7' },
              { value: 2, label: 'Moyen', sublabel: 'Note : 0,3', icon: <ReportProblemIcon />, color: '#ed6c02' },
              { value: 3, label: 'Majeur', sublabel: 'Note : 0', icon: <CancelIcon />, color: '#d32f2f' },
            ].map(({ value, label, sublabel, icon, color }) => {
              const isSelected = value === 3
                ? (item.numberOfNonConformities !== null && item.numberOfNonConformities >= 3)
                : item.numberOfNonConformities === value;
              const handleClick = () => handleNonConformitiesChange(isSelected ? null : value);
              return (
                <Box
                  key={value}
                  role="button"
                  tabIndex={0}
                  onClick={handleClick}
                  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                  sx={{
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 0.75, p: { xs: 1.25, sm: 1.75 },
                    border: '2px solid',
                    borderColor: isSelected ? color : alpha(color, 0.25),
                    borderRadius: 2.5,
                    cursor: 'pointer',
                    bgcolor: isSelected ? alpha(color, 0.08) : 'background.paper',
                    transition: 'all 0.18s ease',
                    outline: 'none',
                    '&:hover': { borderColor: color, bgcolor: alpha(color, 0.05) },
                    '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 2 },
                    userSelect: 'none',
                  }}
                >
                  <Box sx={{
                    width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 }, borderRadius: '50%',
                    bgcolor: isSelected ? color : alpha(color, 0.1),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.18s ease',
                  }}>
                    {React.cloneElement(icon, {
                      sx: { fontSize: { xs: 18, sm: 22 }, color: isSelected ? '#fff' : color },
                    })}
                  </Box>
                  <Typography variant="body2" fontWeight={isSelected ? 700 : 500} sx={{ color: isSelected ? color : 'text.primary', lineHeight: 1.2, textAlign: 'center', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: isSelected ? alpha(color, 0.8) : 'text.secondary', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                    {sublabel}
                  </Typography>
                  {isSelected && (
                    <CheckCircleOutlineIcon sx={{ fontSize: 13, color, position: 'absolute', top: 6, right: 6 }} />
                  )}
                </Box>
              );
            })}
          </Box>
        )}
        {item.numberOfNonConformities === null && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontStyle: 'italic' }}>
            Touchez une carte pour sélectionner l'état de cet item
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
                        {selectedActionForNewObservation &&
                          !availableActions.includes(selectedActionForNewObservation) && (
                            <MenuItem value={selectedActionForNewObservation}>
                              {selectedActionForNewObservation}
                            </MenuItem>
                          )}
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
                            {selectedActionForNewObservation &&
                              !availableActions.includes(selectedActionForNewObservation) && (
                                <MenuItem value={selectedActionForNewObservation}>
                                  {selectedActionForNewObservation}
                                </MenuItem>
                              )}
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
                    aria-label={`Supprimer le commentaire : ${obs.text}`}
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
                          {/* Si l'action enregistrée est personnalisée (hors liste), l'ajouter dynamiquement */}
                          {obs.correctiveAction && !availableActions.includes(obs.correctiveAction) && (
                            <MenuItem value={obs.correctiveAction}>
                              {obs.correctiveAction}
                            </MenuItem>
                          )}
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
          onPhotoAdded={handlePhotoAdded}
        />
        {(item.photos ?? []).length > 0 && (
          <Box sx={{ mt: 2 }}>
            <PhotoGallery
              photos={item.photos ?? []}
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
