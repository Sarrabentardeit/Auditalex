# 🐳 Guide de Déploiement Docker

## 📋 Fichiers Créés

- `backend/Dockerfile` - Image Docker du backend
- `frontend/Dockerfile` - Image Docker du frontend  
- `docker-compose.yml` - Orchestration locale/développement
- `docker-compose.prod.yml` - Orchestration production
- `.env.docker` - Variables d'environnement (à renommer en `.env`)
- `mongo-init.js` - Initialisation MongoDB

## 🚀 Déploiement Local (Développement)

### 1. Configuration

```bash
# Renommer et configurer les variables d'environnement
cp .env.docker .env
nano .env

# Modifier ces valeurs:
MONGO_ROOT_PASSWORD=votre-mot-de-passe-securise
JWT_SECRET=votre-secret-jwt-minimum-32-caracteres
```

### 2. Lancer l'application

```bash
# Build et démarrage
docker-compose up -d --build

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down

# Arrêter et supprimer les volumes (⚠️ efface les données)
docker-compose down -v
```

### 3. Accéder à l'application

- Frontend: http://localhost
- Backend API: http://localhost:3000/api
- MongoDB: localhost:27017

## 🌐 Déploiement Production (VPS alexann.cloud)

### 1. Prérequis sur le VPS

```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Vérifier
docker --version
docker-compose --version
```

### 2. Transférer le code

```bash
# Depuis votre PC Windows
cd C:\Users\ThinkPad\Desktop\Audit
scp -r * root@alexann.cloud:/opt/audit/
```

### 3. Configuration sur le VPS

```bash
# Sur le VPS
cd /opt/audit

# Créer le fichier .env
nano .env
```

Contenu du `.env` :
```env
# MongoDB
MONGO_ROOT_PASSWORD=mot-de-passe-super-securise-mongodb

# Backend JWT
JWT_SECRET=secret-jwt-super-securise-minimum-32-caracteres-aleatoires

# URLs
FRONTEND_URL=https://alexann.cloud
VITE_API_URL=https://alexann.cloud/api
```

### 4. Créer la configuration Nginx

```bash
mkdir -p nginx/sites
nano nginx/sites/default.conf
```

Contenu de `nginx/sites/default.conf` :
```nginx
server {
    listen 80;
    server_name alexann.cloud www.alexann.cloud;

    # Redirect HTTP to HTTPS
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name alexann.cloud www.alexann.cloud;

    # SSL
    ssl_certificate /etc/letsencrypt/live/alexann.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alexann.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Limite upload
    client_max_body_size 50M;
}
```

### 5. Obtenir le certificat SSL

```bash
# Créer les dossiers
mkdir -p certbot/conf certbot/www

# Lancer nginx temporairement
docker-compose -f docker-compose.prod.yml up -d nginx

# Obtenir le certificat
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email votre-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d alexann.cloud \
  -d www.alexann.cloud

# Redémarrer nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### 6. Lancer en production

```bash
# Build et démarrage
docker-compose -f docker-compose.prod.yml up -d --build

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Vérifier le statut
docker-compose -f docker-compose.prod.yml ps
```

### 7. Créer un utilisateur admin initial

```bash
# Accéder au backend
docker exec -it audit-backend-prod node dist/scripts/create-admin.js
# OU via MongoDB
docker exec -it audit-mongodb-prod mongosh
```

## 🔄 Commandes Utiles

### Gestion des conteneurs

```bash
# Voir les conteneurs actifs
docker ps

# Voir les logs
docker logs audit-backend-prod -f
docker logs audit-frontend-prod -f
docker logs audit-mongodb-prod -f

# Redémarrer un service
docker-compose restart backend
docker-compose restart frontend

# Rebuild un service
docker-compose up -d --build backend
```

### Backup MongoDB

```bash
# Backup
docker exec audit-mongodb-prod mongodump --out /backups/backup-$(date +%Y%m%d)

# Restore
docker exec audit-mongodb-prod mongorestore /backups/backup-YYYYMMDD
```

### Mise à jour de l'application

```bash
# Pull nouveau code
cd /opt/audit
git pull

# Rebuild et redémarrer
docker-compose -f docker-compose.prod.yml up -d --build

# Ou rebuild un seul service
docker-compose -f docker-compose.prod.yml up -d --build backend
```

## 📊 Monitoring

```bash
# Statistiques en temps réel
docker stats

# Espace disque
docker system df

# Nettoyer les images inutilisées
docker system prune -a
```

## 🆘 Troubleshooting

### Backend ne démarre pas
```bash
docker logs audit-backend-prod
# Vérifier les variables d'environnement
docker exec audit-backend-prod env
```

### Frontend page blanche
```bash
# Vérifier que VITE_API_URL est correct
docker logs audit-frontend-prod
# Vérifier nginx
docker exec audit-nginx-prod nginx -t
```

### MongoDB connexion failed
```bash
# Vérifier que MongoDB est healthy
docker-compose ps
# Voir les logs
docker logs audit-mongodb-prod
```

## ⚡ Performance

### Images optimisées
- Frontend: ~25 MB (nginx alpine + fichiers buildés)
- Backend: ~150 MB (node alpine + dépendances)
- Total: ~175 MB (hors MongoDB)

### Temps de démarrage
- Build initial: 5-10 minutes
- Démarrage: 30-60 secondes
- Rebuild: 2-5 minutes (avec cache)

## 🔒 Sécurité

✅ Multi-stage builds (images plus légères)
✅ Utilisateurs non-root dans les conteneurs
✅ Pas d'exposition des ports internes
✅ SSL/HTTPS avec Let's Encrypt
✅ Variables d'environnement dans .env
✅ Secrets jamais commités

## 📝 Checklist Déploiement

- [ ] Docker et Docker Compose installés sur le VPS
- [ ] Code transféré sur le VPS
- [ ] Fichier .env créé avec valeurs sécurisées
- [ ] Configuration nginx créée
- [ ] Certificat SSL obtenu
- [ ] Application lancée avec docker-compose
- [ ] Tests: frontend accessible, API répond, login fonctionne
- [ ] Backup MongoDB configuré (cron job)

**Votre application est maintenant containerisée et prête pour le déploiement ! 🚀**
