-- Migration pour activer Row-Level Security (RLS)
-- À exécuter après la création des tables

-- Activer RLS sur toutes les tables avec portée locataire
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE storeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour jobs
CREATE POLICY tenant_isolation_jobs ON jobs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Politiques RLS pour models
CREATE POLICY tenant_isolation_models ON models
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Politiques RLS pour elements
CREATE POLICY tenant_isolation_elements ON elements
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Politiques RLS pour relationships
CREATE POLICY tenant_isolation_relationships ON relationships
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Politiques RLS pour spaces
CREATE POLICY tenant_isolation_spaces ON spaces
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Politiques RLS pour storeys
CREATE POLICY tenant_isolation_storeys ON storeys
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Politiques RLS pour audit_logs
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);





