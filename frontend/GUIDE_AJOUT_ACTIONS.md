# 📝 Guide : Comment Ajouter des Actions Correctives

## 📍 Où se trouve la liste des actions ?

Les actions correctives sont définies dans le fichier :
```
frontend/public/data_structure.json
```

Dans la section `"observations"`, chaque item a une liste d'observations possibles avec leurs actions correctives associées.

## 🔧 Comment ajouter de nouvelles actions ?

### Méthode 1 : Modifier le fichier JSON directement

1. **Ouvrez le fichier** : `frontend/public/data_structure.json`

2. **Trouvez l'item concerné** dans la section `"observations"`

3. **Ajoutez une nouvelle observation avec son action** :

```json
"Nom de l'item": [
  {
    "observation": "Votre nouvelle observation",
    "action": "Votre nouvelle action corrective"
  },
  {
    "observation": "Autre observation",
    "action": "Autre action"
  }
]
```

### Exemple concret

Pour l'item **"Lutte contre les nuisibles"**, vous pouvez ajouter :

```json
"Lutte contre les nuisibles": [
  {
    "observation": "Contrat 3D en place",
    "action": "Conforme"
  },
  {
    "observation": "Entrée potentielle de nuisibles",
    "action": "Toutes les ouvertures doivent être fermées"
  },
  {
    "observation": "Nouvelle observation que vous voulez ajouter",
    "action": "Nouvelle action corrective personnalisée"
  }
]
```

## 📋 Structure du fichier JSON

```json
{
  "categories": [
    {
      "name": "1. LOCAUX ET EQUIPEMENTS",
      "items": [
        {
          "name": "Lutte contre les nuisibles",
          "ponderation": 0.333,
          ...
        }
      ]
    }
  ],
  "observations": {
    "Lutte contre les nuisibles": [
      {
        "observation": "Contrat 3D en place",
        "action": "Conforme"
      },
      {
        "observation": "Entrée potentielle de nuisibles",
        "action": "Toutes les ouvertures doivent être fermées"
      }
    ],
    "Maintenance des locaux et équipements": [
      {
        "observation": "Ensemble bien entretenu",
        "action": "Conforme"
      },
      ...
    ]
  }
}
```

## ⚠️ Important

- **Le nom de l'item** dans `"observations"` doit **exactement correspondre** au nom dans `"categories" → "items" → "name"`
- Les actions vides (`"action": ""`) n'apparaîtront pas dans la liste déroulante
- Après modification du JSON, **rechargez l'application** pour voir les changements

## 🎯 Comment ça fonctionne dans l'interface ?

1. **Liste déroulante "Commentaires"** : Affiche toutes les `"observation"` de l'item
2. **Liste déroulante "Actions Correctives"** : Affiche toutes les `"action"` uniques de l'item (sans doublons)
3. Quand vous sélectionnez un commentaire, l'action correspondante est automatiquement pré-sélectionnée

## 💡 Astuce

Pour ajouter une action qui apparaîtra dans la liste déroulante mais qui n'est pas liée à une observation spécifique, vous pouvez :
- Créer une observation "générique" avec cette action
- Ou utiliser le champ texte pour saisir une action personnalisée directement dans l'interface

---

**Fichier à modifier** : `frontend/public/data_structure.json`


