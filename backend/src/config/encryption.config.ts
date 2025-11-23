/**
 * Encryption Configuration
 *
 * Provides encryption at rest for sensitive data:
 * - Field-level encryption
 * - Database encryption
 * - File encryption
 * - Key management
 */

import crypto from 'crypto';

/**
 * Encryption Algorithm Configuration
 */
export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  authTagLength: 16, // 128 bits
  saltLength: 32,
  iterations: 100000, // PBKDF2 iterations
  digest: 'sha256',
} as const;

/**
 * Key Management Service
 */
export class KeyManagementService {
  private masterKey: Buffer;
  private keys: Map<string, Buffer>;

  constructor() {
    this.keys = new Map();
    this.loadMasterKey();
  }

  /**
   * Load master key from environment or KMS
   */
  private loadMasterKey(): void {
    const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;

    if (!masterKeyHex) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MASTER_ENCRYPTION_KEY must be set in production');
      }

      // Generate a random key for development
      console.warn('WARNING: Using randomly generated encryption key for development');
      this.masterKey = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
    } else {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');

      if (this.masterKey.length !== ENCRYPTION_CONFIG.keyLength) {
        throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
      }
    }
  }

  /**
   * Get master key
   */
  getMasterKey(): Buffer {
    return this.masterKey;
  }

  /**
   * Derive a data encryption key (DEK) from master key
   */
  deriveKey(purpose: string, salt?: Buffer): Buffer {
    const keySalt = salt || crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);

    const dek = crypto.pbkdf2Sync(
      this.masterKey,
      keySalt,
      ENCRYPTION_CONFIG.iterations,
      ENCRYPTION_CONFIG.keyLength,
      ENCRYPTION_CONFIG.digest
    );

    return dek;
  }

  /**
   * Rotate encryption key
   */
  rotateKey(): Buffer {
    const newKey = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);

    // In production, this would update the key in KMS
    console.log('Key rotation: New key generated');

    return newKey;
  }

  /**
   * Get or create key for specific purpose
   */
  getKey(purpose: string): Buffer {
    if (!this.keys.has(purpose)) {
      const key = this.deriveKey(purpose);
      this.keys.set(purpose, key);
    }

    return this.keys.get(purpose)!;
  }
}

/**
 * Encryption Service
 */
export class EncryptionService {
  constructor(private kms: KeyManagementService) {}

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(plaintext: string, purpose: string = 'default'): string {
    const key = this.kms.getKey(purpose);
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
  }

  /**
   * Decrypt data
   */
  decrypt(encrypted: string, purpose: string = 'default'): string {
    const key = this.kms.getKey(purpose);

    try {
      const [ivHex, authTagHex, ciphertext] = encrypted.split(':');

      if (!ivHex || !authTagHex || !ciphertext) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt JSON object
   */
  encryptObject(obj: any, purpose: string = 'default'): string {
    const json = JSON.stringify(obj);
    return this.encrypt(json, purpose);
  }

  /**
   * Decrypt JSON object
   */
  decryptObject<T = any>(encrypted: string, purpose: string = 'default'): T {
    const json = this.decrypt(encrypted, purpose);
    return JSON.parse(json);
  }

  /**
   * Hash data (one-way)
   */
  hash(data: string, salt?: string): string {
    const hashSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, hashSalt, ENCRYPTION_CONFIG.iterations, 64, 'sha512').toString('hex');

    return `${hashSalt}:${hash}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    const [salt, originalHash] = hashedData.split(':');

    if (!salt || !originalHash) {
      return false;
    }

    const hash = crypto.pbkdf2Sync(data, salt, ENCRYPTION_CONFIG.iterations, 64, 'sha512').toString('hex');

    return crypto.timingSafeEqual(Buffer.from(originalHash), Buffer.from(hash));
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }
}

/**
 * Field Encryption Decorator (for database models)
 */
export function Encrypted(purpose: string = 'field') {
  return function (target: any, propertyKey: string) {
    const kms = new KeyManagementService();
    const encryption = new EncryptionService(kms);

    let value: any;

    const getter = function (this: any) {
      if (value && typeof value === 'string' && value.includes(':')) {
        try {
          return encryption.decrypt(value, purpose);
        } catch {
          return value; // Return as-is if decryption fails
        }
      }
      return value;
    };

    const setter = function (this: any, newVal: any) {
      if (newVal && typeof newVal === 'string') {
        value = encryption.encrypt(newVal, purpose);
      } else {
        value = newVal;
      }
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * Database Encryption Layer
 */
export class DatabaseEncryption {
  constructor(private encryption: EncryptionService) {}

  /**
   * Encrypt fields in a database row
   */
  encryptRow(row: any, encryptedFields: string[], purpose: string = 'database'): any {
    const encrypted = { ...row };

    for (const field of encryptedFields) {
      if (encrypted[field] !== null && encrypted[field] !== undefined) {
        encrypted[field] = this.encryption.encrypt(String(encrypted[field]), purpose);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt fields in a database row
   */
  decryptRow(row: any, encryptedFields: string[], purpose: string = 'database'): any {
    const decrypted = { ...row };

    for (const field of encryptedFields) {
      if (decrypted[field] !== null && decrypted[field] !== undefined) {
        try {
          decrypted[field] = this.encryption.decrypt(decrypted[field], purpose);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decrypted;
  }

  /**
   * Encrypt query parameters
   */
  encryptQueryParams(params: any[], encryptedIndices: number[], purpose: string = 'database'): any[] {
    const encrypted = [...params];

    for (const index of encryptedIndices) {
      if (encrypted[index] !== null && encrypted[index] !== undefined) {
        encrypted[index] = this.encryption.encrypt(String(encrypted[index]), purpose);
      }
    }

    return encrypted;
  }
}

/**
 * File Encryption
 */
export class FileEncryption {
  constructor(private encryption: EncryptionService) {}

  /**
   * Encrypt file content
   */
  encryptFile(buffer: Buffer, purpose: string = 'file'): Buffer {
    const plaintext = buffer.toString('base64');
    const encrypted = this.encryption.encrypt(plaintext, purpose);

    return Buffer.from(encrypted, 'utf8');
  }

  /**
   * Decrypt file content
   */
  decryptFile(buffer: Buffer, purpose: string = 'file'): Buffer {
    const encrypted = buffer.toString('utf8');
    const plaintext = this.encryption.decrypt(encrypted, purpose);

    return Buffer.from(plaintext, 'base64');
  }

  /**
   * Encrypt file stream
   */
  createEncryptCipher(purpose: string = 'file'): crypto.Cipher {
    const key = new KeyManagementService().getKey(purpose);
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

    return crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
  }

  /**
   * Decrypt file stream
   */
  createDecryptDecipher(purpose: string = 'file', iv: Buffer): crypto.Decipher {
    const key = new KeyManagementService().getKey(purpose);

    return crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
  }
}

/**
 * Configuration for encrypted fields per table
 */
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  users: ['email', 'phone', 'address'],
  user_profiles: ['ssn', 'creditCardNumber', 'bankAccount'],
  api_keys: ['apiKey', 'apiSecret'],
  oauth_tokens: ['accessToken', 'refreshToken'],
  sensitive_data: ['data', 'metadata'],
  payment_methods: ['cardNumber', 'cvv', 'accountNumber'],
};

/**
 * Initialize encryption services
 */
export function initializeEncryption() {
  const kms = new KeyManagementService();
  const encryption = new EncryptionService(kms);
  const dbEncryption = new DatabaseEncryption(encryption);
  const fileEncryption = new FileEncryption(encryption);

  return {
    kms,
    encryption,
    dbEncryption,
    fileEncryption,
  };
}

/**
 * PostgreSQL Transparent Data Encryption (TDE) Configuration
 */
export const POSTGRES_TDE_CONFIG = `
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption functions
CREATE OR REPLACE FUNCTION encrypt_field(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(data, key), 'base64');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_field(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(data, 'base64'), key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Example: Encrypt sensitive columns
-- UPDATE users SET email = encrypt_field(email, 'encryption_key');

-- Create views with automatic decryption
-- CREATE VIEW users_decrypted AS
-- SELECT id, decrypt_field(email, 'encryption_key') as email FROM users;
`;

/**
 * Export singleton instances
 */
let encryptionInstance: ReturnType<typeof initializeEncryption> | null = null;

export function getEncryption() {
  if (!encryptionInstance) {
    encryptionInstance = initializeEncryption();
  }

  return encryptionInstance;
}
