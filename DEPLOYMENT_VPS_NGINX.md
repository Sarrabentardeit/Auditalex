# 🚀 Déploiement sur VPS avec Nginx Existant

## 📋 Architecture

```
Internet (HTTPS)
    ↓
Nginx VPS (Port 443) - Reverse Proxy + SSL
    ↓
Docker Containers (localhost uniquement):
    - Frontend: 127.0.0.1:8080 → Nginx interne du conteneur
    - Backend: 127.0.0.1:3000 → Node.js API
    - MongoDB: Réseau Docker interne (pas d'exposition)
```

## 🔧 Étape 1 : Transférer le Code

```bash
# Depuis votre PC Windows (PowerShell)
cd C:\Users\ThinkPad\Desktop\Audit

# Option A : Avec Git (RECOMMANDÉ)
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/votre-repo/audit.git
git push -u origin main

# Sur le VPS
cd /opt
git clone https://github.com/votre-repo/audit.git

# Option B : Avec SCP (Direct)
scp -r C:\Users\ThinkPad\Desktop\Audit root@alexann.cloud:/opt/
```

## 🐳 Étape 2 : Configuration Docker

```bash
# Sur le VPS
cd /opt/Audit  # ou /opt/audit selon le nom

# Créer le fichier .env
nano .env
```

**Contenu du `.env`** :
```env
# MongoDB
MONGO_ROOT_PASSWORD=VotrE-MoT-dE-PassE-MonGoDB-TrES-SeCuRise-2024

# Backend JWT (32+ caractères aléatoires)
JWT_SECRET=VoTrE-SeCrEt-JWT-AlEaToiRe-MiNiMuM-32-CarActeRes-2024

# URLs (déjà dans docker-compose.prod.yml)
FRONTEND_URL=https://alexann.cloud
VITE_API_URL=https://alexann.cloud/api
```

**Générer des secrets sécurisés** :
```bash
# Pour JWT_SECRET
openssl rand -base64 32

# Pour MongoDB password
openssl rand -base64 24
```

## 📦 Étape 3 : Lancer Docker

```bash
# Build et démarrage
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier que tout est lancé
docker-compose -f docker-compose.prod.yml ps

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Tester les endpoints
curl http://127.0.0.1:3000/api/health  # Backend
curl http://127.0.0.1:8080              # Frontend
```

## 🌐 Étape 4 : Configuration Nginx VPS

```bash
# Copier la configuration
sudo cp /opt/Audit/nginx-vps-config.conf /etc/nginx/sites-available/alexann.cloud

# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/alexann.cloud /etc/nginx/sites-enabled/

# Supprimer la config par défaut si elle existe
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

## 🔒 Étape 5 : Configuration SSL (Let's Encrypt)

### Si vous n'avez PAS encore de certificat SSL :

```bash
# Installer Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Créer le dossier pour challenges
sudo mkdir -p /var/www/certbot

# Obtenir le certificat (automatique avec Nginx)
sudo certbot --nginx -d alexann.cloud -d www.alexann.cloud

# Ou manuellement
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d alexann.cloud \
  -d www.alexann.cloud

# Redémarrer Nginx
sudo systemctl restart nginx

# Vérifier le renouvellement automatique
sudo certbot renew --dry-run
```

### Si vous AVEZ déjà un certificat SSL :

```bash
# Vérifier l'emplacement des certificats
sudo ls -la /etc/letsencrypt/live/alexann.cloud/

# Si déjà présents, juste redémarrer Nginx
sudo systemctl restart nginx
```

## ✅ Étape 6 : Vérification

```bash
# 1. Vérifier Docker
docker ps
# Devrait afficher : audit-frontend-prod, audit-backend-prod, audit-mongodb-prod

# 2. Vérifier les ports locaux
sudo netstat -tlnp | grep -E '3000|8080'
# Devrait afficher : 127.0.0.1:3000 et 127.0.0.1:8080

# 3. Vérifier Nginx
sudo systemctl status nginx
sudo nginx -t

# 4. Tester les endpoints
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:8080

# 5. Tester depuis l'extérieur
curl https://alexann.cloud/api/health
curl https://alexann.cloud
```

## 🔄 Gestion et Maintenance

### Voir les logs

```bash
# Logs Docker
docker-compose -f docker-compose.prod.yml logs -f
docker logs audit-backend-prod -f
docker logs audit-frontend-prod -f
docker logs audit-mongodb-prod -f

# Logs Nginx
sudo tail -f /var/log/nginx/audit-access.log
sudo tail -f /var/log/nginx/audit-error.log
```

### Redémarrer les services

```bash
# Redémarrer un conteneur
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend

# Redémarrer tout
docker-compose -f docker-compose.prod.yml restart

# Redémarrer Nginx
sudo systemctl restart nginx
```

### Mettre à jour l'application

```bash
# Pull nouveau code
cd /opt/Audit
git pull

# Rebuild et redémarrer
docker-compose -f docker-compose.prod.yml up -d --build

# Ou rebuild un seul service
docker-compose -f docker-compose.prod.yml up -d --build backend
```

### Backup MongoDB

```bash
# Créer un backup
docker exec audit-mongodb-prod mongodump \
  --username admin \
  --password "votre-mot-de-passe" \
  --authenticationDatabase admin \
  --out /backups/backup-$(date +%Y%m%d-%H%M%S)

# Copier le backup hors du conteneur
docker cp audit-mongodb-prod:/backups ./backups-local/

# Restore
docker exec audit-mongodb-prod mongorestore \
  --username admin \
  --password "votre-mot-de-passe" \
  --authenticationDatabase admin \
  /backups/backup-YYYYMMDD-HHMMSS
```

### Automatiser les backups (Cron)

```bash
# Créer un script de backup
sudo nano /opt/backup-mongodb.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

docker exec audit-mongodb-prod mongodump \
  --username admin \
  --password "VOTRE_MOT_DE_PASSE" \
  --authenticationDatabase admin \
  --out /backups/backup-$DATE

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -type d -name "backup-*" -mtime +7 -exec rm -rf {} \;
```

```bash
# Rendre exécutable
sudo chmod +x /opt/backup-mongodb.sh

# Ajouter au cron (tous les jours à 2h du matin)
sudo crontab -e
# Ajouter cette ligne:
0 2 * * * /opt/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

## 🆘 Troubleshooting

### Problème: Frontend page blanche

```bash
# Vérifier les logs
docker logs audit-frontend-prod

# Vérifier que VITE_API_URL est correct
docker exec audit-frontend-prod env | grep VITE

# Rebuild le frontend
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

### Problème: Backend ne répond pas

```bash
# Vérifier les logs
docker logs audit-backend-prod

# Vérifier la connexion MongoDB
docker exec audit-backend-prod env | grep MONGODB

# Tester la connexion MongoDB
docker exec audit-mongodb-prod mongosh --eval "db.adminCommand('ping')"
```

### Problème: 502 Bad Gateway

```bash
# Vérifier que les conteneurs sont actifs
docker ps

# Vérifier que les ports sont ouverts
sudo netstat -tlnp | grep -E '3000|8080'

# Tester directement les conteneurs
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:8080

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/audit-error.log
```

### Problème: SSL ne fonctionne pas

```bash
# Vérifier les certificats
sudo ls -la /etc/letsencrypt/live/alexann.cloud/

# Tester la configuration Nginx
sudo nginx -t

# Renouveler le certificat manuellement
sudo certbot renew --force-renewal

# Redémarrer Nginx
sudo systemctl restart nginx
```

## 📊 Monitoring

```bash
# Voir l'utilisation des ressources
docker stats

# Espace disque
df -h
docker system df

# Nettoyer les images inutilisées
docker system prune -a
```

## 🔒 Sécurité

✅ Conteneurs exposés uniquement sur 127.0.0.1 (localhost)
✅ MongoDB non exposé à l'extérieur
✅ SSL/HTTPS via Nginx VPS
✅ Headers de sécurité configurés
✅ Utilisateurs non-root dans les conteneurs
✅ Secrets dans .env (jamais commités)

## 📝 Checklist Finale

- [ ] Docker installé et fonctionnel
- [ ] Code transféré sur le VPS
- [ ] Fichier .env créé avec secrets sécurisés
- [ ] Docker Compose lancé (3 conteneurs actifs)
- [ ] Configuration Nginx copiée et activée
- [ ] SSL configuré (Let's Encrypt)
- [ ] Tests : https://alexann.cloud fonctionne
- [ ] Tests : Login et création d'audit fonctionnent
- [ ] Backup MongoDB configuré (cron)
- [ ] Monitoring configuré

**Temps estimé : 30-45 minutes**

**Votre application est maintenant en production ! 🚀**
