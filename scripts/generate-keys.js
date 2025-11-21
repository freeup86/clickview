#!/usr/bin/env node

/**
 * ClickView Enterprise - Secure Key Generator
 *
 * Generates cryptographically secure random keys for:
 * - ENCRYPTION_KEY (AES-256 encryption)
 * - JWT_SECRET (JWT token signing)
 * - CLICKUP_WEBHOOK_SECRET (webhook validation)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('\n🔐 ClickView Enterprise - Secure Key Generator\n');
console.log('='.repeat(60));

// Generate keys
const encryptionKey = crypto.randomBytes(32).toString('hex');
const jwtSecret = crypto.randomBytes(64).toString('hex');
const webhookSecret = crypto.randomBytes(32).toString('hex');

console.log('\n✅ Generated Secure Keys:\n');
console.log('ENCRYPTION_KEY (64 hex chars):');
console.log(`  ${encryptionKey}\n`);
console.log('JWT_SECRET (128 hex chars):');
console.log(`  ${jwtSecret}\n`);
console.log('CLICKUP_WEBHOOK_SECRET (64 hex chars):');
console.log(`  ${webhookSecret}\n`);

console.log('='.repeat(60));

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (fs.existsSync(envPath)) {
  console.log('\n⚠️  .env file already exists.');
  console.log('   To use these keys, manually update your .env file or:');
  console.log('   1. Backup your current .env file');
  console.log('   2. Delete it');
  console.log('   3. Run this script again\n');
} else {
  // Create .env from .env.example
  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf-8');

    // Replace placeholder values
    envContent = envContent.replace(
      'ENCRYPTION_KEY=REPLACE_WITH_64_CHAR_HEX_STRING',
      `ENCRYPTION_KEY=${encryptionKey}`
    );
    envContent = envContent.replace(
      'JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING',
      `JWT_SECRET=${jwtSecret}`
    );
    envContent = envContent.replace(
      'CLICKUP_WEBHOOK_SECRET=your-webhook-secret',
      `CLICKUP_WEBHOOK_SECRET=${webhookSecret}`
    );

    fs.writeFileSync(envPath, envContent);

    console.log('\n✅ Created .env file with secure keys!');
    console.log('   Location: .env\n');
    console.log('⚠️  IMPORTANT: Update the following in your .env file:');
    console.log('   - DATABASE_URL');
    console.log('   - REDIS_URL (if using Redis)');
    console.log('   - FRONTEND_URL (for production)\n');
  } else {
    console.log('\n⚠️  .env.example not found. Creating .env manually...\n');

    const envTemplate = `# ClickView Enterprise - Environment Configuration
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://admin:password@localhost:5432/clickview_enterprise

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Security Keys
ENCRYPTION_KEY=${encryptionKey}
JWT_SECRET=${jwtSecret}
CLICKUP_WEBHOOK_SECRET=${webhookSecret}

# Frontend
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_DIR=logs
`;

    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ Created .env file with secure keys!');
    console.log('   Update DATABASE_URL and other settings as needed.\n');
  }
}

console.log('='.repeat(60));
console.log('\n📖 Security Best Practices:\n');
console.log('   1. Never commit .env to version control');
console.log('   2. Use different keys for dev/staging/production');
console.log('   3. Rotate keys periodically (quarterly recommended)');
console.log('   4. Store production keys in a secure vault (AWS Secrets Manager, etc.)');
console.log('   5. Limit access to production keys to essential personnel only\n');

console.log('🎉 Done! Your ClickView Enterprise keys are ready.\n');
