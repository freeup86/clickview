/**
 * SFTP Client Service
 *
 * Secure file transfer for report distribution:
 * - SFTP connection management
 * - File upload with retry logic
 * - Directory creation and management
 * - Connection pooling
 * - Error handling and logging
 * - Progress tracking
 * - Batch uploads
 * - Connection testing
 */

import Client from 'ssh2-sftp-client';
import { Readable } from 'stream';
import * as path from 'path';

// ===================================================================
// SFTP CLIENT SERVICE CLASS
// ===================================================================

export class SFTPClientService {
  private connectionPool: Map<string, SFTPConnection> = new Map();
  private readonly MAX_POOL_SIZE = 5;
  private readonly CONNECTION_TIMEOUT = 30000;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 2000;

  /**
   * Upload a file to an SFTP server
   */
  public async uploadFile(
    config: SFTPConfig,
    localPath: string,
    remotePath: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < (options.retryAttempts || this.RETRY_ATTEMPTS)) {
      attempts++;

      try {
        const client = await this.getConnection(config);

        // Create remote directory if it doesn't exist
        if (options.createRemoteDir !== false) {
          const remoteDir = path.dirname(remotePath);
          await this.ensureDirectory(client, remoteDir);
        }

        // Upload file
        await client.put(localPath, remotePath);

        // Verify upload if requested
        if (options.verify) {
          const exists = await client.exists(remotePath);
          if (!exists) {
            throw new Error('File upload verification failed: file does not exist on remote');
          }
        }

        return {
          success: true,
          remotePath,
          uploadTime: Date.now() - startTime,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`SFTP upload attempt ${attempts} failed:`, error);

        if (attempts < (options.retryAttempts || this.RETRY_ATTEMPTS)) {
          await this.delay(this.RETRY_DELAY * attempts);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts,
      uploadTime: Date.now() - startTime,
    };
  }

  /**
   * Upload a buffer or stream to an SFTP server
   */
  public async uploadBuffer(
    config: SFTPConfig,
    buffer: Buffer | Readable,
    remotePath: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < (options.retryAttempts || this.RETRY_ATTEMPTS)) {
      attempts++;

      try {
        const client = await this.getConnection(config);

        // Create remote directory if needed
        if (options.createRemoteDir !== false) {
          const remoteDir = path.dirname(remotePath);
          await this.ensureDirectory(client, remoteDir);
        }

        // Upload buffer
        await client.put(buffer, remotePath);

        return {
          success: true,
          remotePath,
          uploadTime: Date.now() - startTime,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`SFTP buffer upload attempt ${attempts} failed:`, error);

        if (attempts < (options.retryAttempts || this.RETRY_ATTEMPTS)) {
          await this.delay(this.RETRY_DELAY * attempts);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts,
      uploadTime: Date.now() - startTime,
    };
  }

  /**
   * Upload multiple files in batch
   */
  public async uploadBatch(
    config: SFTPConfig,
    files: Array<{ localPath: string; remotePath: string }>,
    options: UploadOptions = {}
  ): Promise<BatchUploadResult> {
    const startTime = Date.now();
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(config, file.localPath, file.remotePath, options);
      results.push(result);

      // Stop on first failure if requested
      if (!result.success && options.stopOnError) {
        break;
      }
    }

    const successful = results.filter((r) => r.success).length;

    return {
      totalFiles: files.length,
      successful,
      failed: files.length - successful,
      results,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Download a file from an SFTP server
   */
  public async downloadFile(
    config: SFTPConfig,
    remotePath: string,
    localPath: string,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < (options.retryAttempts || this.RETRY_ATTEMPTS)) {
      attempts++;

      try {
        const client = await this.getConnection(config);

        // Check if remote file exists
        const exists = await client.exists(remotePath);
        if (!exists) {
          throw new Error(`Remote file does not exist: ${remotePath}`);
        }

        // Download file
        await client.get(remotePath, localPath);

        return {
          success: true,
          localPath,
          downloadTime: Date.now() - startTime,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`SFTP download attempt ${attempts} failed:`, error);

        if (attempts < (options.retryAttempts || this.RETRY_ATTEMPTS)) {
          await this.delay(this.RETRY_DELAY * attempts);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts,
      downloadTime: Date.now() - startTime,
    };
  }

  /**
   * List files in a remote directory
   */
  public async listFiles(
    config: SFTPConfig,
    remotePath: string = '.'
  ): Promise<FileInfo[]> {
    const client = await this.getConnection(config);
    const list = await client.list(remotePath);

    return list.map((item) => ({
      name: item.name,
      path: path.join(remotePath, item.name),
      type: item.type,
      size: item.size,
      modifyTime: new Date(item.modifyTime),
      accessTime: new Date(item.accessTime),
      rights: item.rights,
      owner: item.owner,
      group: item.group,
    }));
  }

  /**
   * Check if a file or directory exists
   */
  public async exists(config: SFTPConfig, remotePath: string): Promise<boolean | string> {
    const client = await this.getConnection(config);
    return await client.exists(remotePath);
  }

  /**
   * Delete a file from the remote server
   */
  public async deleteFile(config: SFTPConfig, remotePath: string): Promise<boolean> {
    try {
      const client = await this.getConnection(config);
      await client.delete(remotePath);
      return true;
    } catch (error) {
      console.error('SFTP delete failed:', error);
      return false;
    }
  }

  /**
   * Create a directory on the remote server
   */
  public async createDirectory(
    config: SFTPConfig,
    remotePath: string,
    recursive: boolean = true
  ): Promise<boolean> {
    try {
      const client = await this.getConnection(config);
      await client.mkdir(remotePath, recursive);
      return true;
    } catch (error) {
      console.error('SFTP mkdir failed:', error);
      return false;
    }
  }

  /**
   * Test SFTP connection
   */
  public async testConnection(config: SFTPConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const client = new Client();

      await client.connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
        connectTimeout: this.CONNECTION_TIMEOUT,
      });

      // Try to list root directory
      await client.list('.');

      await client.end();

      return {
        success: true,
        message: 'Connection successful',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Distribute a report via SFTP
   */
  public async distributeReport(
    config: SFTPConfig,
    reportBuffer: Buffer,
    reportName: string,
    destinationPath?: string
  ): Promise<UploadResult> {
    // Generate remote path
    const timestamp = new Date().toISOString().split('T')[0];
    const remotePath = destinationPath
      ? path.join(destinationPath, `${timestamp}_${reportName}`)
      : `reports/${timestamp}_${reportName}`;

    // Upload report
    return await this.uploadBuffer(config, reportBuffer, remotePath, {
      createRemoteDir: true,
      verify: true,
    });
  }

  // ===================================================================
  // CONNECTION MANAGEMENT
  // ===================================================================

  /**
   * Get or create an SFTP connection
   */
  private async getConnection(config: SFTPConfig): Promise<Client> {
    const connectionKey = this.getConnectionKey(config);

    // Check if connection exists and is valid
    if (this.connectionPool.has(connectionKey)) {
      const conn = this.connectionPool.get(connectionKey)!;

      // Check if connection is still alive
      if (conn.lastUsed + 300000 > Date.now()) {
        // 5 minutes
        conn.lastUsed = Date.now();
        return conn.client;
      } else {
        // Connection too old, close it
        await this.closeConnection(connectionKey);
      }
    }

    // Create new connection
    const client = new Client();

    await client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey,
      passphrase: config.passphrase,
      connectTimeout: this.CONNECTION_TIMEOUT,
    });

    // Add to pool
    this.connectionPool.set(connectionKey, {
      client,
      config,
      lastUsed: Date.now(),
    });

    // Manage pool size
    if (this.connectionPool.size > this.MAX_POOL_SIZE) {
      await this.evictOldestConnection();
    }

    return client;
  }

  /**
   * Close a specific connection
   */
  private async closeConnection(connectionKey: string): Promise<void> {
    const conn = this.connectionPool.get(connectionKey);
    if (conn) {
      try {
        await conn.client.end();
      } catch (error) {
        console.error('Error closing SFTP connection:', error);
      }
      this.connectionPool.delete(connectionKey);
    }
  }

  /**
   * Evict the oldest connection from the pool
   */
  private async evictOldestConnection(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, conn] of this.connectionPool.entries()) {
      if (conn.lastUsed < oldestTime) {
        oldestTime = conn.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.closeConnection(oldestKey);
    }
  }

  /**
   * Close all connections
   */
  public async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connectionPool.keys()).map((key) => this.closeConnection(key));
    await Promise.all(closePromises);
  }

  /**
   * Generate a unique key for a connection
   */
  private getConnectionKey(config: SFTPConfig): string {
    return `${config.host}:${config.port || 22}:${config.username}`;
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  /**
   * Ensure a directory exists (create if needed)
   */
  private async ensureDirectory(client: Client, remotePath: string): Promise<void> {
    try {
      const exists = await client.exists(remotePath);
      if (!exists) {
        await client.mkdir(remotePath, true);
      }
    } catch (error) {
      console.error('Error ensuring directory:', error);
      throw error;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get connection pool statistics
   */
  public getPoolStats(): PoolStats {
    return {
      activeConnections: this.connectionPool.size,
      maxPoolSize: this.MAX_POOL_SIZE,
      connections: Array.from(this.connectionPool.entries()).map(([key, conn]) => ({
        key,
        host: conn.config.host,
        username: conn.config.username,
        lastUsed: new Date(conn.lastUsed),
        age: Date.now() - conn.lastUsed,
      })),
    };
  }
}

// ===================================================================
// SFTP DISTRIBUTION HELPER
// ===================================================================

/**
 * Helper class for report distribution via SFTP
 */
export class SFTPDistributor {
  private sftpService: SFTPClientService;

  constructor(sftpService?: SFTPClientService) {
    this.sftpService = sftpService || new SFTPClientService();
  }

  /**
   * Distribute a report to multiple SFTP destinations
   */
  public async distributeToMultiple(
    destinations: SFTPDestination[],
    reportBuffer: Buffer,
    reportName: string
  ): Promise<DistributionResult> {
    const results: Array<{ destination: string; result: UploadResult }> = [];
    let successful = 0;
    let failed = 0;

    for (const dest of destinations) {
      const result = await this.sftpService.distributeReport(
        dest.config,
        reportBuffer,
        reportName,
        dest.destinationPath
      );

      results.push({
        destination: `${dest.config.host}:${dest.destinationPath || 'reports'}`,
        result,
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      totalDestinations: destinations.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Schedule automatic report distribution
   */
  public async scheduleDistribution(
    schedule: DistributionSchedule,
    reportGenerator: () => Promise<{ buffer: Buffer; name: string }>
  ): Promise<void> {
    // This would integrate with the scheduling service
    console.log('Distribution scheduled:', schedule);
    // Implementation would depend on the scheduling system
  }
}

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

export interface SFTPConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string | Buffer;
  passphrase?: string;
}

export interface UploadOptions {
  retryAttempts?: number;
  createRemoteDir?: boolean;
  verify?: boolean;
  stopOnError?: boolean;
}

export interface DownloadOptions {
  retryAttempts?: number;
}

export interface UploadResult {
  success: boolean;
  remotePath?: string;
  error?: string;
  uploadTime: number;
  attempts: number;
}

export interface DownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
  downloadTime: number;
  attempts: number;
}

export interface BatchUploadResult {
  totalFiles: number;
  successful: number;
  failed: number;
  results: UploadResult[];
  totalTime: number;
}

export interface FileInfo {
  name: string;
  path: string;
  type: string;
  size: number;
  modifyTime: Date;
  accessTime: Date;
  rights: any;
  owner: number;
  group: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency: number;
}

export interface SFTPConnection {
  client: Client;
  config: SFTPConfig;
  lastUsed: number;
}

export interface PoolStats {
  activeConnections: number;
  maxPoolSize: number;
  connections: Array<{
    key: string;
    host: string;
    username: string;
    lastUsed: Date;
    age: number;
  }>;
}

export interface SFTPDestination {
  config: SFTPConfig;
  destinationPath?: string;
}

export interface DistributionResult {
  totalDestinations: number;
  successful: number;
  failed: number;
  results: Array<{
    destination: string;
    result: UploadResult;
  }>;
}

export interface DistributionSchedule {
  reportId: string;
  destinations: SFTPDestination[];
  schedule: string; // Cron expression
  enabled: boolean;
}
