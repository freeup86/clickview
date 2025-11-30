/**
 * Report API Integration Tests
 * Tests for enterprise report builder functionality
 */

import request from 'supertest';
import express from 'express';
import {
  clearDatabase,
  createTestUser,
  testPool,
  generateTestToken,
} from '../setup';
import reportRoutes from '../../routes/report.routes';
import scheduleRoutes from '../../routes/schedule.routes';

// Mock Express app for testing
const app = express();
app.use(express.json());
app.locals.pool = testPool;
app.use('/api/reports', reportRoutes);
app.use('/api/schedules', scheduleRoutes);

describe('Report Integration Tests', () => {
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

  describe('POST /api/reports', () => {
    it('should create a new report', async () => {
      const reportData = {
        name: 'Monthly Sales Report',
        description: 'Comprehensive monthly sales analysis',
        workspaceId: testWorkspaceId,
        type: 'dashboard',
        config: {
          dashboardId: testDashboardId,
          dateRange: 'last_30_days',
          format: 'pdf',
        },
      };

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(reportData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('report');
      expect(response.body.report.name).toBe(reportData.name);
      expect(response.body.report.type).toBe('dashboard');
    });

    it('should create a custom query report', async () => {
      const reportData = {
        name: 'Custom Query Report',
        workspaceId: testWorkspaceId,
        type: 'query',
        config: {
          query: 'SELECT date, SUM(amount) as total FROM sales GROUP BY date',
          parameters: [],
          format: 'csv',
        },
      };

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(reportData);

      expect(response.status).toBe(201);
      expect(response.body.report.type).toBe('query');
    });

    it('should validate report configuration', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Invalid Report',
          workspaceId: testWorkspaceId,
          type: 'dashboard',
          // Missing required config.dashboardId
          config: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('dashboardId');
    });
  });

  describe('GET /api/reports', () => {
    beforeEach(async () => {
      await testPool.query(
        `INSERT INTO reports (name, workspace_id, created_by, type, config)
         VALUES
           ('Report 1', $1, $2, 'dashboard', '{}'),
           ('Report 2', $1, $2, 'query', '{}'),
           ('Report 3', $1, $2, 'dashboard', '{}')`,
        [testWorkspaceId, testUser.id]
      );
    });

    it('should list all reports', async () => {
      const response = await request(app)
        .get('/api/reports')
        .query({ workspaceId: testWorkspaceId })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports.length).toBe(3);
    });

    it('should filter reports by type', async () => {
      const response = await request(app)
        .get('/api/reports')
        .query({ workspaceId: testWorkspaceId, type: 'dashboard' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports.length).toBe(2);
      expect(response.body.reports.every((r: any) => r.type === 'dashboard')).toBe(true);
    });
  });

  describe('POST /api/reports/:id/generate', () => {
    let reportId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO reports (name, workspace_id, created_by, type, config)
         VALUES ('Test Report', $1, $2, 'dashboard', $3)
         RETURNING id`,
        [testWorkspaceId, testUser.id, JSON.stringify({ dashboardId: testDashboardId })]
      );
      reportId = result.rows[0].id;
    });

    it('should generate report and return job ID', async () => {
      const response = await request(app)
        .post(`/api/reports/${reportId}/generate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          format: 'pdf',
          options: {
            includeCharts: true,
            includeData: true,
          },
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'processing');
    });

    it('should generate report with date override', async () => {
      const response = await request(app)
        .post(`/api/reports/${reportId}/generate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          format: 'pdf',
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId');
    });
  });

  describe('GET /api/reports/:id/history', () => {
    let reportId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO reports (name, workspace_id, created_by, type, config)
         VALUES ('Test Report', $1, $2, 'dashboard', '{}')
         RETURNING id`,
        [testWorkspaceId, testUser.id]
      );
      reportId = result.rows[0].id;

      // Add generation history
      await testPool.query(
        `INSERT INTO report_generations (report_id, status, format, started_at, completed_at)
         VALUES
           ($1, 'completed', 'pdf', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '2 minutes'),
           ($1, 'completed', 'csv', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '1 minute'),
           ($1, 'failed', 'pdf', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')`,
        [reportId]
      );
    });

    it('should return generation history', async () => {
      const response = await request(app)
        .get(`/api/reports/${reportId}/history`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.history.length).toBe(3);
      expect(response.body.history[0]).toHaveProperty('status');
      expect(response.body.history[0]).toHaveProperty('format');
    });

    it('should filter history by status', async () => {
      const response = await request(app)
        .get(`/api/reports/${reportId}/history`)
        .query({ status: 'completed' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.history.length).toBe(2);
    });
  });
});

describe('Schedule Integration Tests', () => {
  let testUser: any;
  let accessToken: string;
  let testWorkspaceId: string;
  let testReportId: string;

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

    const reportResult = await testPool.query(
      `INSERT INTO reports (name, workspace_id, created_by, type, config)
       VALUES ('Test Report', $1, $2, 'dashboard', '{}')
       RETURNING id`,
      [testWorkspaceId, testUser.id]
    );
    testReportId = reportResult.rows[0].id;
  });

  describe('POST /api/schedules', () => {
    it('should create a daily schedule', async () => {
      const scheduleData = {
        reportId: testReportId,
        name: 'Daily Report',
        frequency: 'daily',
        time: '09:00',
        timezone: 'America/New_York',
        recipients: [
          { email: 'user@example.com', type: 'email' },
        ],
        format: 'pdf',
      };

      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(scheduleData);

      expect(response.status).toBe(201);
      expect(response.body.schedule.frequency).toBe('daily');
      expect(response.body.schedule.next_run).toBeDefined();
    });

    it('should create a weekly schedule', async () => {
      const scheduleData = {
        reportId: testReportId,
        name: 'Weekly Report',
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        time: '08:00',
        timezone: 'UTC',
        recipients: [
          { email: 'team@example.com', type: 'email' },
        ],
        format: 'pdf',
      };

      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(scheduleData);

      expect(response.status).toBe(201);
      expect(response.body.schedule.frequency).toBe('weekly');
    });

    it('should create a monthly schedule', async () => {
      const scheduleData = {
        reportId: testReportId,
        name: 'Monthly Report',
        frequency: 'monthly',
        dayOfMonth: 1,
        time: '06:00',
        timezone: 'UTC',
        recipients: [
          { email: 'leadership@example.com', type: 'email' },
          { webhook: 'https://example.com/webhook', type: 'webhook' },
        ],
        format: 'pdf',
      };

      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(scheduleData);

      expect(response.status).toBe(201);
      expect(response.body.schedule.frequency).toBe('monthly');
    });

    it('should validate recipient email', async () => {
      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          reportId: testReportId,
          name: 'Invalid Schedule',
          frequency: 'daily',
          time: '09:00',
          timezone: 'UTC',
          recipients: [
            { email: 'invalid-email', type: 'email' },
          ],
          format: 'pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
    });
  });

  describe('GET /api/schedules', () => {
    beforeEach(async () => {
      await testPool.query(
        `INSERT INTO report_schedules (report_id, name, frequency, config, is_active, created_by)
         VALUES
           ($1, 'Daily', 'daily', '{}', true, $2),
           ($1, 'Weekly', 'weekly', '{}', true, $2),
           ($1, 'Monthly', 'monthly', '{}', false, $2)`,
        [testReportId, testUser.id]
      );
    });

    it('should list all schedules', async () => {
      const response = await request(app)
        .get('/api/schedules')
        .query({ reportId: testReportId })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.schedules.length).toBe(3);
    });

    it('should filter active schedules', async () => {
      const response = await request(app)
        .get('/api/schedules')
        .query({ reportId: testReportId, active: true })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.schedules.length).toBe(2);
    });
  });

  describe('PUT /api/schedules/:id', () => {
    let scheduleId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO report_schedules (report_id, name, frequency, config, is_active, created_by)
         VALUES ($1, 'Test Schedule', 'daily', '{}', true, $2)
         RETURNING id`,
        [testReportId, testUser.id]
      );
      scheduleId = result.rows[0].id;
    });

    it('should update schedule', async () => {
      const response = await request(app)
        .put(`/api/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Schedule',
          frequency: 'weekly',
        });

      expect(response.status).toBe(200);
      expect(response.body.schedule.name).toBe('Updated Schedule');
      expect(response.body.schedule.frequency).toBe('weekly');
    });

    it('should pause schedule', async () => {
      const response = await request(app)
        .put(`/api/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.schedule.is_active).toBe(false);
    });
  });

  describe('DELETE /api/schedules/:id', () => {
    let scheduleId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO report_schedules (report_id, name, frequency, config, is_active, created_by)
         VALUES ($1, 'To Delete', 'daily', '{}', true, $2)
         RETURNING id`,
        [testReportId, testUser.id]
      );
      scheduleId = result.rows[0].id;
    });

    it('should delete schedule', async () => {
      const response = await request(app)
        .delete(`/api/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      const result = await testPool.query(
        'SELECT * FROM report_schedules WHERE id = $1',
        [scheduleId]
      );
      expect(result.rows.length).toBe(0);
    });
  });

  describe('POST /api/schedules/:id/run', () => {
    let scheduleId: string;

    beforeEach(async () => {
      const result = await testPool.query(
        `INSERT INTO report_schedules (report_id, name, frequency, config, is_active, created_by)
         VALUES ($1, 'Manual Run', 'daily', '{}', true, $2)
         RETURNING id`,
        [testReportId, testUser.id]
      );
      scheduleId = result.rows[0].id;
    });

    it('should trigger manual run', async () => {
      const response = await request(app)
        .post(`/api/schedules/${scheduleId}/run`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.message).toContain('triggered');
    });
  });
});
