/**
 * E2E Tests: Dashboard Management
 *
 * Tests the complete dashboard management journey:
 * - Create dashboard
 * - Add visualizations
 * - Configure filters
 * - Save and share
 * - View and interact
 */

describe('Dashboard Management', () => {
  beforeEach(() => {
    // Login
    cy.visit('/login');
    cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
    cy.get('input[name="password"]').type(Cypress.env('testUser').password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  describe('Create Dashboard', () => {
    it('should create a new blank dashboard', () => {
      cy.visit('/dashboards');
      cy.contains(/create.*dashboard|new dashboard/i).click();

      // Should open dashboard editor
      cy.url().should('include', '/dashboards/new');

      // Should show empty grid
      cy.get('[data-testid="dashboard-grid"]').should('be.visible');

      // Should show visualization library
      cy.get('[data-testid="viz-library"]').should('be.visible');
    });

    it('should create dashboard from template', () => {
      cy.visit('/dashboards');
      cy.contains(/create.*dashboard/i).click();

      // Select template tab
      cy.contains(/templates/i).click();

      // Select a template
      cy.get('[data-testid="dashboard-template-card"]').first().click();

      // Should load template with visualizations
      cy.get('[data-testid="dashboard-grid"]').find('[data-viz-id]').should('have.length.gt', 0);
    });

    it('should set dashboard name and description', () => {
      cy.visit('/dashboards/new');

      // Set name
      cy.get('[data-testid="dashboard-name-input"]').clear().type('Sales Performance Dashboard');

      // Set description
      cy.get('[data-testid="dashboard-description"]').type('Monthly sales metrics and KPIs');

      // Should update
      cy.get('[data-testid="dashboard-name-input"]').should('have.value', 'Sales Performance Dashboard');
    });
  });

  describe('Add Visualizations', () => {
    beforeEach(() => {
      cy.visit('/dashboards/new');
    });

    it('should add a chart visualization', () => {
      // Open viz library
      cy.get('[data-testid="viz-library"]').within(() => {
        cy.contains(/charts/i).click();
        cy.get('[data-viz-type="line-chart"]').click();
      });

      // Click on grid to place
      cy.get('[data-testid="dashboard-grid"]').click(200, 200);

      // Should add chart
      cy.get('[data-viz-type="line-chart"]').should('exist');
    });

    it('should add a metric card', () => {
      cy.get('[data-testid="viz-library"]').within(() => {
        cy.contains(/metrics/i).click();
        cy.get('[data-viz-type="metric-card"]').click();
      });

      cy.get('[data-testid="dashboard-grid"]').click(400, 100);

      cy.get('[data-viz-type="metric-card"]').should('exist');
    });

    it('should add a table visualization', () => {
      cy.get('[data-testid="viz-library"]').within(() => {
        cy.contains(/tables/i).click();
        cy.get('[data-viz-type="data-table"]').click();
      });

      cy.get('[data-testid="dashboard-grid"]').click(200, 400);

      cy.get('[data-viz-type="data-table"]').should('exist');
    });

    it('should add a heatmap', () => {
      cy.get('[data-testid="viz-library"]').within(() => {
        cy.contains(/advanced/i).click();
        cy.get('[data-viz-type="heatmap"]').click();
      });

      cy.get('[data-testid="dashboard-grid"]').click(600, 300);

      cy.get('[data-viz-type="heatmap"]').should('exist');
    });
  });

  describe('Configure Visualizations', () => {
    beforeEach(() => {
      cy.visit('/dashboards/new');
      // Add a chart
      cy.get('[data-testid="viz-library"]').contains(/charts/i).click();
      cy.get('[data-viz-type="line-chart"]').click();
      cy.get('[data-testid="dashboard-grid"]').click(200, 200);
    });

    it('should open configuration panel when viz is clicked', () => {
      cy.get('[data-viz-type="line-chart"]').click();

      cy.get('[data-testid="viz-config-panel"]').should('be.visible');
    });

    it('should configure data source', () => {
      cy.get('[data-viz-type="line-chart"]').click();

      // Switch to Data tab
      cy.get('[data-testid="viz-config-panel"]').within(() => {
        cy.contains(/data/i).click();

        // Select data source
        cy.get('select[name="dataSource"]').select('TimescaleDB');

        // Set query
        cy.get('textarea[name="query"]').type('SELECT * FROM sales_metrics');

        // Apply
        cy.contains(/apply/i).click();
      });

      // Viz should update
      cy.get('[data-viz-type="line-chart"]').should('have.attr', 'data-configured', 'true');
    });

    it('should configure visualization appearance', () => {
      cy.get('[data-viz-type="line-chart"]').click();

      cy.get('[data-testid="viz-config-panel"]').within(() => {
        cy.contains(/appearance/i).click();

        // Set colors
        cy.get('input[name="primaryColor"]').clear().type('#3b82f6');

        // Set title
        cy.get('input[name="title"]').type('Sales Over Time');

        // Show legend
        cy.get('input[type="checkbox"][name="showLegend"]').check();

        cy.contains(/apply/i).click();
      });

      // Should show title
      cy.get('[data-viz-type="line-chart"]').contains('Sales Over Time').should('be.visible');
    });

    it('should resize visualization', () => {
      cy.get('[data-viz-type="line-chart"]').click();

      // Drag resize handle
      cy.get('[data-testid="viz-resize-handle"]')
        .trigger('mousedown')
        .trigger('mousemove', { clientX: 800, clientY: 600 })
        .trigger('mouseup');

      // Viz should resize
      cy.get('[data-viz-type="line-chart"]').should('have.css', 'width').and('not.equal', '400px');
    });

    it('should delete visualization', () => {
      cy.get('[data-viz-type="line-chart"]').click();

      cy.get('button[title="Delete Visualization"]').click();

      // Confirm deletion
      cy.contains(/confirm/i).click();

      // Viz should be removed
      cy.get('[data-viz-type="line-chart"]').should('not.exist');
    });
  });

  describe('Dashboard Filters', () => {
    beforeEach(() => {
      cy.visit('/dashboards/new');
      // Add a chart
      cy.get('[data-testid="viz-library"]').contains(/charts/i).click();
      cy.get('[data-viz-type="line-chart"]').click();
      cy.get('[data-testid="dashboard-grid"]').click(200, 200);
    });

    it('should add a date range filter', () => {
      cy.contains(/add filter/i).click();

      cy.get('[data-testid="filter-type-select"]').select('Date Range');

      cy.get('input[name="filterName"]').type('Date');

      cy.contains(/create filter/i).click();

      // Filter should appear
      cy.get('[data-testid="dashboard-filters"]').contains('Date').should('be.visible');
    });

    it('should add a dropdown filter', () => {
      cy.contains(/add filter/i).click();

      cy.get('[data-testid="filter-type-select"]').select('Dropdown');

      cy.get('input[name="filterName"]').type('Region');

      // Add options
      cy.get('input[name="filterOptions"]').type('North,South,East,West');

      cy.contains(/create filter/i).click();

      cy.get('[data-testid="dashboard-filters"]').contains('Region').should('be.visible');
    });

    it('should apply filter to visualization', () => {
      // Create filter first
      cy.contains(/add filter/i).click();
      cy.get('[data-testid="filter-type-select"]').select('Dropdown');
      cy.get('input[name="filterName"]').type('Category');
      cy.get('input[name="filterOptions"]').type('A,B,C');
      cy.contains(/create filter/i).click();

      // Select visualization
      cy.get('[data-viz-type="line-chart"]').click();

      // Connect filter
      cy.get('[data-testid="viz-config-panel"]').within(() => {
        cy.contains(/filters/i).click();
        cy.get('input[type="checkbox"][name="filter-category"]').check();
        cy.contains(/apply/i).click();
      });

      // Filter should be connected
      cy.get('[data-viz-type="line-chart"]').should('have.attr', 'data-filters').and('include', 'category');
    });

    it('should filter visualizations when filter changes', () => {
      // Assuming filter is already set up
      cy.visit('/dashboards/test-dashboard-id'); // Existing dashboard with filters

      // Change filter value
      cy.get('[data-testid="filter-category"]').select('B');

      // Visualizations should update (check loading state)
      cy.get('[data-viz-type="line-chart"]').should('have.attr', 'data-loading', 'false');
    });
  });

  describe('Save Dashboard', () => {
    beforeEach(() => {
      cy.visit('/dashboards/new');
      cy.get('[data-testid="dashboard-name-input"]').clear().type('Test Dashboard');
      // Add a visualization
      cy.get('[data-testid="viz-library"]').contains(/charts/i).click();
      cy.get('[data-viz-type="line-chart"]').click();
      cy.get('[data-testid="dashboard-grid"]').click(200, 200);
    });

    it('should save dashboard', () => {
      cy.contains(/save/i).click();

      // Should show success message
      cy.contains(/dashboard saved/i).should('be.visible');

      // URL should change
      cy.url().should('match', /\/dashboards\/[a-z0-9-]+$/);
    });

    it('should auto-save dashboard', () => {
      // Save first
      cy.contains(/save/i).click();
      cy.wait(1000);

      // Make a change
      cy.get('[data-testid="dashboard-name-input"]').clear().type('Modified Dashboard');

      // Wait for auto-save (2 minutes in real app, but we can test the indicator)
      cy.get('[data-testid="auto-save-indicator"]').should('contain', /saving|saved/i);
    });
  });

  describe('Share Dashboard', () => {
    beforeEach(() => {
      // Create and save a dashboard first
      cy.visit('/dashboards/new');
      cy.get('[data-testid="dashboard-name-input"]').clear().type('Shared Dashboard');
      cy.get('[data-testid="viz-library"]').contains(/charts/i).click();
      cy.get('[data-viz-type="line-chart"]').click();
      cy.get('[data-testid="dashboard-grid"]').click(200, 200);
      cy.contains(/save/i).click();
      cy.wait(1000);
    });

    it('should open share dialog', () => {
      cy.contains(/share/i).click();

      cy.get('[data-testid="share-dialog"]').should('be.visible');
    });

    it('should share with specific user', () => {
      cy.contains(/share/i).click();

      cy.get('input[placeholder*="Search"]').type('test');
      cy.get('[data-testid="user-result"]').first().click();

      cy.get('select[name="permission"]').select('Can View');

      cy.contains(/add/i).click();

      // User should appear in share list
      cy.get('[data-testid="share-list"]').contains('test').should('be.visible');
    });

    it('should generate public link', () => {
      cy.contains(/share/i).click();

      cy.contains(/public link/i).click();

      cy.contains(/generate.*link/i).click();

      // Should show link
      cy.get('input[readonly]').should('have.value').and('include', 'http');
    });

    it('should set public link expiration', () => {
      cy.contains(/share/i).click();

      cy.contains(/public link/i).click();

      cy.contains(/generate.*link/i).click();

      // Set expiration
      cy.get('select[name="expiration"]').select('7 days');

      cy.contains(/update/i).click();

      // Should show expiration date
      cy.contains(/expires/i).should('be.visible');
    });
  });

  describe('View Dashboard', () => {
    it('should view existing dashboard', () => {
      cy.visit('/dashboards');

      // Click on first dashboard
      cy.get('[data-testid="dashboard-card"]').first().click();

      // Should show dashboard
      cy.get('[data-testid="dashboard-grid"]').should('be.visible');

      // Should show visualizations
      cy.get('[data-viz-id]').should('exist');
    });

    it('should refresh dashboard data', () => {
      cy.visit('/dashboards/test-dashboard-id');

      cy.get('button[title="Refresh"]').click();

      // Should show loading state
      cy.get('[data-testid="dashboard-loading"]').should('be.visible');

      // Should complete
      cy.get('[data-testid="dashboard-loading"]').should('not.exist');
    });

    it('should enter fullscreen mode', () => {
      cy.visit('/dashboards/test-dashboard-id');

      cy.get('button[title="Fullscreen"]').click();

      // Should be fullscreen
      cy.get('[data-testid="dashboard-fullscreen"]').should('exist');

      // Exit fullscreen
      cy.get('button[title="Exit Fullscreen"]').click();

      cy.get('[data-testid="dashboard-fullscreen"]').should('not.exist');
    });

    it('should export dashboard', () => {
      cy.visit('/dashboards/test-dashboard-id');

      cy.contains(/export/i).click();

      cy.contains(/pdf/i).click();

      // Should trigger download
      cy.readFile('cypress/downloads').should('exist');
    });
  });

  describe('Dashboard Permissions', () => {
    it('should allow owner to edit dashboard', () => {
      cy.visit('/dashboards/owned-dashboard-id');

      // Edit button should be visible
      cy.get('button').contains(/edit/i).should('be.visible');
    });

    it('should prevent non-owner from editing', () => {
      cy.visit('/dashboards/shared-view-only-id');

      // Edit button should not exist or be disabled
      cy.get('button').contains(/edit/i).should('not.exist');
    });

    it('should show correct permissions in share list', () => {
      cy.visit('/dashboards/owned-dashboard-id');

      cy.contains(/share/i).click();

      // Should show current shares with permissions
      cy.get('[data-testid="share-list"]').within(() => {
        cy.contains(/can view|can edit|admin/i).should('be.visible');
      });
    });
  });

  describe('Dashboard Organization', () => {
    it('should create folder for dashboards', () => {
      cy.visit('/dashboards');

      cy.contains(/new folder/i).click();

      cy.get('input[name="folderName"]').type('Sales Dashboards');

      cy.contains(/create/i).click();

      // Folder should appear
      cy.get('[data-testid="dashboard-folder"]').contains('Sales Dashboards').should('be.visible');
    });

    it('should move dashboard to folder', () => {
      cy.visit('/dashboards');

      // Right-click or open context menu
      cy.get('[data-testid="dashboard-card"]').first().rightclick();

      cy.contains(/move to/i).click();

      cy.get('[data-testid="folder-select"]').select('Sales Dashboards');

      cy.contains(/move/i).click();

      // Dashboard should be in folder
      cy.get('[data-testid="dashboard-folder"]').contains('Sales Dashboards').click();

      cy.get('[data-testid="dashboard-card"]').should('exist');
    });

    it('should search dashboards', () => {
      cy.visit('/dashboards');

      cy.get('input[placeholder*="Search"]').type('sales');

      // Should show matching dashboards
      cy.get('[data-testid="dashboard-card"]').should('have.length.gte', 1);

      // Should contain search term
      cy.get('[data-testid="dashboard-card"]').first().should('contain', /sales/i);
    });

    it('should filter dashboards by tags', () => {
      cy.visit('/dashboards');

      cy.get('[data-testid="filter-tags"]').click();

      cy.get('[data-testid="tag-option"]').contains('Finance').click();

      // Should show only finance dashboards
      cy.get('[data-testid="dashboard-card"]').each(($card) => {
        cy.wrap($card).find('[data-testid="dashboard-tags"]').should('contain', 'Finance');
      });
    });
  });
});
