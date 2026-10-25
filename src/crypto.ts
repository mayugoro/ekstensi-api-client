// Utilitas Enkripsi & Dekripsi Menggunakan Web Crypto API (AES-GCM 256-bit + PBKDF2)

export interface EncryptedPayload {
  format: 'mayugoro-encrypted-backup';
  version: 1;
  kdf: 'PBKDF2';
  cipher: 'AES-GCM-256';
  salt: string; // Base64
  iv: string;   // Base64
  ciphertext: string; // Base64
  createdAt: string;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Menghasilkan CryptoKey AES-GCM 256-bit dari password pengguna dengan PBKDF2 (100.000 iterasi SHA-256)
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passKey = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Mengenkripsi data apapun menjadi format EncryptedPayload
export async function encryptData(data: any, password: string): Promise<EncryptedPayload> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Nonce 12-byte standar AES-GCM
  const key = await deriveKey(password, salt);

  const plaintext = textEncoder.encode(JSON.stringify(data));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    plaintext
  );

  return {
    format: 'mayugoro-encrypted-backup',
    version: 1,
    kdf: 'PBKDF2',
    cipher: 'AES-GCM-256',
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    createdAt: new Date().toISOString()
  };
}

// Mendekripsi EncryptedPayload kembali ke objek aslinya
// Jika password salah atau data diubah, Web Crypto API otomatis melempar error authentication failure
export async function decryptData(payload: EncryptedPayload, password: string): Promise<any> {
  if (payload.format !== 'mayugoro-encrypted-backup') {
    throw new Error('Format file terenkripsi tidak dikenali.');
  }

  const salt = new Uint8Array(base64ToArrayBuffer(payload.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const ciphertext = base64ToArrayBuffer(payload.ciphertext);

  const key = await deriveKey(password, salt);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    ciphertext
  );

  const jsonString = textDecoder.decode(decryptedBuffer);
  return JSON.parse(jsonString);
}

// Memeriksa apakah suatu objek adalah format backup terenkripsi
export function isEncryptedBackup(obj: any): obj is EncryptedPayload {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    obj.format === 'mayugoro-encrypted-backup' &&
    typeof obj.ciphertext === 'string' &&
    typeof obj.iv === 'string' &&
    typeof obj.salt === 'string'
  );
}
