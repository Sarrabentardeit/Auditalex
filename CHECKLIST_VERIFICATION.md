# Checklist de Vérification - Correspondance avec Excel "grille_de_cotation"

## ✅ Points Vérifiés dans le Code

### 1. Structure des Données
- ✅ Catégories définies dans `data_structure.json`
- ✅ Items avec nom et pondération
- ✅ Classification (binaire/multiple) mappée dans `ITEM_CLASSIFICATIONS`
- ✅ Observations et actions définies dans `data_structure.json`

### 2. Calculs (`calculations.ts`)

#### Conversion Non-Conformités → Note
- ✅ **Binaire** : 0 non-conformité = 1.0, 1 non-conformité = 0.0
- ✅ **Multiple** : 0 = 1.0, 1 = 0.7, 2 = 0.3, ≥3 = 0.0

#### Score de Catégorie
- ✅ Formule : `(Σ(note × pondération) / Σ(pondération)) × 100`
- ✅ Exclut les items "EN ATTENTE" (numberOfNonConformities === null)

#### Score Total
- ✅ Moyenne des scores de catégories auditées uniquement
- ✅ Retourne `null` si aucune catégorie auditées

#### KO et Amendes
- ✅ KO = somme manuelle des KO par item (champ indépendant)
- ✅ Amendes = KO × 2250€ (selon Excel: C30*450*5)

### 3. Interface Utilisateur (`ItemCard.tsx`)

#### Sélection Non-Conformités
- ✅ **Binaire** : Boutons "Conforme (0)" / "Non-conforme (1)"
- ✅ **Multiple** : Boutons "Conforme (0)" / "Mineur (1)" / "Moyen (2)" / "Majeur (≥3)"

#### Champ KO
- ✅ Champ numérique manuel indépendant des notes
- ✅ Affichage amende potentielle : KO × 2250€

#### Commentaires et Actions
- ✅ Liste déroulante pour observations
- ✅ Actions correctives liées à chaque observation
- ✅ Commentaires personnalisés possibles

### 4. Export PDF (`pdfExport.ts`)

#### Structure
- ✅ Page 1 : Graphique radar
- ✅ Page 2 : Actions correctives attendues
- ✅ Pages suivantes : Tableau détaillé

#### Colonnes du Tableau
- ✅ NO : Numéro de l'item
- ✅ * : Note brute (1, 0,7, 0,3, 0)
- ✅ Note : Contribution en % (note × pondération / Σ pondérations × 100)
- ✅ Commentaires : Observations sélectionnées
- ✅ Actions correctives : Actions liées
- ✅ Photo(s) : Images

## ⚠️ Points à Vérifier Manuellement dans Excel

### 1. Structure des Colonnes Excel
Ouvrir `Grille 2025 (1).xlsx` → onglet `grille_de_cotation` et vérifier :

- [ ] **Colonne A** : Catégories (ex: "1. LOCAUX ET EQUIPEMENTS")
- [ ] **Colonne B** : Items (noms des items)
- [ ] **Colonne C** : Classification (Binaire/Multiple) - peut être implicite
- [ ] **Colonne D** : Pondération (valeurs numériques)
- [ ] **Colonne E** : Nombre de non-conformités (0, 1, 2, ≥3)
- [ ] **Colonne F** : Note calculée (1, 0.7, 0.3, 0)
- [ ] **Colonne G** : KO (nombre manuel)
- [ ] **Colonne H** : Commentaires/Observations
- [ ] **Colonne I** : Actions correctives
- [ ] **Colonne J** : Photos (si présente)

### 2. Pondérations
Vérifier dans Excel que les pondérations correspondent à `data_structure.json` :

- [ ] **LOCAUX ET EQUIPEMENTS** :
  - [ ] Lutte contre les nuisibles : 0.333
  - [ ] Maintenance : 0.333
  - [ ] Nettoyage : 0.334
  - [ ] **Somme = 1.0** ✅

- [ ] **MAITRISE DES TEMPERATURES** :
  - [ ] Froid : 0.5
  - [ ] Chaud : 0.5
  - [ ] **Somme = 1.0** ✅

- [ ] **MAITRISE DES MATIERES** :
  - [ ] Contrôle réception : 0.333
  - [ ] Conditionnements : 0.333
  - [ ] Affichage : 0.334
  - [ ] **Somme = 1.0** ✅

- [ ] **TRACABILITE** :
  - [ ] Traçabilité : 0.333
  - [ ] Non-conformités : 0.333
  - [ ] Actions correctives : 0.334
  - [ ] **Somme = 1.0** ✅

- [ ] **GESTION DES DECHETS** :
  - [ ] Déchets : 0.5
  - [ ] Poubelles : 0.5
  - [ ] **Somme = 1.0** ✅

- [ ] **GESTION DU PERSONNEL** :
  - [ ] Hygiène : 0.5
  - [ ] Formation : 0.5
  - [ ] **Somme = 1.0** ✅

### 3. Classifications
Vérifier dans Excel que chaque item a la bonne classification :

**Binaires** (selon `ITEM_CLASSIFICATIONS`) :
- [ ] Lutte contre les nuisibles
- [ ] Système de traçabilité
- [ ] Gestion des non-conformités
- [ ] Gestion des actions correctives de l'audit précédent
- [ ] Gestion des déchets
- [ ] Formation et instructions à disposition du personnel

**Multiples** (tous les autres) :
- [ ] Maintenance des locaux et équipements
- [ ] Nettoyage et désinfection
- [ ] Maîtrise du froid
- [ ] Maîtrise du chaud
- [ ] Contrôle à réception
- [ ] Gestions des conditionnements et emballages
- [ ] Affichage
- [ ] Gestions des poubelles
- [ ] Hygiène et équipements du personnel

### 4. Formules Excel
Vérifier les formules dans Excel :

- [ ] **Note calculée** : Formule qui convertit nombre de NC → note (1, 0.7, 0.3, 0)
- [ ] **Score catégorie** : Formule `(Σ(note × pondération) / Σ(pondération)) × 100`
- [ ] **Score total** : Moyenne des scores de catégories
- [ ] **Amendes** : Formule `KO × 450 × 5` ou `KO × 2250`

### 5. Observations et Actions
Vérifier dans Excel que toutes les observations et actions dans `data_structure.json` correspondent :

- [ ] Pour chaque item, vérifier que les observations disponibles correspondent
- [ ] Vérifier que les actions correctives correspondent
- [ ] Vérifier qu'il n'y a pas d'observations/actions manquantes dans le JSON

## 📋 Test de Validation

### Test 1 : Créer un Audit de Test
1. Créer un nouvel audit dans l'application
2. Remplir quelques items avec différentes valeurs :
   - Item binaire : Conforme (0)
   - Item binaire : Non-conforme (1)
   - Item multiple : Mineur (1)
   - Item multiple : Moyen (2)
   - Item multiple : Majeur (≥3)
3. Ajouter des KO manuels
4. Ajouter des observations et actions
5. Générer le PDF

### Test 2 : Comparer avec Excel
1. Ouvrir Excel `Grille 2025 (1).xlsx`
2. Remplir les mêmes valeurs dans l'onglet `grille_de_cotation`
3. Comparer les résultats :
   - [ ] Scores de catégories identiques
   - [ ] Score total identique
   - [ ] Nombre de KO identique
   - [ ] Amendes identiques

### Test 3 : Vérifier le PDF
1. Générer le PDF depuis l'application
2. Comparer avec le PDF de référence `260129_PETIT JEAN SALINE.pdf` :
   - [ ] Structure identique
   - [ ] Colonnes identiques
   - [ ] Formatage identique
   - [ ] Calculs identiques

## 🔧 Corrections Nécessaires (si trouvées)

Si des différences sont trouvées, documenter ici :

1. **Différence trouvée** : [Description]
   - **Fichier concerné** : [Fichier]
   - **Correction nécessaire** : [Correction]

2. ...

## ✅ Validation Finale

Une fois toutes les vérifications effectuées :

- [ ] Toutes les pondérations correspondent
- [ ] Toutes les classifications correspondent
- [ ] Tous les calculs correspondent
- [ ] Toutes les observations/actions correspondent
- [ ] Le PDF correspond au format attendu
- [ ] Les tests de validation passent

**Date de validation** : _______________
**Validé par** : _______________


