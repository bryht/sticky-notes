/**
 * Encryption utilities for Sticky Notes backend integration.
 * Uses Web Crypto API for AES-256-GCM encryption.
 */

/**
 * Derive a 256-bit encryption key from the API key using SHA-256.
 * @param {string} apiKey - The user's API key
 * @returns {Promise<CryptoKey>} The derived encryption key
 */
async function deriveKey(apiKey) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey);

  // Hash the API key to get 32 bytes
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);

  // Import as AES-GCM key
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt content using AES-256-GCM.
 * @param {string} plaintext - The content to encrypt
 * @param {string} apiKey - The user's API key
 * @returns {Promise<{iv: number[], data: number[]}>} Encrypted data with IV
 */
export async function encrypt(plaintext, apiKey) {
  if (!apiKey) {
    throw new Error('API key is required for encryption');
  }

  const key = await deriveKey(apiKey);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encoder = new TextEncoder();
  const encoded = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(ciphertext))
  };
}

/**
 * Decrypt content using AES-256-GCM.
 * @param {{iv: number[], data: number[]}} encrypted - The encrypted data
 * @param {string} apiKey - The user's API key
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(encrypted, apiKey) {
  if (!apiKey) {
    throw new Error('API key is required for decryption');
  }

  const key = await deriveKey(apiKey);
  const iv = new Uint8Array(encrypted.iv);
  const data = new Uint8Array(encrypted.data);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}
