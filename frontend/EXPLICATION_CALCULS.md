# 📊 Explication Complète des Calculs et Méthodes

## 📋 Table des Matières

1. [Classification des Items](#classification-des-items)
2. [Pondération](#pondération)
3. [Non-Conformités et Notes](#non-conformités-et-notes)
4. [Calcul du Score d'un Item](#calcul-du-score-dun-item)
5. [Calcul du Score d'une Catégorie](#calcul-du-score-dune-catégorie)
6. [Calcul du Score Total](#calcul-du-score-total)
7. [Nombre de KO (Knock-Out)](#nombre-de-ko-knock-out)
8. [Amendes Potentielles](#amendes-potentielles)
9. [Exemples Concrets](#exemples-concrets)

---

## 🎯 Classification des Items

Chaque item d'audit a une **classification** qui détermine comment les non-conformités sont comptées :

### Binaire (`binary`)
- **2 valeurs possibles** : 0 ou 1 non-conformité
- **Exemples d'items binaires** :
  - Lutte contre les nuisibles
  - Système de traçabilité
  - Gestion des non-conformités
  - Gestion des actions correctives
  - Gestion des déchets
  - Formation et instructions

### Multiple (`multiple`)
- **4 valeurs possibles** : 0, 1, 2, ou ≥3 non-conformités
- **Exemples d'items multiples** :
  - Maintenance des locaux et équipements
  - Nettoyage et désinfection
  - Maîtrise du froid
  - Maîtrise du chaud
  - Contrôle à réception
  - Gestion des conditionnements
  - Affichage
  - Gestion des poubelles
  - Hygiène et équipements du personnel

---

## ⚖️ Pondération

La **pondération** est le poids (importance) d'un item dans le calcul du score.

- **Valeur** : Nombre décimal entre 0 et 1
- **Valeurs possibles** : `0.333`, `0.334`, ou `0.5`
- **Rôle** : Plus la pondération est élevée, plus l'item a d'impact sur le score final
- **Règle** : La somme des pondérations d'une catégorie = 1.0 (100%)

### Valeurs de Pondération dans le Système

| Pondération | Utilisation | Exemple |
|-------------|-------------|---------|
| **0.333** | Catégories à 3 items (2 premiers items) | LOCAUX ET EQUIPEMENTS |
| **0.334** | Catégories à 3 items (dernier item pour compléter à 1.0) | LOCAUX ET EQUIPEMENTS |
| **0.5** | Catégories à 2 items (chaque item) | MAITRISE DES TEMPÉRATURES |

**Voir le document `PONDERATIONS.md` pour plus de détails.**

---

## 🔢 Non-Conformités et Notes

### Conversion Non-Conformités → Note

#### Classification Binaire

| Non-Conformités | Note | Signification | Libellé |
|-----------------|------|---------------|---------|
| 0 | 1.0 | Conforme | ✅ Conforme |
| 1 | 0.0 | Non-conforme | ❌ Majeur |

**Formule** :
```
Si numberOfNonConformities === 0 → note = 1.0
Si numberOfNonConformities === 1 → note = 0.0
```

#### Classification Multiple

| Non-Conformités | Note | Signification | Libellé |
|-----------------|------|---------------|---------|
| 0 | 1.0 | Conforme | ✅ Conforme |
| 1 | 0.7 | Non-conformité mineure | ⚠️ Mineur |
| 2 | 0.3 | Non-conformité moyenne | ⚠️ Moyen |
| ≥3 | 0.0 | Non-conformité majeure | ❌ Majeur |

**Formule** :
```
Si numberOfNonConformities === 0 → note = 1.0
Si numberOfNonConformities === 1 → note = 0.7
Si numberOfNonConformities === 2 → note = 0.3
Si numberOfNonConformities >= 3 → note = 0.0
```

---

## 📐 Calcul du Score d'un Item

Le score d'un item n'est **pas calculé directement**. C'est la **note** qui est calculée, puis utilisée dans le calcul du score de catégorie.

**Note** : La note est calculée automatiquement à partir du nombre de non-conformités selon la classification.

---

## 📊 Calcul du Score d'une Catégorie

### Formule

```
Score Catégorie = (Σ(note × pondération) / Σ(pondération)) × 100
```

### Explication

1. **Pour chaque item audité** :
   - Calculer la note (selon classification et nombre de non-conformités)
   - Multiplier la note par la pondération : `note × pondération`
   - Ajouter au total : `totalScore += note × pondération`
   - Ajouter la pondération au total : `totalPonderation += pondération`

2. **Calculer le score** :
   - Diviser le total des scores par le total des pondérations
   - Multiplier par 100 pour obtenir un pourcentage

### Exemple

**Catégorie avec 3 items** :

| Item | Classification | Non-Conformités | Note | Pondération | Note × Pondération |
|------|----------------|-----------------|------|-------------|-------------------|
| A | Binaire | 0 | 1.0 | 0.333 | 0.333 |
| B | Multiple | 1 | 0.7 | 0.333 | 0.233 |
| C | Multiple | 2 | 0.3 | 0.334 | 0.100 |

**Calcul** :
```
totalScore = 0.333 + 0.233 + 0.100 = 0.666
totalPonderation = 0.333 + 0.333 + 0.334 = 1.0
Score = (0.666 / 1.0) × 100 = 66.6%
```

### Items Non Audités

- Les items avec `isAudited: false` sont **ignorés** dans le calcul
- Seuls les items audités sont pris en compte
- Si aucun item n'est audité → Score = `null` (affiché comme "—")

---

## 🎯 Calcul du Score Total

### Formule

```
Score Total = Moyenne des scores de catégories auditées
```

### Explication

1. **Calculer le score de chaque catégorie** (voir section précédente)
2. **Filtrer les catégories auditées** :
   - Une catégorie est considérée comme auditées si au moins un de ses items a `isAudited: true`
3. **Calculer la moyenne** :
   - Additionner tous les scores de catégories auditées
   - Diviser par le nombre de catégories auditées

### Exemple

**Audit avec 4 catégories** :

| Catégorie | Score | Auditées ? |
|-----------|------|------------|
| 1. LOCAUX ET EQUIPEMENTS | 66.6% | ✅ Oui |
| 2. MAITRISE DES TEMPÉRATURES | 0% | ❌ Non (aucun item audité) |
| 3. MAITRISE DES MATIÈRES | 0% | ❌ Non (aucun item audité) |
| 4. TRACABILITE | 0% | ❌ Non (aucun item audité) |

**Calcul** :
```
Score Total = 66.6% / 1 = 66.6%
```

**Note** : Seule la catégorie 1 est prise en compte car c'est la seule auditées.

### Si Aucune Catégorie Auditées

Si aucun item n'a été audité (`hasAuditedItems: false`) :
- Score Total = `null` (affiché comme "—" ou "Non calculé")

---

## 🚫 Nombre de KO (Knock-Out)

### Définition

Les **KO** sont le **nombre de violations spécifiques** qui engendrent une amende.

**⚠️ IMPORTANT** : Les KO sont **indépendants des notes** attribuées aux items et **ne sont PAS** la somme automatique de toutes les non-conformités. C'est un **champ séparé que l'auditeur remplit manuellement** pour les violations spécifiques qui engendrent une amende.

### Formule

```
Nombre de KO = Σ(ko) pour tous les items audités
```

Où `ko` est le **champ manuel** saisi par l'auditeur pour chaque item.

### Explication

1. **Pour chaque item**, l'auditeur saisit manuellement le nombre de KO dans un champ dédié
2. **Les KO sont indépendants des notes** :
   - Un item peut avoir une note de 1.0 (conforme) mais 1 KO si c'est une violation spécifique
   - Un item peut avoir une note de 0.7 (mineur) mais 0 KO si ce n'est pas une violation qui engendre une amende
3. **Parcourir tous les items** de toutes les catégories
4. **Pour chaque item audité** (`isAudited: true`) :
   - Ajouter `ko` (champ manuel) au total
5. **Résultat** : Somme de tous les KO manuels

### Exemple

**Audit avec plusieurs items** :

| Item | Note | Non-Conformités | KO (manuel) | Audité ? | Contribution KO |
|------|------|-----------------|-------------|----------|-----------------|
| Lutte contre les nuisibles | 1.0 | 0 | 0 | ✅ Oui | +0 |
| Maintenance | 0.7 | 1 | 0 | ✅ Oui | +0 |
| Nettoyage | 0.3 | 2 | 1 | ✅ Oui | +1 |
| Maîtrise du froid | 0.7 | 1 | 0 | ✅ Oui | +0 |
| Traçabilité | 1.0 | 0 | 0 | ✅ Oui | +0 |

**Calcul** :
```
Nombre de KO = 0 + 0 + 1 + 0 + 0 = 1 KO
```

**Note** : Même si certains items ont des non-conformités (Maintenance: 1, Nettoyage: 2, Maîtrise du froid: 1), seul l'item "Nettoyage" a un KO car c'est la seule violation spécifique qui engendre une amende selon l'auditeur.

### Points Importants

- ✅ **Les KO sont indépendants des notes** : Un item avec note 0.7 (mineur) peut avoir 0 KO ou 1 KO selon l'auditeur
- ✅ **Les KO sont manuels** : L'auditeur saisit le nombre de KO pour chaque item dans un champ dédié
- ✅ **Seuls les items audités sont comptés** : Les items non audités ne contribuent pas
- ✅ **Les KO sont un nombre entier** : Somme simple des KO manuels
- ✅ **Les KO représentent des violations spécifiques** : Seules les violations qui engendrent une amende sont comptées comme KO

---

## 💰 Amendes Potentielles

### Formule Excel

Dans le fichier Excel original (onglet "cartographie", ligne 31, colonne C) :
```
=C30*450*5
```

Où `C30` = Nombre de KO

### Formule Simplifiée

```
Amendes Potentielles = Nombre de KO × 2250 €
```

**Explication** :
- `450 × 5 = 2250`
- Chaque KO coûte **2250 €**

### Exemple

**Avec 4 KO** :
```
Amendes = 4 × 2250 = 9000 €
```

### Table de Référence

| Nombre de KO | Amendes Potentielles |
|--------------|---------------------|
| 0 | 0 € |
| 1 | 2 250 € |
| 2 | 4 500 € |
| 3 | 6 750 € |
| 4 | 9 000 € |
| 5 | 11 250 € |
| 10 | 22 500 € |

---

## 📝 Exemples Concrets

### Exemple 1 : Audit Partiel

**Catégorie "LOCAUX ET EQUIPEMENTS"** (3 items) :

| Item | Classification | Non-Conformités | Audité ? | Note | Pondération |
|------|----------------|-----------------|----------|------|-------------|
| Lutte contre les nuisibles | Binaire | 1 | ✅ Oui | 0.0 | 0.333 |
| Maintenance | Multiple | 1 | ✅ Oui | 0.7 | 0.333 |
| Nettoyage | Multiple | 2 | ✅ Oui | 0.3 | 0.334 |

**Calculs** :

1. **Score de la catégorie** :
   ```
   totalScore = (0.0 × 0.333) + (0.7 × 0.333) + (0.3 × 0.334)
             = 0 + 0.233 + 0.100
             = 0.333
   
   totalPonderation = 0.333 + 0.333 + 0.334 = 1.0
   
   Score = (0.333 / 1.0) × 100 = 33.3%
   ```

2. **Nombre de KO** :
   ```
   KO = 1 + 1 + 2 = 4 KO
   ```

3. **Amendes** :
   ```
   Amendes = 4 × 2250 = 9000 €
   ```

---

### Exemple 2 : Audit avec Items Non Audités

**Catégorie "MAITRISE DES TEMPÉRATURES"** (2 items) :

| Item | Classification | Non-Conformités | Audité ? | Note | Pondération |
|------|----------------|-----------------|----------|------|-------------|
| Maîtrise du froid | Multiple | 0 | ❌ Non | - | 0.5 |
| Maîtrise du chaud | Multiple | 0 | ❌ Non | - | 0.5 |

**Résultat** :
- **Score** : `null` (affiché comme "—")
- **KO** : 0 (items non audités ignorés)
- **Amendes** : 0 €

---

### Exemple 3 : Audit Complet

**4 catégories, toutes auditées** :

| Catégorie | Score | Items Audités |
|-----------|------|---------------|
| LOCAUX ET EQUIPEMENTS | 66.6% | 3/3 |
| MAITRISE DES TEMPÉRATURES | 100% | 2/2 |
| MAITRISE DES MATIÈRES | 50% | 3/3 |
| TRACABILITE | 0% | 1/1 |

**Calculs** :

1. **Score Total** :
   ```
   Score Total = (66.6 + 100 + 50 + 0) / 4 = 216.6 / 4 = 54.15%
   ```

2. **Nombre de KO** :
   ```
   KO = Somme de toutes les non-conformités de tous les items audités
   ```

3. **Amendes** :
   ```
   Amendes = KO × 2250 €
   ```

---

## 🔄 Résumé des Formules

### 1. Note d'un Item
```
Si classification === 'binary':
  note = (numberOfNonConformities === 0) ? 1.0 : 0.0

Si classification === 'multiple':
  note = (numberOfNonConformities === 0) ? 1.0 :
         (numberOfNonConformities === 1) ? 0.7 :
         (numberOfNonConformities === 2) ? 0.3 : 0.0
```

### 2. Score d'une Catégorie
```
Score = (Σ(note × pondération) / Σ(pondération)) × 100
       (pour tous les items audités)
```

### 3. Score Total
```
Score Total = Moyenne(Score Catégorie) pour toutes les catégories auditées
```

### 4. Nombre de KO
```
KO = Σ(numberOfNonConformities) pour tous les items audités
```

### 5. Amendes Potentielles
```
Amendes = KO × 2250 €
```

---

## ⚠️ Points Importants

1. **Les KO sont indépendants des notes** :
   - Un item avec note 0.7 (mineur) contribue 1 KO
   - Un item avec note 0.3 (moyen) contribue 2 KO
   - Un item avec note 0.0 (majeur) contribue ≥3 KO

2. **Seuls les items audités sont comptés** :
   - Items avec `isAudited: false` → ignorés dans tous les calculs
   - Score = `null` si aucun item audité

3. **La pondération détermine l'importance** :
   - Plus la pondération est élevée, plus l'item a d'impact
   - La somme des pondérations d'une catégorie ≈ 1.0

4. **Classification détermine les valeurs possibles** :
   - Binaire : seulement 0 ou 1
   - Multiple : 0, 1, 2, ou ≥3

---

## 📚 Références

- **Formule Excel** : `Grille 2025 (1).xlsx`
  - Onglet "cartographie" : Ligne 31, Colonne C = `=C30*450*5`
  - Onglet "grille_de_cotation" : Formules de calcul des scores

- **Document PDF** : `Logiciel de conduite d'audit-Mode de calcul.pdf`
  - Classification binaire/multiple
  - Conversion non-conformités → notes
  - Définition des KO

---

**Dernière mise à jour :** 2025-01-27

