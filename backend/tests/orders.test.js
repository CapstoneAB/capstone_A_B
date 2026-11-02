const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const Database = require('better-sqlite3');
const {createApp} = require('../server');
let app, server, base, dir, file;
// Two customers, so we can check that one can't see or change the other's cart and orders
const alex = {username: 'alex_b', email: 'alex@example.com', password: 'Str0ng!Pass'};
const sam = {username: 'sam_c', email: 'sam@example.com', password: 'An0ther!Pass'};

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'buildmart-orders-'));
  file = path.join(dir, 'test.db');
  // The real seed: 8 products, guest cart 1
  execFileSync(process.execPath, [path.join(__dirname, '..', 'init-db.js')], {env: {...process.env, BUILDMART_DB: file}, stdio: 'pipe'});
  app = createApp(file, {jwtSecret: 'test-secret-for-orders'});
  server = await new Promise(resolve => {const s = app.listen(0, () => resolve(s));});
  base = `http://127.0.0.1:${server.address().port}`;
  for (const user of [alex, sam]) {
    assert.equal((await request('POST', '/auth/register', user)).status, 201);
    const login = await request('POST', '/auth/login', {email: user.email, password: user.password});
    user.token = login.data.token;
    user.id = login.data.user.user_id;
  }
});
after(async () => {await new Promise(resolve => server.close(resolve)); app.locals.closeDatabase(); fs.rmSync(dir, {recursive: true, force: true});});

async function request(method, url, body, token) {
  const headers = {'content-type': 'application/json'};
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(base + url, {method, headers, ...(body ? {body: JSON.stringify(body)} : {})});
  return {status: response.status, headers: response.headers, data: await response.json()};
}
const stockOf = id => {
  const db = new Database(file);
  try { return db.prepare('SELECT stock FROM products WHERE product_id = ?').get(id).stock; } finally { db.close(); }
};

// ---- Product API (issue #38) ----
test('GET /api/products/:id returns one product with its category', async () => {
  const r = await request('GET', '/api/products/2');
  assert.equal(r.status, 200);
  assert.equal(r.data.name, 'Claw Hammer 450g');
  assert.equal(r.data.category, 'Tools');
});
test('GET /api/products/:id returns 404 for a missing product and 400 for a bad id', async () => {
  assert.equal((await request('GET', '/api/products/999')).status, 404);
  assert.equal((await request('GET', '/api/products/abc')).status, 400);
  assert.equal((await request('GET', '/api/products/0')).status, 400);
});
test('products can be filtered by category, ignoring letter case', async () => {
  const byPath = await request('GET', '/api/products/category/tools');
  assert.deepEqual(byPath.data.map(p => p.product_id), [2, 5, 6]);
  const byQuery = await request('GET', '/api/products?category=Tools');
  assert.deepEqual(byQuery.data, byPath.data);
  assert.deepEqual((await request('GET', '/api/products/category/Nothing')).data, []);
  assert.equal((await request('GET', '/api/products?category=')).status, 400);
});
test('GET /api/categories lists each category with a product count', async () => {
  const r = await request('GET', '/api/categories');
  assert.deepEqual(r.data.find(c => c.category === 'Tools'), {category: 'Tools', product_count: 3});
  assert.equal(r.data.reduce((sum, c) => sum + c.product_count, 0), 8);
});
test('products can be paged, and X-Total-Count gives the full count', async () => {
  const first = await request('GET', '/api/products?page=1&limit=3');
  assert.deepEqual(first.data.map(p => p.product_id), [1, 2, 3]);
  assert.equal(first.headers.get('x-total-count'), '8');
  const last = await request('GET', '/api/products?page=3&limit=3');
  assert.deepEqual(last.data.map(p => p.product_id), [7, 8]);
  assert.equal((await request('GET', '/api/products')).data.length, 8);
});
test('bad page or limit values return 400', async () => {
  for (const query of ['page=0', 'page=-1', 'limit=0', 'limit=51', 'limit=abc'])
    assert.equal((await request('GET', `/api/products?${query}`)).status, 400, query);
});

// ---- Carts linked to accounts (issue #39) ----
test('GET /api/my-cart needs a login token', async () => {
  assert.equal((await request('GET', '/api/my-cart')).status, 401);
});
test('each user gets their own cart, and the same cart comes back next time', async () => {
  const first = await request('GET', '/api/my-cart', null, alex.token);
  assert.equal(first.status, 200);
  assert.deepEqual(first.data.items, []);
  alex.cartId = first.data.cart_id;
  assert.equal((await request('GET', '/api/my-cart', null, alex.token)).data.cart_id, alex.cartId);
  sam.cartId = (await request('GET', '/api/my-cart', null, sam.token)).data.cart_id;
  assert.notEqual(sam.cartId, alex.cartId);
  assert.notEqual(alex.cartId, 1);
});
test('a user cart keeps its items after logging out and in again', async () => {
  await request('POST', `/api/carts/${alex.cartId}/items`, {product_id: 3, quantity: 2}, alex.token);
  await request('POST', '/auth/logout', null, alex.token);
  const login = await request('POST', '/auth/login', {email: alex.email, password: alex.password});
  alex.token = login.data.token;
  const cart = await request('GET', '/api/my-cart', null, alex.token);
  assert.equal(cart.data.items[0].quantity, 2);
});
test('a user cart cannot be read or changed without its owner\'s token', async () => {
  assert.equal((await request('GET', `/api/carts/${alex.cartId}/items`)).status, 401);
  assert.equal((await request('GET', `/api/carts/${alex.cartId}/items`, null, sam.token)).status, 403);
  assert.equal((await request('POST', `/api/carts/${alex.cartId}/items`, {product_id: 1, quantity: 1}, sam.token)).status, 403);
  assert.equal((await request('DELETE', `/api/carts/${alex.cartId}/items/3`, null, sam.token)).status, 403);
  assert.equal((await request('GET', `/api/carts/${alex.cartId}/items`, null, alex.token)).status, 200);
});
test('the guest cart (cart 1) still works without logging in', async () => {
  const r = await request('POST', '/api/carts/1/items', {product_id: 1, quantity: 1});
  assert.equal(r.status, 201);
  await request('DELETE', '/api/carts/1/items/1');
});

// ---- Orders (issues #40, #45) ----
test('checkout needs a login token', async () => {
  assert.equal((await request('POST', '/api/orders')).status, 401);
});
test('checkout with an empty cart returns 400', async () => {
  const r = await request('POST', '/api/orders', null, sam.token);
  assert.equal(r.status, 400);
  assert.equal(r.data.error, 'Your cart is empty');
});
test('checkout makes an order, takes the stock and empties the cart', async () => {
  await request('POST', `/api/carts/${alex.cartId}/items`, {product_id: 1, quantity: 1}, alex.token);
  const paintBefore = stockOf(3), boltBefore = stockOf(1);
  const r = await request('POST', '/api/orders', null, alex.token);
  assert.equal(r.status, 201);
  assert.equal(r.data.status, 'Placed');
  assert.equal(r.data.total, 128); // 2 x 58.00 + 1 x 12.00
  assert.equal(r.data.gst_included, 11.64);
  assert.deepEqual(r.data.items.map(i => [i.product_name, i.quantity, i.subtotal]), [['Interior Paint 4L', 2, 116], ['Bolt', 1, 12]]);
  assert.equal(stockOf(3), paintBefore - 2);
  assert.equal(stockOf(1), boltBefore - 1);
  assert.deepEqual((await request('GET', '/api/my-cart', null, alex.token)).data.items, []);
  alex.orderId = r.data.order_id;
});
test('checkout is refused if stock ran out after the item was added, and nothing changes', async () => {
  await request('POST', `/api/carts/${sam.cartId}/items`, {product_id: 8, quantity: 3}, sam.token);
  // Someone else buys the last pair of safety glasses first
  const db = new Database(file);
  db.prepare('UPDATE products SET stock = 1 WHERE product_id = 8').run();
  db.close();
  const r = await request('POST', '/api/orders', null, sam.token);
  assert.equal(r.status, 409);
  assert.match(r.data.error, /Only 1 left of Safety Glasses/);
  assert.equal(stockOf(8), 1);
  assert.equal((await request('GET', '/api/my-cart', null, sam.token)).data.items.length, 1);
  assert.equal((await request('GET', `/api/users/${sam.id}/orders`, null, sam.token)).data.total_count, 0);
  await request('PATCH', `/api/carts/${sam.cartId}/items/8`, {quantity: 1}, sam.token);
});
test('order prices are kept even if the product price changes later', async () => {
  const db = new Database(file);
  db.prepare('UPDATE products SET price = 99 WHERE product_id = 3').run();
  db.close();
  const r = await request('GET', `/api/orders/${alex.orderId}`, null, alex.token);
  assert.equal(r.data.items[0].unit_price, 58);
  assert.equal(r.data.total, 128);
  const fix = new Database(file);
  fix.prepare('UPDATE products SET price = 58 WHERE product_id = 3').run();
  fix.close();
});
test('GET /api/orders/:id only shows the owner\'s order', async () => {
  assert.equal((await request('GET', `/api/orders/${alex.orderId}`, null, alex.token)).status, 200);
  assert.equal((await request('GET', `/api/orders/${alex.orderId}`, null, sam.token)).status, 404);
  assert.equal((await request('GET', `/api/orders/${alex.orderId}`)).status, 401);
  assert.equal((await request('GET', '/api/orders/999', null, alex.token)).status, 404);
  assert.equal((await request('GET', '/api/orders/abc', null, alex.token)).status, 400);
});
test('order history lists the user\'s orders, newest first', async () => {
  await request('POST', `/api/carts/${alex.cartId}/items`, {product_id: 6, quantity: 1}, alex.token);
  const second = await request('POST', '/api/orders', null, alex.token);
  const r = await request('GET', `/api/users/${alex.id}/orders`, null, alex.token);
  assert.equal(r.status, 200);
  assert.equal(r.data.total_count, 2);
  assert.deepEqual(r.data.orders.map(o => o.order_id), [second.data.order_id, alex.orderId]);
  assert.equal(r.data.orders[1].item_count, 3);
});
test('a user cannot see another user\'s order history', async () => {
  assert.equal((await request('GET', `/api/users/${alex.id}/orders`, null, sam.token)).status, 403);
  assert.equal((await request('GET', `/api/users/${alex.id}/orders`)).status, 401);
});
test('order history can be filtered by status, date and amount, and paged', async () => {
  const url = query => `/api/users/${alex.id}/orders?${query}`;
  const today = new Date().toISOString().slice(0, 10);
  assert.equal((await request('GET', url('min_total=100'), null, alex.token)).data.total_count, 1);
  assert.equal((await request('GET', url('max_total=20'), null, alex.token)).data.total_count, 1);
  assert.equal((await request('GET', url(`from=${today}&to=${today}`), null, alex.token)).data.total_count, 2);
  assert.equal((await request('GET', url('from=2000-01-01&to=2000-12-31'), null, alex.token)).data.total_count, 0);
  assert.equal((await request('GET', url('status=Placed'), null, alex.token)).data.total_count, 2);
  const paged = await request('GET', url('page=2&limit=1'), null, alex.token);
  assert.equal(paged.data.orders.length, 1);
  assert.equal(paged.data.orders[0].order_id, alex.orderId);
});
test('bad order history filters return 400', async () => {
  for (const query of ['status=Lost', 'from=01-11-2026', 'to=yesterday', 'min_total=-5', 'max_total=abc', 'page=0', 'limit=100'])
    assert.equal((await request('GET', `/api/users/${alex.id}/orders?${query}`, null, alex.token)).status, 400, query);
});
test('cancelling an order puts the stock back and can only happen once', async () => {
  const paintBefore = stockOf(3);
  const r = await request('PATCH', `/api/orders/${alex.orderId}`, {status: 'Cancelled'}, alex.token);
  assert.equal(r.status, 200);
  assert.equal(r.data.status, 'Cancelled');
  assert.equal(stockOf(3), paintBefore + 2);
  const again = await request('PATCH', `/api/orders/${alex.orderId}`, {status: 'Cancelled'}, alex.token);
  assert.equal(again.status, 409);
  assert.equal(stockOf(3), paintBefore + 2);
  assert.equal((await request('GET', `/api/users/${alex.id}/orders?status=Cancelled`, null, alex.token)).data.total_count, 1);
});
test('customers can only cancel, and only their own orders', async () => {
  const r = await request('GET', `/api/users/${alex.id}/orders?status=Placed`, null, alex.token);
  const placedId = r.data.orders[0].order_id;
  assert.equal((await request('PATCH', `/api/orders/${placedId}`, {status: 'Shipped'}, alex.token)).status, 400);
  assert.equal((await request('PATCH', `/api/orders/${placedId}`, {status: 'Cancelled'}, sam.token)).status, 404);
  assert.equal((await request('PATCH', `/api/orders/${placedId}`, {status: 'Cancelled'})).status, 401);
});
