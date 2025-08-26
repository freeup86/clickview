import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Disable SSL certificate verification for testing (Aiven uses self-signed certs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('Testing database connection with SSL bypass...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true  // Just enable SSL without verification
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');
    console.log('Current database time:', result.rows[0].now);
    
    // Test creating a simple table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_connection (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Can create tables!');
    
    // Clean up test table
    await pool.query('DROP TABLE IF EXISTS test_connection');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    await pool.end();
    process.exit(1);
  }
}

testConnection();