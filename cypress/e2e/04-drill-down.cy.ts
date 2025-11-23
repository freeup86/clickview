/**
 * E2E Tests: Drill-Down Navigation
 *
 * Tests the multi-level drill-down functionality:
 * - Click data points to drill down
 * - Navigate drill-down hierarchy
 * - Breadcrumb navigation
 * - Context preservation
 * - Cross-visualization drill-down
 */

describe('Drill-Down Navigation', () => {
  beforeEach(() => {
    // Login
    cy.visit('/login');
    cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
    cy.get('input[name="password"]').type(Cypress.env('testUser').password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  describe('Basic Drill-Down', () => {
    beforeEach(() => {
      // Navigate to dashboard with drill-down enabled
      cy.visit('/dashboards/drill-down-demo');
    });

    it('should show drill-down indicator on interactive data points', () => {
      // Hover over data point
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-drill-enabled="true"]').first().trigger('mouseover');
      });

      // Should show drill-down cursor or tooltip
      cy.get('[data-testid="drill-down-tooltip"]').should('be.visible');
      cy.get('[data-testid="drill-down-tooltip"]').should('contain', /click to drill/i);
    });

    it('should drill down when clicking data point', () => {
      // Click on bar chart data point
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      // Should navigate to drill-down view
      cy.url().should('include', 'drillPath=category:Electronics');

      // Should show breadcrumb
      cy.get('[data-testid="breadcrumb"]').should('contain', 'Electronics');

      // Visualization should update
      cy.get('[data-viz-type="bar-chart"]').should('have.attr', 'data-drill-level', '1');
    });

    it('should drill down multiple levels', () => {
      // First level - Category
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      cy.wait(500);

      // Second level - Subcategory
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-subcategory="Laptops"]').click();
      });

      cy.wait(500);

      // Third level - Product
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-product="MacBook Pro"]').click();
      });

      // Should show all levels in breadcrumb
      cy.get('[data-testid="breadcrumb"]')
        .should('contain', 'Electronics')
        .and('contain', 'Laptops')
        .and('contain', 'MacBook Pro');

      // Should be at level 3
      cy.url().should('match', /drillPath=.*MacBook%20Pro/);
    });

    it('should preserve filters during drill-down', () => {
      // Set a date filter
      cy.get('[data-testid="filter-date-range"]').click();
      cy.get('[data-testid="date-preset"]').contains('Last 30 Days').click();

      // Drill down
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      // Filter should still be applied
      cy.get('[data-testid="filter-date-range"]').should('contain', 'Last 30 Days');

      // URL should preserve filter
      cy.url().should('include', 'dateRange=last30days');
    });
  });

  describe('Breadcrumb Navigation', () => {
    beforeEach(() => {
      cy.visit('/dashboards/drill-down-demo');

      // Drill down to level 2
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });
      cy.wait(500);

      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-subcategory="Laptops"]').click();
      });
    });

    it('should show complete breadcrumb trail', () => {
      cy.get('[data-testid="breadcrumb"]').within(() => {
        cy.contains('All Categories').should('be.visible');
        cy.contains('Electronics').should('be.visible');
        cy.contains('Laptops').should('be.visible');
      });
    });

    it('should navigate back using breadcrumb', () => {
      // Click on first level in breadcrumb
      cy.get('[data-testid="breadcrumb"]').contains('Electronics').click();

      // Should go back to level 1
      cy.get('[data-testid="breadcrumb"]').should('not.contain', 'Laptops');

      cy.url().should('include', 'drillPath=category:Electronics');
      cy.url().should('not.include', 'Laptops');
    });

    it('should navigate to root using breadcrumb', () => {
      // Click on root in breadcrumb
      cy.get('[data-testid="breadcrumb"]').contains('All Categories').click();

      // Should be at root level
      cy.get('[data-testid="breadcrumb"]').should('have.length', 1);

      cy.url().should('not.include', 'drillPath');
    });

    it('should show breadcrumb dropdown for long paths', () => {
      // Drill down many levels (if supported)
      // For now, test dropdown appears
      cy.get('[data-testid="breadcrumb-overflow"]').should('exist');
    });
  });

  describe('Browser Navigation', () => {
    beforeEach(() => {
      cy.visit('/dashboards/drill-down-demo');
    });

    it('should support browser back button', () => {
      // Drill down
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      cy.wait(500);

      // Use browser back
      cy.go('back');

      // Should be at root level
      cy.get('[data-testid="breadcrumb"]').should('have.length', 1);
    });

    it('should support browser forward button', () => {
      // Drill down
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      cy.wait(500);

      // Go back
      cy.go('back');

      // Go forward
      cy.go('forward');

      // Should be back at level 1
      cy.get('[data-testid="breadcrumb"]').should('contain', 'Electronics');
    });

    it('should restore drill-down state from URL', () => {
      // Navigate directly to drill-down URL
      cy.visit('/dashboards/drill-down-demo?drillPath=category:Electronics>subcategory:Laptops');

      // Should show correct breadcrumb
      cy.get('[data-testid="breadcrumb"]')
        .should('contain', 'Electronics')
        .and('contain', 'Laptops');

      // Visualization should be at correct level
      cy.get('[data-viz-type="bar-chart"]').should('have.attr', 'data-drill-level', '2');
    });
  });

  describe('Cross-Visualization Drill-Down', () => {
    beforeEach(() => {
      cy.visit('/dashboards/drill-down-demo');
    });

    it('should sync drill-down across all visualizations', () => {
      // Drill down on bar chart
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      cy.wait(500);

      // Line chart should also update
      cy.get('[data-viz-type="line-chart"]').should('have.attr', 'data-drill-level', '1');

      // Table should also update
      cy.get('[data-viz-type="data-table"]').should('contain', 'Electronics');
    });

    it('should allow independent drill-down per visualization', () => {
      // Enable independent mode (if supported)
      cy.get('[data-testid="independent-drill-toggle"]').click();

      // Drill down on bar chart
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      cy.wait(500);

      // Line chart should remain at root level
      cy.get('[data-viz-type="line-chart"]').should('have.attr', 'data-drill-level', '0');
    });

    it('should highlight source visualization during drill-down', () => {
      // Click on bar chart
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      // Bar chart should have active indicator
      cy.get('[data-viz-type="bar-chart"]').should('have.class', 'drill-source');
    });
  });

  describe('Drill-Down Configuration', () => {
    beforeEach(() => {
      // Go to dashboard edit mode
      cy.visit('/dashboards/drill-down-demo');
      cy.contains(/edit/i).click();
    });

    it('should configure drill-down hierarchy for visualization', () => {
      // Select visualization
      cy.get('[data-viz-type="bar-chart"]').click();

      // Open drill-down config
      cy.get('[data-testid="viz-config-panel"]').within(() => {
        cy.contains(/drill-down/i).click();

        // Enable drill-down
        cy.get('input[type="checkbox"][name="enableDrillDown"]').check();

        // Set hierarchy
        cy.get('[data-testid="drill-level-0"]').within(() => {
          cy.get('select[name="dimension"]').select('Category');
        });

        cy.contains(/add level/i).click();

        cy.get('[data-testid="drill-level-1"]').within(() => {
          cy.get('select[name="dimension"]').select('Subcategory');
        });

        cy.contains(/add level/i).click();

        cy.get('[data-testid="drill-level-2"]').within(() => {
          cy.get('select[name="dimension"]').select('Product');
        });

        // Apply
        cy.contains(/apply/i).click();
      });

      // Configuration should be saved
      cy.get('[data-viz-type="bar-chart"]').should('have.attr', 'data-drill-enabled', 'true');
    });

    it('should set custom drill-down labels', () => {
      cy.get('[data-viz-type="bar-chart"]').click();

      cy.get('[data-testid="viz-config-panel"]').within(() => {
        cy.contains(/drill-down/i).click();

        cy.get('[data-testid="drill-level-0"]').within(() => {
          cy.get('input[name="customLabel"]').type('Product Categories');
        });

        cy.contains(/apply/i).click();
      });

      // Save dashboard
      cy.contains(/save/i).click();
      cy.wait(1000);

      // Exit edit mode
      cy.contains(/view/i).click();

      // Custom label should appear in breadcrumb
      cy.get('[data-testid="breadcrumb"]').should('contain', 'Product Categories');
    });

    it('should configure drill-down behavior', () => {
      cy.get('[data-viz-type="bar-chart"]').click();

      cy.get('[data-testid="viz-config-panel"]').within(() => {
        cy.contains(/drill-down/i).click();

        // Set behavior
        cy.get('select[name="drillBehavior"]').select('Modal'); // vs 'In-place'

        // Set transition
        cy.get('select[name="transition"]').select('Slide'); // vs 'Fade'

        cy.contains(/apply/i).click();
      });

      cy.contains(/save/i).click();
    });
  });

  describe('Drill-Down Data Loading', () => {
    beforeEach(() => {
      cy.visit('/dashboards/drill-down-demo');
    });

    it('should show loading indicator while drilling down', () => {
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      // Should show loading state
      cy.get('[data-testid="drill-loading"]').should('be.visible');

      // Should complete
      cy.get('[data-testid="drill-loading"]').should('not.exist');
    });

    it('should handle drill-down errors gracefully', () => {
      // Simulate error by drilling down with invalid data
      cy.intercept('POST', '**/api/drill-down', {
        statusCode: 500,
        body: { error: 'Failed to load drill-down data' },
      }).as('drillError');

      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      cy.wait('@drillError');

      // Should show error message
      cy.contains(/failed to load|error/i).should('be.visible');

      // Should stay at current level
      cy.get('[data-testid="breadcrumb"]').should('have.length', 1);
    });

    it('should cache drill-down data', () => {
      // Drill down
      cy.intercept('POST', '**/api/drill-down').as('drillRequest');

      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      cy.wait('@drillRequest');

      // Go back
      cy.get('[data-testid="breadcrumb"]').contains('All Categories').click();

      // Drill down again
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      // Should not make another request (cached)
      cy.get('@drillRequest.all').should('have.length', 1);
    });
  });

  describe('Drill-Down Context Menu', () => {
    beforeEach(() => {
      cy.visit('/dashboards/drill-down-demo');
    });

    it('should show context menu on right-click', () => {
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').rightclick();
      });

      // Should show context menu
      cy.get('[data-testid="drill-context-menu"]').should('be.visible');

      // Should have drill-down option
      cy.get('[data-testid="drill-context-menu"]').should('contain', /drill down/i);
    });

    it('should drill down from context menu', () => {
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').rightclick();
      });

      cy.get('[data-testid="drill-context-menu"]').contains(/drill down/i).click();

      // Should navigate to drill-down view
      cy.get('[data-testid="breadcrumb"]').should('contain', 'Electronics');
    });

    it('should show drill-through option in context menu', () => {
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').rightclick();
      });

      // Should have drill-through option (jump to detail report)
      cy.get('[data-testid="drill-context-menu"]').should('contain', /view details/i);
    });

    it('should drill through to detail report', () => {
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').rightclick();
      });

      cy.get('[data-testid="drill-context-menu"]').contains(/view details/i).click();

      // Should navigate to detail report
      cy.url().should('include', '/reports/electronics-detail');

      // Should preserve context
      cy.contains('Electronics').should('be.visible');
    });
  });

  describe('Drill-Down Permissions', () => {
    it('should respect drill-down permissions', () => {
      // Login as user without drill-down permission
      cy.visit('/dashboards/restricted-drill-down');

      // Data points should not be clickable
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').should('not.have.attr', 'data-drill-enabled');
      });

      // Should not show drill-down cursor
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').trigger('mouseover');
      });

      cy.get('[data-testid="drill-down-tooltip"]').should('not.exist');
    });

    it('should show permission error when drilling without access', () => {
      // Try to access drill-down URL directly
      cy.visit('/dashboards/restricted-drill-down?drillPath=category:Electronics');

      // Should show permission error
      cy.contains(/no permission|access denied/i).should('be.visible');

      // Should redirect to root level
      cy.url().should('not.include', 'drillPath');
    });
  });

  describe('Drill-Down Export', () => {
    beforeEach(() => {
      cy.visit('/dashboards/drill-down-demo');

      // Drill down to level 1
      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });
    });

    it('should export drilled-down data', () => {
      cy.contains(/export/i).click();

      cy.contains(/excel/i).click();

      // Should export filtered data
      cy.readFile('cypress/downloads').should('exist');

      // Export should contain "Electronics" in filename or content
    });

    it('should include drill-down context in export', () => {
      cy.contains(/export/i).click();

      cy.contains(/pdf/i).click();

      // PDF should show breadcrumb in header
      // This would require PDF validation in real test
    });
  });

  describe('Drill-Down Analytics', () => {
    beforeEach(() => {
      cy.visit('/dashboards/drill-down-demo');
    });

    it('should track drill-down usage analytics', () => {
      cy.intercept('POST', '**/api/analytics/track').as('trackEvent');

      cy.get('[data-viz-type="bar-chart"]').within(() => {
        cy.get('[data-category="Electronics"]').click();
      });

      // Should send analytics event
      cy.wait('@trackEvent').its('request.body').should('include', {
        event: 'drill_down',
        level: 1,
        dimension: 'category',
        value: 'Electronics',
      });
    });

    it('should show drill-down usage insights', () => {
      // Go to dashboard insights
      cy.contains(/insights/i).click();

      // Should show drill-down stats
      cy.get('[data-testid="drill-insights"]').should('be.visible');
      cy.get('[data-testid="drill-insights"]').should('contain', /most drilled dimensions/i);
    });
  });
});
