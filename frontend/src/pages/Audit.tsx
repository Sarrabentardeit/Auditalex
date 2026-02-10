import { useState } from 'react';
import { Typography, Box, Paper, Button, CircularProgress, TextField } from '@mui/material';
import { useAuditStore } from '../store/auditStore';
import CategoryCard from '../components/CategoryCard';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { generatePDFReport } from '../utils/pdfExport';

export default function Audit() {
  const navigate = useNavigate();
  const { currentAudit, results, updateAuditDate, updateAuditAddress } = useAuditStore();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleExportPDF = async () => {
    if (!currentAudit || !results) {
      console.error('Erreur: currentAudit ou results est null', { currentAudit, results });
      alert('Impossible de générer le PDF : audit ou résultats manquants.');
      return;
    }
    
    setIsGeneratingPDF(true);
    try {
      console.log('Début de la génération du PDF...', { audit: currentAudit, results });
      await generatePDFReport(currentAudit, results);
      console.log('PDF généré avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!currentAudit) {
    return (
      <Layout>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Aucun audit en cours
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 2 }}
          >
            Retour à l'accueil
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
            >
              Retour
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {results && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={isGeneratingPDF ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
                  onClick={handleExportPDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? 'Génération...' : 'Exporter en PDF'}
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/actions-correctives')}
              >
                Suivant
              </Button>
            </Box>
          </Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Audit d'Hygiène
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2, alignItems: 'center' }}>
            <TextField
              label="Date de l'exécution"
              type="date"
              value={currentAudit.dateExecution}
              onChange={(e) => updateAuditDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ minWidth: 200 }}
              size="small"
            />
            <TextField
              label="Adresse"
              value={currentAudit.adresse || ''}
              onChange={(e) => updateAuditAddress(e.target.value)}
              placeholder="Saisissez l'adresse"
              sx={{ minWidth: 300, flex: 1 }}
              size="small"
            />
          </Box>
          <Box 
            sx={{ 
              mt: 1.5, 
              mb: 1,
              px: 1.5,
              py: 0.75,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              display: 'inline-block'
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '0.7rem',
                display: 'block',
                lineHeight: 1.5,
                letterSpacing: '0.01em'
              }}
            >
              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>*</Box> 1 : conforme ; 0,7 : non-conformité mineur ; 0,3 : non-conformité moyenne ; 0 : non-conformité majeur
            </Typography>
          </Box>
        </Box>

        {/* Results Dashboard */}
        {results && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 3 
          }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Score Total
              </Typography>
              <Typography variant="h4" fontWeight="bold" color={results.totalScore !== null ? 'primary' : 'text.secondary'}>
                {results.totalScore !== null ? `${results.totalScore.toFixed(1)}%` : '— %'}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Nombre de KO
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={results.numberOfKO > 0 ? 'error' : 'success'}
              >
                {results.numberOfKO}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Amendes Potentielles
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={results.potentialFines > 0 ? 'warning.main' : 'success'}
              >
                {results.potentialFines.toFixed(0)} €
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Categories */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {currentAudit.categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </Box>
      </Box>
    </Layout>
  );
}
