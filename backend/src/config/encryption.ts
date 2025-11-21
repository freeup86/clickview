import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - ensure we're loading from the right location
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Validate encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error(
    'ENCRYPTION_KEY environment variable is required. Generate a secure 64-character hex string using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

if (ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    `ENCRYPTION_KEY must be exactly 64 characters (32 bytes as hex). Current length: ${ENCRYPTION_KEY.length}. Generate a new key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"`
  );
}

// Validate hex format
if (!/^[0-9a-f]{64}$/i.test(ENCRYPTION_KEY)) {
  throw new Error(
    'ENCRYPTION_KEY must be a valid 64-character hexadecimal string. Generate a new key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

export class EncryptionService {
  static encrypt(text: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16).toString('hex');
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY + iv).toString();
    return { encrypted, iv };
  }

  static decrypt(encryptedText: string, iv: string): string {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY + iv);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateShareToken(): string {
    return crypto.randomBytes(16).toString('base64url');
  }
}