/**
 * Safe demo credential representation utility.
 * In this demo environment, passwords are stored in a masked hash representation
 * rather than plain text.
 */

// Simple deterministic salt for demo hashing
const DEMO_SALT = 'abm_pharma_salt_2026';

export const hashDemoPassword = (plainPassword) => {
  if (!plainPassword) return '';
  // Convert string to a safe hexadecimal token representation
  let hash = 0;
  const str = `${DEMO_SALT}_${plainPassword}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `demohash_${Math.abs(hash).toString(16).padStart(8, '0')}`;
};

export const verifyDemoPassword = (plainPassword, storedHash) => {
  if (!plainPassword || !storedHash) return false;
  return hashDemoPassword(plainPassword) === storedHash;
};
