import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip,
  LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { AuditCategory } from '../types';
import ItemCard from './ItemCard';
import { useAuditStore } from '../store/auditStore';
import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

interface CategoryCardProps {
  category: AuditCategory;
}

function CategoryCard({ category }: CategoryCardProps) {
  // Sélecteur optimisé : ne s'abonne qu'à results, pas à tout le store
  const results = useAuditStore((state) => state.results, shallow);

  const categoryScore = useMemo(() => {
    if (!results) return null;
    const score = results.categoryScores[category.id];
    // Le score peut être null si tous les items sont EN ATTENTE
    return score !== undefined ? score : null;
  }, [results, category.id]);

  // Vérifier si au moins un item de cette catégorie a été audité
  const hasAuditedItems = useMemo(() => {
    return category.items.some(item => item.isAudited);
  }, [category.items]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'info';
    if (score >= 50) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {category.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {category.items.length} item(s)
            </Typography>
          </Box>
          <Chip
            label={categoryScore !== null ? `${categoryScore.toFixed(0)}%` : '— %'}
            color={categoryScore !== null ? (getScoreColor(categoryScore) as any) : 'default'}
            variant={categoryScore === null ? 'outlined' : 'filled'}
          />
        </Box>

        {results && categoryScore !== null && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={categoryScore}
              color={getScoreColor(categoryScore) as any}
            />
          </Box>
        )}
        {results && categoryScore === null && hasAuditedItems === false && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              En attente d'audit
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {category.items.map((item) => (
            <Accordion key={item.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="body1" sx={{ flex: 1 }}>
                    {item.name}
                  </Typography>
                  {item.note !== undefined && (
                    <Chip
                      label={item.note === 1.0 ? 'Conforme' : item.note === 0.7 ? 'Mineur' : item.note === 0.3 ? 'Moyen' : 'Majeur'}
                      size="small"
                      color={
                        item.note === 1.0 ? 'success' :
                        item.note === 0.7 ? 'info' :
                        item.note === 0.3 ? 'warning' : 'error'
                      }
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <ItemCard item={item} categoryId={category.id} categoryItems={category.items} />
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

// Mémoriser le composant pour éviter les re-renders inutiles
export default React.memo(CategoryCard);
