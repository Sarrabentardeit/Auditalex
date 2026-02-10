# Vérification de la Correspondance avec Excel "grille_de_cotation"

## Structure Attendue (selon Excel)

### Colonnes dans Excel (grille_de_cotation) :
1. **Catégorie** (colonne A) : Nom de la catégorie (ex: "1. LOCAUX ET EQUIPEMENTS")
2. **Item** (colonne B) : Nom de l'item d'audit
3. **Classification** : Binaire ou Multiple (déterminé par le type d'item)
4. **Pondération** : Valeur numérique (ex: 0.333, 0.5, etc.)
5. **Nombre de non-conformités** : 0, 1, 2, ou ≥3 (selon classification)
6. **Note calculée** : 1, 0.7, 0.3, ou 0 (calculée automatiquement)
7. **KO** : Nombre manuel de violations spécifiques engendrant une amende
8. **Commentaires** : Observations sélectionnées depuis une liste
9. **Actions correctives** : Actions liées aux commentaires
10. **Photos** : Images associées à l'item

## Vérification du Code Actuel

### ✅ Structure des Données (`data_structure.json`)
- **Catégories** : ✅ Définies avec nom et items
- **Items** : ✅ Nom, pondération définis
- **Classification** : ✅ Mappée dans `ITEM_CLASSIFICATIONS`
- **Observations** : ✅ Définies dans la section `observations` du JSON

### ✅ Calculs (`calculations.ts`)

#### 1. Conversion Non-Conformités → Note
```typescript
// Binaire: 0 = 1.0, 1 = 0.0 ✅ CORRECT
// Multiple: 0 = 1.0, 1 = 0.7, 2 = 0.3, >=3 = 0.0 ✅ CORRECT
```

#### 2. Score de Catégorie
```typescript
// Formule: (Σ(note × pondération) / Σ(pondération)) × 100 ✅ CORRECT
```

#### 3. Score Total
```typescript
// Moyenne des scores de catégories auditées ✅ CORRECT
```

#### 4. KO et Amendes
```typescript
// KO = somme manuelle des KO par item ✅ CORRECT
// Amendes = KO × 2250€ ✅ CORRECT (selon Excel: C30*450*5)
```

### ✅ Interface Utilisateur (`ItemCard.tsx`)

#### 1. Sélection Non-Conformités
- **Binaire** : ✅ Boutons "Conforme (0)" / "Non-conforme (1)"
- **Multiple** : ✅ Boutons "Conforme (0)" / "Mineur (1)" / "Moyen (2)" / "Majeur (≥3)"

#### 2. Champ KO
- ✅ Champ numérique manuel
- ✅ Affichage de l'amende potentielle (KO × 2250€)
- ✅ Indépendant des notes ✅ CORRECT

#### 3. Commentaires et Actions
- ✅ Liste déroulante pour sélectionner observations
- ✅ Actions correctives liées à chaque observation
- ✅ Possibilité d'ajouter des commentaires personnalisés

#### 4. Photos
- ✅ Upload de photos
- ✅ Galerie de photos

### ✅ Export PDF (`pdfExport.ts`)

#### Structure du PDF :
1. ✅ Page 1 : Graphique radar
2. ✅ Page 2 : Actions correctives attendues
3. ✅ Pages suivantes : Tableau détaillé par catégorie

#### Colonnes du tableau :
- ✅ NO : Numéro de l'item
- ✅ * : Note brute (1, 0,7, 0,3, 0)
- ✅ Note : Contribution en % (calculée)
- ✅ Commentaires : Observations sélectionnées
- ✅ Actions correctives : Actions liées
- ✅ Photo(s) : Images

## Points à Vérifier dans Excel

### 1. Structure des Colonnes
- [ ] Vérifier que les colonnes dans Excel correspondent exactement
- [ ] Vérifier l'ordre des colonnes
- [ ] Vérifier les formules de calcul dans Excel

### 2. Pondérations
- [ ] Vérifier que toutes les pondérations dans `data_structure.json` correspondent à Excel
- [ ] Vérifier que la somme des pondérations par catégorie = 1.0

### 3. Classifications
- [ ] Vérifier que toutes les classifications dans `ITEM_CLASSIFICATIONS` correspondent à Excel
- [ ] Vérifier les items binaires vs multiples

### 4. Observations et Actions
- [ ] Vérifier que toutes les observations dans `data_structure.json` correspondent à Excel
- [ ] Vérifier que les actions correctives correspondent

### 5. Formules de Calcul
- [ ] Vérifier la formule de calcul du score de catégorie
- [ ] Vérifier la formule de calcul du score total
- [ ] Vérifier la formule de calcul des amendes (KO × 2250€)

## Actions Requises

1. **Analyser le fichier Excel** pour extraire :
   - La structure exacte des colonnes
   - Les pondérations exactes
   - Les classifications exactes
   - Les formules de calcul

2. **Comparer avec le code actuel** :
   - Vérifier les différences
   - Corriger les écarts

3. **Tester** :
   - Créer un audit de test
   - Comparer les résultats avec Excel
   - Vérifier que les calculs correspondent


