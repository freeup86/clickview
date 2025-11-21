import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Enterprise-grade SSL/TLS Configuration
 *
 * SECURITY: Never disable certificate verification in production
 * For cloud databases (Aiven, AWS RDS, etc.), download and use their CA certificates
 *
 * Setup instructions:
 * 1. Download your cloud provider's CA certificate
 * 2. Save it to: backend/certs/ca-certificate.crt
 * 3. Set DATABASE_SSL_CA_PATH in .env (optional, defaults to above path)
 *
 * For local development without SSL: Add ?sslmode=disable to DATABASE_URL
 */

// Configure SSL settings based on environment and database provider
const getSSLConfig = (): boolean | { rejectUnauthorized: boolean; ca?: Buffer } => {
  const dbUrl = process.env.DATABASE_URL || '';

  // Explicit SSL disable for local development
  if (dbUrl.includes('sslmode=disable') || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    return false;
  }

  // Production and cloud databases require SSL
  if (process.env.NODE_ENV === 'production' || dbUrl.includes('aivencloud.com') || dbUrl.includes('amazonaws.com')) {
    // Check for custom CA certificate
    const caPath = process.env.DATABASE_SSL_CA_PATH || path.join(__dirname, '../../certs/ca-certificate.crt');

    if (fs.existsSync(caPath)) {
      // Use provided CA certificate
      const ca = fs.readFileSync(caPath);
      console.log(`✅ Using SSL CA certificate from: ${caPath}`);
      return {
        rejectUnauthorized: true,
        ca
      };
    } else if (dbUrl.includes('aivencloud.com')) {
      // Aiven cloud requires SSL but we don't have the CA cert
      console.warn('⚠️  WARNING: Aiven PostgreSQL detected but CA certificate not found.');
      console.warn('   Download from: https://aiven.io/docs/platform/howto/download-ca-cert');
      console.warn(`   Save to: ${caPath}`);
      console.warn('   Proceeding with SSL verification enabled (may fail)...');
      return {
        rejectUnauthorized: true
      };
    } else {
      // Other cloud providers - use system CA store
      return {
        rejectUnauthorized: true
      };
    }
  }

  // Default: no SSL for local development
  return false;
};

// Configure database connection
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: getSSLConfig()
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };
  
  return client;
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}