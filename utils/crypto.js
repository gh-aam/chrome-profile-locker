/**
 * ProfileLock Cryptographic Utilities
 * Standard Web Crypto API implementation for secure local hashing & recovery
 */

export const CryptoUtil = {
  /**
   * Converts an ArrayBuffer to a hex string
   */
  bufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Converts a hex string to a Uint8Array
   */
  hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  },

  /**
   * Generates a cryptographically random hex salt
   */
  generateSalt(length = 16) {
    const saltBytes = new Uint8Array(length);
    crypto.getRandomValues(saltBytes);
    return this.bufferToHex(saltBytes);
  },

  /**
   * Derives a PBKDF2-SHA256 hash from a plaintext string and salt
   */
  async hashWithSalt(plaintext, saltHex, iterations = 100000) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(plaintext),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const saltBuffer = this.hexToBuffer(saltHex);
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return this.bufferToHex(derivedBits);
  },

  /**
   * Constant-time comparison between two hex strings to mitigate timing attacks
   */
  constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  },

  /**
   * Generates an emergency recovery key formatted as PLOCK-XXXX-XXXX-XXXX-XXXX
   */
  generateEmergencyKey() {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Crockford-like base32 (no ambiguous 0/O, 1/I)
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    
    let keyString = '';
    for (let i = 0; i < 16; i++) {
      keyString += charset[randomBytes[i] % charset.length];
    }
    
    const parts = [
      'PLOCK',
      keyString.slice(0, 4),
      keyString.slice(4, 8),
      keyString.slice(8, 12),
      keyString.slice(12, 16)
    ];
    return parts.join('-');
  },

  /**
   * Fast SHA-256 hash for emergency key verification
   */
  async hashSHA256(text) {
    const clean = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(clean));
    return this.bufferToHex(hashBuffer);
  }
};
