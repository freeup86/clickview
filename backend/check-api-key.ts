import { query } from './src/config/database';
import { EncryptionService } from './src/config/encryption';

async function checkApiKey() {
  try {
    console.log('Checking API key for workspace...');
    const result = await query(
      `SELECT id, name, encrypted_api_key, api_key_iv, clickup_team_id 
       FROM workspaces 
       WHERE id = '0895631a-79c7-4334-b92a-41d438003a3c'`
    );
    
    if (result.rows.length === 0) {
      console.log('Workspace not found');
    } else {
      const workspace = result.rows[0];
      console.log('Workspace found:', {
        id: workspace.id,
        name: workspace.name,
        has_encrypted_key: !!workspace.encrypted_api_key,
        has_iv: !!workspace.api_key_iv,
        clickup_team_id: workspace.clickup_team_id
      });
      
      if (workspace.encrypted_api_key && workspace.api_key_iv) {
        try {
          const apiKey = EncryptionService.decrypt(workspace.encrypted_api_key, workspace.api_key_iv);
          console.log('API Key decrypted successfully');
          console.log('API Key starts with:', apiKey.substring(0, 10) + '...');
        } catch (error) {
          console.error('Failed to decrypt API key:', error);
        }
      } else {
        console.log('No API key configured for this workspace');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking API key:', error);
    process.exit(1);
  }
}

checkApiKey();