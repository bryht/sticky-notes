const PBKDF2_ITERATIONS = 100000;
const SALT = new TextEncoder().encode('sticky-notes-encryption-salt-v1');

const keyCache = new Map();

async function deriveKey(apiKey) {
  if (keyCache.has(apiKey)) {
    return keyCache.get(apiKey);
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(apiKey, key);
  return key;
}

export async function encrypt(plaintext, apiKey) {
  if (!apiKey) {
    throw new Error('API key is required for encryption');
  }

  const key = await deriveKey(apiKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
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

export async function decrypt(encrypted, apiKey) {
  if (!apiKey) {
    throw new Error('API key is required for decryption');
  }

  if (!encrypted || !Array.isArray(encrypted.iv) || !Array.isArray(encrypted.data)) {
    throw new Error('Invalid encrypted data format');
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

export function clearKeyCache() {
  keyCache.clear();
}
