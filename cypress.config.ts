import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    downloadsFolder: 'cypress/downloads',

    // Viewport
    viewportWidth: 1280,
    viewportHeight: 720,

    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,

    // Retries
    retries: {
      runMode: 2,
      openMode: 0,
    },

    // Video and screenshots
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,

    // Browser
    chromeWebSecurity: false,

    env: {
      apiUrl: 'http://localhost:3001',
      testUser: {
        email: 'test@example.com',
        password: 'TestPassword123!',
        username: 'testuser',
      },
    },

    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });

      return config;
    },
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'frontend/src/**/*.cy.{js,jsx,ts,tsx}',
  },
});
