const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {createApp} = require('../server');
const {ensureAuthTables} = require('../auth/schema');
const {checkPasswordStrength, hashPassword, verifyPassword} = require('../auth/passwords');
// Made-up password and secret used only by these tests
const SAMPLE = 'Sample#Pass1';
const TEST_SECRET = 'test-secret';
let app, server, base, dir, dbFile;
// Reset tokens are handed to this list instead of being printed to the console
const resetTokens = [];
before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildmart-auth-'));
  dbFile = path.join(dir, 'test.db');
  // createApp prepares the cart queries, so the cart tables have to exist (empty is fine)
  const db = new Database(dbFile);
  db.exec(`CREATE TABLE products(product_id INTEGER PRIMARY KEY,name TEXT,price REAL,stock INTEGER);
    CREATE TABLE carts(cart_id INTEGER PRIMARY KEY,customer_name TEXT);
    CREATE TABLE cart_items(cart_item_id INTEGER PRIMARY KEY,cart_id INTEGER REFERENCES carts(cart_id),product_id INTEGER REFERENCES products(product_id),quantity INTEGER,UNIQUE(cart_id,product_id));`);
  db.close();
  app = createApp(dbFile, {jwtSecret: TEST_SECRET, onResetToken: info => resetTokens.push(info)});
  server = await new Promise(resolve => {const s = app.listen(0, () => resolve(s));});
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {await new Promise(resolve => server.close(resolve)); app.locals.closeDatabase(); fs.rmSync(dir, {recursive:true,force:true});});
async function request(method, url, body, token) {
  const headers = {'content-type':'application/json', ...(token ? {authorization:`Bearer ${token}`} : {})};
  const response = await fetch(base + url, {method, headers, ...(body ? {body:JSON.stringify(body)} : {})});
  return {status:response.status, headers:response.headers, data:await response.json()};
}

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
test('verifyPassword rejects the right password with extra text after 72 bytes', async () => {
  const long = 'Aa1!' + 'x'.repeat(68);
  const hash = await hashPassword(long);
  assert.equal(await verifyPassword(long, hash), true);
  assert.equal(await verifyPassword(long + 'extra', hash), false);
});

// ---- Register and login (they share one database, so each test uses its own user) ----
test('register creates a user and returns only public details', async () => {
  const r = await request('POST','/auth/register',{username:'alex_b',email:'  Alex@Example.com ',password:SAMPLE});
  assert.equal(r.status,201);
  assert.deepEqual(Object.keys(r.data).sort(),['email','user_id','username']);
  assert.equal(r.data.username,'alex_b'); assert.equal(r.data.email,'alex@example.com');
  assert.ok(Number.isInteger(r.data.user_id));
  assert.equal(r.headers.get('cache-control'),'no-store');
});
test('register rejects a username that is taken (any letter case)', async () => {
  await request('POST','/auth/register',{username:'sam_t',email:'sam@example.com',password:SAMPLE});
  const r = await request('POST','/auth/register',{username:'SAM_T',email:'sam2@example.com',password:SAMPLE});
  assert.equal(r.status,409); assert.ok(r.data.fields.username); assert.equal(r.data.fields.email,undefined);
});
test('register rejects an email that is taken in a different letter case', async () => {
  await request('POST','/auth/register',{username:'jo_k',email:'jo@example.com',password:SAMPLE});
  const r = await request('POST','/auth/register',{username:'jo_k2',email:'JO@Example.COM',password:SAMPLE});
  assert.equal(r.status,409); assert.ok(r.data.fields.email); assert.equal(r.data.fields.username,undefined);
});
test('register rejects a weak password and lists the missing rules', async () => {
  const r = await request('POST','/auth/register',{username:'weak_user',email:'weak@example.com',password:'password'});
  assert.equal(r.status,400);
  assert.match(r.data.fields.password,/one uppercase letter/);
  assert.match(r.data.fields.password,/one number/);
  assert.match(r.data.fields.password,/one symbol/);
  assert.equal(r.data.fields.email,undefined); assert.equal(r.data.fields.username,undefined);
});
test('register rejects a bad email', async () => {
  for (const email of ['not-an-email','a@b','has space@example.com','',undefined]) {
    const r = await request('POST','/auth/register',{username:'mail_user',email,password:SAMPLE});
    assert.equal(r.status,400); assert.ok(r.data.fields.email,`expected email error for ${email}`);
  }
});
test('register rejects a bad username', async () => {
  for (const username of ['ab','a'.repeat(21),'has space','dash-name','',42]) {
    const r = await request('POST','/auth/register',{username,email:'name@example.com',password:SAMPLE});
    assert.equal(r.status,400); assert.ok(r.data.fields.username,`expected username error for ${username}`);
  }
});
test('register with no body returns 400 with an error for every field', async () => {
  const r = await request('POST','/auth/register');
  assert.equal(r.status,400); assert.deepEqual(Object.keys(r.data.fields).sort(),['email','password','username']);
});
test('stored password is a bcrypt hash, not the password', async () => {
  await request('POST','/auth/register',{username:'hash_check',email:'hash@example.com',password:SAMPLE});
  const db = new Database(dbFile, {readonly:true});
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get('hash_check');
  db.close();
  assert.notEqual(row.password_hash,SAMPLE);
  assert.match(row.password_hash,/^\$2[aby]\$12\$.{53}$/);
  assert.equal(await verifyPassword(SAMPLE,row.password_hash),true);
  assert.ok(!Object.values(row).includes(SAMPLE));
});
test('login returns a signed HS256 token that lasts 1 hour', async () => {
  const reg = await request('POST','/auth/register',{username:'login_ok',email:'login@example.com',password:SAMPLE});
  const r = await request('POST','/auth/login',{email:'LOGIN@example.com',password:SAMPLE});
  assert.equal(r.status,200); assert.equal(r.data.expires_in,3600);
  assert.deepEqual(r.data.user,{user_id:reg.data.user_id,username:'login_ok',email:'login@example.com'});
  assert.equal(jwt.decode(r.data.token,{complete:true}).header.alg,'HS256');
  const claims = jwt.verify(r.data.token,TEST_SECRET,{algorithms:['HS256']});
  assert.equal(claims.sub,String(reg.data.user_id)); assert.equal(claims.username,'login_ok');
  assert.equal(claims.exp - claims.iat,3600); assert.ok(claims.jti);
  assert.equal(r.headers.get('cache-control'),'no-store');
});
test('each login gets a different token id (jti)', async () => {
  await request('POST','/auth/register',{username:'two_logins',email:'two@example.com',password:SAMPLE});
  const a = await request('POST','/auth/login',{email:'two@example.com',password:SAMPLE});
  const b = await request('POST','/auth/login',{email:'two@example.com',password:SAMPLE});
  assert.notEqual(jwt.decode(a.data.token).jti,jwt.decode(b.data.token).jti);
});
test('login with the wrong password returns 401', async () => {
  await request('POST','/auth/register',{username:'wrong_pw',email:'wrong@example.com',password:SAMPLE});
  const r = await request('POST','/auth/login',{email:'wrong@example.com',password:'Sample#Pass2'});
  assert.equal(r.status,401); assert.equal(r.data.error,'Invalid email or password'); assert.equal(r.data.token,undefined);
});
test('login with an unknown email returns the same 401', async () => {
  const r = await request('POST','/auth/login',{email:'nobody@example.com',password:SAMPLE});
  assert.equal(r.status,401); assert.equal(r.data.error,'Invalid email or password'); assert.equal(r.data.token,undefined);
});
test('login with missing fields returns 400', async () => {
  assert.equal((await request('POST','/auth/login',{email:'login@example.com'})).status,400);
  assert.equal((await request('POST','/auth/login',{password:SAMPLE})).status,400);
});
test('createApp refuses to start in production without JWT_SECRET', () => {
  const saved = {NODE_ENV:process.env.NODE_ENV, JWT_SECRET:process.env.JWT_SECRET};
  process.env.NODE_ENV = 'production'; delete process.env.JWT_SECRET;
  try {
    assert.throws(() => createApp(path.join(dir,'never-opened.db')),/JWT_SECRET/);
    assert.equal(fs.existsSync(path.join(dir,'never-opened.db')),false);
  } finally {
    for (const [key,value] of Object.entries(saved)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});

// ---- Verify and logout ----
// Registers a user and logs in, returning the token and the user's id
async function loginAs(username) {
  const email = `${username}@example.com`;
  const reg = await request('POST','/auth/register',{username,email,password:SAMPLE});
  const r = await request('POST','/auth/login',{email,password:SAMPLE});
  return {token:r.data.token, userId:reg.data.user_id, email};
}
const sign = (payload, options, secret = TEST_SECRET) => jwt.sign(payload, secret, {algorithm:'HS256', expiresIn:3600, jwtid:'test-jti', ...options});
function changeDatabase(sql, ...params) {
  const db = new Database(dbFile);
  try { return db.prepare(sql).run(...params); } finally { db.close(); }
}
test('verify with a valid token returns the user', async () => {
  const {token, userId} = await loginAs('verify_ok');
  const r = await request('GET','/auth/verify',null,token);
  assert.equal(r.status,200);
  assert.deepEqual(r.data,{valid:true,user:{user_id:userId,username:'verify_ok',email:'verify_ok@example.com'}});
});
test('verify with no token returns 401', async () => {
  const r = await request('GET','/auth/verify');
  assert.equal(r.status,401); assert.equal(r.data.error,'Invalid or expired token');
  assert.equal(r.headers.get('www-authenticate'),'Bearer');
});
test('verify with a token in the wrong header format returns 401', async () => {
  const {token} = await loginAs('wrong_scheme');
  const response = await fetch(base + '/auth/verify', {headers:{authorization:`Basic ${token}`}});
  assert.equal(response.status,401);
  const noScheme = await fetch(base + '/auth/verify', {headers:{authorization:token}});
  assert.equal(noScheme.status,401);
});
test('verify with a garbage token returns 401', async () => {
  assert.equal((await request('GET','/auth/verify',null,'not.a.token')).status,401);
  assert.equal((await request('GET','/auth/verify',null,'garbage')).status,401);
});
test('verify with a token signed with a different secret returns 401', async () => {
  const {userId} = await loginAs('other_secret');
  const forged = sign({username:'other_secret'},{subject:String(userId)},'some-other-secret');
  assert.equal((await request('GET','/auth/verify',null,forged)).status,401);
});
test('verify with an expired token returns 401', async () => {
  const {userId} = await loginAs('expired_tok');
  const now = Math.floor(Date.now() / 1000);
  // Issued 2 hours ago with a 1 hour lifetime, so it expired an hour ago
  const expired = sign({username:'expired_tok', iat:now - 7200},{subject:String(userId)});
  assert.equal((await request('GET','/auth/verify',null,expired)).status,401);
});
test('verify refuses an unsigned (alg none) token and other algorithms', async () => {
  const {userId} = await loginAs('alg_check');
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({alg:'none',typ:'JWT'})}.${encode({sub:String(userId),username:'alg_check',jti:'x',iat:now,exp:now + 3600})}.`;
  assert.equal((await request('GET','/auth/verify',null,unsigned)).status,401);
  const hs512 = jwt.sign({username:'alg_check'},TEST_SECRET,{algorithm:'HS512',expiresIn:3600,subject:String(userId),jwtid:'y'});
  assert.equal((await request('GET','/auth/verify',null,hs512)).status,401);
});
test('verify refuses a valid signature for a user that does not exist', async () => {
  assert.equal((await request('GET','/auth/verify',null,sign({username:'ghost'},{subject:'99999'}))).status,401);
});
test('after logout the same token gets 401 from verify', async () => {
  const {token} = await loginAs('logout_ok');
  assert.equal((await request('GET','/auth/verify',null,token)).status,200);
  const out = await request('POST','/auth/logout',null,token);
  assert.equal(out.status,200); assert.equal(out.data.message,'Logged out');
  assert.equal((await request('GET','/auth/verify',null,token)).status,401);
  assert.equal((await request('POST','/auth/logout',null,token)).status,401);
});
test('logout only revokes that token, not other logins of the same user', async () => {
  const {token, email} = await loginAs('two_devices');
  const second = (await request('POST','/auth/login',{email,password:SAMPLE})).data.token;
  await request('POST','/auth/logout',null,token);
  assert.equal((await request('GET','/auth/verify',null,second)).status,200);
});
test('logout without a token returns 401', async () => {
  assert.equal((await request('POST','/auth/logout')).status,401);
});
test('logout removes expired rows from revoked_tokens', async () => {
  const {token} = await loginAs('cleanup');
  changeDatabase('INSERT INTO revoked_tokens(jti, expires_at) VALUES (?, ?)','old-jti',Math.floor(Date.now() / 1000) - 60);
  await request('POST','/auth/logout',null,token);
  const db = new Database(dbFile, {readonly:true});
  const jtis = db.prepare('SELECT jti FROM revoked_tokens').all().map(row => row.jti);
  db.close();
  assert.ok(!jtis.includes('old-jti')); assert.ok(jtis.includes(jwt.decode(token).jti));
});
test('tokens issued before password_changed_at are rejected, new logins still work', async () => {
  const {token, userId, email} = await loginAs('pw_changed');
  changeDatabase('UPDATE users SET password_changed_at = ? WHERE user_id = ?',new Date().toISOString(),userId);
  assert.equal((await request('GET','/auth/verify',null,token)).status,401);
  // Logging in straight away (even in the same second) gives a token that works
  const fresh = (await request('POST','/auth/login',{email,password:SAMPLE})).data.token;
  assert.equal((await request('GET','/auth/verify',null,fresh)).status,200);
});

// ---- Password reset ----
const NEW_PASSWORD = 'Changed#Pass2';
const RESET_MESSAGE = 'If that email is registered, a reset link has been sent.';
const sha256 = value => require('node:crypto').createHash('sha256').update(value).digest('hex');
// Asks for a reset and returns the token that the server handed to onResetToken
async function requestReset(email) {
  const before = resetTokens.length;
  const r = await request('POST','/auth/forgot-password',{email});
  assert.equal(r.status,200); assert.equal(r.data.message,RESET_MESSAGE);
  assert.equal(resetTokens.length,before + 1);
  return resetTokens.at(-1).token;
}
test('full reset flow: old password stops working, new one works', async () => {
  const {email, userId} = await loginAs('reset_flow');
  const token = await requestReset(email.toUpperCase());
  assert.match(token,/^[0-9a-f]{64}$/); assert.equal(resetTokens.at(-1).userId,userId);
  const r = await request('POST','/auth/reset-password',{token,password:NEW_PASSWORD});
  assert.equal(r.status,200);
  assert.equal((await request('POST','/auth/login',{email,password:SAMPLE})).status,401);
  const login = await request('POST','/auth/login',{email,password:NEW_PASSWORD});
  assert.equal(login.status,200);
  assert.equal((await request('GET','/auth/verify',null,login.data.token)).status,200);
});
test('an old login token stops working after a reset', async () => {
  const {token: oldJwt, email} = await loginAs('reset_jwt');
  assert.equal((await request('GET','/auth/verify',null,oldJwt)).status,200);
  const token = await requestReset(email);
  assert.equal((await request('POST','/auth/reset-password',{token,password:NEW_PASSWORD})).status,200);
  assert.equal((await request('GET','/auth/verify',null,oldJwt)).status,401);
});
test('unknown email gets exactly the same response and no token is made', async () => {
  const before = resetTokens.length;
  await loginAs('reset_known');
  const known = await request('POST','/auth/forgot-password',{email:'reset_known@example.com'});
  const unknown = await request('POST','/auth/forgot-password',{email:'nobody-here@example.com'});
  const empty = await request('POST','/auth/forgot-password',{});
  for (const r of [unknown, empty]) {assert.equal(r.status,known.status); assert.deepEqual(r.data,known.data);}
  assert.equal(resetTokens.length,before + 1);
});
test('only the SHA-256 hash of the reset token is stored', async () => {
  const {email, userId} = await loginAs('reset_hash');
  const token = await requestReset(email);
  const db = new Database(dbFile, {readonly:true});
  const rows = db.prepare('SELECT * FROM password_resets WHERE user_id = ?').all(userId);
  db.close();
  assert.equal(rows.length,1); assert.equal(rows[0].token_hash,sha256(token)); assert.equal(rows[0].used_at,null);
  assert.ok(!Object.values(rows[0]).includes(token));
  // Expires 30 minutes from now (allowing a few seconds for the test to run)
  const left = rows[0].expires_at - Math.floor(Date.now() / 1000);
  assert.ok(left > 1790 && left <= 1800,`expected about 1800 seconds, got ${left}`);
});
test('a reset token cannot be used twice', async () => {
  const {email} = await loginAs('reset_twice');
  const token = await requestReset(email);
  assert.equal((await request('POST','/auth/reset-password',{token,password:NEW_PASSWORD})).status,200);
  const again = await request('POST','/auth/reset-password',{token,password:'Another#Pass3'});
  assert.equal(again.status,400); assert.equal(again.data.error,'This reset link is invalid or has expired.');
  assert.equal((await request('POST','/auth/login',{email,password:NEW_PASSWORD})).status,200);
});
test('an expired reset token is rejected', async () => {
  const {email} = await loginAs('reset_expired');
  const token = await requestReset(email);
  changeDatabase('UPDATE password_resets SET expires_at = ? WHERE token_hash = ?',Math.floor(Date.now() / 1000) - 1,sha256(token));
  assert.equal((await request('POST','/auth/reset-password',{token,password:NEW_PASSWORD})).status,400);
  assert.equal((await request('POST','/auth/login',{email,password:SAMPLE})).status,200);
});
test('a weak new password is rejected and the link can still be used', async () => {
  const {email} = await loginAs('reset_weak');
  const token = await requestReset(email);
  const weak = await request('POST','/auth/reset-password',{token,password:'weakpass'});
  assert.equal(weak.status,400); assert.match(weak.data.fields.password,/one uppercase letter/);
  assert.equal((await request('POST','/auth/login',{email,password:SAMPLE})).status,200);
  assert.equal((await request('POST','/auth/reset-password',{token,password:NEW_PASSWORD})).status,200);
});
test('a made-up or missing reset token is rejected', async () => {
  for (const token of ['0'.repeat(64),'not-a-token','',undefined,123])
    assert.equal((await request('POST','/auth/reset-password',{token,password:NEW_PASSWORD})).status,400);
});
test('asking for a new reset link cancels the older one', async () => {
  const {email} = await loginAs('reset_newer');
  const first = await requestReset(email);
  const second = await requestReset(email);
  assert.notEqual(first,second);
  assert.equal((await request('POST','/auth/reset-password',{token:first,password:NEW_PASSWORD})).status,400);
  assert.equal((await request('POST','/auth/reset-password',{token:second,password:NEW_PASSWORD})).status,200);
});
