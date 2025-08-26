import { query } from './src/config/database';

async function checkWorkspace() {
  try {
    console.log('Checking workspaces...');
    const result = await query('SELECT id, name, is_active FROM workspaces');
    console.log('Workspaces found:', result.rows);
    
    if (result.rows.length === 0) {
      console.log('No workspaces found in the database');
    } else {
      for (const workspace of result.rows) {
        console.log(`- ${workspace.name} (ID: ${workspace.id}, Active: ${workspace.is_active})`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking workspaces:', error);
    process.exit(1);
  }
}

checkWorkspace();