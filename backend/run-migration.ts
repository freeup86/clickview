import { query } from './src/config/database';
import fs from 'fs';

async function runMigration() {
  try {
    const sql = fs.readFileSync('./migrations/005_add_space_list_ids.sql', 'utf8');
    
    // Split by semicolons and run each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Running:', statement.substring(0, 50) + '...');
        await query(statement);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();