-- ===================================================================
-- ClickView Enterprise - Authentication & Authorization Schema
-- Version: 2.0.0-enterprise
-- Date: 2025-11-21
-- ===================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================================================
-- USERS & AUTHENTICATION
-- ===================================================================

-- Users table (enterprise multi-tenant)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT, -- NULL for SSO-only users
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    phone VARCHAR(50),

    -- Authentication settings
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret TEXT, -- TOTP secret (encrypted)
    mfa_backup_codes TEXT[], -- Encrypted backup codes

    -- Account status
    is_active BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    locked_until TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,

    -- Password management
    password_changed_at TIMESTAMP WITH TIME ZONE,
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    must_change_password BOOLEAN DEFAULT false,

    -- Profile
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',
    preferences JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,

    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50), -- mobile, desktop, tablet
    device_name VARCHAR(255),

    -- Session management
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,

    -- Security
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT
);

-- SSO providers and connections
CREATE TABLE sso_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL, -- 'google', 'microsoft', 'okta', etc.
    type VARCHAR(50) NOT NULL CHECK (type IN ('saml', 'oauth2', 'oidc')),

    -- Provider configuration
    is_enabled BOOLEAN DEFAULT true,
    auto_create_users BOOLEAN DEFAULT false,

    -- SAML configuration
    saml_entry_point TEXT,
    saml_issuer TEXT,
    saml_cert TEXT,

    -- OAuth2/OIDC configuration
    client_id TEXT,
    client_secret_encrypted TEXT,
    authorization_url TEXT,
    token_url TEXT,
    user_info_url TEXT,
    scopes TEXT[],

    -- Attribute mapping
    attribute_mapping JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User SSO connections
CREATE TABLE user_sso_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,

    provider_user_id VARCHAR(255) NOT NULL, -- ID from SSO provider
    provider_email VARCHAR(255),
    provider_data JSONB DEFAULT '{}'::jsonb,

    linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(provider_id, provider_user_id)
);

-- ===================================================================
-- ORGANIZATIONS & TENANCY
-- ===================================================================

-- Organizations (multi-tenant isolation)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,

    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7), -- Hex color
    custom_domain VARCHAR(255),

    -- Subscription & limits
    plan_type VARCHAR(50) DEFAULT 'free', -- free, professional, enterprise
    max_users INTEGER,
    max_workspaces INTEGER,
    max_dashboards INTEGER,
    features JSONB DEFAULT '{}'::jsonb, -- Feature flags

    -- Status
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,

    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User-Organization membership
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role in organization
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, invited, suspended
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(organization_id, user_id)
);

-- ===================================================================
-- ROLES & PERMISSIONS (RBAC)
-- ===================================================================

-- Roles (reusable permission sets)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- System roles cannot be modified
    is_system BOOLEAN DEFAULT false,

    -- Permissions (array of permission strings)
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(organization_id, name)
);

-- User-Role assignments
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- For temporary access

    UNIQUE(user_id, role_id, organization_id)
);

-- Permissions (granular access control)
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Permission identifier (e.g., 'dashboard:read', 'workspace:write')
    resource VARCHAR(100) NOT NULL, -- dashboard, workspace, widget, etc.
    action VARCHAR(50) NOT NULL, -- read, write, delete, share, etc.
    scope VARCHAR(50) DEFAULT 'all', -- all, own, team, organization

    name VARCHAR(255) UNIQUE NOT NULL, -- Computed: resource:action:scope
    description TEXT,

    -- Permission categories
    category VARCHAR(50), -- data, admin, security, etc.

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resource-level permissions (for fine-grained access)
CREATE TABLE resource_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,

    -- Resource identification
    resource_type VARCHAR(100) NOT NULL, -- dashboard, workspace, widget
    resource_id UUID NOT NULL,

    -- Permission level
    permission_level VARCHAR(50) NOT NULL, -- view, edit, admin, owner

    -- Inheritance
    inherited_from UUID REFERENCES resource_permissions(id),

    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CHECK (user_id IS NOT NULL OR role_id IS NOT NULL)
);

-- ===================================================================
-- WORKSPACE RELATIONSHIPS (Updated)
-- ===================================================================

-- Link workspaces to organizations
ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'private'; -- private, team, organization

-- Link dashboards to users
ALTER TABLE dashboards
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'private';

-- ===================================================================
-- AUDIT LOGGING
-- ===================================================================

-- Comprehensive audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,

    -- What
    action VARCHAR(100) NOT NULL, -- login, logout, create, update, delete, view
    resource_type VARCHAR(100), -- user, dashboard, workspace, etc.
    resource_id UUID,

    -- Context
    description TEXT,
    ip_address INET,
    user_agent TEXT,

    -- Changes (for updates)
    old_values JSONB,
    new_values JSONB,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Severity for security events
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, error, critical

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Security events (separate from general audit log)
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    event_type VARCHAR(100) NOT NULL, -- failed_login, account_locked, suspicious_activity
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    ip_address INET,
    user_agent TEXT,
    location JSONB, -- GeoIP data

    details JSONB DEFAULT '{}'::jsonb,
    risk_score INTEGER, -- 0-100

    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- API KEYS & TOKENS
-- ===================================================================

-- API keys for programmatic access
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    key_hash TEXT UNIQUE NOT NULL, -- Hashed API key
    key_prefix VARCHAR(10), -- First few chars for identification

    -- Permissions
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,

    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;

-- Sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at) WHERE is_active = true;

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE is_active = true;
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);

-- Roles & Permissions
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_resource_permissions_user_id ON resource_permissions(user_id);
CREATE INDEX idx_resource_permissions_resource ON resource_permissions(resource_type, resource_id);

-- Audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);

-- API Keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash) WHERE is_active = true;

-- ===================================================================
-- TRIGGERS
-- ===================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data (unless they're admins)
CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (id = current_setting('app.current_user_id')::uuid OR
           current_setting('app.is_admin')::boolean = true);

-- Organizations: members can view, admins can modify
CREATE POLICY organizations_select_members ON organizations
    FOR SELECT
    USING (id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = current_setting('app.current_user_id')::uuid
    ));

-- ===================================================================
-- SEED DATA: System Roles
-- ===================================================================

INSERT INTO roles (id, name, description, is_system, permissions) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'Full system access', true, ARRAY[
        'system:*',
        'user:*',
        'organization:*',
        'workspace:*',
        'dashboard:*',
        'widget:*',
        'role:*',
        'permission:*',
        'audit:*'
    ]),
    ('00000000-0000-0000-0000-000000000002', 'Organization Admin', 'Full organization access', true, ARRAY[
        'organization:read',
        'organization:write',
        'user:invite',
        'user:read',
        'workspace:*',
        'dashboard:*',
        'widget:*',
        'role:assign'
    ]),
    ('00000000-0000-0000-0000-000000000003', 'Manager', 'Manage workspaces and dashboards', true, ARRAY[
        'workspace:*',
        'dashboard:*',
        'widget:*',
        'user:read'
    ]),
    ('00000000-0000-0000-0000-000000000004', 'Analyst', 'Create and edit dashboards', true, ARRAY[
        'workspace:read',
        'dashboard:create',
        'dashboard:read',
        'dashboard:write:own',
        'dashboard:delete:own',
        'widget:*:own'
    ]),
    ('00000000-0000-0000-0000-000000000005', 'Viewer', 'View-only access', true, ARRAY[
        'workspace:read',
        'dashboard:read',
        'widget:read'
    ]);

-- ===================================================================
-- SEED DATA: Permissions
-- ===================================================================

INSERT INTO permissions (resource, action, scope, name, description, category) VALUES
    -- System
    ('system', 'admin', 'all', 'system:admin', 'Full system administration', 'admin'),

    -- Users
    ('user', 'create', 'all', 'user:create', 'Create new users', 'admin'),
    ('user', 'read', 'all', 'user:read', 'View all users', 'admin'),
    ('user', 'write', 'all', 'user:write', 'Edit any user', 'admin'),
    ('user', 'delete', 'all', 'user:delete', 'Delete any user', 'admin'),
    ('user', 'invite', 'all', 'user:invite', 'Invite users to organization', 'admin'),

    -- Organizations
    ('organization', 'create', 'all', 'organization:create', 'Create organizations', 'admin'),
    ('organization', 'read', 'all', 'organization:read', 'View organization details', 'data'),
    ('organization', 'write', 'all', 'organization:write', 'Edit organization settings', 'admin'),
    ('organization', 'delete', 'all', 'organization:delete', 'Delete organization', 'admin'),

    -- Workspaces
    ('workspace', 'create', 'all', 'workspace:create', 'Create workspaces', 'data'),
    ('workspace', 'read', 'all', 'workspace:read', 'View all workspaces', 'data'),
    ('workspace', 'read', 'own', 'workspace:read:own', 'View own workspaces', 'data'),
    ('workspace', 'write', 'all', 'workspace:write', 'Edit any workspace', 'data'),
    ('workspace', 'write', 'own', 'workspace:write:own', 'Edit own workspaces', 'data'),
    ('workspace', 'delete', 'all', 'workspace:delete', 'Delete any workspace', 'data'),

    -- Dashboards
    ('dashboard', 'create', 'all', 'dashboard:create', 'Create dashboards', 'data'),
    ('dashboard', 'read', 'all', 'dashboard:read', 'View all dashboards', 'data'),
    ('dashboard', 'read', 'own', 'dashboard:read:own', 'View own dashboards', 'data'),
    ('dashboard', 'write', 'all', 'dashboard:write', 'Edit any dashboard', 'data'),
    ('dashboard', 'write', 'own', 'dashboard:write:own', 'Edit own dashboards', 'data'),
    ('dashboard', 'delete', 'all', 'dashboard:delete', 'Delete any dashboard', 'data'),
    ('dashboard', 'delete', 'own', 'dashboard:delete:own', 'Delete own dashboards', 'data'),
    ('dashboard', 'share', 'all', 'dashboard:share', 'Share any dashboard', 'data'),

    -- Widgets
    ('widget', 'create', 'all', 'widget:create', 'Create widgets', 'data'),
    ('widget', 'read', 'all', 'widget:read', 'View all widgets', 'data'),
    ('widget', 'write', 'all', 'widget:write', 'Edit any widget', 'data'),
    ('widget', 'write', 'own', 'widget:write:own', 'Edit own widgets', 'data'),
    ('widget', 'delete', 'all', 'widget:delete', 'Delete any widget', 'data'),

    -- Roles
    ('role', 'create', 'all', 'role:create', 'Create custom roles', 'admin'),
    ('role', 'read', 'all', 'role:read', 'View roles', 'admin'),
    ('role', 'write', 'all', 'role:write', 'Edit roles', 'admin'),
    ('role', 'delete', 'all', 'role:delete', 'Delete roles', 'admin'),
    ('role', 'assign', 'all', 'role:assign', 'Assign roles to users', 'admin'),

    -- Audit
    ('audit', 'read', 'all', 'audit:read', 'View audit logs', 'security');

-- ===================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ===================================================================

-- Check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_permission TEXT,
    p_organization_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    -- Check if user has the permission through any role
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND (ur.organization_id = p_organization_id OR p_organization_id IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
          AND (p_permission = ANY(r.permissions) OR 'system:*' = ANY(r.permissions))
    ) INTO has_perm;

    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_permissions(
    p_user_id UUID,
    p_organization_id UUID DEFAULT NULL
) RETURNS TEXT[] AS $$
DECLARE
    permissions TEXT[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT perm)
    INTO permissions
    FROM (
        SELECT UNNEST(r.permissions) as perm
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND (ur.organization_id = p_organization_id OR p_organization_id IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    ) perms;

    RETURN COALESCE(permissions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions() RETURNS void AS $$
BEGIN
    UPDATE user_sessions
    SET is_active = false,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_reason = 'expired'
    WHERE is_active = true
      AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON TABLE users IS 'Enterprise user accounts with MFA support';
COMMENT ON TABLE user_sessions IS 'Active user sessions with device tracking';
COMMENT ON TABLE sso_providers IS 'SSO provider configurations (SAML, OAuth, OIDC)';
COMMENT ON TABLE organizations IS 'Multi-tenant organizations with subscription management';
COMMENT ON TABLE roles IS 'Reusable permission sets for RBAC';
COMMENT ON TABLE permissions IS 'Granular permission definitions';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance';
COMMENT ON TABLE security_events IS 'Security-specific events for threat monitoring';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access';

-- ===================================================================
-- END OF SCHEMA
-- ===================================================================
