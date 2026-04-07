import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEV_VERSION_JSON = JSON.stringify(
  { version: '0.0.0', buildId: 'dev-local', builtAt: '' },
  null,
  2
);

function versionJsonDevPlugin(): Plugin {
  return {
    name: 'version-json-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url === '/version.json') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(DEV_VERSION_JSON);
          return;
        }
        next();
      });
    },
  };
}

function versionJsonBuildPlugin(): Plugin {
  return {
    name: 'version-json-build',
    apply: 'build',
    generateBundle(this: import('rollup').PluginContext) {
      const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
        version: string;
      };
      const payload = JSON.stringify(
        {
          version: pkg.version,
          buildId: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          builtAt: new Date().toISOString(),
        },
        null,
        2
      );
      this.emitFile({ type: 'asset', fileName: 'version.json', source: payload });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionJsonDevPlugin(), versionJsonBuildPlugin()],
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
