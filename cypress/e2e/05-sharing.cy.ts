/**
 * E2E Tests: Sharing Workflows
 *
 * Tests sharing functionality across the platform:
 * - Share dashboards and reports
 * - Set permissions
 * - Public links
 * - Team sharing
 * - Access control
 */

describe('Sharing Workflows', () => {
  beforeEach(() => {
    // Login as owner
    cy.visit('/login');
    cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
    cy.get('input[name="password"]').type(Cypress.env('testUser').password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  describe('Dashboard Sharing', () => {
    beforeEach(() => {
      // Create a test dashboard
      cy.visit('/dashboards/new');
      cy.get('[data-testid="dashboard-name-input"]').clear().type('Shareable Dashboard');
      cy.get('[data-testid="viz-library"]').contains(/charts/i).click();
      cy.get('[data-viz-type="line-chart"]').click();
      cy.get('[data-testid="dashboard-grid"]').click(200, 200);
      cy.contains(/save/i).click();
      cy.wait(1000);
    });

    it('should open sharing dialog', () => {
      cy.contains(/share/i).click();

      cy.get('[data-testid="share-dialog"]').should('be.visible');
      cy.get('[data-testid="share-dialog"]').should('contain', 'Shareable Dashboard');
    });

    it('should share with specific user - view permission', () => {
      cy.contains(/share/i).click();

      // Search for user
      cy.get('input[placeholder*="Search"]').type('viewer@example.com');
      cy.get('[data-testid="user-result"]').contains('viewer@example.com').click();

      // Set permission to view
      cy.get('select[name="permission"]').select('Can View');

      cy.contains(/add/i).click();

      // Should show success message
      cy.contains(/shared successfully/i).should('be.visible');

      // User should appear in share list
      cy.get('[data-testid="share-list"]')
        .should('contain', 'viewer@example.com')
        .and('contain', 'Can View');
    });

    it('should share with specific user - edit permission', () => {
      cy.contains(/share/i).click();

      cy.get('input[placeholder*="Search"]').type('editor@example.com');
      cy.get('[data-testid="user-result"]').first().click();

      cy.get('select[name="permission"]').select('Can Edit');

      cy.contains(/add/i).click();

      cy.get('[data-testid="share-list"]')
        .should('contain', 'editor@example.com')
        .and('contain', 'Can Edit');
    });

    it('should share with specific user - admin permission', () => {
      cy.contains(/share/i).click();

      cy.get('input[placeholder*="Search"]').type('admin@example.com');
      cy.get('[data-testid="user-result"]').first().click();

      cy.get('select[name="permission"]').select('Admin');

      cy.contains(/add/i).click();

      cy.get('[data-testid="share-list"]')
        .should('contain', 'admin@example.com')
        .and('contain', 'Admin');
    });

    it('should change user permission', () => {
      cy.contains(/share/i).click();

      // Assuming user is already shared
      cy.get('[data-testid="share-list"]').within(() => {
        cy.contains('viewer@example.com').parent().within(() => {
          cy.get('select[name="permission"]').select('Can Edit');
        });
      });

      cy.contains(/update/i).click();

      // Permission should be updated
      cy.get('[data-testid="share-list"]')
        .should('contain', 'viewer@example.com')
        .and('contain', 'Can Edit');
    });

    it('should remove user access', () => {
      cy.contains(/share/i).click();

      cy.get('[data-testid="share-list"]').within(() => {
        cy.contains('viewer@example.com').parent().within(() => {
          cy.get('button[title="Remove"]').click();
        });
      });

      // Confirm removal
      cy.contains(/confirm/i).click();

      // User should be removed
      cy.get('[data-testid="share-list"]').should('not.contain', 'viewer@example.com');
    });
  });

  describe('Team Sharing', () => {
    beforeEach(() => {
      cy.visit('/dashboards/test-dashboard-id');
    });

    it('should share with entire team', () => {
      cy.contains(/share/i).click();

      // Switch to Teams tab
      cy.contains(/teams/i).click();

      // Select team
      cy.get('input[placeholder*="Search teams"]').type('Engineering');
      cy.get('[data-testid="team-result"]').contains('Engineering').click();

      cy.get('select[name="permission"]').select('Can View');

      cy.contains(/add/i).click();

      // Team should appear in share list
      cy.get('[data-testid="share-list"]')
        .should('contain', 'Engineering')
        .and('contain', 'Team');
    });

    it('should share with multiple teams', () => {
      cy.contains(/share/i).click();

      cy.contains(/teams/i).click();

      // Add first team
      cy.get('input[placeholder*="Search teams"]').type('Engineering');
      cy.get('[data-testid="team-result"]').first().click();
      cy.get('select[name="permission"]').select('Can Edit');
      cy.contains(/add/i).click();

      cy.wait(500);

      // Add second team
      cy.get('input[placeholder*="Search teams"]').clear().type('Sales');
      cy.get('[data-testid="team-result"]').first().click();
      cy.get('select[name="permission"]').select('Can View');
      cy.contains(/add/i).click();

      // Both teams should appear
      cy.get('[data-testid="share-list"]').should('contain', 'Engineering').and('contain', 'Sales');
    });

    it('should show team members when expanding team share', () => {
      cy.contains(/share/i).click();

      cy.get('[data-testid="share-list"]').within(() => {
        cy.contains('Engineering').click();
      });

      // Should show team members
      cy.get('[data-testid="team-members"]').should('be.visible');
      cy.get('[data-testid="team-member"]').should('have.length.gte', 1);
    });
  });

  describe('Public Link Sharing', () => {
    beforeEach(() => {
      cy.visit('/dashboards/test-dashboard-id');
    });

    it('should generate public link', () => {
      cy.contains(/share/i).click();

      // Switch to Public Link tab
      cy.contains(/public link/i).click();

      cy.contains(/generate.*link/i).click();

      // Should show link
      cy.get('input[readonly][name="publicLink"]').should('have.value').and('include', 'http');

      // Should show copy button
      cy.contains(/copy/i).should('be.visible');
    });

    it('should copy public link to clipboard', () => {
      cy.contains(/share/i).click();

      cy.contains(/public link/i).click();

      cy.contains(/generate.*link/i).click();

      cy.contains(/copy/i).click();

      // Should show copied confirmation
      cy.contains(/copied/i).should('be.visible');
    });

    it('should set link expiration', () => {
      cy.contains(/share/i).click();

      cy.contains(/public link/i).click();

      cy.contains(/generate.*link/i).click();

      // Set expiration
      cy.get('select[name="expiration"]').select('7 days');

      cy.contains(/update/i).click();

      // Should show expiration date
      cy.get('[data-testid="link-expiration"]').should('contain', /expires/i);
    });

    it('should set link password', () => {
      cy.contains(/share/i).click();

      cy.contains(/public link/i).click();

      cy.contains(/generate.*link/i).click();

      // Enable password protection
      cy.get('input[type="checkbox"][name="requirePassword"]').check();

      cy.get('input[name="linkPassword"]').type('SecurePass123!');

      cy.contains(/update/i).click();

      // Should show password protection indicator
      cy.get('[data-testid="link-settings"]').should('contain', /password protected/i);
    });

    it('should set link access level', () => {
      cy.contains(/share/i).click();

      cy.contains(/public link/i).click();

      cy.contains(/generate.*link/i).click();

      // Set access level
      cy.get('select[name="accessLevel"]').select('View Only');

      cy.contains(/update/i).click();

      cy.get('[data-testid="link-settings"]').should('contain', 'View Only');
    });

    it('should revoke public link', () => {
      cy.contains(/share/i).click();

      cy.contains(/public link/i).click();

      cy.contains(/revoke.*link/i).click();

      // Confirm revocation
      cy.contains(/confirm/i).click();

      // Link should be removed
      cy.get('input[name="publicLink"]').should('not.exist');

      // Should show generate button again
      cy.contains(/generate.*link/i).should('be.visible');
    });

    it('should track link usage', () => {
      cy.contains(/share/i).click();

      cy.contains(/public link/i).click();

      // Should show link stats
      cy.get('[data-testid="link-stats"]').should('be.visible');
      cy.get('[data-testid="link-views"]').should('contain', /views/i);
    });
  });

  describe('Viewing Shared Content', () => {
    it('should access shared dashboard with view permission', () => {
      // Logout and login as viewer
      cy.get('[data-testid="user-menu"]').click();
      cy.contains(/logout/i).click();

      cy.visit('/login');
      cy.get('input[name="emailOrUsername"]').type('viewer@example.com');
      cy.get('input[name="password"]').type('ViewerPass123!');
      cy.get('button[type="submit"]').click();

      // Navigate to shared dashboards
      cy.visit('/dashboards/shared');

      // Should see shared dashboard
      cy.get('[data-testid="dashboard-card"]').contains('Shareable Dashboard').should('be.visible');

      // Click to view
      cy.get('[data-testid="dashboard-card"]').contains('Shareable Dashboard').click();

      // Should view dashboard
      cy.get('[data-testid="dashboard-grid"]').should('be.visible');

      // Edit button should not exist
      cy.get('button').contains(/edit/i).should('not.exist');
    });

    it('should edit shared dashboard with edit permission', () => {
      // Login as editor
      cy.visit('/login');
      cy.get('input[name="emailOrUsername"]').type('editor@example.com');
      cy.get('input[name="password"]').type('EditorPass123!');
      cy.get('button[type="submit"]').click();

      cy.visit('/dashboards/shared');

      cy.get('[data-testid="dashboard-card"]').contains('Shareable Dashboard').click();

      // Edit button should exist
      cy.contains(/edit/i).should('be.visible').click();

      // Should be able to edit
      cy.get('[data-testid="dashboard-name-input"]')
        .clear()
        .type('Modified by Editor');

      cy.contains(/save/i).click();

      // Should save successfully
      cy.contains(/saved/i).should('be.visible');
    });

    it('should not access dashboard without permission', () => {
      // Login as user without access
      cy.visit('/login');
      cy.get('input[name="emailOrUsername"]').type('noaccess@example.com');
      cy.get('input[name="password"]').type('NoAccessPass123!');
      cy.get('button[type="submit"]').click();

      // Try to access dashboard directly
      cy.visit('/dashboards/test-dashboard-id');

      // Should show access denied
      cy.contains(/access denied|no permission/i).should('be.visible');

      // Should redirect
      cy.url().should('not.include', 'test-dashboard-id');
    });
  });

  describe('Public Link Access', () => {
    it('should access dashboard via public link without login', () => {
      // Logout first
      cy.visit('/logout');

      // Access via public link
      cy.visit('/public/dashboard/abc123def456');

      // Should show dashboard
      cy.get('[data-testid="dashboard-grid"]').should('be.visible');

      // Should show public access banner
      cy.get('[data-testid="public-access-banner"]').should('be.visible');

      // Should not show edit controls
      cy.get('button').contains(/edit/i).should('not.exist');
    });

    it('should prompt for password on protected link', () => {
      cy.visit('/logout');

      cy.visit('/public/dashboard/protected-link-id');

      // Should show password prompt
      cy.get('[data-testid="link-password-prompt"]').should('be.visible');

      cy.get('input[name="linkPassword"]').type('WrongPassword');
      cy.get('button[type="submit"]').click();

      // Should show error
      cy.contains(/incorrect password/i).should('be.visible');

      // Enter correct password
      cy.get('input[name="linkPassword"]').clear().type('SecurePass123!');
      cy.get('button[type="submit"]').click();

      // Should access dashboard
      cy.get('[data-testid="dashboard-grid"]').should('be.visible');
    });

    it('should show expired link message', () => {
      cy.visit('/logout');

      cy.visit('/public/dashboard/expired-link-id');

      // Should show expired message
      cy.contains(/link.*expired|no longer available/i).should('be.visible');

      // Should not show dashboard
      cy.get('[data-testid="dashboard-grid"]').should('not.exist');
    });
  });

  describe('Report Sharing', () => {
    beforeEach(() => {
      // Create a test report
      cy.visit('/reports/new');
      cy.get('[data-testid="report-name-input"]').clear().type('Shareable Report');
      cy.get('[data-testid="element-chart"]').click();
      cy.get('[data-testid="report-canvas"]').click(200, 200);
      cy.contains(/save/i).click();
      cy.wait(1000);
    });

    it('should share report with user', () => {
      cy.contains(/share/i).click();

      cy.get('input[placeholder*="Search"]').type('viewer@example.com');
      cy.get('[data-testid="user-result"]').first().click();

      cy.get('select[name="permission"]').select('Can View');

      cy.contains(/add/i).click();

      cy.get('[data-testid="share-list"]').should('contain', 'viewer@example.com');
    });

    it('should generate public link for report', () => {
      cy.contains(/share/i).click();

      cy.contains(/public link/i).click();

      cy.contains(/generate.*link/i).click();

      cy.get('input[readonly][name="publicLink"]').should('have.value').and('include', '/public/report/');
    });

    it('should send report via email', () => {
      cy.contains(/share/i).click();

      // Switch to Email tab
      cy.contains(/email/i).click();

      cy.get('input[name="recipients"]').type('recipient@example.com');

      cy.get('textarea[name="message"]').type('Please review this report');

      cy.get('select[name="format"]').select('PDF');

      cy.contains(/send/i).click();

      // Should show success
      cy.contains(/email sent/i).should('be.visible');
    });
  });

  describe('Share Notifications', () => {
    it('should notify user when dashboard is shared with them', () => {
      // Share dashboard
      cy.visit('/dashboards/test-dashboard-id');
      cy.contains(/share/i).click();

      cy.get('input[placeholder*="Search"]').type('viewer@example.com');
      cy.get('[data-testid="user-result"]').first().click();
      cy.get('select[name="permission"]').select('Can View');
      cy.contains(/add/i).click();

      // Logout and login as viewer
      cy.get('[data-testid="user-menu"]').click();
      cy.contains(/logout/i).click();

      cy.visit('/login');
      cy.get('input[name="emailOrUsername"]').type('viewer@example.com');
      cy.get('input[name="password"]').type('ViewerPass123!');
      cy.get('button[type="submit"]').click();

      // Check notifications
      cy.get('[data-testid="notifications"]').click();

      // Should see share notification
      cy.get('[data-testid="notification-item"]')
        .should('contain', 'shared')
        .and('contain', 'Shareable Dashboard');
    });

    it('should send email notification when content is shared', () => {
      // This would require email testing integration
      // For now, test that notification preference exists
      cy.visit('/settings/notifications');

      cy.get('input[type="checkbox"][name="emailOnShare"]').should('exist');
    });
  });

  describe('Share Management', () => {
    beforeEach(() => {
      cy.visit('/dashboards/test-dashboard-id');
    });

    it('should view all shares for a dashboard', () => {
      cy.contains(/share/i).click();

      // Should show all current shares
      cy.get('[data-testid="share-list"]').within(() => {
        cy.get('[data-testid="share-item"]').should('have.length.gte', 1);
      });
    });

    it('should filter shares by permission level', () => {
      cy.contains(/share/i).click();

      cy.get('select[name="filterPermission"]').select('Can View');

      // Should show only view-only shares
      cy.get('[data-testid="share-item"]').each(($item) => {
        cy.wrap($item).should('contain', 'Can View');
      });
    });

    it('should search shares', () => {
      cy.contains(/share/i).click();

      cy.get('input[placeholder*="Search shares"]').type('viewer');

      // Should show matching shares
      cy.get('[data-testid="share-item"]').should('contain', 'viewer');
    });

    it('should bulk update permissions', () => {
      cy.contains(/share/i).click();

      // Select multiple shares
      cy.get('input[type="checkbox"][name="selectShare"]').first().check();
      cy.get('input[type="checkbox"][name="selectShare"]').eq(1).check();

      // Bulk update
      cy.contains(/bulk actions/i).click();
      cy.contains(/change permission/i).click();

      cy.get('select[name="bulkPermission"]').select('Can Edit');

      cy.contains(/apply/i).click();

      // Permissions should be updated
      cy.get('[data-testid="share-item"]').first().should('contain', 'Can Edit');
    });

    it('should bulk remove shares', () => {
      cy.contains(/share/i).click();

      cy.get('input[type="checkbox"][name="selectShare"]').first().check();

      cy.contains(/bulk actions/i).click();
      cy.contains(/remove/i).click();

      cy.contains(/confirm/i).click();

      // Shares should be removed
      cy.get('[data-testid="share-item"]').should('have.length.lt', 2);
    });
  });

  describe('Share Permissions Inheritance', () => {
    it('should inherit folder permissions to dashboards', () => {
      // Create folder and set permissions
      cy.visit('/dashboards');

      cy.contains(/new folder/i).click();
      cy.get('input[name="folderName"]').type('Shared Folder');
      cy.contains(/create/i).click();

      // Share folder
      cy.get('[data-testid="dashboard-folder"]').contains('Shared Folder').rightclick();
      cy.contains(/share/i).click();

      cy.get('input[placeholder*="Search"]').type('viewer@example.com');
      cy.get('[data-testid="user-result"]').first().click();
      cy.get('select[name="permission"]').select('Can View');
      cy.get('input[type="checkbox"][name="inheritToChildren"]').check();
      cy.contains(/add/i).click();

      // Create dashboard in folder
      cy.get('[data-testid="dashboard-folder"]').contains('Shared Folder').click();
      cy.contains(/create.*dashboard/i).click();

      cy.get('[data-testid="dashboard-name-input"]').clear().type('Inherited Dashboard');
      cy.contains(/save/i).click();

      // Dashboard should inherit permissions
      cy.contains(/share/i).click();

      cy.get('[data-testid="share-list"]')
        .should('contain', 'viewer@example.com')
        .and('contain', 'Inherited');
    });
  });

  describe('Share Analytics', () => {
    it('should track share activity', () => {
      cy.visit('/dashboards/test-dashboard-id');

      cy.contains(/insights/i).click();

      // Should show share analytics
      cy.get('[data-testid="share-analytics"]').should('be.visible');
      cy.get('[data-testid="share-analytics"]').should('contain', /total shares|shared with/i);
    });

    it('should show most shared content', () => {
      cy.visit('/analytics');

      // Should show content share leaderboard
      cy.get('[data-testid="share-leaderboard"]').should('be.visible');
      cy.get('[data-testid="share-leaderboard"]').should('contain', /most shared/i);
    });
  });
});
