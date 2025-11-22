/**
 * Swagger/OpenAPI Configuration
 *
 * Comprehensive API documentation for all endpoints
 */

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ClickView Enterprise API',
    version: '2.0.0',
    description: `
      Comprehensive enterprise business intelligence platform API.

      ## Features
      - Enterprise authentication with MFA
      - Advanced RBAC & ABAC authorization
      - GraphQL API
      - Real-time data streaming
      - Advanced visualizations
      - AI-powered natural language queries
      - Anomaly detection
      - Automated reporting & scheduling

      ## Authentication
      Most endpoints require authentication via JWT tokens.
      Use the /api/auth/login endpoint to obtain a token.
      Include the token in the Authorization header: \`Bearer <token>\`
    `,
    contact: {
      name: 'API Support',
      email: 'api@clickview.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.clickview.com',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and session management' },
    { name: 'Authorization', description: 'RBAC/ABAC and permission management' },
    { name: 'Admin', description: 'Administrative endpoints for user, org, role management' },
    { name: 'Workspaces', description: 'Workspace management' },
    { name: 'Dashboards', description: 'Dashboard creation and management' },
    { name: 'Widgets', description: 'Chart and widget management' },
    { name: 'Data', description: 'Data queries and transformations' },
    { name: 'Reports', description: 'Report generation and scheduling' },
    { name: 'AI/ML', description: 'AI-powered features (NLQ, anomaly detection)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login',
      },
    },
    schemas: {
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          name: { type: 'string' },
          active: { type: 'boolean' },
          emailVerified: { type: 'boolean' },
          mfaEnabled: { type: 'boolean' },
          lastLoginAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          roles: { type: 'array', items: { type: 'string' } },
        },
      },
      CreateUser: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          name: { type: 'string' },
          password: { type: 'string', minLength: 8 },
          sendWelcomeEmail: { type: 'boolean', default: true },
        },
      },
      // Organization schemas
      Organization: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          domain: { type: 'string' },
          description: { type: 'string' },
          memberCount: { type: 'integer' },
          dashboardCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // Role schemas
      Role: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          system: { type: 'boolean' },
          permissionCount: { type: 'integer' },
          userCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Permission: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          resource: { type: 'string' },
          action: { type: 'string' },
        },
      },
      // Audit Log schemas
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          timestamp: { type: 'string', format: 'date-time' },
          userId: { type: 'string', format: 'uuid' },
          userName: { type: 'string' },
          userEmail: { type: 'string' },
          action: { type: 'string' },
          resourceType: { type: 'string' },
          resourceId: { type: 'string', format: 'uuid' },
          severity: { type: 'string', enum: ['debug', 'info', 'warning', 'error', 'critical'] },
          ipAddress: { type: 'string' },
          userAgent: { type: 'string' },
          success: { type: 'boolean' },
          details: { type: 'object' },
          changes: { type: 'object' },
        },
      },
      // Dashboard schemas
      Dashboard: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          workspaceId: { type: 'string', format: 'uuid' },
          layout: { type: 'array', items: { type: 'object' } },
          filters: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      // Error schemas
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    // ===================================================================
    // AUTHENTICATION ENDPOINTS
    // ===================================================================
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new user',
        description: 'Create a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string' },
                  name: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error or email already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate user and obtain JWT tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    requireMfa: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user',
        description: 'Get authenticated user information',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user info',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '401': {
            description: 'Not authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },

    // ===================================================================
    // ADMIN - USER MANAGEMENT
    // ===================================================================
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users',
        description: 'Get paginated list of users with search and filtering',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 },
            description: 'Items per page',
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search by email, name, or username',
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['all', 'active', 'inactive', 'locked'] },
            description: 'Filter by user status',
          },
        ],
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { description: 'Not authenticated' },
          '403': { description: 'Insufficient permissions' },
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create user',
        description: 'Create a new user (admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUser' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Not authenticated' },
          '403': { description: 'Insufficient permissions' },
        },
      },
    },

    // ===================================================================
    // ADMIN - ORGANIZATION MANAGEMENT
    // ===================================================================
    '/api/admin/organizations': {
      get: {
        tags: ['Admin'],
        summary: 'List organizations',
        description: 'Get all organizations with statistics',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search by name or domain',
          },
        ],
        responses: {
          '200': {
            description: 'List of organizations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    organizations: { type: 'array', items: { $ref: '#/components/schemas/Organization' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ===================================================================
    // ADMIN - ROLE MANAGEMENT
    // ===================================================================
    '/api/admin/roles': {
      get: {
        tags: ['Admin'],
        summary: 'List roles',
        description: 'Get all roles with statistics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of roles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    roles: { type: 'array', items: { $ref: '#/components/schemas/Role' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/admin/permissions': {
      get: {
        tags: ['Admin'],
        summary: 'List permissions',
        description: 'Get all available permissions',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of permissions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    permissions: { type: 'array', items: { $ref: '#/components/schemas/Permission' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ===================================================================
    // ADMIN - AUDIT LOGS
    // ===================================================================
    '/api/admin/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'List audit logs',
        description: 'Get paginated audit logs with filtering',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          {
            name: 'action',
            in: 'query',
            schema: { type: 'string', enum: ['all', 'create', 'read', 'update', 'delete', 'login', 'logout'] },
          },
          {
            name: 'severity',
            in: 'query',
            schema: { type: 'string', enum: ['all', 'debug', 'info', 'warning', 'error', 'critical'] },
          },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'userId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'resource', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of audit logs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    logs: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/admin/audit-logs/export': {
      get: {
        tags: ['Admin'],
        summary: 'Export audit logs',
        description: 'Export audit logs to CSV',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'severity', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'CSV file',
            content: {
              'text/csv': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },

    // ===================================================================
    // HEALTH CHECK
    // ===================================================================
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Check system health and database connectivity',
        responses: {
          '200': {
            description: 'System healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number' },
                    environment: { type: 'string' },
                  },
                },
              },
            },
          },
          '503': {
            description: 'System unhealthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['unhealthy'] },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
