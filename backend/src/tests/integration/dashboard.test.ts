/**
 * Dashboard API Integration Tests
 * Tests for dashboard CRUD operations and related features
 */

import request from 'supertest';
import express from 'express';
import {
  clearDatabase,
  createTestUser,
  testPool,
  testRedis,
  generateTestToken,
} from '../setup';
import dashboardRoutes from '../../routes/dashboard.routes';
import widgetRoutes from '../../routes/widget.routes';

// Mock Express app for testing
const app = express();
app.use(express.json());
app.locals.pool = testPool;
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/widgets', widgetRoutes);

describe('Dashboard Integration Tests', () => {
  let testUser: any;
  let accessToken: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    // Create test workspace
    const workspaceResult = await testPool.query(
      `INSERT INTO workspaces (name, slug, owner_id)
       VALUES ('Test Workspace', 'test-workspace', 1)
       RETURNING id`
    );
    testWorkspaceId = workspaceResult.rows[0].id;
  });

  beforeEach(async () => {
    await clearDatabase();

    testUser = await createTestUser();
    accessToken = generateTestToken(testUser.id);
  });

  describe('POST /api/dashboards', () => {
    it('should create a new dashboard', async () => {
      const dashboardData = {
        name: 'Test Dashboard',
        description: 'A test dashboard for integration testing',
        workspaceId: testWorkspaceId,
        layout: { columns: 12, rows: 'auto' },
      };

      const response = await request(app)
        .post('/api/dashboards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(dashboardData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('dashboard');
      expect(response.body.dashboard.name).toBe(dashboardData.name);
      expect(response.body.dashboard.description).toBe(dashboardData.description);

      // Verify in database
      const result = await testPool.query(
        'SELECT * FROM dashboards WHERE id = $1',
        [response.body.dashboard.id]
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].created_by).toBe(testUser.id);
    });

    it('should create dashboard with default settings', async () => {
      const response = await request(app)
        .post('/api/dashboards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Minimal Dashboard',
          workspaceId: testWorkspaceId,
        });

      expect(response.status).toBe(201);
      expect(response.body.dashboard).toHaveProperty('layout');
      expect(response.body.dashboard).toHaveProperty('settings');
    });

    it('should reject dashboard creation without name', async () => {
      const response = await request(app)
        .post('/api/dashboards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          workspaceId: testWorkspaceId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name');
    });

    it('should reject dashboard creation without authentication', async () => {
      const response = await request(app)
        .post('/api/dashboards')
        .send({
          name: 'Unauthorized Dashboard',
          workspaceId: testWorkspaceId,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/dashboards', () => {
    beforeEach(async () => {
      // Create test dashboards
      await testPool.query(
        `INSERT INTO dashboards (name, workspace_id, created_by, is_public)
         VALUES
           ('Dashboard 1', $1, $2, true),
           ('Dashboard 2', $1, $2, false),
           ('Dashboard 3', $1, $2, true)`,
        [testWorkspaceId, testUser.id]
      );
    });

    it('should list all dashboards for workspace', async () => {
      const response = await request(app)
        .get('/api/dashboards')
        .query({ workspaceId: testWorkspaceId })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('dashboards');
      expect(response.body.dashboards.length).toBe(3);
    });

    it('should paginate dashboards', async () => {
      const response = await request(app)
        .get('/api/dashboards')
        .query({ workspaceId: testWorkspaceId, limit: 2, offset: 0 })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.dashboards.length).toBe(2);
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBe(3);
    });

    it('should filter dashboards by public status', async () => {
      const response = await request(app)
        .get('/api/dashboards')
        .query({ workspaceId: testWorkspaceId, isPublic: true })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.dashboards.length).toBe(2);
      expect(response.body.dashboards.every((d: any) => d.is_public)).toBe(true);
    });

    it('should search dashboards by name', async () => {
      const response = await request(app)
        .get('/api/dashboards')
        .query({ workspaceId: testWorkspaceId, search: 'Dashboard 1' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.dashboards.length).toBe(1);
      expect(response.body.dashboards[0].name).toBe('Dashboard 1');
    });
  });

  describe('GET /api/dashboards/:id', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO dashboards (name, workspace_id, created_by)
         VALUES ('Test Dashboard', $1, $2)
         RETURNING id`,
        [testWorkspaceId, testUser.id]
      );
      dashboardId = result.rows[0].id;
    });

    it('should get dashboard by ID', async () => {
      const response = await request(app)
        .get(`/api/dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('dashboard');
      expect(response.body.dashboard.id).toBe(dashboardId);
      expect(response.body.dashboard.name).toBe('Test Dashboard');
    });

    it('should include widgets in dashboard response', async () => {
      // Create test widget
      await testPool.query(
        `INSERT INTO widgets (dashboard_id, type, title, config, position)
         VALUES ($1, 'chart', 'Test Widget', '{}', '{"x": 0, "y": 0}')`,
        [dashboardId]
      );

      const response = await request(app)
        .get(`/api/dashboards/${dashboardId}`)
        .query({ includeWidgets: true })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.dashboard).toHaveProperty('widgets');
      expect(response.body.dashboard.widgets.length).toBe(1);
    });

    it('should return 404 for non-existent dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboards/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/dashboards/:id', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO dashboards (name, workspace_id, created_by)
         VALUES ('Original Name', $1, $2)
         RETURNING id`,
        [testWorkspaceId, testUser.id]
      );
      dashboardId = result.rows[0].id;
    });

    it('should update dashboard', async () => {
      const response = await request(app)
        .put(`/api/dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.dashboard.name).toBe('Updated Name');
      expect(response.body.dashboard.description).toBe('Updated description');

      // Verify in database
      const result = await testPool.query(
        'SELECT * FROM dashboards WHERE id = $1',
        [dashboardId]
      );
      expect(result.rows[0].name).toBe('Updated Name');
    });

    it('should update dashboard layout', async () => {
      const newLayout = { columns: 16, rows: 'fixed', rowHeight: 100 };

      const response = await request(app)
        .put(`/api/dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ layout: newLayout });

      expect(response.status).toBe(200);
      expect(response.body.dashboard.layout).toEqual(newLayout);
    });

    it('should reject update from non-owner', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser',
      });
      const otherToken = generateTestToken(otherUser.id);

      const response = await request(app)
        .put(`/api/dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/dashboards/:id', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO dashboards (name, workspace_id, created_by)
         VALUES ('To Delete', $1, $2)
         RETURNING id`,
        [testWorkspaceId, testUser.id]
      );
      dashboardId = result.rows[0].id;
    });

    it('should delete dashboard', async () => {
      const response = await request(app)
        .delete(`/api/dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      // Verify deleted from database
      const result = await testPool.query(
        'SELECT * FROM dashboards WHERE id = $1',
        [dashboardId]
      );
      expect(result.rows.length).toBe(0);
    });

    it('should cascade delete widgets', async () => {
      // Create widget
      await testPool.query(
        `INSERT INTO widgets (dashboard_id, type, title, config, position)
         VALUES ($1, 'chart', 'Widget', '{}', '{}')`,
        [dashboardId]
      );

      await request(app)
        .delete(`/api/dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Verify widgets deleted
      const result = await testPool.query(
        'SELECT * FROM widgets WHERE dashboard_id = $1',
        [dashboardId]
      );
      expect(result.rows.length).toBe(0);
    });

    it('should reject delete from non-owner', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser',
      });
      const otherToken = generateTestToken(otherUser.id);

      const response = await request(app)
        .delete(`/api/dashboards/${dashboardId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/dashboards/:id/duplicate', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO dashboards (name, workspace_id, created_by, settings)
         VALUES ('Original', $1, $2, '{"theme": "dark"}')
         RETURNING id`,
        [testWorkspaceId, testUser.id]
      );
      dashboardId = result.rows[0].id;

      // Add widgets
      await testPool.query(
        `INSERT INTO widgets (dashboard_id, type, title, config, position)
         VALUES
           ($1, 'chart', 'Widget 1', '{}', '{"x": 0, "y": 0}'),
           ($1, 'table', 'Widget 2', '{}', '{"x": 0, "y": 1}')`,
        [dashboardId]
      );
    });

    it('should duplicate dashboard with widgets', async () => {
      const response = await request(app)
        .post(`/api/dashboards/${dashboardId}/duplicate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Copy of Original' });

      expect(response.status).toBe(201);
      expect(response.body.dashboard.name).toBe('Copy of Original');
      expect(response.body.dashboard.id).not.toBe(dashboardId);

      // Verify widgets duplicated
      const widgets = await testPool.query(
        'SELECT * FROM widgets WHERE dashboard_id = $1',
        [response.body.dashboard.id]
      );
      expect(widgets.rows.length).toBe(2);
    });

    it('should use default name if not provided', async () => {
      const response = await request(app)
        .post(`/api/dashboards/${dashboardId}/duplicate`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(201);
      expect(response.body.dashboard.name).toContain('Copy');
    });
  });
});

describe('Widget Integration Tests', () => {
  let testUser: any;
  let accessToken: string;
  let testWorkspaceId: string;
  let testDashboardId: string;

  beforeAll(async () => {
    const workspaceResult = await testPool.query(
      `INSERT INTO workspaces (name, slug, owner_id)
       VALUES ('Test Workspace', 'test-workspace', 1)
       RETURNING id`
    );
    testWorkspaceId = workspaceResult.rows[0].id;
  });

  beforeEach(async () => {
    await clearDatabase();

    testUser = await createTestUser();
    accessToken = generateTestToken(testUser.id);

    const dashboardResult = await testPool.query(
      `INSERT INTO dashboards (name, workspace_id, created_by)
       VALUES ('Test Dashboard', $1, $2)
       RETURNING id`,
      [testWorkspaceId, testUser.id]
    );
    testDashboardId = dashboardResult.rows[0].id;
  });

  describe('POST /api/widgets', () => {
    it('should create a chart widget', async () => {
      const widgetData = {
        dashboardId: testDashboardId,
        type: 'chart',
        title: 'Sales Chart',
        config: {
          chartType: 'bar',
          dataSource: 'sales',
          xAxis: 'month',
          yAxis: 'revenue',
        },
        position: { x: 0, y: 0, w: 6, h: 4 },
      };

      const response = await request(app)
        .post('/api/widgets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(widgetData);

      expect(response.status).toBe(201);
      expect(response.body.widget.type).toBe('chart');
      expect(response.body.widget.title).toBe('Sales Chart');
      expect(response.body.widget.config.chartType).toBe('bar');
    });

    it('should create a table widget', async () => {
      const widgetData = {
        dashboardId: testDashboardId,
        type: 'table',
        title: 'Data Table',
        config: {
          columns: ['name', 'value', 'date'],
          sortable: true,
          filterable: true,
        },
        position: { x: 6, y: 0, w: 6, h: 4 },
      };

      const response = await request(app)
        .post('/api/widgets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(widgetData);

      expect(response.status).toBe(201);
      expect(response.body.widget.type).toBe('table');
    });

    it('should create a metric widget', async () => {
      const widgetData = {
        dashboardId: testDashboardId,
        type: 'metric',
        title: 'Total Revenue',
        config: {
          value: 'SUM(revenue)',
          format: 'currency',
          comparison: 'previousPeriod',
        },
        position: { x: 0, y: 4, w: 3, h: 2 },
      };

      const response = await request(app)
        .post('/api/widgets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(widgetData);

      expect(response.status).toBe(201);
      expect(response.body.widget.type).toBe('metric');
    });

    it('should reject widget with invalid type', async () => {
      const response = await request(app)
        .post('/api/widgets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dashboardId: testDashboardId,
          type: 'invalid-type',
          title: 'Invalid Widget',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('type');
    });
  });

  describe('PUT /api/widgets/:id', () => {
    let widgetId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO widgets (dashboard_id, type, title, config, position)
         VALUES ($1, 'chart', 'Original Title', '{}', '{"x": 0, "y": 0}')
         RETURNING id`,
        [testDashboardId]
      );
      widgetId = result.rows[0].id;
    });

    it('should update widget title', async () => {
      const response = await request(app)
        .put(`/api/widgets/${widgetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.widget.title).toBe('Updated Title');
    });

    it('should update widget config', async () => {
      const newConfig = { chartType: 'line', animate: true };

      const response = await request(app)
        .put(`/api/widgets/${widgetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ config: newConfig });

      expect(response.status).toBe(200);
      expect(response.body.widget.config).toEqual(newConfig);
    });

    it('should update widget position', async () => {
      const newPosition = { x: 3, y: 2, w: 4, h: 3 };

      const response = await request(app)
        .put(`/api/widgets/${widgetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ position: newPosition });

      expect(response.status).toBe(200);
      expect(response.body.widget.position).toEqual(newPosition);
    });
  });

  describe('PUT /api/widgets/batch', () => {
    let widgetIds: string[];

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO widgets (dashboard_id, type, title, config, position)
         VALUES
           ($1, 'chart', 'Widget 1', '{}', '{"x": 0, "y": 0}'),
           ($1, 'chart', 'Widget 2', '{}', '{"x": 6, "y": 0}'),
           ($1, 'chart', 'Widget 3', '{}', '{"x": 0, "y": 4}')
         RETURNING id`,
        [testDashboardId]
      );
      widgetIds = result.rows.map((r) => r.id);
    });

    it('should batch update widget positions', async () => {
      const updates = [
        { id: widgetIds[0], position: { x: 0, y: 0, w: 12, h: 4 } },
        { id: widgetIds[1], position: { x: 0, y: 4, w: 6, h: 4 } },
        { id: widgetIds[2], position: { x: 6, y: 4, w: 6, h: 4 } },
      ];

      const response = await request(app)
        .put('/api/widgets/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ widgets: updates });

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(3);
    });
  });

  describe('DELETE /api/widgets/:id', () => {
    let widgetId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO widgets (dashboard_id, type, title, config, position)
         VALUES ($1, 'chart', 'To Delete', '{}', '{}')
         RETURNING id`,
        [testDashboardId]
      );
      widgetId = result.rows[0].id;
    });

    it('should delete widget', async () => {
      const response = await request(app)
        .delete(`/api/widgets/${widgetId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      const result = await testPool.query(
        'SELECT * FROM widgets WHERE id = $1',
        [widgetId]
      );
      expect(result.rows.length).toBe(0);
    });
  });
});
