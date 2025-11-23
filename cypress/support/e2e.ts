/**
 * Cypress Support File
 *
 * Custom commands and global configuration for E2E tests
 */

// Import Cypress commands
import './commands';

// Global before hook
before(() => {
  // Seed test data
  cy.task('log', 'Starting E2E test suite');
});

// Global after hook
after(() => {
  cy.task('log', 'E2E test suite completed');
});

// Before each test
beforeEach(() => {
  // Clear cookies and local storage
  cy.clearCookies();
  cy.clearLocalStorage();

  // Set viewport
  cy.viewport(1280, 720);

  // Intercept common API calls
  cy.intercept('GET', '**/api/health').as('health');
});

// After each test
afterEach(function () {
  // Take screenshot on failure
  if (this.currentTest?.state === 'failed') {
    cy.screenshot(`${this.currentTest.parent?.title}--${this.currentTest.title}`, {
      capture: 'fullPage',
    });
  }
});

// Suppress uncaught exceptions in development
Cypress.on('uncaught:exception', (err) => {
  // Return false to prevent the test from failing
  // Only in specific cases
  if (err.message.includes('ResizeObserver')) {
    return false;
  }

  if (err.message.includes('Loading chunk')) {
    return false;
  }

  // Let other errors fail the test
  return true;
});

// Global configuration
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login
       * @example cy.login('user@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Custom command to login with test user
       * @example cy.loginAsTestUser()
       */
      loginAsTestUser(): Chainable<void>;

      /**
       * Custom command to create a test dashboard
       * @example cy.createDashboard('My Dashboard')
       */
      createDashboard(name: string): Chainable<string>;

      /**
       * Custom command to create a test report
       * @example cy.createReport('My Report')
       */
      createReport(name: string): Chainable<string>;

      /**
       * Custom command to wait for API response
       * @example cy.waitForApi('@apiCall')
       */
      waitForApi(alias: string, timeout?: number): Chainable<void>;

      /**
       * Custom command to seed test data
       * @example cy.seedData('dashboards')
       */
      seedData(dataType: string): Chainable<void>;

      /**
       * Custom command to clean up test data
       * @example cy.cleanupData()
       */
      cleanupData(): Chainable<void>;

      /**
       * Custom command to drag and drop
       * @example cy.get('.source').dragTo('.target')
       */
      dragTo(targetSelector: string): Chainable<void>;

      /**
       * Custom command to check accessibility
       * @example cy.checkA11y()
       */
      checkA11y(): Chainable<void>;

      /**
       * Custom command to mock GraphQL query
       * @example cy.mockGraphQL('GetDashboards', { dashboards: [] })
       */
      mockGraphQL(operationName: string, data: any): Chainable<void>;

      /**
       * Custom command to set feature flag
       * @example cy.setFeatureFlag('newFeature', true)
       */
      setFeatureFlag(flag: string, enabled: boolean): Chainable<void>;
    }
  }
}

// Export for TypeScript
export {};
