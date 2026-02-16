import { createTheme } from '@mui/material/styles';

// Charte graphique Alexann'
// Bleu : #1482B7
// Vert : #8CB33A
// Polices : Bebas Neue (titres) et Montserrat (texte)

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1482B7', // Bleu Alexann'
      light: '#4BA3D1',
      dark: '#0F6A94',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8CB33A', // Vert Alexann'
      light: '#A8C85A',
      dark: '#6F8F2E',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    success: {
      main: '#8CB33A', // Utiliser le vert Alexann' pour le succès
      light: '#A8C85A',
      dark: '#6F8F2E',
    },
    info: {
      main: '#1482B7', // Utiliser le bleu Alexann' pour l'info
      light: '#4BA3D1',
      dark: '#0F6A94',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: [
      'Montserrat',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: '2.5rem',
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: '0.02em',
      color: '#1482B7',
    },
    h2: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: '2rem',
      fontWeight: 400,
      lineHeight: 1.3,
      letterSpacing: '0.02em',
      color: '#1482B7',
    },
    h3: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: '1.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: '0.01em',
      color: '#1482B7',
    },
    h4: {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: '1.5rem',
      fontWeight: 400,
      lineHeight: 1.4,
      color: '#1482B7',
    },
    h5: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontFamily: 'Montserrat, sans-serif',
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          fontWeight: 600,
          textTransform: 'none',
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1482B7',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

export default theme;
