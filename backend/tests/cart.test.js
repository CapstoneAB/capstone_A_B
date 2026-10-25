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
    INSERT INTO products VALUES(1,'Hammer',19.95,5); INSERT INTO carts VALUES(1,'Tester');
    INSERT INTO products VALUES(2,'Screwdriver Set',24.50,15); INSERT INTO products VALUES(3,'Paint Brush',8.99,30);
    INSERT INTO carts VALUES(2,'Tester Two'); INSERT INTO carts VALUES(3,'Tester Three');`);
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
// Tests below use cart 2 so they don't change cart 1
test('health check returns 200 with running message', async () => {
  const r = await request('GET','/');
  assert.equal(r.status,200); assert.equal(r.data.message,'Buildmart backend running');
});
test('product list returns all 3 products', async () => {
  const r = await request('GET','/api/products');
  assert.equal(r.status,200); assert.equal(r.data.length,3);
  assert.deepEqual(r.data.map(p => p.name),['Hammer','Screwdriver Set','Paint Brush']);
});
test('PATCH with quantity 0 returns 400', async () => {
  assert.equal((await request('PATCH','/api/carts/2/items/2',{quantity:0})).status,400);
});
test('PATCH with a negative quantity returns 400', async () => {
  assert.equal((await request('PATCH','/api/carts/2/items/2',{quantity:-3})).status,400);
});
test('PATCH with a non-number quantity returns 400', async () => {
  assert.equal((await request('PATCH','/api/carts/2/items/2',{quantity:'abc'})).status,400);
});
test('DELETE of a product not in the cart returns 404', async () => {
  assert.equal((await request('DELETE','/api/carts/2/items/2')).status,404);
});
test('POST of a product that does not exist returns 404', async () => {
  assert.equal((await request('POST','/api/carts/2/items',{product_id:999,quantity:1})).status,404);
});
test('multi-item cart calculates total and GST included', async () => {
  // 2 x 24.50 = 49.00 and 3 x 8.99 = 26.97, so total = 75.97
  // GST = 75.97 - 75.97 / 1.1 = 75.97 - 69.0636 = 6.9064, rounded to 6.91
  await request('POST','/api/carts/2/items',{product_id:2,quantity:2});
  const r = await request('POST','/api/carts/2/items',{product_id:3,quantity:3});
  assert.equal(r.status,201); assert.equal(r.data.items.length,2);
  assert.equal(r.data.total,75.97); assert.equal(r.data.gst_included,6.91);
});
// Quantity cap tests use cart 3 and Paint Brush (stock 30) so stock limits can't interfere
test('POST quantity over 20 returns 400', async () => {
  const r = await request('POST','/api/carts/3/items',{product_id:3,quantity:25});
  assert.equal(r.status,400); assert.equal(r.data.error,'Maximum quantity per item is 20');
});
test('POST that takes the total over 20 returns 400 and keeps the old quantity', async () => {
  assert.equal((await request('POST','/api/carts/3/items',{product_id:3,quantity:18})).status,201);
  assert.equal((await request('POST','/api/carts/3/items',{product_id:3,quantity:3})).status,400);
  const r = await request('GET','/api/carts/3/items');
  assert.equal(r.data.items[0].quantity,18);
});
test('PATCH quantity to 21 returns 400', async () => {
  assert.equal((await request('PATCH','/api/carts/3/items/3',{quantity:21})).status,400);
});
test('PATCH quantity to exactly 20 returns 200', async () => {
  const r = await request('PATCH','/api/carts/3/items/3',{quantity:20});
  assert.equal(r.status,200); assert.equal(r.data.items[0].quantity,20);
});
