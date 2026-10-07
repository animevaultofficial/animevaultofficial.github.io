const PIN_ITERATIONS = 310_000;
const PIN_LENGTH = 6;

export function isValidParentalPin(pin) {
  return new RegExp(`^\\d{${PIN_LENGTH},12}$`).test(String(pin || ''));
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function derivePinHash(pin, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure PIN storage is not available in this browser.');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt,
    iterations: PIN_ITERATIONS,
    hash: 'SHA-256'
  }, key, 256);
  return new Uint8Array(hash);
}

export async function createParentalPinCredential(pin) {
  if (!isValidParentalPin(pin)) {
    throw new Error('Use a PIN with 6 to 12 digits.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePinHash(pin, salt);
  return { salt: bytesToBase64(salt), hash: bytesToBase64(hash) };
}

export async function verifyParentalPin(pin, credential) {
  if (!isValidParentalPin(pin) || !credential?.salt || !credential?.hash) return false;
  const actual = await derivePinHash(pin, base64ToBytes(credential.salt));
  const expected = base64ToBytes(credential.hash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}
