const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const {createApp} = require('../server');
let app, server, base, dir;
before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildmart-'));
  const file = path.join(dir, 'test.db');
  const db = new Database(file);
  db.exec(`CREATE TABLE products(product_id INTEGER PRIMARY KEY,name TEXT,price REAL,stock INTEGER);
    CREATE TABLE carts(cart_id INTEGER PRIMARY KEY,customer_name TEXT);
    CREATE TABLE cart_items(cart_item_id INTEGER PRIMARY KEY,cart_id INTEGER REFERENCES carts(cart_id),product_id INTEGER REFERENCES products(product_id),quantity INTEGER,UNIQUE(cart_id,product_id));
    INSERT INTO products VALUES(1,'Hammer',19.95,5); INSERT INTO carts VALUES(1,'Tester');`);
  db.close();
  app = createApp(file);
  server = await new Promise(resolve => {const s = app.listen(0, () => resolve(s));});
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {await new Promise(resolve => server.close(resolve)); app.locals.closeDatabase(); fs.rmSync(dir, {recursive:true,force:true});});
async function request(method, url, body) {
  const response = await fetch(base + url, {method, headers: {'content-type':'application/json'}, ...(body ? {body:JSON.stringify(body)} : {})});
  return {status:response.status, data:await response.json()};
}
test('add product to cart', async () => {
  const r = await request('POST','/api/carts/1/items',{product_id:1,quantity:2});
  assert.equal(r.status,201); assert.equal(r.data.items[0].quantity,2);
});
test('adding same product increases quantity', async () => {
  const r = await request('POST','/api/carts/1/items',{product_id:1,quantity:1});
  assert.equal(r.data.items[0].quantity,3);
});
test('reject invalid quantity', async () => {
  assert.equal((await request('POST','/api/carts/1/items',{product_id:1,quantity:-2})).status,400);
});
test('reject excessive stock', async () => {
  assert.equal((await request('POST','/api/carts/1/items',{product_id:1,quantity:4})).status,409);
});
test('update quantity and calculate total', async () => {
  const r = await request('PATCH','/api/carts/1/items/1',{quantity:4});
  assert.equal(r.status,200); assert.equal(r.data.total,79.8);
});
test('remove cart item', async () => {
  const r = await request('DELETE','/api/carts/1/items/1');
  assert.equal(r.status,200); assert.equal(r.data.items.length,0);
});
test('cart shows GST included in the total', async () => {
  await request('POST','/api/carts/1/items',{product_id:1,quantity:2});
  const r = await request('GET','/api/carts/1/items');
  assert.equal(r.data.total,39.9); assert.equal(r.data.gst_included,3.63);
});
test('missing cart returns 404', async () => {
  assert.equal((await request('GET','/api/carts/99/items')).status,404);
});
