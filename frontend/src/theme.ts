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
      default: '#f5f8fa',
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
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: '0 2px 6px rgba(20,130,183,0.25)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(20,130,183,0.35)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        outlined: {
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1482B7',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 14,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
          transition: 'background-color 0.15s ease',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.8rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1482B7',
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#1482B7',
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '10px !important',
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '0 0 8px 0',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.Mui-expanded': {
            borderRadius: '10px 10px 0 0',
          },
        },
      },
    },
  },
});

export default theme;
