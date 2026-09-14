# Explorateur d'éléments IFC

Page de consultation d'un modèle IFCXML après parsing : arbre de
hiérarchie et liste filtrable à gauche, fiche détaillée à droite. Thème
clair, aligné sur le reste de l'application (accent bleu, voir
`frontend/app/globals.css`), pas le thème sombre des premières versions.

**URL :** `/models/{id}`
**Composants :** `frontend/components/explorer/IfcExplorer.tsx`,
`frontend/components/explorer/HierarchyTree.tsx`
**Route Next.js :** `frontend/app/models/[id]/page.tsx`

Ce n'est pas un outil de coordination BIM générique : pas de vue 3D, pas
de visionneuse JSON brute. L'objectif est de retrouver rapidement un
élément et ses quantités/propriétés résolues, d'assigner un prix ou une
correction de quantité pour le métré chiffré, puis d'exporter un rapport
(Excel/PDF).

## Accès

1. Choisir ou créer un **client** puis un **projet** (`/clients`,
   `/projects`).
2. Uploader un fichier IFCXML dans ce projet (`/upload`).
3. Attendre que la tâche passe au statut **TERMINE**.
4. Ouvrir le modèle depuis **Modèles**, le tableau de bord, ou la fiche du
   projet.

La barre de navigation principale est masquée sur cette page pour laisser
place à un écran plein. Le lien **← Modèles** ramène à la liste.

## Disposition de l'écran

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Modèles   Nom du projet                    [⌕ Recherche] [Excel][PDF]
│  IFC4 · N éléments                                                    │
├───────────┬──────────────┬────────────────────────────────────────────┤
│ Arbre     │ Chips types  │  Nom de l'élément          [IfcWall]        │
│ Projet    │ IfcWall 12   │  guid · étage                               │
│  Site     │ IfcDoor  4   │                                             │
│   Bâtiment│ …            │  Emplacement                                │
│    Étage 1│──────────────│  X / Y / Z / Rotation / Étage               │
│     Pièce │ IfcWall      │                                             │
│    Étage 2│  Mur 250mm   │  Quantités (barres de proportion)           │
│           │  guid…       │  Prix / quantité assignés (métré chiffré)   │
│           │ IfcDoor      │  Jeux de propriétés (tables Pset)           │
│           │  Porte 900   │                                             │
│           │              │  Matériau (pastille + nom)                  │
└───────────┴──────────────┴────────────────────────────────────────────┘
```

| Zone | Rôle |
|------|------|
| En-tête | Nom du projet (`IfcProject` ou nom de fichier), version IFC, nombre d'éléments, recherche, export Excel/PDF |
| Arbre de hiérarchie | `IfcProject → IfcSite → IfcBuilding → IfcBuildingStorey → IfcSpace`. Cliquer sur un étage ou un espace filtre la liste ; les autres niveaux sont juste repliables/dépliables |
| Chips | Compteurs par type IFC (`IfcWall`, `IfcDoor`, …) ; chip **All** |
| Liste | Groupes par type ; nom + GUID ; élément sélectionné en surbrillance |
| Détail | Fiche de l'élément courant, y compris l'assignation manuelle de prix/quantité pour le métré chiffré |

Typographie : IBM Plex Sans / IBM Plex Mono. Accent bleu, cohérent avec
`frontend/app/globals.css`.

## Comportement

- **Types affichés dans la liste :** éléments de construction et espaces
  (`IfcWall`, `IfcDoor`, `IfcWindow`, `IfcSlab`, `IfcColumn`, `IfcSpace`,
  etc. — 130 sous-types concrets d'`IfcElement` + `IfcSpace`, énumérés
  depuis `ifcXML4.xsd`).
- **Types affichés uniquement dans l'arbre :** `IfcProject`, `IfcSite`,
  `IfcBuilding`, `IfcBuildingStorey` (structurants, pas des ouvrages).
- **Arbre tolérant aux relations manquantes :** si un niveau intermédiaire
  n'a pas de relation d'agrégation dans le fichier source (ex : un
  bâtiment sans site), ses enfants remontent au niveau disponible le plus
  proche plutôt que de disparaître.
- **Ordre des étages :** trié par élévation (`GET /models/{id}/storeys`),
  pas par ordre alphabétique.
- **Filtres combinés :** type × étage × espace × recherche.
- **Libellés de quantités :** traduits (Length → Longueur, NetArea →
  Surface nette, …).
- **Booléens :** `VRAI` / `FAUX`.
- **Placement :** coordonnées converties en millimètres si l'unité IFC
  est le mètre.
- **Barres de quantités :** proportion relative au maximum du même groupe
  d'unités dans l'élément.
- **Assignation de prix/quantité :** depuis la fiche détail, on peut
  assigner explicitement une entrée du catalogue de prix à un élément
  (utile quand plusieurs prix existent pour le même type IFC), et
  corriger manuellement sa quantité pour le métré chiffré — voir
  `backend/app/services/costing_service.py`.
- **Export Excel/PDF :** boutons dans l'en-tête, appellent
  `GET /models/{id}/report?format=xlsx|pdf` et déclenchent un
  téléchargement navigateur. L'export **DPGF** (groupé par lot, avec
  sous-totaux) est accessible depuis la page **Métré chiffré**
  (`/models/{id}/cost-estimate`), pas depuis l'explorateur lui-même.

## Données affichées

### Emplacement
Issu de `geometry.placement` (IfcLocalPlacement / IfcCartesianPoint) :
X, Y, Z, rotation (approximée depuis `RefDirection`), étage
(`storey_name`).

### Quantités
Issu de `quantities` (IfcElementQuantity / Qto). Chaque entrée a `value`,
`unit` et `type`.

### Jeux de propriétés
Issu de `properties`, un objet `{ "Pset_WallCommon": { "IsExternal": true, … }, … }`.

### Matériau
Issu de `attributes.material` : `{ name, color }`. La couleur est dérivée
du nom si le fichier n'en fournit pas.

## Backend associé

Le parseur (`backend/app/services/parser_service.py` +
`backend/app/utils/ifc_utils.py`) remplit ces champs en plusieurs passes :

1. Entités de hiérarchie et éléments (streaming `iterparse`).
2. Relations spatiales (`IfcRelContainedInSpatialStructure`,
   `IfcRelAggregates`, …) pour lier l'étage.
3. Définitions référencées : `IfcPropertySet`, `IfcElementQuantity`,
   `IfcRelDefinesByProperties`, `IfcRelAssociatesMaterial`.

### API

| Méthode | Chemin | Usage |
|---------|--------|--------|
| `GET` | `/api/v1/models/{id}` | Nom, statistiques, version IFC, client/projet |
| `GET` | `/api/v1/models/{id}/storeys` | Liste des étages triés par élévation (id = `element_id` du storey) |
| `GET` | `/api/v1/models/{id}/report?format=xlsx\|pdf\|dpgf` | Génère et télécharge le rapport de quantités (`dpgf` = groupé par lot avec sous-totaux) |
| `GET` | `/api/v1/models/{id}/cost-estimate` | Avant-métré chiffré, groupé par lot |
| `GET` | `/api/v1/models/{id}/quality` | Avertissements « quantités manquantes » |
| `GET` | `/api/v1/models/{id}/compliance` | Avertissements réglementaires indicatifs |
| `GET` | `/api/v1/elements?model_id={id}&page_size=2000` | Éléments avec hiérarchie spatiale, properties, quantities, attributes, geometry, prix/quantité assignés |
| `PUT` | `/api/v1/elements/{id}/price` | Assigne (ou retire) un prix de catalogue à un élément |
| `PUT` | `/api/v1/elements/{id}/quantity-override` | Corrige manuellement la quantité d'un élément |

La page charge jusqu'à **2000** éléments côté client (y compris les
entités de hiérarchie, utilisées pour construire l'arbre) ; le filtrage
est ensuite local.

## Fichiers

```
frontend/app/models/[id]/page.tsx          # Route, chargement des données
frontend/components/explorer/IfcExplorer.tsx
frontend/components/explorer/HierarchyTree.tsx  # Arbre Project → Site → Building → Storey → Space
frontend/components/explorer/explorer.css  # Thème clair, accent bleu
frontend/components/explorer/explorerUtils.ts   # buildHierarchyTree, flattenQuantities, flattenPsets, IFC_TYPE_GROUPS, …
frontend/components/layout/AppShell.tsx    # Plein écran sans nav globale
frontend/lib/api.ts                        # api.downloadReport(), api.assignElementPrice(), …
backend/app/api/v1/elements.py
backend/app/api/v1/models.py              # GET .../storeys, .../report, .../cost-estimate, .../quality, .../compliance
backend/app/services/parser_service.py
backend/app/services/report_service.py
backend/app/services/costing_service.py
backend/app/utils/ifc_utils.py
```

## Limites actuelles

- Pas de vue 3D : l'emplacement est numérique uniquement, pas de
  géométrie de représentation (B-rep, extrusions).
- Les Psets / Qto / matériaux **uniquement référencés** et mal liés dans
  le XML peuvent rester vides — voir les avertissements de qualité
  d'export (`GET /models/{id}/quality`).
- Au-delà de 2000 éléments, la liste et l'arbre sont tronqués
  (pagination API).
