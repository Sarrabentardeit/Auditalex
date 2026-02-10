# ⚖️ Pondérations Possibles dans le Système d'Audit

## 📊 Vue d'Ensemble

Le système utilise **3 valeurs de pondération différentes** :

| Pondération | Valeur | Utilisation |
|-------------|--------|-------------|
| **0.333** | 33.3% | Items dans des catégories à 3 items |
| **0.334** | 33.4% | Item supplémentaire pour compléter à 100% dans des catégories à 3 items |
| **0.5** | 50% | Items dans des catégories à 2 items |

---

## 🔍 Détail par Catégorie

### Catégories avec 3 Items (Pondération 0.333 / 0.334)

#### 1. LOCAUX ET EQUIPEMENTS
| Item | Pondération |
|------|-------------|
| Lutte contre les nuisibles | **0.333** |
| Maintenance des locaux et équipements | **0.333** |
| Nettoyage et désinfection des locaux et équipements | **0.334** |

**Total** : 0.333 + 0.333 + 0.334 = **1.000** ✅

---

#### 3. MAITRISE DES MATIÈRES
| Item | Pondération |
|------|-------------|
| Contrôle à réception | **0.333** |
| Gestions des conditionnements et emballages | **0.333** |
| Affichage | **0.334** |

**Total** : 0.333 + 0.333 + 0.334 = **1.000** ✅

---

#### 4. TRACABILITE ET GESTION DES NON-CONFORMITES
| Item | Pondération |
|------|-------------|
| Système de traçabilité | **0.333** |
| Gestion des non-conformités | **0.333** |
| Gestion des actions correctives de l'audit précédent | **0.334** |

**Total** : 0.333 + 0.333 + 0.334 = **1.000** ✅

---

### Catégories avec 2 Items (Pondération 0.5)

#### 2. MAITRISE DES TEMPÉRATURES
| Item | Pondération |
|------|-------------|
| Maîtrise du froid positif et négatif | **0.5** |
| Maîtrise du chaud | **0.5** |

**Total** : 0.5 + 0.5 = **1.000** ✅

---

#### 5. GESTION DES DECHETS ET DES SOUS-PRODUITS ANIMAUX
| Item | Pondération |
|------|-------------|
| Gestion des déchets | **0.5** |
| Gestions des poubelles | **0.5** |

**Total** : 0.5 + 0.5 = **1.000** ✅

---

#### 6. GESTION DU PERSONNEL
| Item | Pondération |
|------|-------------|
| Hygiène et équipements du personnel | **0.5** |
| Formation et instructions à disposition du personnel | **0.5** |

**Total** : 0.5 + 0.5 = **1.000** ✅

---

## 📐 Logique de Répartition

### Pourquoi 0.333 et 0.334 ?

Quand une catégorie a **3 items**, la répartition égale donnerait :
```
1 / 3 = 0.333333... (infini)
```

Pour obtenir exactement **1.0** (100%), on utilise :
- **2 items** avec **0.333** chacun = 0.666
- **1 item** avec **0.334** = 0.334
- **Total** = 0.666 + 0.334 = **1.000** ✅

### Pourquoi 0.5 ?

Quand une catégorie a **2 items**, la répartition égale est simple :
```
1 / 2 = 0.5
```

Chaque item a donc **0.5** (50%) du poids total.

---

## 🎯 Impact sur le Calcul du Score

### Exemple avec Pondération 0.333 / 0.334

**Catégorie "LOCAUX ET EQUIPEMENTS"** :

| Item | Note | Pondération | Note × Pondération |
|------|------|-------------|-------------------|
| Lutte contre les nuisibles | 1.0 | 0.333 | 0.333 |
| Maintenance | 0.7 | 0.333 | 0.233 |
| Nettoyage | 0.3 | 0.334 | 0.100 |

**Calcul** :
```
Score = (0.333 + 0.233 + 0.100) / (0.333 + 0.333 + 0.334) × 100
      = 0.666 / 1.000 × 100
      = 66.6%
```

### Exemple avec Pondération 0.5

**Catégorie "MAITRISE DES TEMPÉRATURES"** :

| Item | Note | Pondération | Note × Pondération |
|------|------|-------------|-------------------|
| Maîtrise du froid | 1.0 | 0.5 | 0.5 |
| Maîtrise du chaud | 0.7 | 0.5 | 0.35 |

**Calcul** :
```
Score = (0.5 + 0.35) / (0.5 + 0.5) × 100
      = 0.85 / 1.0 × 100
      = 85%
```

---

## 📋 Résumé des Pondérations

### Valeurs Uniques

1. **0.333** (33.3%)
   - Utilisé dans les catégories à 3 items
   - Apparaît **2 fois** par catégorie à 3 items

2. **0.334** (33.4%)
   - Utilisé dans les catégories à 3 items
   - Apparaît **1 fois** par catégorie à 3 items
   - Permet d'atteindre exactement 100%

3. **0.5** (50%)
   - Utilisé dans les catégories à 2 items
   - Apparaît **2 fois** par catégorie à 2 items

### Répartition Globale

| Type de Catégorie | Nombre | Pondérations Utilisées |
|-------------------|--------|------------------------|
| Catégories à 3 items | 3 | 0.333, 0.333, 0.334 |
| Catégories à 2 items | 3 | 0.5, 0.5 |

**Total** : 6 catégories, 14 items au total

---

## ⚠️ Points Importants

1. **La somme des pondérations d'une catégorie = 1.0**
   - Garantit que le score de la catégorie est un pourcentage valide

2. **Les pondérations sont fixes**
   - Définies dans `data_structure.json`
   - Ne peuvent pas être modifiées par l'utilisateur

3. **Impact sur le score**
   - Plus la pondération est élevée, plus l'item a d'impact
   - Un item avec 0.5 a plus d'impact qu'un item avec 0.333

4. **Calcul uniquement pour les items audités**
   - Si un item n'est pas audité (`isAudited: false`), sa pondération n'est pas comptée
   - Le total des pondérations peut être < 1.0 si certains items ne sont pas audités

---

## 🔢 Tableau de Référence Complet

| Catégorie | Nombre d'Items | Pondérations | Total |
|-----------|---------------|--------------|-------|
| 1. LOCAUX ET EQUIPEMENTS | 3 | 0.333, 0.333, 0.334 | 1.000 |
| 2. MAITRISE DES TEMPÉRATURES | 2 | 0.5, 0.5 | 1.000 |
| 3. MAITRISE DES MATIÈRES | 3 | 0.333, 0.333, 0.334 | 1.000 |
| 4. TRACABILITE ET GESTION DES NON-CONFORMITES | 3 | 0.333, 0.333, 0.334 | 1.000 |
| 5. GESTION DES DECHETS ET DES SOUS-PRODUITS ANIMAUX | 2 | 0.5, 0.5 | 1.000 |
| 6. GESTION DU PERSONNEL | 2 | 0.5, 0.5 | 1.000 |

---

**Dernière mise à jour :** 2025-01-27


