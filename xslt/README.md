# Couche de Transformation XSLT

## Structure

```
xslt/
├── modules/
│   ├── common.xsl                  # Modèles et fonctions communs
│   ├── entities.xsl                # Modèles d'extraction d'entités
│   ├── properties.xsl              # Extraction d'ensembles de propriétés
│   ├── quantities.xsl              # Extraction de quantités
│   └── relationships.xsl           # Extraction de relations
│
├── templates/
│   ├── to-json.xsl                 # Transformation JSON principale
│   └── to-html.xsl                 # Documentation HTML (optionnelle)
│
└── README.md
```

## Principes de Conception

1. **Modularité** : Chaque module XSLT gère une préoccupation spécifique
2. **Réutilisabilité** : Modèles communs partagés entre modules
3. **Support de Version** : Les modèles gèrent IFC2x3 et IFC4
4. **Performance** : Expressions XPath efficaces, récursion minimale

## Sortie de Transformation

### Schéma JSON (Normalisé)

```json
{
  "project": {
    "guid": "...",
    "name": "...",
    "site": {
      "guid": "...",
      "name": "...",
      "buildings": [
        {
          "guid": "...",
          "name": "...",
          "storeys": [
            {
              "guid": "...",
              "name": "...",
              "elevation": 0.0,
              "spaces": [...],
              "elements": [...]
            }
          ]
        }
      ]
    }
  },
  "elements": {
    "byGuid": {
      "...": {
        "guid": "...",
        "type": "IfcWall",
        "name": "...",
        "properties": {...},
        "quantities": {...}
      }
    },
    "byType": {
      "IfcWall": [...],
      "IfcSlab": [...]
    }
  },
  "relationships": [...]
}
```

## Fonctionnalités XSLT 2.0+ Utilisées

- Regroupement (`xsl:for-each-group`)
- Fonctions (`xsl:function`)
- Documents de sortie multiples (si nécessaire)
- Sortie JSON (extension Saxon)

## Notes d'Implémentation

- Utiliser Saxon-HE via le package Python `saxonche`
- Compiler les feuilles de style une fois, réutiliser pour plusieurs fichiers
- Gérer les différences de namespace entre IFC2x3 et IFC4
- Gestion d'erreurs pour XML mal formé
