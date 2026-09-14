# Explorateur d’éléments IFC

Page de consultation d’un modèle IFCXML après parsing. L’interface reprend la maquette `ifc_browser_fr.html` : thème sombre, arbre de hiérarchie et liste filtrable à gauche, fiche détaillée à droite.

**URL :** `/models/{id}`  
**Composants :** `frontend/components/explorer/IfcExplorer.tsx`, `frontend/components/explorer/HierarchyTree.tsx`  
**Route Next.js :** `frontend/app/models/[id]/page.tsx`

Ce n’est pas un outil de coordination BIM générique : pas de vue 3D, pas de visionneuse JSON brute. L’objectif est de retrouver rapidement un élément et ses quantités/propriétés résolues, puis d’exporter un rapport (Excel/PDF).

## Accès

1. Uploader un fichier IFCXML (`/upload`).
2. Attendre que la tâche passe au statut **TERMINE**.
3. Cliquer sur **Explorer le modèle** depuis la fiche de tâche, ou ouvrir le modèle dans **Modèles**.

La barre de navigation principale est masquée sur cette page pour laisser place à un écran plein. Le lien **← Modèles** ramène à la liste.

Les modèles parsés **avant** la mise en place de l’explorateur n’ont souvent que le nom et le type. Pour obtenir psets, quantités, emplacement et matériau, **re-uploader** le fichier.

## Disposition de l’écran

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Modèles   Nom du projet                    [⌕ Recherche] [Excel][PDF]
│  IFC4 · N éléments                                                    │
├───────────┬──────────────┬────────────────────────────────────────────┤
│ Arbre     │ Chips types  │  Nom de l’élément          [IfcWall]        │
│ Projet    │ IfcWall 12   │  guid · étage                               │
│  Site     │ IfcDoor  4   │                                             │
│   Bâtiment│ …            │  Emplacement                                │
│    Étage 1│──────────────│  X / Y / Z / Rotation / Étage               │
│     Pièce │ IfcWall      │                                             │
│    Étage 2│  Mur 250mm   │  Quantités (barres de proportion)           │
│           │  guid…       │                                             │
│           │ IfcDoor      │  Jeux de propriétés (tables Pset)           │
│           │  Porte 900   │                                             │
│           │              │  Matériau (pastille + nom)                  │
└───────────┴──────────────┴────────────────────────────────────────────┘
```

| Zone | Rôle |
|------|------|
| En-tête | Nom du projet (`IfcProject` ou nom de fichier), version IFC, nombre d’éléments, recherche, export Excel/PDF |
| Arbre de hiérarchie | `IfcProject → IfcSite → IfcBuilding → IfcBuildingStorey → IfcSpace`. Cliquer sur un étage ou un espace filtre la liste ; les autres niveaux sont juste repliables/dépliables |
| Chips | Compteurs par type IFC (`IfcWall`, `IfcDoor`, …) ; chip **All** |
| Liste | Groupes par type ; nom + GUID ; élément sélectionné en orange |
| Détail | Fiche de l’élément courant |

Typographie : IBM Plex Sans / IBM Plex Mono. Accent : `#E8722C` sur fond `#161B22`.

## Comportement

- **Types affichés dans la liste :** éléments de construction et espaces (`IfcWall`, `IfcDoor`, `IfcWindow`, `IfcSlab`, `IfcColumn`, `IfcSpace`, etc.).
- **Types affichés uniquement dans l’arbre :** `IfcProject`, `IfcSite`, `IfcBuilding`, `IfcBuildingStorey` (structurants, pas des ouvrages).
- **Arbre tolérant aux relations manquantes :** si un niveau intermédiaire n’a pas de relation d’agrégation dans le fichier source (ex : un bâtiment sans site), ses enfants remontent au niveau disponible le plus proche plutôt que de disparaître.
- **Ordre des étages :** trié par élévation (`GET /models/{id}/storeys`), pas par ordre alphabétique.
- **Filtres combinés :** type × étage × espace × recherche.
- **Libellés de quantités :** traduits (Length → Longueur, NetArea → Surface nette, …).
- **Booléens :** `VRAI` / `FAUX`.
- **Placement :** coordonnées converties en millimètres si l’unité IFC est le mètre.
- **Barres de quantités :** proportion relative au maximum du même groupe d’unités dans l’élément.
- **Export Excel/PDF :** boutons dans l’en-tête, appellent `GET /models/{id}/report?format=xlsx|pdf` (voir `report_service.py`) et déclenchent un téléchargement navigateur.

## Données affichées

### Emplacement

Issu de `geometry.placement` (IfcLocalPlacement / IfcCartesianPoint) :

- X, Y, Z
- Rotation (approximée depuis `RefDirection`)
- Étage (`storey_name`)

### Quantités

Issu de `quantities` (IfcElementQuantity / Qto). Chaque entrée a `value`, `unit` et `type`.

### Jeux de propriétés

Issu de `properties`, un objet `{ "Pset_WallCommon": { "IsExternal": true, … }, … }`.

### Matériau

Issu de `attributes.material` : `{ name, color }`. La couleur est dérivée du nom si le fichier n’en fournit pas.

## Backend associé

Le parseur (`backend/app/services/parser_service.py` + `backend/app/utils/ifc_utils.py`) remplit ces champs en plusieurs passes :

1. Entités de hiérarchie et éléments (streaming `iterparse`).
2. Relations spatiales (`IfcRelContainedInSpatialStructure`, `IfcRelAggregates`, …) pour lier l’étage.
3. Définitions référencées : `IfcPropertySet`, `IfcElementQuantity`, `IfcRelDefinesByProperties`, `IfcRelAssociatesMaterial`.

### API

| Méthode | Chemin | Usage |
|---------|--------|--------|
| `GET` | `/api/v1/models/{id}` | Nom, statistiques, version IFC |
| `GET` | `/api/v1/models/{id}/storeys` | Liste des étages triés par élévation (id = `element_id` du storey) |
| `GET` | `/api/v1/models/{id}/report?format=xlsx\|pdf` | Génère et télécharge le rapport de quantités (voir `report_service.py`) |
| `GET` | `/api/v1/elements?model_id={id}&page_size=2000` | Éléments avec project_id/site_id/building_id/storey_id/space_id, properties, quantities, attributes, geometry |

La page charge jusqu’à **2000** éléments côté client (y compris les entités de hiérarchie, utilisées pour construire l'arbre) ; le filtrage est ensuite local.

## Fichiers

```
frontend/app/models/[id]/page.tsx          # Route, chargement des données
frontend/components/explorer/IfcExplorer.tsx
frontend/components/explorer/HierarchyTree.tsx  # Arbre Project → Site → Building → Storey → Space
frontend/components/explorer/explorer.css  # Thème sombre (maquette)
frontend/components/explorer/explorerUtils.ts   # buildHierarchyTree, flattenQuantities, flattenPsets, …
frontend/components/layout/AppShell.tsx    # Plein écran sans nav globale
frontend/lib/api.ts                        # api.downloadReport()
backend/app/api/v1/elements.py
backend/app/api/v1/models.py              # GET .../storeys, GET .../report
backend/app/services/parser_service.py
backend/app/services/report_service.py
backend/app/utils/ifc_utils.py
```

## Limites actuelles

- Pas de vue 3D : l’emplacement est numérique uniquement.
- Les Psets / Qto / matériaux **uniquement référencés** et mal liés dans le XML peuvent rester vides (voir aussi les avertissements de qualité d'export, `GET /models/{id}/quality`, pas encore affichés dans cette UI).
- Au-delà de 2000 éléments, la liste et l'arbre sont tronqués (pagination API).
- La géométrie de représentation (B-rep, extrusions) n’est pas extraite.
