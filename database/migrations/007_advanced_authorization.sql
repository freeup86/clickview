-- ===================================================================
-- ClickView Enterprise - Advanced Authorization (AUTH-002)
-- Version: 2.0.0-enterprise
-- Date: 2025-11-21
-- Features: RLS, CLS, Data Masking, ABAC Policy Engine
-- ===================================================================

-- ===================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- RLS policy definitions
CREATE TABLE rls_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Policy identification
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Target table
    table_name VARCHAR(100) NOT NULL,
    schema_name VARCHAR(100) DEFAULT 'public',

    -- Policy type
    policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('permissive', 'restrictive')),

    -- Commands this policy applies to
    commands TEXT[] DEFAULT ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::TEXT[],

    -- Policy expression (SQL WHERE clause)
    -- Examples:
    --   "organization_id = current_setting('app.current_organization')::uuid"
    --   "created_by = current_setting('app.current_user')::uuid"
    --   "visibility = 'public' OR created_by = current_setting('app.current_user')::uuid"
    using_expression TEXT NOT NULL,

    -- Check expression for INSERT/UPDATE (optional)
    check_expression TEXT,

    -- Roles this policy applies to
    applies_to_roles TEXT[] DEFAULT ARRAY['authenticated']::TEXT[],

    -- Status
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100, -- Higher priority = evaluated first

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),

    UNIQUE(schema_name, table_name, name)
);

-- RLS policy audit log
CREATE TABLE rls_policy_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES rls_policies(id) ON DELETE CASCADE,

    action VARCHAR(50) NOT NULL, -- created, updated, deleted, enabled, disabled
    old_values JSONB,
    new_values JSONB,

    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- ===================================================================
-- COLUMN-LEVEL SECURITY (CLS)
-- ===================================================================

-- Column access control definitions
CREATE TABLE column_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target column
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    schema_name VARCHAR(100) DEFAULT 'public',

    -- Access control
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL CHECK (permission_level IN ('none', 'read', 'write', 'masked')),

    -- Masking rule (if permission_level = 'masked')
    masking_rule_id UUID REFERENCES data_masking_rules(id),

    -- Conditions (optional - for attribute-based control)
    condition_expression TEXT, -- e.g., "user_department = 'finance'"

    -- Status
    is_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Either role_id or user_id must be set
    CHECK (role_id IS NOT NULL OR user_id IS NOT NULL)
);

-- ===================================================================
-- DYNAMIC DATA MASKING
-- ===================================================================

-- Data masking rule definitions
CREATE TABLE data_masking_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Rule identification
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Masking type
    masking_type VARCHAR(50) NOT NULL CHECK (masking_type IN (
        'full',          -- Complete masking: 'John Doe' -> '********'
        'partial',       -- Partial masking: 'john@example.com' -> 'j***@example.com'
        'email',         -- Email masking: 'john@example.com' -> 'j***@e***.com'
        'phone',         -- Phone masking: '555-1234' -> '***-1234'
        'credit_card',   -- CC masking: '4532-1234-5678-9010' -> '****-****-****-9010'
        'ssn',           -- SSN masking: '123-45-6789' -> '***-**-6789'
        'custom',        -- Custom function
        'hash',          -- One-way hash
        'null'           -- Return NULL
    )),

    -- Masking configuration
    config JSONB DEFAULT '{}'::jsonb,
    -- Examples:
    -- For 'partial': {"show_first": 1, "show_last": 0, "mask_char": "*"}
    -- For 'custom': {"function_name": "mask_custom_field"}

    -- Custom masking function (for 'custom' type)
    custom_function TEXT,

    -- Apply to specific data types
    data_types TEXT[], -- e.g., ['varchar', 'text', 'char']

    -- Exceptions (roles/users that bypass masking)
    bypass_roles UUID[] DEFAULT ARRAY[]::UUID[],
    bypass_users UUID[] DEFAULT ARRAY[]::UUID[],

    -- Status
    is_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(name)
);

-- Table-column masking assignments
CREATE TABLE column_masking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target column
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    schema_name VARCHAR(100) DEFAULT 'public',

    -- Masking rule
    masking_rule_id UUID NOT NULL REFERENCES data_masking_rules(id) ON DELETE CASCADE,

    -- Conditional masking
    condition_expression TEXT, -- e.g., "role != 'admin'"

    -- Status
    is_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(schema_name, table_name, column_name)
);

-- ===================================================================
-- ATTRIBUTE-BASED ACCESS CONTROL (ABAC) POLICY ENGINE
-- ===================================================================

-- ABAC policy definitions
CREATE TABLE abac_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Policy identification
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,

    -- Policy target
    resource_type VARCHAR(100) NOT NULL, -- dashboard, workspace, widget, query, etc.
    action VARCHAR(50) NOT NULL, -- read, write, delete, share, execute, etc.

    -- Policy effect
    effect VARCHAR(50) NOT NULL CHECK (effect IN ('allow', 'deny')),

    -- Policy conditions (JSON-based rule engine)
    -- Supports complex attribute comparisons
    conditions JSONB NOT NULL,
    -- Example conditions:
    -- {
    --   "all": [
    --     {"attribute": "user.department", "operator": "equals", "value": "finance"},
    --     {"attribute": "resource.sensitivity", "operator": "lessThan", "value": "high"},
    --     {"attribute": "environment.time", "operator": "between", "value": ["09:00", "17:00"]}
    --   ]
    -- }

    -- Priority (higher = evaluated first)
    priority INTEGER DEFAULT 100,

    -- Organization scope (NULL = global/system policy)
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Status
    is_enabled BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- ABAC policy evaluation cache (for performance)
CREATE TABLE abac_policy_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Cache key components
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,

    -- Cached decision
    decision VARCHAR(10) NOT NULL CHECK (decision IN ('allow', 'deny')),
    matched_policies UUID[], -- Array of policy IDs that matched

    -- Cache metadata
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Context snapshot (for audit)
    context_snapshot JSONB,

    UNIQUE(user_id, resource_type, resource_id, action)
);

-- Create index for cache expiration cleanup
CREATE INDEX idx_abac_cache_expires ON abac_policy_cache(expires_at);

-- ===================================================================
-- PERMISSION INHERITANCE
-- ===================================================================

-- Permission inheritance rules
CREATE TABLE permission_inheritance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Parent resource (inherits from)
    parent_resource_type VARCHAR(100) NOT NULL,
    parent_resource_id UUID NOT NULL,

    -- Child resource (inherits to)
    child_resource_type VARCHAR(100) NOT NULL,
    child_resource_id UUID NOT NULL,

    -- Inheritance type
    inheritance_type VARCHAR(50) NOT NULL CHECK (inheritance_type IN (
        'full',      -- Child inherits all permissions from parent
        'additive',  -- Child has parent permissions + its own
        'override'   -- Child permissions override parent
    )),

    -- Inheritance depth (for cascading)
    max_depth INTEGER DEFAULT 1, -- -1 = infinite

    -- Status
    is_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(parent_resource_type, parent_resource_id, child_resource_type, child_resource_id)
);

-- Materialized permission view (denormalized for performance)
CREATE TABLE materialized_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Subject (who)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Resource (what)
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,

    -- Permission (action)
    permission VARCHAR(255) NOT NULL,

    -- Source of permission
    source VARCHAR(50) NOT NULL CHECK (source IN ('direct', 'role', 'inherited', 'organization')),
    source_id UUID, -- ID of role, parent resource, or organization

    -- Effective permission level
    permission_level VARCHAR(50) NOT NULL,

    -- Last computed
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- For temporary permissions

    UNIQUE(user_id, resource_type, resource_id, permission)
);

CREATE INDEX idx_materialized_perms_user ON materialized_permissions(user_id);
CREATE INDEX idx_materialized_perms_resource ON materialized_permissions(resource_type, resource_id);
CREATE INDEX idx_materialized_perms_expires ON materialized_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- ===================================================================
-- AUTHORIZATION CONTEXT
-- ===================================================================

-- Stores current authorization context for policy evaluation
CREATE TABLE authorization_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Session identification
    session_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Context attributes
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example attributes:
    -- {
    --   "user": {"department": "finance", "level": "senior", "location": "NYC"},
    --   "environment": {"ip": "192.168.1.1", "time": "14:30", "day": "monday"},
    --   "device": {"type": "mobile", "trusted": true}
    -- }

    -- Organization context
    organization_id UUID REFERENCES organizations(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_auth_context_session ON authorization_context(session_id);
CREATE INDEX idx_auth_context_expires ON authorization_context(expires_at);

-- ===================================================================
-- RESOURCE SENSITIVITY CLASSIFICATION
-- ===================================================================

-- Data sensitivity levels for compliance
CREATE TABLE resource_sensitivity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Resource identification
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,

    -- Sensitivity classification
    sensitivity_level VARCHAR(50) NOT NULL CHECK (sensitivity_level IN (
        'public',       -- No restrictions
        'internal',     -- Internal use only
        'confidential', -- Restricted access
        'restricted',   -- Highly restricted
        'critical'      -- Maximum security
    )),

    -- Compliance tags
    compliance_tags TEXT[], -- e.g., ['PII', 'PHI', 'PCI', 'GDPR', 'SOX']

    -- Data classification
    data_classification JSONB DEFAULT '{}'::jsonb,
    -- Example:
    -- {
    --   "contains_pii": true,
    --   "retention_period": "7 years",
    --   "encryption_required": true,
    --   "audit_required": true
    -- }

    -- Access restrictions
    requires_mfa BOOLEAN DEFAULT false,
    allowed_ip_ranges INET[],
    allowed_time_windows JSONB, -- e.g., [{"start": "09:00", "end": "17:00", "days": ["mon", "tue"]}]

    -- Metadata
    classified_by UUID REFERENCES users(id),
    classified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(resource_type, resource_id)
);

CREATE INDEX idx_resource_sensitivity_level ON resource_sensitivity(sensitivity_level);
CREATE INDEX idx_resource_sensitivity_compliance ON resource_sensitivity USING GIN(compliance_tags);

-- ===================================================================
-- DELEGATION & TEMPORARY ACCESS
-- ===================================================================

-- Temporary permission grants
CREATE TABLE permission_delegations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Delegation chain
    delegated_by UUID NOT NULL REFERENCES users(id), -- Who granted access
    delegated_to UUID NOT NULL REFERENCES users(id), -- Who received access

    -- What was delegated
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    permissions TEXT[] NOT NULL, -- Array of permissions granted

    -- Delegation constraints
    can_redelegate BOOLEAN DEFAULT false,
    max_redelegation_depth INTEGER DEFAULT 0,

    -- Time constraints
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    max_uses INTEGER, -- NULL = unlimited
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Status
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    revoke_reason TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (valid_until > valid_from)
);

CREATE INDEX idx_delegations_to ON permission_delegations(delegated_to) WHERE is_active = true;
CREATE INDEX idx_delegations_expires ON permission_delegations(valid_until) WHERE is_active = true;

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- RLS policies
CREATE INDEX idx_rls_policies_table ON rls_policies(schema_name, table_name) WHERE is_enabled = true;
CREATE INDEX idx_rls_policies_priority ON rls_policies(priority DESC) WHERE is_enabled = true;

-- Column permissions
CREATE INDEX idx_column_perms_table ON column_permissions(schema_name, table_name, column_name) WHERE is_enabled = true;
CREATE INDEX idx_column_perms_role ON column_permissions(role_id) WHERE is_enabled = true;
CREATE INDEX idx_column_perms_user ON column_permissions(user_id) WHERE is_enabled = true;

-- ABAC policies
CREATE INDEX idx_abac_policies_resource ON abac_policies(resource_type, action) WHERE is_enabled = true;
CREATE INDEX idx_abac_policies_priority ON abac_policies(priority DESC) WHERE is_enabled = true;
CREATE INDEX idx_abac_policies_org ON abac_policies(organization_id) WHERE is_enabled = true;

-- Permission inheritance
CREATE INDEX idx_perm_inherit_parent ON permission_inheritance(parent_resource_type, parent_resource_id);
CREATE INDEX idx_perm_inherit_child ON permission_inheritance(child_resource_type, child_resource_id);

-- ===================================================================
-- FUNCTIONS FOR AUTHORIZATION
-- ===================================================================

-- Function to check if user has permission on resource
CREATE OR REPLACE FUNCTION has_permission(
    p_user_id UUID,
    p_resource_type VARCHAR,
    p_resource_id UUID,
    p_permission VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM materialized_permissions
        WHERE user_id = p_user_id
          AND resource_type = p_resource_type
          AND resource_id = p_resource_id
          AND permission = p_permission
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to refresh materialized permissions for a user
CREATE OR REPLACE FUNCTION refresh_user_permissions(p_user_id UUID) RETURNS VOID AS $$
BEGIN
    -- Delete existing materialized permissions
    DELETE FROM materialized_permissions WHERE user_id = p_user_id;

    -- Rebuild from direct permissions, roles, and inheritance
    -- (Implementation would be more complex, this is a placeholder)
    -- This should be called when user roles change or permissions are updated

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- TRIGGERS
-- ===================================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rls_policies_updated_at BEFORE UPDATE ON rls_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_column_permissions_updated_at BEFORE UPDATE ON column_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_masking_rules_updated_at BEFORE UPDATE ON data_masking_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_abac_policies_updated_at BEFORE UPDATE ON abac_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_context_updated_at BEFORE UPDATE ON authorization_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger for RLS policy changes
CREATE OR REPLACE FUNCTION audit_rls_policy_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO rls_policy_audit (policy_id, action, old_values, new_values)
        VALUES (
            NEW.id,
            'updated',
            row_to_json(OLD),
            row_to_json(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO rls_policy_audit (policy_id, action, old_values)
        VALUES (OLD.id, 'deleted', row_to_json(OLD));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_rls_policies AFTER UPDATE OR DELETE ON rls_policies
    FOR EACH ROW EXECUTE FUNCTION audit_rls_policy_changes();

-- ===================================================================
-- INITIAL DATA - DEFAULT POLICIES
-- ===================================================================

-- Insert default data masking rules
INSERT INTO data_masking_rules (name, description, masking_type, config) VALUES
('email_standard', 'Standard email masking', 'email', '{"show_first": 1, "show_last": 0}'::jsonb),
('phone_standard', 'Standard phone masking', 'phone', '{"show_last": 4}'::jsonb),
('ssn_standard', 'Standard SSN masking', 'ssn', '{"show_last": 4}'::jsonb),
('credit_card_standard', 'Standard credit card masking', 'credit_card', '{"show_last": 4}'::jsonb),
('full_mask', 'Complete masking', 'full', '{"mask_char": "*"}'::jsonb),
('hash_irreversible', 'One-way hash', 'hash', '{"algorithm": "sha256"}'::jsonb);

-- ===================================================================
-- COMMENTS
-- ===================================================================

COMMENT ON TABLE rls_policies IS 'Row-level security policy definitions';
COMMENT ON TABLE column_permissions IS 'Column-level access control';
COMMENT ON TABLE data_masking_rules IS 'Dynamic data masking rules';
COMMENT ON TABLE column_masking IS 'Column-to-masking rule assignments';
COMMENT ON TABLE abac_policies IS 'Attribute-based access control policies';
COMMENT ON TABLE permission_inheritance IS 'Permission inheritance rules';
COMMENT ON TABLE materialized_permissions IS 'Denormalized permission cache';
COMMENT ON TABLE authorization_context IS 'Runtime authorization context';
COMMENT ON TABLE resource_sensitivity IS 'Data sensitivity classification';
COMMENT ON TABLE permission_delegations IS 'Temporary permission grants';

COMMENT ON COLUMN abac_policies.conditions IS 'JSON-based policy conditions supporting complex attribute comparisons';
COMMENT ON COLUMN data_masking_rules.config IS 'Masking configuration (JSON) - format varies by masking_type';
COMMENT ON COLUMN resource_sensitivity.compliance_tags IS 'Regulatory compliance tags (PII, PHI, PCI, GDPR, etc.)';
