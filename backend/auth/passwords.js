const bcrypt = require('bcryptjs');
// Cost 12 = 2^12 rounds, slow enough to make guessing expensive
const BCRYPT_COST = 12;
// bcrypt only uses the first 72 bytes, so longer passwords are rejected instead of cut short
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;

// Returns the list of rules the password fails ([] means it is strong enough)
function checkPasswordStrength(plain) {
  const value = typeof plain === 'string' ? plain : '';
  const failed = [];
  if (value.length < MIN_PASSWORD_LENGTH) failed.push(`at least ${MIN_PASSWORD_LENGTH} characters`);
  if (Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES) failed.push(`at most ${MAX_PASSWORD_BYTES} bytes`);
  if (!/[A-Z]/.test(value)) failed.push('one uppercase letter');
  if (!/[a-z]/.test(value)) failed.push('one lowercase letter');
  if (!/[0-9]/.test(value)) failed.push('one number');
  if (!/[^A-Za-z0-9\s]/.test(value)) failed.push('one symbol');
  return failed;
}

function hashPassword(plain) {
  if (typeof plain !== 'string' || Buffer.byteLength(plain, 'utf8') > MAX_PASSWORD_BYTES)
    return Promise.reject(new TypeError('Password must be a string of at most 72 bytes'));
  return bcrypt.hash(plain, BCRYPT_COST);
}

function verifyPassword(plain, hash) {
  if (typeof plain !== 'string' || typeof hash !== 'string') return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}

module.exports = {BCRYPT_COST, MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH, checkPasswordStrength, hashPassword, verifyPassword};
