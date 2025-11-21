/**
 * ClickView GraphQL Resolvers
 *
 * Implements all queries, mutations, and subscriptions
 * with authorization, caching, and DataLoader optimization
 */

import { GraphQLError } from 'graphql';
import { pool } from '../config/database';
import { AuthService } from '../services/auth.service';
import { AuthorizationService } from '../services/authorization.service';
import DataLoader from 'dataloader';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

// ===================================================================
// DATA LOADERS (N+1 Query Prevention)
// ===================================================================

const createLoaders = () => ({
  user: new DataLoader(async (ids: readonly string[]) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = ANY($1::uuid[])',
      [ids]
    );
    const userMap = new Map(result.rows.map(u => [u.id, u]));
    return ids.map(id => userMap.get(id as string) || null);
  }),

  workspace: new DataLoader(async (ids: readonly string[]) => {
    const result = await pool.query(
      'SELECT * FROM workspaces WHERE id = ANY($1::uuid[])',
      [ids]
    );
    const map = new Map(result.rows.map(w => [w.id, w]));
    return ids.map(id => map.get(id as string) || null);
  }),

  dashboard: new DataLoader(async (ids: readonly string[]) => {
    const result = await pool.query(
      'SELECT * FROM dashboards WHERE id = ANY($1::uuid[])',
      [ids]
    );
    const map = new Map(result.rows.map(d => [d.id, d]));
    return ids.map(id => map.get(id as string) || null);
  }),

  organization: new DataLoader(async (ids: readonly string[]) => {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE id = ANY($1::uuid[])',
      [ids]
    );
    const map = new Map(result.rows.map(o => [o.id, o]));
    return ids.map(id => map.get(id as string) || null);
  }),
});

// ===================================================================
// CONTEXT BUILDER
// ===================================================================

export interface GraphQLContext {
  user?: any;
  token?: string;
  loaders: ReturnType<typeof createLoaders>;
  ip: string;
  userAgent: string;
}

export const createContext = ({ req }: any): GraphQLContext => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // User would be validated from token
  const user = null; // Would validate token here

  return {
    user,
    token,
    loaders: createLoaders(),
    ip: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
  };
};

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

const requireAuth = (context: GraphQLContext) => {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
};

const checkPermission = async (
  context: GraphQLContext,
  resourceType: string,
  resourceId: string,
  action: string
) => {
  const user = requireAuth(context);

  const hasPermission = await AuthorizationService.checkPermission(
    {
      userId: user.id,
      sessionId: '',
      roles: user.roles || [],
      permissions: user.permissions || [],
      attributes: {},
      environment: {
        ipAddress: context.ip,
        userAgent: context.userAgent,
        timestamp: new Date(),
      },
    },
    { resourceType, resourceId, action }
  );

  if (!hasPermission) {
    throw new GraphQLError('Insufficient permissions', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
};

// ===================================================================
// RESOLVERS
// ===================================================================

export const resolvers = {
  // ===================================================================
  // QUERIES
  // ===================================================================
  Query: {
    // ----- Authentication & Users -----
    me: async (_: any, __: any, context: GraphQLContext) => {
      const user = requireAuth(context);
      return context.loaders.user.load(user.id);
    },

    user: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context);
      return context.loaders.user.load(id);
    },

    users: async (
      _: any,
      { organizationId, search, limit = 50, offset = 0 }: any,
      context: GraphQLContext
    ) => {
      requireAuth(context);

      let query = 'SELECT * FROM users WHERE 1=1';
      const params: any[] = [];

      if (organizationId) {
        params.push(organizationId);
        query += ` AND id IN (
          SELECT user_id FROM organization_members
          WHERE organization_id = $${params.length}
        )`;
      }

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (
          username ILIKE $${params.length} OR
          email ILIKE $${params.length} OR
          first_name ILIKE $${params.length} OR
          last_name ILIKE $${params.length}
        )`;
      }

      params.push(limit, offset);
      query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const result = await pool.query(query, params);

      // Get total count
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM users WHERE 1=1' +
          (organizationId ? ` AND id IN (SELECT user_id FROM organization_members WHERE organization_id = $1)` : ''),
        organizationId ? [organizationId] : []
      );

      return {
        edges: result.rows,
        pageInfo: {
          hasNextPage: offset + limit < parseInt(countResult.rows[0].count),
          hasPreviousPage: offset > 0,
          total: parseInt(countResult.rows[0].count),
        },
      };
    },

    // ----- Organizations -----
    organization: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context);
      return context.loaders.organization.load(id);
    },

    myOrganizations: async (_: any, __: any, context: GraphQLContext) => {
      const user = requireAuth(context);

      const result = await pool.query(
        `SELECT o.* FROM organizations o
         JOIN organization_members om ON o.id = om.organization_id
         WHERE om.user_id = $1 AND om.status = 'active'
         ORDER BY om.joined_at DESC`,
        [user.id]
      );

      return result.rows;
    },

    // ----- Workspaces -----
    workspace: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);
      await checkPermission(context, 'workspace', id, 'read');
      return context.loaders.workspace.load(id);
    },

    workspaces: async (
      _: any,
      { organizationId, limit = 50, offset = 0 }: any,
      context: GraphQLContext
    ) => {
      requireAuth(context);

      let query = 'SELECT * FROM workspaces WHERE 1=1';
      const params: any[] = [];

      if (organizationId) {
        params.push(organizationId);
        query += ` AND organization_id = $${params.length}`;
      }

      params.push(limit, offset);
      query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const result = await pool.query(query, params);

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM workspaces WHERE 1=1' +
          (organizationId ? ' AND organization_id = $1' : ''),
        organizationId ? [organizationId] : []
      );

      return {
        edges: result.rows,
        pageInfo: {
          hasNextPage: offset + limit < parseInt(countResult.rows[0].count),
          hasPreviousPage: offset > 0,
          total: parseInt(countResult.rows[0].count),
        },
      };
    },

    myWorkspaces: async (_: any, __: any, context: GraphQLContext) => {
      const user = requireAuth(context);

      const result = await pool.query(
        `SELECT w.* FROM workspaces w
         WHERE w.created_by = $1
         OR EXISTS (
           SELECT 1 FROM resource_permissions rp
           WHERE rp.resource_type = 'workspace'
             AND rp.resource_id = w.id
             AND rp.user_id = $1
         )
         ORDER BY w.created_at DESC`,
        [user.id]
      );

      return result.rows;
    },

    // ----- Dashboards -----
    dashboard: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);
      await checkPermission(context, 'dashboard', id, 'read');

      const dashboard = await context.loaders.dashboard.load(id);

      // Update view count and last viewed
      await pool.query(
        `UPDATE dashboards
         SET view_count = view_count + 1,
             last_viewed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      return dashboard;
    },

    dashboards: async (
      _: any,
      { workspaceId, organizationId, search, limit = 50, offset = 0 }: any,
      context: GraphQLContext
    ) => {
      requireAuth(context);

      let query = 'SELECT d.* FROM dashboards d WHERE 1=1';
      const params: any[] = [];

      if (workspaceId) {
        params.push(workspaceId);
        query += ` AND d.workspace_id = $${params.length}`;
      }

      if (organizationId) {
        params.push(organizationId);
        query += ` AND EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.id = d.workspace_id AND w.organization_id = $${params.length}
        )`;
      }

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (d.name ILIKE $${params.length} OR d.description ILIKE $${params.length})`;
      }

      params.push(limit, offset);
      query += ` ORDER BY d.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const result = await pool.query(query, params);

      return {
        edges: result.rows,
        pageInfo: {
          hasNextPage: result.rows.length === limit,
          hasPreviousPage: offset > 0,
          total: 0, // Would need separate count query
        },
      };
    },

    myDashboards: async (_: any, __: any, context: GraphQLContext) => {
      const user = requireAuth(context);

      const result = await pool.query(
        `SELECT d.* FROM dashboards d
         WHERE d.created_by = $1
         OR EXISTS (
           SELECT 1 FROM resource_permissions rp
           WHERE rp.resource_type = 'dashboard'
             AND rp.resource_id = d.id
             AND rp.user_id = $1
         )
         ORDER BY d.last_viewed_at DESC NULLS LAST`,
        [user.id]
      );

      return result.rows;
    },

    recentDashboards: async (_: any, { limit = 10 }: any, context: GraphQLContext) => {
      const user = requireAuth(context);

      const result = await pool.query(
        `SELECT d.* FROM dashboards d
         WHERE d.created_by = $1
         AND d.last_viewed_at IS NOT NULL
         ORDER BY d.last_viewed_at DESC
         LIMIT $2`,
        [user.id, limit]
      );

      return result.rows;
    },

    // ----- Widgets -----
    widgets: async (_: any, { dashboardId }: { dashboardId: string }, context: GraphQLContext) => {
      const user = requireAuth(context);
      await checkPermission(context, 'dashboard', dashboardId, 'read');

      const result = await pool.query(
        'SELECT * FROM widgets WHERE dashboard_id = $1 ORDER BY y, x',
        [dashboardId]
      );

      return result.rows;
    },

    // ----- Authorization -----
    roles: async (_: any, { organizationId }: any, context: GraphQLContext) => {
      requireAuth(context);

      let query = 'SELECT * FROM roles WHERE 1=1';
      const params: any[] = [];

      if (organizationId) {
        params.push(organizationId);
        query += ` AND (organization_id = $${params.length} OR is_system = true)`;
      } else {
        query += ' AND is_system = true';
      }

      query += ' ORDER BY name';

      const result = await pool.query(query, params);
      return result.rows;
    },

    abacPolicies: async (
      _: any,
      { resourceType, action, limit = 50, offset = 0 }: any,
      context: GraphQLContext
    ) => {
      requireAuth(context);

      let query = 'SELECT * FROM abac_policies WHERE 1=1';
      const params: any[] = [];

      if (resourceType) {
        params.push(resourceType);
        query += ` AND resource_type = $${params.length}`;
      }

      if (action) {
        params.push(action);
        query += ` AND action = $${params.length}`;
      }

      params.push(limit, offset);
      query += ` ORDER BY priority DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const result = await pool.query(query, params);
      return result.rows;
    },
  },

  // ===================================================================
  // MUTATIONS
  // ===================================================================
  Mutation: {
    // ----- Authentication -----
    login: async (
      _: any,
      { emailOrUsername, password }: { emailOrUsername: string; password: string },
      context: GraphQLContext
    ) => {
      const result = await AuthService.login(emailOrUsername, password, {
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });

      return {
        token: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
        requiresMfa: result.requiresMfa || false,
        mfaToken: result.mfaToken,
      };
    },

    register: async (_: any, args: any, context: GraphQLContext) => {
      const result = await AuthService.register(
        args.email,
        args.username,
        args.password,
        args.firstName,
        args.lastName
      );

      return {
        token: result.accessToken,
        user: result.user,
        requiresMfa: false,
      };
    },

    // ----- Workspaces -----
    createWorkspace: async (_: any, args: any, context: GraphQLContext) => {
      const user = requireAuth(context);

      const result = await pool.query(
        `INSERT INTO workspaces (name, description, organization_id, icon, color, created_by, visibility)
         VALUES ($1, $2, $3, $4, $5, $6, 'private')
         RETURNING *`,
        [args.name, args.description, args.organizationId, args.icon, args.color, user.id]
      );

      return result.rows[0];
    },

    updateWorkspace: async (_: any, { id, ...updates }: any, context: GraphQLContext) => {
      const user = requireAuth(context);
      await checkPermission(context, 'workspace', id, 'write');

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        throw new GraphQLError('No fields to update');
      }

      values.push(id);
      const query = `UPDATE workspaces SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $${paramIndex} RETURNING *`;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new GraphQLError('Workspace not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return result.rows[0];
    },

    deleteWorkspace: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);
      await checkPermission(context, 'workspace', id, 'delete');

      const result = await pool.query('DELETE FROM workspaces WHERE id = $1 RETURNING id', [id]);

      return result.rows.length > 0;
    },

    // ----- Dashboards -----
    createDashboard: async (_: any, args: any, context: GraphQLContext) => {
      const user = requireAuth(context);
      await checkPermission(context, 'workspace', args.workspaceId, 'write');

      const result = await pool.query(
        `INSERT INTO dashboards
         (workspace_id, name, description, theme, refresh_interval, created_by, visibility)
         VALUES ($1, $2, $3, $4, $5, $6, 'private')
         RETURNING *`,
        [
          args.workspaceId,
          args.name,
          args.description,
          args.theme || 'light',
          args.refreshInterval || 'MANUAL',
          user.id,
        ]
      );

      const dashboard = result.rows[0];

      // Publish subscription
      pubsub.publish('DASHBOARD_CREATED', { dashboardCreated: dashboard });

      return dashboard;
    },

    deleteDashboard: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);
      await checkPermission(context, 'dashboard', id, 'delete');

      const result = await pool.query('DELETE FROM dashboards WHERE id = $1 RETURNING id', [id]);

      return result.rows.length > 0;
    },

    // ----- Widgets -----
    createWidget: async (_: any, args: any, context: GraphQLContext) => {
      const user = requireAuth(context);
      await checkPermission(context, 'dashboard', args.dashboardId, 'write');

      const result = await pool.query(
        `INSERT INTO widgets
         (dashboard_id, type, title, config, x, y, width, height)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          args.dashboardId,
          args.type,
          args.title,
          args.config,
          args.x,
          args.y,
          args.width,
          args.height,
        ]
      );

      const widget = result.rows[0];

      // Publish subscription
      pubsub.publish(`DASHBOARD_UPDATED_${args.dashboardId}`, {
        dashboardUpdated: await context.loaders.dashboard.load(args.dashboardId),
      });

      return widget;
    },

    deleteWidget: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context);

      // Get dashboard ID first
      const widgetResult = await pool.query('SELECT dashboard_id FROM widgets WHERE id = $1', [
        id,
      ]);

      if (widgetResult.rows.length === 0) {
        throw new GraphQLError('Widget not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const dashboardId = widgetResult.rows[0].dashboard_id;
      await checkPermission(context, 'dashboard', dashboardId, 'write');

      const result = await pool.query('DELETE FROM widgets WHERE id = $1 RETURNING id', [id]);

      return result.rows.length > 0;
    },
  },

  // ===================================================================
  // SUBSCRIPTIONS
  // ===================================================================
  Subscription: {
    dashboardUpdated: {
      subscribe: (_: any, { dashboardId }: { dashboardId: string }) => {
        return pubsub.asyncIterator(`DASHBOARD_UPDATED_${dashboardId}`);
      },
    },

    widgetDataUpdated: {
      subscribe: (_: any, { widgetId }: { widgetId: string }) => {
        return pubsub.asyncIterator(`WIDGET_DATA_${widgetId}`);
      },
    },
  },

  // ===================================================================
  // FIELD RESOLVERS
  // ===================================================================
  User: {
    fullName: (parent: any) => {
      return `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || parent.username;
    },

    organizations: async (parent: any, _: any, context: GraphQLContext) => {
      const result = await pool.query(
        `SELECT om.*, o.* FROM organization_members om
         JOIN organizations o ON om.organization_id = o.id
         WHERE om.user_id = $1`,
        [parent.id]
      );

      return result.rows;
    },

    roles: async (parent: any) => {
      const result = await pool.query(
        `SELECT r.* FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1`,
        [parent.id]
      );

      return result.rows;
    },
  },

  Workspace: {
    owner: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.user.load(parent.created_by);
    },

    organization: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.organization_id) return null;
      return context.loaders.organization.load(parent.organization_id);
    },

    dashboards: async (parent: any) => {
      const result = await pool.query(
        'SELECT * FROM dashboards WHERE workspace_id = $1 ORDER BY created_at DESC',
        [parent.id]
      );

      return result.rows;
    },

    dashboardCount: async (parent: any) => {
      const result = await pool.query(
        'SELECT COUNT(*) FROM dashboards WHERE workspace_id = $1',
        [parent.id]
      );

      return parseInt(result.rows[0].count);
    },
  },

  Dashboard: {
    workspace: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.workspace.load(parent.workspace_id);
    },

    owner: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.user.load(parent.created_by);
    },

    widgets: async (parent: any) => {
      const result = await pool.query(
        'SELECT * FROM widgets WHERE dashboard_id = $1 ORDER BY y, x',
        [parent.id]
      );

      return result.rows;
    },

    widgetCount: async (parent: any) => {
      const result = await pool.query('SELECT COUNT(*) FROM widgets WHERE dashboard_id = $1', [
        parent.id,
      ]);

      return parseInt(result.rows[0].count);
    },
  },

  Organization: {
    members: async (parent: any) => {
      const result = await pool.query(
        `SELECT om.*, u.* FROM organization_members om
         JOIN users u ON om.user_id = u.id
         WHERE om.organization_id = $1`,
        [parent.id]
      );

      return result.rows;
    },

    memberCount: async (parent: any) => {
      const result = await pool.query(
        'SELECT COUNT(*) FROM organization_members WHERE organization_id = $1',
        [parent.id]
      );

      return parseInt(result.rows[0].count);
    },
  },
};
