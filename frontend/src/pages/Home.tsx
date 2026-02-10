import { Button, Typography, Box, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuditStore } from '../store/auditStore';
import { loadCategoriesFromJSON } from '../services/dataLoader';
import Layout from '../components/Layout';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useState } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const { createAudit } = useAuditStore();
  const [loading, setLoading] = useState(false);

  const handleNewAudit = async () => {
    setLoading(true);
    try {
      const categories = await loadCategoriesFromJSON();
      const today = new Date().toISOString().split('T')[0];
      
      await createAudit(today, '', categories);
      navigate('/audit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Audit d'Hygiène
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Application de gestion des audits d'hygiène
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Nouvel Audit
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Créer un nouvel audit d'hygiène
          </Typography>
          <Button
            variant="contained"
            onClick={handleNewAudit}
            disabled={loading}
            startIcon={<AddCircleOutlineIcon />}
            fullWidth
          >
            {loading ? 'Chargement...' : 'Commencer un nouvel audit'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Audits existants
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Charger un audit existant (à venir)
          </Typography>
        </CardContent>
      </Card>
    </Layout>
  );
}
