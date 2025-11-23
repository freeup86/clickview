# Backend Implementation - Dashboard Features

This document describes the backend API implementation for the comprehensive dashboard features (Weeks 1-7).

## Overview

The backend provides 40+ REST API endpoints organized into 6 feature modules:

1. **Dashboard Templates** - Template gallery system
2. **Calculated Fields** - Formula builder and computed values
3. **Dashboard Folders** - Hierarchical organization
4. **Enhanced Sharing** - Share links with passwords and permissions
5. **Dashboard Comments** - Collaborative commenting
6. **Dashboard Exports** - Multi-format export system

## Architecture

### Technology Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **Testing**: Jest + Supertest
- **API Documentation**: Swagger/OpenAPI

### Project Structure

```
backend/src/
├── routes/
│   ├── dashboard-templates.routes.ts     # Template CRUD operations
│   ├── calculated-fields.routes.ts       # Formula management
│   ├── dashboard-folders.routes.ts       # Folder hierarchy
│   ├── dashboard-sharing.routes.ts       # Share links & permissions
│   ├── dashboard-comments.routes.ts      # Comments & replies
│   └── dashboard-export.routes.ts        # Export generation
├── database/
│   └── migrations/
│       └── 009_dashboard_features.sql    # Database schema
├── tests/
│   └── integration/
│       └── dashboard-features.test.ts    # Integration tests
└── index.ts                              # Route registration
```

## API Endpoints

### Dashboard Templates

#### List Templates
```http
GET /api/dashboards/templates
Query: category, tags, isPublic, search
Response: { success, templates }
```

#### Get Template
```http
GET /api/dashboards/templates/:id
Response: { success, template }
```

#### Create Template
```http
POST /api/dashboards/templates
Body: {
  dashboardId, name, description, category,
  tags, isPublic, generateThumbnail
}
Response: { success, template }
```

#### Update Template
```http
PUT /api/dashboards/templates/:id
Body: { name, description, category, tags, isPublic }
Response: { success, template }
```

#### Delete Template
```http
DELETE /api/dashboards/templates/:id
Response: { success, message }
```

#### Create from Template
```http
POST /api/dashboards/from-template
Body: { templateId, workspaceId, name }
Response: { success, dashboard }
```

---

### Calculated Fields

#### List Calculated Fields
```http
GET /api/dashboards/:dashboardId/calculated-fields
Response: { success, calculatedFields }
```

#### Create Calculated Field
```http
POST /api/dashboards/:dashboardId/calculated-fields
Body: { name, expression, description, returnType }
Response: { success, calculatedField }
```

#### Update Calculated Field
```http
PUT /api/calculated-fields/:id
Body: { name, expression, description, returnType }
Response: { success, calculatedField }
```

#### Delete Calculated Field
```http
DELETE /api/calculated-fields/:id
Response: { success, message }
```

#### Test Expression
```http
POST /api/calculated-fields/test
Body: { expression, sampleData }
Response: { success, validation, sampleResult }
```

---

### Dashboard Folders

#### List Folders
```http
GET /api/workspaces/:workspaceId/dashboard-folders
Response: { success, folders }
```

#### Create Folder
```http
POST /api/workspaces/:workspaceId/dashboard-folders
Body: { name, parentId, icon, color }
Response: { success, folder }
```

#### Update Folder
```http
PUT /api/dashboard-folders/:id
Body: { name, parentId, icon, color }
Response: { success, folder }
```

#### Delete Folder
```http
DELETE /api/dashboard-folders/:id
Response: { success, message }
```

#### Move Dashboard
```http
PUT /api/dashboards/:id/move
Body: { folderId }
Response: { success, dashboard }
```

#### Toggle Favorite
```http
POST /api/dashboards/:id/favorite
Response: { success, dashboard, isFavorite }
```

#### Track View
```http
POST /api/dashboards/:id/view
Response: { success, message }
```

---

### Enhanced Sharing

#### Create Share Link
```http
POST /api/dashboards/:dashboardId/share-links
Body: { expiresIn, password, permission }
Response: { success, shareLink }
```

#### List Share Links
```http
GET /api/dashboards/:dashboardId/share-links
Response: { success, shareLinks }
```

#### Update Share Link
```http
PUT /api/share-links/:id
Body: { expiresIn, password, permission, isActive }
Response: { success, shareLink }
```

#### Revoke Share Link
```http
DELETE /api/share-links/:id
Response: { success, message }
```

#### Verify Password
```http
POST /api/share-links/verify-password
Body: { token, password }
Response: { success, message }
```

#### Get Permissions
```http
GET /api/dashboards/:dashboardId/permissions
Response: { success, permissions }
```

#### Add Permission
```http
POST /api/dashboards/:dashboardId/permissions
Body: { userId, teamId, role }
Response: { success, permission }
```

#### Update Permission
```http
PUT /api/dashboard-permissions/:id
Body: { role }
Response: { success, permission }
```

#### Remove Permission
```http
DELETE /api/dashboard-permissions/:id
Response: { success, message }
```

#### Get Available Users
```http
GET /api/workspaces/:workspaceId/users
Query: dashboardId
Response: { success, users, currentUserId, currentUserName }
```

#### Get Available Teams
```http
GET /api/workspaces/:workspaceId/teams
Query: dashboardId
Response: { success, teams }
```

---

### Dashboard Comments

#### List Comments
```http
GET /api/dashboards/:dashboardId/comments
Response: { success, comments }
```

#### Add Comment
```http
POST /api/dashboards/:dashboardId/comments
Body: { content, parentId }
Response: { success, comment }
```

#### Update Comment
```http
PUT /api/dashboard-comments/:id
Body: { content }
Response: { success, comment }
```

#### Delete Comment
```http
DELETE /api/dashboard-comments/:id
Response: { success, message }
```

---

### Dashboard Exports

#### Create Export
```http
POST /api/dashboards/export
Body: { dashboardId, format, options }
Response: { success, export, downloadUrl }
Status: 202 Accepted
```

#### Get Export Status
```http
GET /api/exports/:id
Response: { success, export }
```

#### Download Export
```http
GET /api/exports/:id/download
Response: File download (PDF/Excel/CSV/PowerPoint)
```

#### Get Export History
```http
GET /api/dashboards/:dashboardId/exports
Query: limit
Response: { success, exports }
```

#### Delete Export
```http
DELETE /api/exports/:id
Response: { success, message }
```

---

## Database Schema

### Tables Created

```sql
-- Dashboard Templates
dashboard_templates (
  id UUID PRIMARY KEY,
  dashboard_id UUID REFERENCES dashboards,
  name VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  tags JSONB,
  is_public BOOLEAN,
  thumbnail_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Template Usage Tracking
dashboard_from_template_usage (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES dashboard_templates,
  dashboard_id UUID REFERENCES dashboards,
  created_at TIMESTAMP
)

-- Calculated Fields
calculated_fields (
  id UUID PRIMARY KEY,
  dashboard_id UUID REFERENCES dashboards,
  name VARCHAR(255),
  expression TEXT,
  description TEXT,
  return_type VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Dashboard Folders
dashboard_folders (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces,
  name VARCHAR(255),
  parent_id UUID REFERENCES dashboard_folders,
  icon VARCHAR(50),
  color VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Enhanced Share Links
dashboard_share_links (
  id UUID PRIMARY KEY,
  dashboard_id UUID REFERENCES dashboards,
  share_token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP,
  password_hash VARCHAR(255),
  permission VARCHAR(50),
  is_active BOOLEAN,
  view_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Dashboard Permissions
dashboard_permissions (
  id UUID PRIMARY KEY,
  dashboard_id UUID REFERENCES dashboards,
  user_id UUID REFERENCES users,
  team_id UUID REFERENCES teams,
  role VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Dashboard Comments
dashboard_comments (
  id UUID PRIMARY KEY,
  dashboard_id UUID REFERENCES dashboards,
  user_id UUID REFERENCES users,
  parent_id UUID REFERENCES dashboard_comments,
  content TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Dashboard Exports
dashboard_exports (
  id UUID PRIMARY KEY,
  dashboard_id UUID REFERENCES dashboards,
  user_id UUID REFERENCES users,
  format VARCHAR(50),
  options JSONB,
  status VARCHAR(50),
  file_path TEXT,
  file_size BIGINT,
  download_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
)

-- Teams
teams (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces,
  name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Team Members
team_members (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams,
  user_id UUID REFERENCES users,
  role VARCHAR(50),
  created_at TIMESTAMP
)

-- Workspace Members
workspace_members (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces,
  user_id UUID REFERENCES users,
  role VARCHAR(50),
  created_at TIMESTAMP
)
```

### Indexes

All tables include strategic indexes for:
- Foreign key relationships
- Frequently queried fields
- Full-text search (using GIN indexes)
- Time-based queries

### Triggers

Automatic `updated_at` timestamp updates via PostgreSQL triggers.

---

## Security Features

### Authentication
- JWT token validation on all protected routes
- User identity verification

### Authorization
- Role-based access control (RBAC)
- Permission hierarchy: viewer < editor < admin < owner
- Ownership validation for updates/deletes

### Data Protection
- Password hashing with bcrypt (10 rounds)
- SQL injection prevention via parameterized queries
- XSS protection through input sanitization
- CSRF protection via tokens

### Rate Limiting
- 100 requests per minute per IP
- Configurable per endpoint

---

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "details": "Optional additional details"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `202` - Accepted (async operations)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### Validation Errors
All input validation uses consistent error messages:
```json
{
  "error": "Validation failed: field is required"
}
```

---

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- dashboard-features

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Test Coverage

Target coverage: 80%+

**Current coverage areas:**
- Route handlers
- Database operations
- Validation logic
- Permission checks
- Error handling

### Integration Tests

Located in `src/tests/integration/dashboard-features.test.ts`

Tests cover:
- All CRUD operations
- Permission validation
- Error scenarios
- Edge cases

---

## Deployment

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/clickview
DATABASE_SSL=true

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Frontend
FRONTEND_URL=https://app.clickview.example

# File Storage (for exports)
EXPORT_STORAGE_PATH=/var/clickview/exports
EXPORT_MAX_SIZE=10485760  # 10MB

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Database Migration

```bash
# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

### Production Considerations

1. **Scaling**
   - Use connection pooling (pg-pool)
   - Implement caching (Redis)
   - Queue long-running operations (Bull/BullMQ)

2. **Monitoring**
   - Application metrics (Prometheus)
   - Error tracking (Sentry)
   - Performance monitoring (New Relic)

3. **Backup**
   - Automated PostgreSQL backups
   - Export file retention policy
   - Disaster recovery plan

---

## Performance Optimization

### Database
- Indexed foreign keys and frequently queried columns
- Query optimization with EXPLAIN ANALYZE
- Connection pooling (max 20 connections)

### Caching
- Redis for frequently accessed data
- Cache invalidation strategies
- TTL-based expiration

### File Operations
- Async file operations
- Streaming for large exports
- Cleanup of old export files

---

## Maintenance

### Monitoring Endpoints

```http
GET /api/health
Response: { status: "ok", timestamp, database: "connected" }
```

### Logging

All operations are logged with:
- Request ID
- User ID
- Timestamp
- Duration
- Status code

Log levels: ERROR, WARN, INFO, DEBUG

---

## Future Enhancements

### Phase 2 Features
- WebSocket support for real-time collaboration
- Advanced export scheduling
- Custom widget SDK
- AI-powered insights
- Mobile API optimizations

### Phase 3 Features
- Multi-tenancy improvements
- Advanced analytics
- Integration marketplace
- Audit logging
- Compliance features (GDPR, SOC 2)

---

## Support

### Documentation
- API docs: `/api-docs` (Swagger UI)
- Database schema: See migration files
- Postman collection: `postman/dashboard-features.json`

### Contact
- Technical lead: engineering@clickview.example
- Issues: GitHub Issues
- Slack: #backend-support

---

*Last updated: 2025 | Version: 1.0.0*
