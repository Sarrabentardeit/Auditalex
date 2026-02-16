# 🚀 Commandes pour Déployer sur le VPS

Les erreurs TypeScript ont été corrigées et poussées sur GitHub. Voici les commandes à exécuter sur votre VPS.

## 📋 Commandes à Exécuter sur le VPS

```bash
# 1. Se connecter au VPS
ssh root@alexann.cloud

# 2. Aller dans le répertoire du projet
cd /opt/Auditalex

# 3. Récupérer les dernières modifications (corrections TypeScript)
git pull origin main

# 4. Build et démarrage des conteneurs Docker
docker-compose -f docker-compose.prod.yml up -d --build

# 5. Vérifier que tout fonctionne
docker-compose -f docker-compose.prod.yml ps

# 6. Voir les logs en temps réel (Ctrl+C pour quitter)
docker-compose -f docker-compose.prod.yml logs -f
```

## ✅ Ce qui a été Corrigé

### Backend (`backend/src/`)
1. **`index.ts` ligne 37** : Variable `res` inutilisée → Changée en `_res`
2. **`utils/jwt.ts` ligne 15** : Type incompatible pour `expiresIn` → Ajout du type cast correct

### Frontend (`frontend/src/`)
3. **`main.tsx` ligne 29** : `process.env` inexistant → Utilisation de `import.meta.env.PROD`

## 🔍 Vérifications après Déploiement

```bash
# Vérifier que les 3 conteneurs sont actifs
docker ps
# Devrait afficher:
# - audit-backend-prod
# - audit-frontend-prod
# - audit-mongodb-prod

# Tester le backend
curl http://127.0.0.1:3000/api/health

# Tester le frontend
curl http://127.0.0.1:8080

# Voir les logs d'un conteneur spécifique
docker logs audit-backend-prod -f
docker logs audit-frontend-prod -f
```

## 🌐 Configuration Nginx (si pas encore fait)

```bash
# Copier la configuration Nginx
sudo cp /opt/Auditalex/nginx-vps-config.conf /etc/nginx/sites-available/alexann.cloud

# Activer le site
sudo ln -s /etc/nginx/sites-available/alexann.cloud /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx

# Obtenir le certificat SSL (si pas déjà fait)
sudo certbot --nginx -d alexann.cloud -d www.alexann.cloud
```

## 🎯 Test Final

```bash
# Depuis votre PC ou n'importe où
curl https://alexann.cloud/api/health

# Ou visitez dans le navigateur
https://alexann.cloud
```

## 📊 Monitoring

```bash
# Voir l'utilisation des ressources
docker stats

# Voir les logs Nginx
sudo tail -f /var/log/nginx/audit-access.log
sudo tail -f /var/log/nginx/audit-error.log

# Redémarrer un service si nécessaire
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
```

## 🆘 En cas de Problème

### Build qui échoue encore
```bash
# Nettoyer et reconstruire complètement
docker-compose -f docker-compose.prod.yml down
docker system prune -a -f
docker-compose -f docker-compose.prod.yml up -d --build
```

### Voir les erreurs détaillées
```bash
# Logs détaillés d'un conteneur
docker logs audit-backend-prod --tail 100

# Se connecter au conteneur pour débugger
docker exec -it audit-backend-prod sh
```

## ✨ Résultat Attendu

Après l'exécution de ces commandes :
- ✅ Backend construit sans erreur TypeScript
- ✅ Frontend construit sans erreur
- ✅ MongoDB initialisé et prêt
- ✅ Application accessible sur https://alexann.cloud
- ✅ API accessible sur https://alexann.cloud/api

**Temps total estimé : 5-10 minutes** ⏱️
