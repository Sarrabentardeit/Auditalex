import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
  },
  build: {
    // Optimisations de performance
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprimer les console.log en production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Code splitting manuel pour optimiser le chargement
        manualChunks: {
          // Séparer les vendor libs pour un meilleur caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'utils': ['zustand', 'date-fns', 'browser-image-compression'],
          'pdf': ['jspdf'],
        },
      },
    },
    // Augmenter la limite d'avertissement de chunk
    chunkSizeWarningLimit: 1000,
  },
  // Optimiser le chargement des dépendances
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      'zustand',
      'date-fns',
    ],
  },
});
