# 🚀 COMMANDES FINALES POUR LE VPS

Toutes les erreurs TypeScript ont été corrigées et poussées sur GitHub !

## ✅ Exécutez ces commandes sur votre VPS :

```bash
# 1. Récupérer les corrections depuis GitHub
cd /opt/Auditalex
git pull origin main

# 2. Build et démarrer Docker (cette fois ça va marcher !)
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Attendre que tout démarre (30-60 secondes)
# Voir les logs en temps réel
docker-compose -f docker-compose.prod.yml logs -f

# 4. Vérifier que les 3 conteneurs sont actifs (dans un autre terminal)
docker ps
```

## ✅ Résultat Attendu

Vous devriez voir 3 conteneurs :
- ✅ `audit-backend-prod` (Status: Up)
- ✅ `audit-frontend-prod` (Status: Up)
- ✅ `audit-mongodb-prod` (Status: Up, healthy)

## 📋 Configuration Nginx (si pas encore fait)

```bash
# Copier la configuration Nginx
sudo cp /opt/Auditalex/nginx-vps-config.conf /etc/nginx/sites-available/alexann.cloud

# Activer le site
sudo ln -s /etc/nginx/sites-available/alexann.cloud /etc/nginx/sites-enabled/

# Supprimer la config par défaut si elle existe
sudo rm -f /etc/nginx/sites-enabled/default

# Tester
sudo nginx -t

# Redémarrer
sudo systemctl restart nginx
```

## 🔒 SSL (si pas encore fait)

```bash
# Installer Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL
sudo certbot --nginx -d alexann.cloud -d www.alexann.cloud
```

## 🧪 Tests

```bash
# Test 1: Backend
curl http://127.0.0.1:3000/api/health

# Test 2: Frontend
curl http://127.0.0.1:8080

# Test 3: Depuis l'extérieur
curl https://alexann.cloud/api/health
curl https://alexann.cloud
```

## 📊 Monitoring

```bash
# Voir les ressources
docker stats

# Voir les logs d'un service spécifique
docker logs audit-backend-prod -f
docker logs audit-frontend-prod -f
docker logs audit-mongodb-prod -f

# Logs Nginx
sudo tail -f /var/log/nginx/audit-error.log
```

## 🔄 Commandes Utiles

```bash
# Redémarrer un service
docker-compose -f docker-compose.prod.yml restart backend

# Redémarrer tout
docker-compose -f docker-compose.prod.yml restart

# Arrêter tout
docker-compose -f docker-compose.prod.yml down

# Voir les ports ouverts
sudo netstat -tlnp | grep -E '3000|8080'
```

## 🆘 Si Problème

```bash
# Nettoyer complètement et recommencer
docker-compose -f docker-compose.prod.yml down
docker system prune -a -f
docker-compose -f docker-compose.prod.yml up -d --build

# Voir les logs détaillés
docker-compose -f docker-compose.prod.yml logs --tail=100
```

## 🎯 Corrections Appliquées

✅ **Backend** :
- Paramètre `res` inutilisé → `_res`
- Type `expiresIn` JWT corrigé

✅ **Frontend** :
- Import `shallow` Zustand supprimé (API changée v5)
- `process.env` remplacé par `import.meta.env.PROD`
- Fichiers `db.ts` et `userDb.ts` supprimés (dexie enlevé)
- Type `NodeJS.Timeout` remplacé par `number`

## ✨ Temps Estimé

- Build Docker : 5-10 minutes
- Configuration Nginx : 2 minutes
- SSL : 2 minutes
- **Total : ~15 minutes maximum**

**Le build Docker devrait maintenant réussir à 100% ! 🎉**

---

## 📝 Après le Déploiement

Une fois que tout fonctionne :

1. **Créer un utilisateur admin** (via MongoDB ou script)
2. **Tester le login** sur https://alexann.cloud
3. **Créer un audit test**
4. **Exporter un PDF**
5. **Configurer les backups MongoDB** (cron job)

**Votre application est prête pour la production ! 🚀**
