/**
 * Cypress Custom Commands
 *
 * Reusable commands for E2E tests
 */

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="emailOrUsername"]').clear().type(email);
  cy.get('input[name="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/dashboard');
  cy.get('[data-testid="user-menu"]').should('be.visible');
});

// Login as test user
Cypress.Commands.add('loginAsTestUser', () => {
  const testUser = Cypress.env('testUser');
  cy.login(testUser.email, testUser.password);
});

// Create dashboard
Cypress.Commands.add('createDashboard', (name: string) => {
  cy.visit('/dashboards/new');
  cy.get('[data-testid="dashboard-name-input"]').clear().type(name);

  // Add a simple visualization
  cy.get('[data-testid="viz-library"]').contains(/charts/i).click();
  cy.get('[data-viz-type="line-chart"]').click();
  cy.get('[data-testid="dashboard-grid"]').click(200, 200);

  // Save
  cy.contains(/save/i).click();
  cy.wait(1000);

  // Extract ID from URL
  cy.url().then((url) => {
    const match = url.match(/\/dashboards\/([a-z0-9-]+)$/);
    const dashboardId = match ? match[1] : '';
    cy.wrap(dashboardId).as('dashboardId');
    return cy.wrap(dashboardId);
  });
});

// Create report
Cypress.Commands.add('createReport', (name: string) => {
  cy.visit('/reports/new');
  cy.get('[data-testid="report-name-input"]').clear().type(name);

  // Add a simple element
  cy.get('[data-testid="element-chart"]').click();
  cy.get('[data-testid="report-canvas"]').click(200, 200);

  // Save
  cy.contains(/save/i).click();
  cy.wait(1000);

  // Extract ID from URL
  cy.url().then((url) => {
    const match = url.match(/\/reports\/([a-z0-9-]+)$/);
    const reportId = match ? match[1] : '';
    cy.wrap(reportId).as('reportId');
    return cy.wrap(reportId);
  });
});

// Wait for API with custom timeout
Cypress.Commands.add('waitForApi', (alias: string, timeout: number = 10000) => {
  cy.wait(alias, { timeout });
});

// Seed test data
Cypress.Commands.add('seedData', (dataType: string) => {
  cy.request('POST', `${Cypress.env('apiUrl')}/api/test/seed`, {
    dataType,
  }).then((response) => {
    expect(response.status).to.eq(200);
  });
});

// Clean up test data
Cypress.Commands.add('cleanupData', () => {
  cy.request('POST', `${Cypress.env('apiUrl')}/api/test/cleanup`).then((response) => {
    expect(response.status).to.eq(200);
  });
});

// Drag and drop command
Cypress.Commands.add('dragTo', { prevSubject: 'element' }, (subject, targetSelector) => {
  cy.wrap(subject).trigger('dragstart', { dataTransfer: new DataTransfer() });
  cy.get(targetSelector).trigger('drop', { dataTransfer: new DataTransfer() });
  cy.wrap(subject).trigger('dragend');
});

// Accessibility check (requires cypress-axe)
Cypress.Commands.add('checkA11y', () => {
  // This would require installing cypress-axe
  // cy.injectAxe();
  // cy.checkA11y();

  // Basic accessibility checks without cypress-axe
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt');
  });

  cy.get('button').each(($btn) => {
    cy.wrap($btn).should('satisfy', ($el) => {
      return $el.text().trim() !== '' || $el.attr('aria-label') !== undefined;
    });
  });

  cy.get('input').each(($input) => {
    const type = $input.attr('type');
    if (type !== 'hidden' && type !== 'submit') {
      cy.wrap($input).should('satisfy', ($el) => {
        return (
          $el.attr('aria-label') !== undefined ||
          $el.attr('aria-labelledby') !== undefined ||
          $el.closest('label').length > 0 ||
          $el.siblings('label').length > 0
        );
      });
    }
  });
});

// Mock GraphQL query
Cypress.Commands.add('mockGraphQL', (operationName: string, data: any) => {
  cy.intercept('POST', '**/graphql', (req) => {
    if (req.body.operationName === operationName) {
      req.reply({
        statusCode: 200,
        body: {
          data,
        },
      });
    }
  }).as(`gql${operationName}`);
});

// Set feature flag
Cypress.Commands.add('setFeatureFlag', (flag: string, enabled: boolean) => {
  cy.window().then((win) => {
    win.localStorage.setItem(`featureFlag:${flag}`, JSON.stringify(enabled));
  });
});

// Additional utility commands

/**
 * Wait for element to be stable (not moving/changing)
 */
Cypress.Commands.add('waitForStable', { prevSubject: 'element' }, (subject) => {
  let previousPosition: { left: number; top: number } | null = null;

  return cy.wrap(subject).should(($el) => {
    const rect = $el[0].getBoundingClientRect();
    const currentPosition = { left: rect.left, top: rect.top };

    if (previousPosition) {
      expect(currentPosition).to.deep.equal(previousPosition);
    }

    previousPosition = currentPosition;
  });
});

/**
 * Type with realistic delay
 */
Cypress.Commands.add('typeRealistic', { prevSubject: 'element' }, (subject, text: string) => {
  cy.wrap(subject).type(text, { delay: 50 });
});

/**
 * Select file for upload
 */
Cypress.Commands.add('selectFile', { prevSubject: 'element' }, (subject, filePath: string) => {
  cy.wrap(subject).attachFile(filePath);
});

/**
 * Wait for loading to complete
 */
Cypress.Commands.add('waitForLoading', () => {
  cy.get('[data-testid="loading"]', { timeout: 10000 }).should('not.exist');
  cy.get('[data-loading="true"]', { timeout: 10000 }).should('not.exist');
  cy.get('.loading', { timeout: 10000 }).should('not.exist');
});

/**
 * Assert toast/notification message
 */
Cypress.Commands.add('assertToast', (message: string | RegExp) => {
  cy.get('[data-testid="toast"], [role="alert"], .notification', { timeout: 5000 })
    .should('be.visible')
    .and('contain', message);
});

/**
 * Dismiss all toasts
 */
Cypress.Commands.add('dismissToasts', () => {
  cy.get('[data-testid="toast-close"], .toast-close').each(($btn) => {
    cy.wrap($btn).click({ force: true });
  });
});

/**
 * Set date picker value
 */
Cypress.Commands.add('setDatePicker', { prevSubject: 'element' }, (subject, date: string) => {
  // This depends on your date picker implementation
  cy.wrap(subject).click();
  cy.get('[data-testid="date-picker"]').within(() => {
    cy.contains(date).click();
  });
});

/**
 * Mock API response
 */
Cypress.Commands.add('mockApi', (method: string, url: string, response: any, statusCode = 200) => {
  cy.intercept(method, url, {
    statusCode,
    body: response,
  }).as(`api${method}${url.replace(/\//g, '_')}`);
});

/**
 * Wait for network idle
 */
Cypress.Commands.add('waitForNetworkIdle', (timeout = 5000) => {
  let requestCount = 0;

  cy.intercept('**', () => {
    requestCount++;
  });

  cy.window().then({ timeout }, () => {
    return new Cypress.Promise((resolve) => {
      const checkIdle = () => {
        if (requestCount === 0) {
          resolve();
        } else {
          requestCount = 0;
          setTimeout(checkIdle, 500);
        }
      };
      setTimeout(checkIdle, 500);
    });
  });
});

/**
 * Get element by data-testid
 */
Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

/**
 * Find element by data-testid within subject
 */
Cypress.Commands.add('findByTestId', { prevSubject: 'element' }, (subject, testId: string) => {
  return cy.wrap(subject).find(`[data-testid="${testId}"]`);
});

// TypeScript declarations for additional commands
declare global {
  namespace Cypress {
    interface Chainable {
      waitForStable(): Chainable<void>;
      typeRealistic(text: string): Chainable<void>;
      selectFile(filePath: string): Chainable<void>;
      waitForLoading(): Chainable<void>;
      assertToast(message: string | RegExp): Chainable<void>;
      dismissToasts(): Chainable<void>;
      setDatePicker(date: string): Chainable<void>;
      mockApi(method: string, url: string, response: any, statusCode?: number): Chainable<void>;
      waitForNetworkIdle(timeout?: number): Chainable<void>;
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      findByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};
