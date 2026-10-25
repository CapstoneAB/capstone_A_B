const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const {ensureAuthTables} = require('../auth/schema');
const {checkPasswordStrength, hashPassword, verifyPassword} = require('../auth/passwords');
// Made-up password used only by these tests
const SAMPLE = 'Sample#Pass1';

test('hash is never equal to the password and uses bcrypt cost 12', async () => {
  const hash = await hashPassword(SAMPLE);
  assert.notEqual(hash, SAMPLE);
  assert.ok(!hash.includes(SAMPLE));
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.equal(bcrypt.getRounds(hash), 12);
});
test('verifyPassword accepts the right password and rejects a wrong one', async () => {
  const hash = await hashPassword(SAMPLE);
  assert.equal(await verifyPassword(SAMPLE, hash), true);
  assert.equal(await verifyPassword('Sample#Pass2', hash), false);
  assert.equal(await verifyPassword('', hash), false);
});
test('two hashes of the same password are different (salted)', async () => {
  const [a, b] = await Promise.all([hashPassword(SAMPLE), hashPassword(SAMPLE)]);
  assert.notEqual(a, b);
});
test('hashPassword refuses a password longer than 72 bytes', async () => {
  await assert.rejects(hashPassword('Aa1!' + 'x'.repeat(69)), TypeError);
});
test('strong password passes every rule', () => {
  assert.deepEqual(checkPasswordStrength(SAMPLE), []);
});
test('strength rules report each missing requirement', () => {
  assert.deepEqual(checkPasswordStrength('Aa1!'), ['at least 8 characters']);
  assert.deepEqual(checkPasswordStrength('sample#pass1'), ['one uppercase letter']);
  assert.deepEqual(checkPasswordStrength('SAMPLE#PASS1'), ['one lowercase letter']);
  assert.deepEqual(checkPasswordStrength('Sample#Pass'), ['one number']);
  assert.deepEqual(checkPasswordStrength('SamplePass1'), ['one symbol']);
  assert.equal(checkPasswordStrength('').length, 5);
  assert.equal(checkPasswordStrength(undefined).length, 5);
});
test('strength rules count bytes for the 72 byte limit', () => {
  assert.deepEqual(checkPasswordStrength('Aa1!' + 'x'.repeat(68)), []);
  assert.deepEqual(checkPasswordStrength('Aa1!' + 'x'.repeat(69)), ['at most 72 bytes']);
  // 'é' is 2 bytes in UTF-8, so 36 of them plus 'Aa1!' is 76 bytes but only 40 characters
  assert.deepEqual(checkPasswordStrength('Aa1!' + 'é'.repeat(36)), ['at most 72 bytes']);
});
test('ensureAuthTables creates the auth tables and can run twice', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildmart-auth-'));
  const db = new Database(path.join(dir, 'schema.db'));
  try {
    ensureAuthTables(db);
    ensureAuthTables(db);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(t => t.name);
    assert.deepEqual(tables, ['password_resets', 'revoked_tokens', 'users']);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
  } finally {
    db.close();
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
