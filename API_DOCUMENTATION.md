# ClickView API Documentation

**Version**: 2.0.0-enterprise
**Base URL**: `https://api.clickview.com` (production) | `http://localhost:3001` (development)
**Last Updated**: 2025-11-23

---

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [Dashboards](#dashboards)
4. [Reports](#reports)
5. [GraphQL API](#graphql-api)
6. [Webhooks](#webhooks)
7. [Rate Limiting](#rate-limiting)
8. [Error Handling](#error-handling)

---

## Authentication

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "emailOrUsername": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "requiresMFA": false
}
```

### Enable MFA
```http
POST /api/auth/mfa/enable
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,..."
}
```

### Verify MFA
```http
POST /api/auth/mfa/verify
Content-Type: application/json

{
  "sessionId": "session-123",
  "code": "123456"
}
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

---

## Authorization

### Check Permission
```http
POST /api/authorization/check
Authorization: Bearer {token}
Content-Type: application/json

{
  "resource": "dashboard",
  "action": "read",
  "resourceId": "dash-123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "allowed": true,
  "reason": "Direct permission"
}
```

### Create RLS Policy
```http
POST /api/authorization/rls-policies
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "org_isolation",
  "tableName": "dashboards",
  "policyType": "permissive",
  "usingExpression": "organization_id = current_setting('app.current_organization')::uuid",
  "appliesToRoles": ["authenticated"]
}
```

### Create Data Masking Rule
```http
POST /api/authorization/masking-rules
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "email_mask",
  "maskingType": "email",
  "config": {
    "showFirst": 1,
    "showLast": 11
  }
}
```

---

## Dashboards

### List Dashboards
```http
GET /api/dashboards?limit=20&offset=0&search=sales
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "dashboards": [
    {
      "id": "dash-123",
      "name": "Sales Dashboard",
      "description": "Q4 2024 sales metrics",
      "createdAt": "2024-11-01T00:00:00Z",
      "updatedAt": "2024-11-20T10:30:00Z",
      "widgets": 12,
      "visibility": "private"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

### Get Dashboard
```http
GET /api/dashboards/{dashboardId}
Authorization: Bearer {token}
```

### Create Dashboard
```http
POST /api/dashboards
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Dashboard",
  "description": "Dashboard description",
  "workspaceId": "workspace-123",
  "visibility": "private",
  "layout": "grid"
}
```

### Update Dashboard
```http
PUT /api/dashboards/{dashboardId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Dashboard Name",
  "description": "Updated description"
}
```

### Delete Dashboard
```http
DELETE /api/dashboards/{dashboardId}
Authorization: Bearer {token}
```

---

## Reports

### Create Report
```http
POST /api/reports
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Monthly Sales Report",
  "description": "Automated sales report",
  "category": "sales",
  "layout": "canvas",
  "canvasWidth": 1200,
  "canvasHeight": 800,
  "elements": [
    {
      "type": "chart",
      "chartType": "bar",
      "dataSource": "sales_data",
      "layout": {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 400
      }
    }
  ]
}
```

### Export Report
```http
GET /api/reports/{reportId}/export/pdf
Authorization: Bearer {token}
```

Returns PDF file.

### Schedule Report
```http
POST /api/reports/{reportId}/schedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Weekly Sales Report",
  "schedule": {
    "type": "cron",
    "expression": "0 9 * * 1"
  },
  "distribution": {
    "channels": [
      {
        "type": "email",
        "recipients": ["team@example.com"],
        "format": "pdf"
      }
    ]
  },
  "enabled": true
}
```

### Share Report
```http
POST /api/reports/{reportId}/share
Authorization: Bearer {token}
Content-Type: application/json

{
  "targetType": "user",
  "targetId": "user-456",
  "permission": "view"
}
```

### Generate Public Link
```http
POST /api/reports/{reportId}/public-link
Authorization: Bearer {token}
Content-Type: application/json

{
  "enabled": true,
  "password": "optional-password",
  "expiresAt": "2025-01-31T23:59:59Z"
}
```

---

## GraphQL API

### Endpoint
```
POST /graphql
```

### Example Query
```graphql
query GetDashboardWithWidgets($id: ID!) {
  dashboard(id: $id) {
    id
    name
    description
    widgets {
      id
      type
      title
      config
      data
    }
    owner {
      id
      username
      fullName
    }
  }
}
```

### Example Mutation
```graphql
mutation CreateDashboard($input: CreateDashboardInput!) {
  createDashboard(
    workspaceId: $input.workspaceId
    name: $input.name
    description: $input.description
  ) {
    id
    name
    createdAt
  }
}
```

### Example Subscription
```graphql
subscription DashboardUpdates($dashboardId: ID!) {
  dashboardUpdated(dashboardId: $dashboardId) {
    id
    name
    widgets {
      id
      data
    }
  }
}
```

### GraphQL Playground
Available at `/playground` in development mode.

---

## Rate Limiting

### Default Limits
- **Authenticated**: 1000 requests/hour
- **Unauthenticated**: 100 requests/hour
- **Premium**: 5000 requests/hour

### Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 3600
}
```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable

### Common Error Codes
- `INVALID_CREDENTIALS` - Login failed
- `USER_EXISTS` - Registration conflict
- `PERMISSION_DENIED` - Authorization failed
- `RESOURCE_NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Input validation failed
- `MFA_REQUIRED` - MFA verification needed
- `TOKEN_EXPIRED` - JWT token expired
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## Webhooks

### Subscribe to Webhook
```http
POST /api/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["dashboard.created", "report.completed"],
  "secret": "webhook_secret_key"
}
```

### Webhook Payload
```json
{
  "event": "dashboard.created",
  "timestamp": "2024-11-23T10:30:00Z",
  "data": {
    "dashboardId": "dash-123",
    "name": "New Dashboard",
    "createdBy": "user-123"
  },
  "signature": "sha256_hmac_signature"
}
```

### Supported Events
- `dashboard.created`
- `dashboard.updated`
- `dashboard.deleted`
- `report.created`
- `report.completed`
- `report.failed`
- `user.registered`
- `share.created`

---

## Best Practices

### Authentication
1. Store tokens securely (httpOnly cookies or secure storage)
2. Refresh tokens before expiration
3. Implement token rotation
4. Use HTTPS in production
5. Enable MFA for sensitive accounts

### API Usage
1. Implement exponential backoff for retries
2. Cache responses when appropriate
3. Use pagination for large datasets
4. Batch requests when possible (GraphQL)
5. Monitor rate limits

### Security
1. Never expose API keys in client code
2. Validate all input
3. Use CORS appropriately
4. Implement CSRF protection
5. Log security events

---

## SDK & Client Libraries

### Official SDKs
- **JavaScript/TypeScript**: `@clickview/sdk-js`
- **Python**: `clickview-sdk`
- **Ruby**: `clickview-ruby`
- **Go**: `github.com/clickview/clickview-go`

### Example (JavaScript)
```javascript
import { ClickViewClient } from '@clickview/sdk-js';

const client = new ClickViewClient({
  apiKey: process.env.CLICKVIEW_API_KEY,
  baseURL: 'https://api.clickview.com',
});

const dashboards = await client.dashboards.list({
  limit: 20,
  search: 'sales',
});
```

---

## Support

- **Documentation**: https://docs.clickview.com
- **API Status**: https://status.clickview.com
- **Support Email**: api-support@clickview.com
- **GitHub**: https://github.com/clickview/api-issues

---

**For detailed GraphQL schema documentation**, visit `/playground` or download the schema:
```bash
curl https://api.clickview.com/graphql -H "Content-Type: application/json" --data '{"query": "{__schema{types{name}}}"}
```
