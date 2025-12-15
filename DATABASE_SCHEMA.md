# Conception du Schéma de Base de Données

## Vue d'Ensemble

Base de données PostgreSQL avec support JSONB pour stockage flexible des propriétés. Toutes les tables incluent l'isolation des locataires et des champs d'audit.

## Tables

### 1. `tenants`
Isolation multi-locataire au niveau racine.

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
```

### 2. `jobs`
Suivre le statut d'upload et de traitement des fichiers.

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    ifc_version VARCHAR(10), -- 'IFC2X3' ou 'IFC4'
    status VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
    -- Valeurs de statut: EN_ATTENTE, VALIDATION, VALIDE, PARSING, TRANSFORMATION, TERMINE, ECHOUE
    error_message TEXT,
    validation_errors JSONB, -- Tableau d'erreurs de validation
    metadata JSONB, -- Métadonnées de fichier, statistiques de traitement
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_tenant_status ON jobs(tenant_id, status);
```

### 3. `models`
Métadonnées du modèle IFC parsé et JSON normalisé.

```sql
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(500),
    description TEXT,
    project_guid UUID, -- GUID du Projet racine
    normalized_json JSONB, -- JSON transformé par XSLT
    statistics JSONB, -- Compteurs: éléments, espaces, relations, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_models_job_id ON models(job_id);
CREATE INDEX idx_models_tenant_id ON models(tenant_id);
CREATE INDEX idx_models_project_guid ON models(project_guid);
CREATE INDEX idx_models_normalized_json ON models USING GIN(normalized_json);
```

### 4. `elements`
Éléments IFC (murs, dalles, portes, fenêtres, etc.).

```sql
CREATE TABLE elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    guid UUID NOT NULL, -- GUID IFC
    ifc_type VARCHAR(100) NOT NULL, -- ex: 'IfcWall', 'IfcSlab', 'IfcDoor'
    name VARCHAR(500),
    description TEXT,
    tag VARCHAR(100), -- Tag/identifiant d'élément
    -- Hiérarchie
    project_id UUID REFERENCES elements(id),
    site_id UUID REFERENCES elements(id),
    building_id UUID REFERENCES elements(id),
    storey_id UUID REFERENCES elements(id),
    space_id UUID REFERENCES elements(id),
    -- Propriétés et Quantités (JSONB pour flexibilité)
    properties JSONB, -- Ensembles de Propriétés (Psets)
    quantities JSONB, -- Quantités (Qto)
    -- Géométrie (si extraite)
    geometry JSONB,
    -- Attributs IFC bruts
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(model_id, guid)
);

CREATE INDEX idx_elements_model_id ON elements(model_id);
CREATE INDEX idx_elements_tenant_id ON elements(tenant_id);
CREATE INDEX idx_elements_guid ON elements(guid);
CREATE INDEX idx_elements_ifc_type ON elements(ifc_type);
CREATE INDEX idx_elements_storey_id ON elements(storey_id);
CREATE INDEX idx_elements_space_id ON elements(space_id);
CREATE INDEX idx_elements_properties ON elements USING GIN(properties);
CREATE INDEX idx_elements_quantities ON elements USING GIN(quantities);
CREATE INDEX idx_elements_name ON elements(name);
```

### 5. `relationships`
Relations entre éléments (contenu, agrégation, vides/remplissages, etc.).

```sql
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    -- Types: CONTIENT, AGREGATE, VIDES, REMPLISSAGES, CONNECTE, etc.
    from_element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    to_element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    metadata JSONB, -- Données de relation supplémentaires
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_relationships_model_id ON relationships(model_id);
CREATE INDEX idx_relationships_tenant_id ON relationships(tenant_id);
CREATE INDEX idx_relationships_from_element ON relationships(from_element_id);
CREATE INDEX idx_relationships_to_element ON relationships(to_element_id);
CREATE INDEX idx_relationships_type ON relationships(relationship_type);
CREATE INDEX idx_relationships_from_type ON relationships(from_element_id, relationship_type);
```

### 6. `spaces`
Table dédiée pour les espaces (pièces) avec hiérarchie.

```sql
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    guid UUID NOT NULL,
    name VARCHAR(500),
    number VARCHAR(100), -- Numéro de pièce
    storey_id UUID REFERENCES elements(id),
    building_id UUID REFERENCES elements(id),
    properties JSONB,
    quantities JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(model_id, guid)
);

CREATE INDEX idx_spaces_model_id ON spaces(model_id);
CREATE INDEX idx_spaces_tenant_id ON spaces(tenant_id);
CREATE INDEX idx_spaces_guid ON spaces(guid);
CREATE INDEX idx_spaces_storey_id ON spaces(storey_id);
CREATE INDEX idx_spaces_building_id ON spaces(building_id);
```

### 7. `storeys`
Niveaux de bâtiment (étages).

```sql
CREATE TABLE storeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    guid UUID NOT NULL,
    name VARCHAR(500),
    elevation NUMERIC(10, 3), -- Élévation du niveau
    building_id UUID REFERENCES elements(id),
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(model_id, guid)
);

CREATE INDEX idx_storeys_model_id ON storeys(model_id);
CREATE INDEX idx_storeys_tenant_id ON storeys(tenant_id);
CREATE INDEX idx_storeys_guid ON storeys(guid);
CREATE INDEX idx_storeys_building_id ON storeys(building_id);
```

## Stratégie d'Indexation

### Index Principaux
- Toutes les clés étrangères indexées pour performance des JOIN
- ID Locataire indexé sur toutes les tables pour requêtes multi-locataires
- Index GUID pour recherches d'entités IFC

### Index JSONB
- Index GIN sur colonnes JSONB pour recherches de propriétés/quantités
- JSON normalisé indexé pour capacités de recherche plein texte

### Index Composés
- `(tenant_id, status)` sur jobs pour listes de tâches par locataire
- `(model_id, guid)` contraintes uniques pour unicité des entités

### Modèles de Requêtes Supportés
1. **Isolation locataire** : Toutes les requêtes filtrées par `tenant_id`
2. **Hiérarchie de modèle** : Project → Site → Building → Storey → Space
3. **Recherche d'éléments** : Par type, nom, propriétés
4. **Parcours de relations** : Recherches d'éléments depuis/vers
5. **Recherche de propriétés** : Requêtes JSONB sur Psets/Qto

## Sécurité au Niveau des Lignes (Futur - Phase 6)

```sql
-- Activer RLS sur toutes les tables avec portée locataire
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE storeys ENABLE ROW LEVEL SECURITY;

-- Exemple de politique (à implémenter en Phase 6)
CREATE POLICY tenant_isolation_jobs ON jobs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

## Stratégie de Migration

1. Créer les tables de base (tenants, jobs)
2. Créer les tables de modèles (models, elements)
3. Créer les tables de relations (relationships, spaces, storeys)
4. Ajouter les index de manière incrémentale
5. Ajouter les politiques RLS en Phase 6
