# Backend Dockerfile - Multi-stage build
FROM node:20-alpine AS builder

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers package
COPY package*.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copier le code source
COPY . .

# Build TypeScript
RUN npm run build

# Stage de production
FROM node:20-alpine

WORKDIR /app

# Copier seulement les dépendances de production
COPY package*.json ./
RUN npm ci --only=production

# Copier le code compilé depuis le builder
COPY --from=builder /app/dist ./dist

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Changer le propriétaire des fichiers
RUN chown -R nodejs:nodejs /app

# Utiliser l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Démarrer l'application
CMD ["node", "dist/index.js"]