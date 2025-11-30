/**
 * Global teardown for Jest tests
 * This runs once after all test suites complete
 */

export default async function globalTeardown() {
  console.log('\n🧹 Running global test teardown...');

  // Force exit if there are any hanging connections
  // The actual cleanup should happen in afterAll hooks

  // Give a small delay for any remaining async operations
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('✅ Test teardown complete\n');
}
