/**
 * E2E Tests: Report Building Flow
 *
 * Tests the complete report building journey:
 * - Create report
 * - Add elements
 * - Configure properties
 * - Preview
 * - Export
 * - Save and share
 */

describe('Report Building Flow', () => {
  beforeEach(() => {
    // Login
    cy.visit('/login');
    cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
    cy.get('input[name="password"]').type(Cypress.env('testUser').password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  describe('Create New Report', () => {
    it('should create a new blank report', () => {
      cy.visit('/reports');
      cy.contains(/create.*report|new report/i).click();

      // Should open report builder
      cy.url().should('include', '/reports/new');

      // Should show empty canvas
      cy.get('[data-testid="report-canvas"]').should('be.visible');

      // Should show element palette
      cy.get('[data-testid="element-palette"]').should('be.visible');
    });

    it('should create report from template', () => {
      cy.visit('/reports');
      cy.contains(/create.*report/i).click();

      // Select template tab
      cy.contains(/templates/i).click();

      // Select a template
      cy.get('[data-testid="template-card"]').first().click();

      // Should load template
      cy.get('[data-testid="report-canvas"]').find('[data-element-type]').should('have.length.gt', 0);
    });

    it('should set report name and description', () => {
      cy.visit('/reports/new');

      // Click on report name
      cy.get('[data-testid="report-name-input"]').clear().type('Test Report');

      // Should update name
      cy.get('[data-testid="report-name-input"]').should('have.value', 'Test Report');
    });
  });

  describe('Add Report Elements', () => {
    beforeEach(() => {
      cy.visit('/reports/new');
    });

    it('should add a chart element', () => {
      // Drag chart from palette
      cy.get('[data-testid="element-chart"]').trigger('dragstart');
      cy.get('[data-testid="report-canvas"]')
        .trigger('drop', { clientX: 200, clientY: 200 });

      // Should add chart to canvas
      cy.get('[data-element-type="chart"]').should('exist');
    });

    it('should add a table element', () => {
      cy.get('[data-testid="element-table"]').click();
      cy.get('[data-testid="report-canvas"]').click(300, 300);

      cy.get('[data-element-type="table"]').should('exist');
    });

    it('should add a metric card element', () => {
      cy.get('[data-testid="element-metric"]').click();
      cy.get('[data-testid="report-canvas"]').click(400, 200);

      cy.get('[data-element-type="metric"]').should('exist');
    });

    it('should add a text element', () => {
      cy.get('[data-testid="element-text"]').click();
      cy.get('[data-testid="report-canvas"]').click(100, 100);

      cy.get('[data-element-type="text"]').should('exist');
    });
  });

  describe('Configure Element Properties', () => {
    beforeEach(() => {
      cy.visit('/reports/new');
      // Add a chart element
      cy.get('[data-testid="element-chart"]').click();
      cy.get('[data-testid="report-canvas"]').click(200, 200);
    });

    it('should open properties panel when element is selected', () => {
      cy.get('[data-element-type="chart"]').click();

      cy.get('[data-testid="properties-panel"]').should('be.visible');
    });

    it('should update element position', () => {
      cy.get('[data-element-type="chart"]').click();

      cy.get('input[name="x"]').clear().type('100');
      cy.get('input[name="y"]').clear().type('150');

      // Element should move
      cy.get('[data-element-type="chart"]').should('have.css', 'left', '100px');
    });

    it('should update element size', () => {
      cy.get('[data-element-type="chart"]').click();

      cy.get('input[name="width"]').clear().type('600');
      cy.get('input[name="height"]').clear().type('400');

      cy.get('[data-element-type="chart"]')
        .should('have.css', 'width', '600px')
        .and('have.css', 'height', '400px');
    });

    it('should configure chart data source', () => {
      cy.get('[data-element-type="chart"]').click();

      // Switch to Data tab
      cy.contains(/data/i).click();

      // Select data source
      cy.get('select[name="dataSource"]').select('API');
      cy.get('input[name="apiEndpoint"]').type('/api/sales-data');

      // Should save configuration
      cy.contains(/save/i).click();
    });
  });

  describe('Report Canvas Operations', () => {
    beforeEach(() => {
      cy.visit('/reports/new');
      cy.get('[data-testid="element-chart"]').click();
      cy.get('[data-testid="report-canvas"]').click(200, 200);
    });

    it('should drag and reposition elements', () => {
      cy.get('[data-element-type="chart"]')
        .trigger('mousedown', { button: 0 })
        .trigger('mousemove', { clientX: 400, clientY: 300 })
        .trigger('mouseup');

      // Element should move
      cy.get('[data-element-type="chart"]').should('not.have.css', 'left', '200px');
    });

    it('should resize elements', () => {
      cy.get('[data-element-type="chart"]').click();

      // Drag resize handle
      cy.get('[data-testid="resize-handle-se"]')
        .trigger('mousedown')
        .trigger('mousemove', { clientX: 600, clientY: 500 })
        .trigger('mouseup');

      // Element should resize
      cy.get('[data-element-type="chart"]').should('have.css', 'width').and('not.equal', '400px');
    });

    it('should delete elements', () => {
      cy.get('[data-element-type="chart"]').click();

      cy.get('button[title="Delete"]').click();

      // Element should be removed
      cy.get('[data-element-type="chart"]').should('not.exist');
    });

    it('should duplicate elements', () => {
      cy.get('[data-element-type="chart"]').click();

      cy.get('button[title="Duplicate"]').click();

      // Should have 2 chart elements
      cy.get('[data-element-type="chart"]').should('have.length', 2);
    });

    it('should undo and redo operations', () => {
      // Add element
      cy.get('[data-testid="element-table"]').click();
      cy.get('[data-testid="report-canvas"]').click(300, 300);

      cy.get('[data-element-type="table"]').should('exist');

      // Undo
      cy.get('button[title="Undo"]').click();

      cy.get('[data-element-type="table"]').should('not.exist');

      // Redo
      cy.get('button[title="Redo"]').click();

      cy.get('[data-element-type="table"]').should('exist');
    });
  });

  describe('Preview Report', () => {
    beforeEach(() => {
      cy.visit('/reports/new');
      // Add some elements
      cy.get('[data-testid="element-chart"]').click();
      cy.get('[data-testid="report-canvas"]').click(200, 200);
    });

    it('should switch to preview mode', () => {
      cy.contains(/preview/i).click();

      // Should hide edit controls
      cy.get('[data-testid="element-palette"]').should('not.be.visible');

      // Should show preview toolbar
      cy.get('[data-testid="preview-toolbar"]').should('be.visible');
    });

    it('should zoom in preview mode', () => {
      cy.contains(/preview/i).click();

      cy.get('button[title="Zoom In"]').click();

      // Should increase zoom level
      cy.contains(/125%|150%/i).should('be.visible');
    });
  });

  describe('Export Report', () => {
    beforeEach(() => {
      cy.visit('/reports/new');
      cy.get('[data-testid="element-chart"]').click();
      cy.get('[data-testid="report-canvas"]').click(200, 200);
    });

    it('should export as PDF', () => {
      cy.contains(/export/i).click();
      cy.contains(/pdf/i).click();

      // Should trigger download
      cy.readFile('cypress/downloads').should('exist');
    });

    it('should export as Excel', () => {
      cy.contains(/export/i).click();
      cy.contains(/excel/i).click();

      // Should trigger download
      cy.readFile('cypress/downloads').should('exist');
    });

    it('should export as PowerPoint', () => {
      cy.contains(/export/i).click();
      cy.contains(/powerpoint/i).click();

      // Should trigger download
      cy.readFile('cypress/downloads').should('exist');
    });
  });

  describe('Save and Share Report', () => {
    beforeEach(() => {
      cy.visit('/reports/new');
      cy.get('[data-testid="report-name-input"]').clear().type('Test Shared Report');
      cy.get('[data-testid="element-chart"]').click();
      cy.get('[data-testid="report-canvas"]').click(200, 200);
    });

    it('should save report', () => {
      cy.contains(/save/i).click();

      // Should show success message
      cy.contains(/saved successfully/i).should('be.visible');

      // URL should change from /new to /{reportId}
      cy.url().should('match', /\/reports\/[a-z0-9-]+$/);
    });

    it('should share report with user', () => {
      // Save first
      cy.contains(/save/i).click();
      cy.wait(1000);

      // Open share dialog
      cy.contains(/share/i).click();

      // Add user
      cy.get('input[placeholder*="Search"]').type('test');
      cy.get('[data-testid="user-result"]').first().click();

      // Set permission
      cy.get('select[name="permission"]').select('Can View');

      // Should show user in share list
      cy.get('[data-testid="share-list"]').contains('test').should('be.visible');
    });

    it('should generate public link', () => {
      // Save first
      cy.contains(/save/i).click();
      cy.wait(1000);

      // Open share dialog
      cy.contains(/share/i).click();

      // Go to public link tab
      cy.contains(/public link/i).click();

      // Generate link
      cy.contains(/generate.*link/i).click();

      // Should show public link
      cy.get('input[readonly]').should('have.value').and('include', 'http');

      // Should have copy button
      cy.contains(/copy/i).should('be.visible');
    });
  });

  describe('Version History', () => {
    beforeEach(() => {
      cy.visit('/reports/new');
      cy.get('[data-testid="report-name-input"]').clear().type('Versioned Report');
    });

    it('should show version history', () => {
      // Save multiple times
      cy.contains(/save/i).click();
      cy.wait(1000);

      cy.get('[data-testid="element-text"]').click();
      cy.get('[data-testid="report-canvas"]').click(100, 100);

      cy.contains(/save/i).click();
      cy.wait(1000);

      // Open versions
      cy.contains(/versions/i).click();

      // Should show version list
      cy.get('[data-testid="version-list"]').find('[data-testid="version-item"]')
        .should('have.length.gte', 2);
    });

    it('should restore previous version', () => {
      // Implementation depends on version history UI
      cy.contains(/versions/i).click();

      cy.get('[data-testid="version-item"]').eq(1).click();
      cy.contains(/restore/i).click();

      // Should show confirmation
      cy.contains(/are you sure/i).should('be.visible');

      cy.contains(/confirm/i).click();

      // Should restore version
      cy.contains(/version restored/i).should('be.visible');
    });
  });
});
