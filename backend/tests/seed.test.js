const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
let dir, file;
const initDb = (...args) => execFileSync(process.execPath, [path.join(__dirname, '..', 'init-db.js'), ...args],
  {env: {...process.env, BUILDMART_DB: file}, stdio: 'pipe'});
const query = run => {
  const db = new Database(file);
  try { return run(db); } finally { db.close(); }
};
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildmart-seed-'));
  file = path.join(dir, 'seed.db');
  initDb();
});
after(() => fs.rmSync(dir, {recursive: true, force: true}));

test('init-db seeds the 8 shop products with stock and an empty cart', () => {
  const products = query(db => db.prepare('SELECT * FROM products ORDER BY product_id').all());
  assert.equal(products.length, 8);
  assert.ok(products.every(p => p.stock > 0));
  assert.equal(query(db => db.prepare('SELECT COUNT(*) AS n FROM cart_items').get().n), 0);
  assert.equal(query(db => db.prepare('SELECT COUNT(*) AS n FROM carts WHERE cart_id = 1').get().n), 1);
});
test('every seeded product has a description, a unit and an icon on the shop page', () => {
  const shop = fs.readFileSync(path.join(__dirname, '..', '..', 'shop.html'), 'utf8');
  const icons = shop.match(/const icons = \{(.*)\}/)[1];
  const products = query(db => db.prepare('SELECT * FROM products ORDER BY product_id').all());
  for (const p of products) {
    assert.ok(p.description && p.unit, `product ${p.product_id} needs a description and a unit`);
    assert.match(icons, new RegExp(`\\b${p.product_id}:`));
  }
});
test('init-db upgrades a database made before the description and unit columns', () => {
  const oldFile = path.join(dir, 'old.db');
  const old = new Database(oldFile);
  old.exec(`CREATE TABLE products (product_id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL);
    INSERT INTO products VALUES (1,'Hammer',19.95,20);`);
  old.close();
  execFileSync(process.execPath, [path.join(__dirname, '..', 'init-db.js')], {env: {...process.env, BUILDMART_DB: oldFile}, stdio: 'pipe'});
  const upgraded = new Database(oldFile);
  const first = upgraded.prepare('SELECT * FROM products WHERE product_id = 1').get();
  upgraded.close();
  assert.equal(first.name, 'Bolt');
  assert.equal(first.unit, 'each');
});
test('running init-db again keeps cart items and refreshes the catalogue', () => {
  query(db => {
    db.prepare('INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (1,1,2)').run();
    db.prepare("UPDATE products SET name = 'Old name' WHERE product_id = 1").run();
  });
  initDb();
  assert.equal(query(db => db.prepare('SELECT COUNT(*) AS n FROM cart_items').get().n), 1);
  assert.equal(query(db => db.prepare('SELECT name FROM products WHERE product_id = 1').get().name), 'Bolt');
});
test('reset-db removes cart items and users and restores the seed', () => {
  query(db => db.prepare("INSERT INTO users(username,email,password_hash) VALUES ('alex_b','alex@example.com','x')").run());
  initDb('--reset');
  assert.equal(query(db => db.prepare('SELECT COUNT(*) AS n FROM cart_items').get().n), 0);
  assert.equal(query(db => db.prepare('SELECT COUNT(*) AS n FROM users').get().n), 0);
  assert.equal(query(db => db.prepare('SELECT COUNT(*) AS n FROM products').get().n), 8);
});
