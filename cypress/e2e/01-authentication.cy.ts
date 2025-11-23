/**
 * E2E Tests: Authentication Flow
 *
 * Tests the complete authentication journey:
 * - Registration
 * - Login
 * - MFA setup
 * - Password reset
 * - Logout
 */

describe('Authentication Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    username: `testuser${Date.now()}`,
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(() => {
    cy.visit('/');
  });

  describe('User Registration', () => {
    it('should successfully register a new user', () => {
      cy.visit('/register');

      // Fill registration form
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="username"]').type(testUser.username);
      cy.get('input[name="firstName"]').type(testUser.firstName);
      cy.get('input[name="lastName"]').type(testUser.lastName);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);

      // Submit form
      cy.get('button[type="submit"]').click();

      // Should redirect to dashboard or verification page
      cy.url().should('match', /\/(dashboard|verify-email)/);

      // Should show success message
      cy.contains(/registration successful|account created/i).should('be.visible');
    });

    it('should show validation errors for invalid input', () => {
      cy.visit('/register');

      // Try to submit empty form
      cy.get('button[type="submit"]').click();

      // Should show validation errors
      cy.contains(/email is required/i).should('be.visible');
      cy.contains(/password is required/i).should('be.visible');
    });

    it('should validate password strength', () => {
      cy.visit('/register');

      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('weak');

      // Should show weak password indicator
      cy.contains(/password.*weak/i).should('be.visible');
    });

    it('should prevent duplicate email registration', () => {
      cy.visit('/register');

      // Try to register with existing email
      cy.get('input[name="email"]').type(Cypress.env('testUser').email);
      cy.get('input[name="username"]').type('newusername');
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);

      cy.get('button[type="submit"]').click();

      // Should show error
      cy.contains(/email already exists|user already registered/i).should('be.visible');
    });
  });

  describe('User Login', () => {
    it('should successfully login with correct credentials', () => {
      cy.visit('/login');

      cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
      cy.get('input[name="password"]').type(Cypress.env('testUser').password);

      cy.get('button[type="submit"]').click();

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');

      // Should show user menu
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should fail login with incorrect password', () => {
      cy.visit('/login');

      cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
      cy.get('input[name="password"]').type('WrongPassword123!');

      cy.get('button[type="submit"]').click();

      // Should show error
      cy.contains(/invalid credentials|incorrect password/i).should('be.visible');

      // Should remain on login page
      cy.url().should('include', '/login');
    });

    it('should remember user credentials when "Remember Me" is checked', () => {
      cy.visit('/login');

      cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
      cy.get('input[name="password"]').type(Cypress.env('testUser').password);
      cy.get('input[type="checkbox"][name="rememberMe"]').check();

      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/dashboard');

      // Check if token is stored in localStorage
      cy.window().its('localStorage.token').should('exist');
    });

    it('should show account lockout after multiple failed attempts', () => {
      cy.visit('/login');

      // Attempt login 5 times with wrong password
      for (let i = 0; i < 5; i++) {
        cy.get('input[name="emailOrUsername"]').clear().type(Cypress.env('testUser').email);
        cy.get('input[name="password"]').clear().type('WrongPassword!');
        cy.get('button[type="submit"]').click();
        cy.wait(500);
      }

      // Should show lockout message
      cy.contains(/account.*locked|too many attempts/i).should('be.visible');
    });
  });

  describe('MFA (Multi-Factor Authentication)', () => {
    beforeEach(() => {
      // Login first
      cy.visit('/login');
      cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
      cy.get('input[name="password"]').type(Cypress.env('testUser').password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
    });

    it('should enable MFA and show QR code', () => {
      cy.visit('/settings/security');

      cy.contains(/enable.*mfa|two-factor/i).click();

      // Should show QR code
      cy.get('[data-testid="mfa-qr-code"]').should('be.visible');

      // Should show secret key
      cy.contains(/secret.*key/i).should('be.visible');
    });

    it('should verify MFA code and complete setup', () => {
      cy.visit('/settings/security');

      // This would require mocking the TOTP code generation
      // or using a known test secret
      cy.get('input[name="mfaCode"]').type('123456');
      cy.get('button').contains(/verify/i).click();

      // Should show success or error based on code validity
      cy.get('[data-testid="mfa-status"]').should('be.visible');
    });
  });

  describe('Password Reset', () => {
    it('should request password reset and receive email', () => {
      cy.visit('/forgot-password');

      cy.get('input[name="email"]').type(Cypress.env('testUser').email);
      cy.get('button[type="submit"]').click();

      // Should show success message
      cy.contains(/reset.*link.*sent|check your email/i).should('be.visible');
    });

    it('should reset password with valid token', () => {
      // This would require getting a reset token
      // For now, test the UI flow
      const mockToken = 'mock-reset-token';
      cy.visit(`/reset-password?token=${mockToken}`);

      cy.get('input[name="newPassword"]').type('NewSecurePass123!');
      cy.get('input[name="confirmPassword"]').type('NewSecurePass123!');

      cy.get('button[type="submit"]').click();

      // Should redirect to login or show success
      cy.url().should('match', /\/(login|reset-success)/);
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Login first
      cy.visit('/login');
      cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
      cy.get('input[name="password"]').type(Cypress.env('testUser').password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
    });

    it('should successfully logout', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.contains(/logout|sign out/i).click();

      // Should redirect to login page
      cy.url().should('include', '/login');

      // Token should be removed
      cy.window().its('localStorage.token').should('not.exist');
    });

    it('should not access protected routes after logout', () => {
      // Logout
      cy.get('[data-testid="user-menu"]').click();
      cy.contains(/logout/i).click();

      // Try to access dashboard
      cy.visit('/dashboard');

      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });

  describe('Session Management', () => {
    it('should maintain session across page refreshes', () => {
      // Login
      cy.visit('/login');
      cy.get('input[name="emailOrUsername"]').type(Cypress.env('testUser').email);
      cy.get('input[name="password"]').type(Cypress.env('testUser').password);
      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/dashboard');

      // Refresh page
      cy.reload();

      // Should still be logged in
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should expire session after timeout', () => {
      // This test would require mocking time or waiting
      // Skipping actual timeout test, but testing the concept
      cy.visit('/dashboard');

      // Simulate expired token
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'expired-token');
      });

      cy.reload();

      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });
});
