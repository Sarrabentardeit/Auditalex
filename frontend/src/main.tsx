/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import theme from './theme';
import { registerServiceWorker } from './hooks/useOffline';
import './style.css';

// Enregistrer le Service Worker pour le mode hors ligne
if ('serviceWorker' in navigator) {
  registerServiceWorker().catch((error) => {
    console.error('Erreur lors de l\'enregistrement du Service Worker:', error);
  });
}

const app = (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </BrowserRouter>
);

// StrictMode uniquement en développement pour éviter les double-renders en production
const isDevelopment = process.env.NODE_ENV !== 'production';

ReactDOM.createRoot(document.getElementById('app')!).render(
  isDevelopment ? <React.StrictMode>{app}</React.StrictMode> : app
);

