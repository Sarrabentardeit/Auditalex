# 🔧 CORRECTION ERREUR 404 "Route not found"

## ❌ **Le Problème**

Votre configuration Nginx actuelle utilise des **rewrites** qui cassent les routes :

```nginx
# ❌ MAUVAISE CONFIG (celle que vous avez actuellement)
location ~ ^/api/auth/(login|register)$ {
    rewrite ^/api/auth/(.*)$ /$1 break;  # Enlève /api/auth
    proxy_pass http://127.0.0.1:3000;
}
```

**Ce qui se passe** :
1. Frontend envoie : `POST https://alexann.nav.ovh/api/auth/login`
2. Nginx rewrite enlève `/api/auth` : → envoie `POST /login` au backend
3. Backend s'attend à : `/api/auth/login`
4. **Résultat : 404 Route not found** ❌

## ✅ **La Solution SIMPLE**

Votre backend est configuré pour recevoir les routes **avec** le préfixe `/api` :
- Routes attendues : `/api/auth/login`, `/api/audits`, etc.
- **Il ne faut PAS de rewrite** dans Nginx

## 🔧 **Commandes à Exécuter sur le VPS**

```bash
# 1. Remplacer la configuration Nginx par la version CORRECTE
sudo nano /etc/nginx/sites-available/alexann.nav.ovh
```

**Supprimez tout et remplacez par ceci** :

```nginx
# Redirection HTTP -> HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name alexann.nav.ovh www.alexann.nav.ovh;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS - Application Audit
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name alexann.nav.ovh www.alexann.nav.ovh;

    # SSL
    ssl_certificate /etc/letsencrypt/live/alexann.nav.ovh/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alexann.nav.ovh/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Logs
    access_log /var/log/nginx/audit_access.log;
    error_log /var/log/nginx/audit_error.log;

    client_max_body_size 50M;

    # Headers sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Backend API - SANS REWRITE !
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend React
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 2. Tester la configuration
sudo nginx -t

# 3. Redémarrer Nginx
sudo systemctl restart nginx

# 4. Vérifier les logs
sudo tail -f /var/log/nginx/audit_error.log
```

## 🧪 **Tester**

```bash
# Test 1: Backend direct
curl http://127.0.0.1:3000/api/auth/login

# Test 2: Via Nginx depuis l'extérieur
curl -X POST https://alexann.nav.ovh/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

## 📊 **Différence Clé**

### ❌ Votre config actuelle (avec rewrite)
```
Frontend: POST /api/auth/login
    ↓
Nginx: rewrite enlève /api/auth → POST /login
    ↓
Backend reçoit: POST /login
    ↓
Backend cherche: /api/auth/login
    ↓
ERREUR 404 Route not found
```

### ✅ Config correcte (sans rewrite)
```
Frontend: POST /api/auth/login
    ↓
Nginx: transmet tel quel → POST /api/auth/login
    ↓
Backend reçoit: POST /api/auth/login
    ↓
Backend trouve: /api/auth/login
    ↓
SUCCESS 200 ✅
```

## 🎯 **Pourquoi votre ancienne config avait des rewrites ?**

Probablement copiée d'un autre projet où :
- Le backend n'utilisait PAS `/api` comme préfixe
- Les routes étaient directement `/login`, `/users`, etc.

**Votre backend actuel utilise `/api` donc PAS BESOIN de rewrite !**

## ✅ **Après la Correction**

1. Le login devrait fonctionner immédiatement
2. Plus d'erreur 404
3. L'application devrait être totalement fonctionnelle

**Temps estimé : 2 minutes pour corriger** ⏱️
