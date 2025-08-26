import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// For Aiven PostgreSQL with self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: true
});

async function runMigration() {
  console.log('🚀 Starting database migration...');
  
  try {
    // Check for migrations folder first
    const migrationsPath = path.join(__dirname, '../../migrations');
    
    if (fs.existsSync(migrationsPath)) {
      // Run all SQL files in migrations folder
      const migrationFiles = fs.readdirSync(migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`📁 Found ${migrationFiles.length} migration files`);
      
      for (const file of migrationFiles) {
        console.log(`  Running ${file}...`);
        const migrationPath = path.join(migrationsPath, file);
        const migration = fs.readFileSync(migrationPath, 'utf8');
        await pool.query(migration);
        console.log(`  ✓ ${file} completed`);
      }
    } else {
      // Fallback to old schema file
      const schemaPath = path.join(__dirname, '../../../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
    }
    
    console.log('✅ Database migration completed successfully!');
    
    // Verify tables were created
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const result = await pool.query(tablesQuery);
    console.log('\n📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

export default runMigration;