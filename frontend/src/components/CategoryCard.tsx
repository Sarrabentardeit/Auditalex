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
  LinearProgress,
  alpha,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { AuditCategory } from '../types';
import ItemCard from './ItemCard';
import { useAuditStore } from '../store/auditStore';
import { useMemo } from 'react';

interface CategoryCardProps {
  category: AuditCategory;
  expandedItemKey?: string | null;
  onExpandedChange?: (key: string | null) => void;
}

const SCORE_PALETTE = {
  success: { main: '#8CB33A', light: alpha('#8CB33A', 0.12), border: alpha('#8CB33A', 0.35) },
  info:    { main: '#1482B7', light: alpha('#1482B7', 0.1),  border: alpha('#1482B7', 0.3) },
  warning: { main: '#ed6c02', light: alpha('#ed6c02', 0.1),  border: alpha('#ed6c02', 0.3) },
  error:   { main: '#d32f2f', light: alpha('#d32f2f', 0.08), border: alpha('#d32f2f', 0.25) },
  neutral: { main: '#94a3b8', light: alpha('#94a3b8', 0.08), border: alpha('#94a3b8', 0.2) },
} as const;

const NOTE_PALETTE = {
  1.0: SCORE_PALETTE.success,
  0.7: SCORE_PALETTE.info,
  0.3: SCORE_PALETTE.warning,
  0.0: SCORE_PALETTE.error,
} as const;

function CategoryCard({ category, expandedItemKey = null, onExpandedChange }: CategoryCardProps) {
  const results = useAuditStore((state) => state.results);

  const categoryScore = useMemo(() => {
    if (!results) return null;
    const score = results.categoryScores[category.id];
    return score !== undefined ? score : null;
  }, [results, category.id]);

  const categoryCounts = useMemo(() => {
    if (!results?.categoryAuditedCounts) return null;
    return results.categoryAuditedCounts[category.id];
  }, [results, category.id]);

  const hasAuditedItems = useMemo(() => {
    return category.items.some(item => item.isAudited);
  }, [category.items]);

  const getScoreKey = (score: number): 'success' | 'info' | 'warning' | 'error' => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'info';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const palette = categoryScore !== null ? SCORE_PALETTE[getScoreKey(categoryScore)] : SCORE_PALETTE.neutral;

  return (
    <Card
      sx={{
        borderLeft: `4px solid ${palette.main}`,
        borderRadius: 2.5,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: `0 4px 16px ${alpha(palette.main, 0.15)}`,
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1,
          mb: categoryScore !== null ? 1.5 : 2,
        }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' }, fontWeight: 600, lineHeight: 1.4 }}
            >
              {category.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {category.items.length} item{category.items.length > 1 ? 's' : ''}
              {categoryCounts ? ` · ${categoryCounts.audited} contrôlé${categoryCounts.audited > 1 ? 's' : ''}` : ''}
            </Typography>
          </Box>

          <Chip
            label={categoryScore !== null ? `${categoryScore.toFixed(0)} %` : '— %'}
            sx={{
              fontWeight: 700,
              fontSize: '0.85rem',
              height: 32,
              bgcolor: categoryScore !== null ? alpha(palette.main, 0.12) : 'transparent',
              color: palette.main,
              border: `1.5px solid ${palette.border}`,
              '& .MuiChip-label': { px: 1.5 },
            }}
            variant="outlined"
          />
        </Box>

        {/* Barre de progression */}
        {results && categoryScore !== null && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={categoryScore}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(palette.main, 0.12),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${palette.main} 0%, ${alpha(palette.main, 0.8)} 100%)`,
                },
              }}
            />
          </Box>
        )}
        {results && categoryScore === null && !hasAuditedItems && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              En attente d'audit
            </Typography>
          </Box>
        )}

        {/* Items */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {category.items.map((item) => {
            const itemKey = `${category.id}-${item.id}`;
            const isExpanded = expandedItemKey === itemKey;
            const noteKey = item.note as keyof typeof NOTE_PALETTE | undefined;
            const itemPalette = noteKey !== undefined && NOTE_PALETTE[noteKey]
              ? NOTE_PALETTE[noteKey]
              : null;

            return (
              <Accordion
                key={item.id}
                expanded={isExpanded}
                onChange={(_, expanded) => onExpandedChange?.(expanded ? itemKey : null)}
                sx={{
                  borderRadius: '10px !important',
                  border: '1px solid',
                  borderColor: isExpanded && itemPalette
                    ? alpha(itemPalette.main, 0.35)
                    : 'rgba(0,0,0,0.09)',
                  transition: 'border-color 0.2s ease',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: 48,
                    borderRadius: '10px',
                    bgcolor: isExpanded && itemPalette ? alpha(itemPalette.main, 0.04) : 'transparent',
                    '&.Mui-expanded': { borderRadius: '10px 10px 0 0' },
                    '& .MuiAccordionSummary-content': { my: 1 },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', minWidth: 0 }}>
                    {/* Dot indicateur de note */}
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      bgcolor: itemPalette ? itemPalette.main : 'divider',
                      boxShadow: itemPalette ? `0 0 0 2px ${alpha(itemPalette.main, 0.2)}` : 'none',
                    }} />
                    <Typography
                      variant="body2"
                      sx={{ flex: 1, fontWeight: isExpanded ? 600 : 400, lineHeight: 1.4 }}
                    >
                      {item.name}
                    </Typography>
                    {item.note !== undefined && (
                      <Chip
                        label={item.note === 1.0 ? 'Conforme' : item.note === 0.7 ? 'Mineur' : item.note === 0.3 ? 'Moyen' : 'Majeur'}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: itemPalette ? alpha(itemPalette.main, 0.12) : undefined,
                          color: itemPalette ? itemPalette.main : undefined,
                          border: `1px solid ${itemPalette ? alpha(itemPalette.main, 0.3) : 'transparent'}`,
                          '& .MuiChip-label': { px: 1 },
                        }}
                        variant="outlined"
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 1 }}>
                  <ItemCard
                    item={item}
                    categoryId={category.id}
                    categoryItems={category.items}
                  />
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

export default React.memo(CategoryCard);
