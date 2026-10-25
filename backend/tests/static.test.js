const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const {createApp} = require('../server');
let app, server, base, dir;
before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildmart-static-'));
  const file = path.join(dir, 'test.db');
  // createApp prepares the cart queries, so the cart tables have to exist (empty is fine)
  const db = new Database(file);
  db.exec(`CREATE TABLE products(product_id INTEGER PRIMARY KEY,name TEXT,price REAL,stock INTEGER);
    CREATE TABLE carts(cart_id INTEGER PRIMARY KEY,customer_name TEXT);
    CREATE TABLE cart_items(cart_item_id INTEGER PRIMARY KEY,cart_id INTEGER REFERENCES carts(cart_id),product_id INTEGER REFERENCES products(product_id),quantity INTEGER,UNIQUE(cart_id,product_id));`);
  db.close();
  app = createApp(file, {jwtSecret: 'test-secret'});
  server = await new Promise(resolve => {const s = app.listen(0, () => resolve(s));});
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {await new Promise(resolve => server.close(resolve)); app.locals.closeDatabase(); fs.rmSync(dir, {recursive:true,force:true});});
async function get(url) {
  const response = await fetch(base + url);
  return {status:response.status, type:response.headers.get('content-type') || '', body:await response.text()};
}
test('GET /login.html returns the login page as HTML', async () => {
  const r = await get('/login.html');
  assert.equal(r.status,200); assert.match(r.type,/text\/html/); assert.match(r.body,/<form id="loginForm"/);
});
test('every root HTML page is served', async () => {
  for (const page of fs.readdirSync(path.join(__dirname, '..', '..')).filter(name => name.endsWith('.html')))
    assert.equal((await get('/' + page)).status,200,page);
});
test('GET /css/style.css and /js/login.js are served', async () => {
  const css = await get('/css/style.css');
  assert.equal(css.status,200); assert.match(css.type,/text\/css/);
  const js = await get('/js/login.js');
  assert.equal(js.status,200); assert.match(js.type,/javascript/);
});
test('health check at / still returns JSON, not a page', async () => {
  const response = await fetch(base + '/');
  assert.equal(response.status,200); assert.equal((await response.json()).message,'Buildmart backend running');
});
test('backend files, the database, git files and dotfiles are not served', async () => {
  for (const url of ['/backend/buildmart.db','/backend/server.js','/backend/package.json','/backend/node_modules/express/package.json',
    '/.git/config','/.github/workflows/backend-tests.yml','/.htmlvalidate.json','/docs/','/README.md','/intro_ranjan.txt','/css/','/js/'])
    assert.equal((await get(url)).status,404,url);
});
test('a missing page returns 404', async () => {
  assert.equal((await get('/no-such-page.html')).status,404);
});
test('encoded ../ paths cannot reach files outside css and js', async () => {
  for (const url of ['/css/%2e%2e/backend/server.js','/js/..%2fbackend%2fserver.js','/css/..%5cbackend%5cserver.js','/%2e%2e/backend/server.js','/..%2flogin.html']) {
    const r = await get(url);
    assert.notEqual(r.status,200,url); assert.doesNotMatch(r.body,/createApp|require\(/,url);
  }
});
