# Plateforme SaaS IFCXML Entreprise - Architecture

## Architecture de Haut Niveau

### Vue d'Ensemble du Système

```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend Next.js                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Upload   │  │  Tâches  │  │Explorateur│  │ Recherche│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend FastAPI                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Upload     │  │ Validation   │  │   Parseur    │     │
│  │   Service    │  │   Service    │  │  (résout     │     │
│  │              │  │              │  │  Psets/Qtos) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Travailleurs │  │   Locataire  │                        │
│  │  en Arrière- │  │  Middleware  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        ┌──────────────┐      ┌──────────────┐
        │  PostgreSQL  │      │ Stockage     │
        │   Base de    │      │  Fichiers    │
        │   Données    │      │ (S3/Local)   │
        └──────────────┘      └──────────────┘
```

### Principes Fondamentaux

1. **Streaming en Priorité** : Tout traitement XML utilise des parseurs en streaming (iterparse/SAX)
2. **Traitement Asynchrone** : Les opérations lourdes s'exécutent dans des workers en arrière-plan
3. **Prêt Multi-Tenant** : Isolation des locataires au niveau base de données et stockage
4. **Validation en Premier** : Validation XSD avant tout traitement
5. **Résolution en Python** : Les Psets/Qtos sont résolus en une seconde passe Python sur le graphe d'entités déjà parsé, sans couche de transformation séparée

## Responsabilités des Composants

### Services Backend

#### Service d'Upload
- Accepter les uploads de fichiers multipart
- Stocker les fichiers avec isolation par locataire
- Créer des enregistrements de tâches
- Déclencher le traitement en arrière-plan

#### Service de Validation
- Détecter la version IFC depuis le namespace XML
- Charger le schéma XSD approprié
- Valider le XML en streaming contre le XSD
- Rapporter les erreurs de validation avec numéros de ligne

#### Service de Parsing
- Parser IFCXML en streaming avec iterparse (une seule passe pour les entités/éléments, gardant la mémoire bornée)
- Extraire les entités (Project, Site, Building, Storey, Space, Elements)
- Résoudre les GUIDs et relations (CONTAINS, AGGREGATES, VOIDS, FILLS)
- Résoudre en une seconde passe les Psets/Qtos (`IfcRelDefinesByProperties`, `IfcElementQuantity`) et les matériaux, en Python pur, directement dans les colonnes JSONB `properties`/`quantities` des éléments — sans étape de transformation séparée

#### Workers en Arrière-Plan
- Traiter les uploads de fichiers de manière asynchrone
- Gérer le pipeline validation → parsing (avec résolution Psets/Qtos)
- Mettre à jour le statut des tâches
- Envoyer des notifications en cas de succès/échec

### Composants Frontend

#### Page d'Upload
- Upload de fichiers par glisser-déposer
- Indication de progression
- Retour de validation de fichier

#### Page de Statut des Tâches
- Lister toutes les tâches du locataire
- Mises à jour en temps réel (WebSocket/SSE)
- Messages d'erreur et logs

#### Explorateur de Modèle
Page plein écran `/models/{id}` (voir [EXPLORER.md](./EXPLORER.md)), calquée sur la maquette `ifc_browser_fr.html` :

- En-tête : nom de projet, version IFC, recherche nom/GUID, export Excel/PDF
- Rail gauche : arbre `Project → Site → Building → Storey → Space`, puis chips de types IFC et liste groupée
- Panneau droit : emplacement, quantités (barres), jeux de propriétés, matériau
- Types spatiaux racines (`IfcProject`, `IfcSite`, `IfcBuilding`, `IfcBuildingStorey`) exclus de la liste des éléments ; navigables uniquement via l'arbre

#### Vue de Détail d'Élément
Intégrée au panneau droit de l'explorateur — pas de visionneuse JSON brute, pas d'outil de coordination BIM générique.

## Flux de Données

### Pipeline d'Upload et Traitement

```
1. L'utilisateur upload un fichier IFCXML
   ↓
2. Fichier stocké dans un emplacement spécifique au locataire
   ↓
3. Enregistrement de tâche créé (statut: EN_ATTENTE)
   ↓
4. Worker en arrière-plan prend la tâche
   ↓
5. Service de Validation:
   - Détecter la version IFC
   - Valider en streaming contre XSD
   - Rapporter les erreurs si présentes
   ↓
6. Service de Parsing:
   - Parser XML en streaming
   - Extraire les entités et éléments
   - Résoudre les Psets/Qtos (deuxième passe Python) dans les colonnes JSONB
   - Stocker dans la base de données
   ↓
7. Statut de tâche mis à jour (statut: TERMINE)
   ↓
8. Frontend notifié via WebSocket/SSE
```

## Pile Technologique

### Backend
- **Framework** : FastAPI 0.104+
- **Base de données** : PostgreSQL 14+ avec JSONB
- **File d'attente de tâches** : Celery + Redis (ou RQ)
- **Parsing XML** : lxml (iterparse), résolution Psets/Qtos en Python pur
- **Stockage de fichiers** : Système de fichiers local (dev) / S3 (prod)

### Frontend
- **Framework** : Next.js 14+ (App Router)
- **Bibliothèque UI** : React 18+
- **Gestion d'état** : React Query / SWR
- **Composants UI** : shadcn/ui ou similaire
- **Temps réel** : WebSocket ou Server-Sent Events

### Infrastructure
- **Containerisation** : Docker + Docker Compose
- **Proxy inverse** : Nginx (production)
- **Monitoring** : À définir (Prometheus/Grafana)

## Considérations de Sécurité

1. **Sécurité des Uploads de Fichiers**
   - Limites de taille de fichier
   - Validation du type MIME
   - Scan antivirus (futur)

2. **Isolation des Locataires**
   - Sécurité au niveau des lignes de la base de données
   - Isolation des chemins de stockage de fichiers
   - Contexte locataire des requêtes API

3. **Authentification** (Phase 6)
   - Tokens JWT
   - Support de clés API
   - Contrôle d'accès basé sur les rôles

## Considérations de Scalabilité

1. **Mise à l'Échelle Horizontale**
   - Serveurs API sans état
   - Base de données partagée
   - File d'attente de tâches distribuée

2. **Performance**
   - Stratégie d'indexation de base de données
   - Cache (Redis) pour requêtes fréquentes
   - CDN pour assets statiques

3. **Gestion de Fichiers Lourds**
   - Uploads par chunks (futur)
   - Traitement en streaming (obligatoire)
   - Suivi de progression

## Hypothèses

1. **Versions IFC** : Support de IFC2x3 et IFC4 initialement
2. **Taille de fichier** : Jusqu'à 500MB par fichier (configurable)
3. **Tâches concurrentes** : 10 par locataire (configurable)
4. **Stockage** : Système de fichiers local pour MVP, S3 pour production
5. **Authentification** : Auth basique par clé API pour Phase 6

## Risques & Atténuations

| Risque | Impact | Atténuation |
|--------|--------|-------------|
| Épuisement mémoire sur fichiers volumineux | Élevé | Parsing en streaming obligatoire, pas de chargement DOM |
| Performance validation XSD | Moyen | Validation en streaming, cache des schémas compilés |
| Performance base de données sur modèles volumineux | Élevé | Indexation appropriée, requêtes JSONB, pagination |
| Fuite de données locataire | Critique | Sécurité au niveau des lignes, isolation des chemins, logs d'audit |
