import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - ensure we're loading from the right location
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Always use the same key for consistency
const ENCRYPTION_KEY = 'a4f8d9e2b7c1f6a3e8d2b9c4f7a1e6d3b8c2f9a4e7d1b6c3f8a2e9d4b7c1f6a3';

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