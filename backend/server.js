const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const {ensureAuthTables} = require('./auth/schema');
const {createAuthRouter} = require('./auth/routes');
const {createRequireAuth} = require('./auth/middleware');
const {ensureShopTables, ORDER_STATUSES} = require('./schema');
// Same per-item limit as the front end (shop.html)
const MAX_QUANTITY = 20;
// Biggest page size for the product list and order history
const MAX_PAGE_SIZE = 50;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// The website pages live one folder up from backend/
const SITE_ROOT = path.join(__dirname, '..');
// Only plain page names like login.html, so nothing in a subfolder or a dotfile can match
const PAGE_PATTERN = /^\/([A-Za-z0-9_-]+\.html)$/;

// The secret that signs login tokens comes from the environment, never from the code
function getJwtSecret(options) {
  const secret = options.jwtSecret || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set when NODE_ENV is production');
  console.warn('Warning: JWT_SECRET is not set, using a random secret (logins end when the server restarts)');
  return crypto.randomBytes(32).toString('hex');
}

function createApp(databasePath = path.join(__dirname, 'buildmart.db'), options = {}) {
  // Checked before opening the database so a missing secret stops startup cleanly
  const jwtSecret = getJwtSecret(options);
  const app = express();
  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  // Adds the user, order and newer product/cart columns to an existing buildmart.db without re-running init-db
  ensureAuthTables(db);
  ensureShopTables(db);
  app.use(express.json());
  const requireAuth = createRequireAuth(db, jwtSecret);
  // Responses that belong to one logged-in user must not be cached by the browser or a proxy
  const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };

  const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
  const findCart = db.prepare('SELECT cart_id, user_id FROM carts WHERE cart_id = ?');
  const items = db.prepare(`SELECT ci.cart_item_id, ci.product_id, p.name, p.price, ci.quantity,
    ROUND(p.price * ci.quantity, 2) AS subtotal
    FROM cart_items ci JOIN products p ON p.product_id = ci.product_id
    WHERE ci.cart_id = ? ORDER BY ci.cart_item_id`);
  const getCart = id => {
    const result = items.all(id);
    const total = Math.round(result.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
    // Prices are GST-inclusive (same as shop.html), so the GST part is total - total / 1.1
    const gst = Math.round((total - total / 1.1) * 100) / 100;
    return {cart_id: Number(id), items: result, gst_included: gst, total};
  };
  // A guest cart (no user_id) is open to anyone. A cart that belongs to an account
  // needs that account's login token, so one customer can't change another's cart.
  const checkCart = (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({error: 'Invalid cart ID'});
    const cart = findCart.get(req.params.id);
    if (!cart) return res.status(404).json({error: 'Cart not found'});
    if (cart.user_id === null) return next();
    requireAuth(req, res, () => {
      if (req.auth.user.user_id !== cart.user_id) return res.status(403).json({error: 'This cart belongs to another account'});
      res.set('Cache-Control', 'no-store');
      next();
    });
  };

  // ---- Products ----
  const PRODUCT_COLUMNS = 'product_id, name, description, category, price, unit, stock';
  // page and limit are optional. Without them the whole list is returned (the shop page uses this).
  // With them, X-Total-Count says how many products match, so a page can show "page 1 of 2".
  function sendProducts(req, res, category) {
    const {page, limit} = req.query;
    if ((page !== undefined && !validId(page)) || (limit !== undefined && (!validId(limit) || Number(limit) > MAX_PAGE_SIZE)))
      return res.status(400).json({error: `page must be a positive integer and limit must be 1 to ${MAX_PAGE_SIZE}`});
    const where = category ? 'WHERE category = ? COLLATE NOCASE' : '';
    const params = category ? [category] : [];
    const totalCount = db.prepare(`SELECT COUNT(*) AS n FROM products ${where}`).get(...params).n;
    let sql = `SELECT ${PRODUCT_COLUMNS} FROM products ${where} ORDER BY product_id`;
    if (page !== undefined || limit !== undefined) {
      const size = Number(limit || 10);
      sql += ' LIMIT ? OFFSET ?';
      params.push(size, (Number(page || 1) - 1) * size);
      res.set({'X-Total-Count': String(totalCount), 'X-Page': String(page || 1), 'X-Per-Page': String(size)});
    }
    res.json(db.prepare(sql).all(...params));
  }

  // ---- Orders ----
  const findUserCart = db.prepare('SELECT cart_id FROM carts WHERE user_id = ?');
  const insertUserCart = db.prepare('INSERT INTO carts(customer_name, user_id) VALUES (?, ?)');
  const orderRow = db.prepare('SELECT order_id, user_id, status, total, gst_included, created_at FROM orders WHERE order_id = ? AND user_id = ?');
  const orderItems = db.prepare(`SELECT order_item_id, product_id, product_name, unit_price, quantity, subtotal
    FROM order_items WHERE order_id = ? ORDER BY order_item_id`);
  const getOrder = (orderId, userId) => {
    const order = orderRow.get(orderId, userId);
    return order && {...order, items: orderItems.all(orderId)};
  };
  // Everything in one transaction: if any step fails, no order is saved and no stock changes
  const placeOrder = db.transaction(userId => {
    const cart = findUserCart.get(userId);
    const lines = cart ? items.all(cart.cart_id) : [];
    if (!lines.length) return {status: 400, error: 'Your cart is empty'};
    for (const line of lines) {
      const {stock} = db.prepare('SELECT stock FROM products WHERE product_id = ?').get(line.product_id);
      if (line.quantity > stock) return {status: 409, error: `Only ${stock} left of ${line.name}. Please change the quantity.`};
    }
    const {total, gst_included} = getCart(cart.cart_id);
    const orderId = Number(db.prepare('INSERT INTO orders(user_id, total, gst_included) VALUES (?, ?, ?)').run(userId, total, gst_included).lastInsertRowid);
    const addLine = db.prepare('INSERT INTO order_items(order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)');
    const takeStock = db.prepare('UPDATE products SET stock = stock - ? WHERE product_id = ?');
    for (const line of lines) {
      addLine.run(orderId, line.product_id, line.name, line.price, line.quantity, line.subtotal);
      takeStock.run(line.quantity, line.product_id);
    }
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.cart_id);
    return {orderId};
  });
  const cancelOrder = db.transaction(orderId => {
    db.prepare("UPDATE orders SET status = 'Cancelled' WHERE order_id = ?").run(orderId);
    // Cancelled items go back into stock
    const giveBack = db.prepare('UPDATE products SET stock = stock + ? WHERE product_id = ?');
    for (const line of orderItems.all(orderId)) giveBack.run(line.quantity, line.product_id);
  });

  app.get('/', (_req, res) => res.json({message: 'Buildmart backend running'}));
  app.use('/auth', createAuthRouter(db, {...options, jwtSecret}));
  app.get('/api/products', (req, res) => {
    const {category} = req.query;
    if (category !== undefined && (typeof category !== 'string' || !category.trim()))
      return res.status(400).json({error: 'category must not be empty'});
    sendProducts(req, res, category && category.trim());
  });
  app.get('/api/categories', (_req, res) => res.json(db.prepare(
    'SELECT category, COUNT(*) AS product_count FROM products GROUP BY category ORDER BY category').all()));
  app.get('/api/products/category/:category', (req, res) => sendProducts(req, res, req.params.category));
  app.get('/api/products/:id', (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({error: 'Invalid product ID'});
    const product = db.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE product_id = ?`).get(req.params.id);
    if (!product) return res.status(404).json({error: 'Product not found'});
    res.json(product);
  });
  // The logged-in user's own cart. It is made the first time they ask for it.
  app.get('/api/my-cart', requireAuth, noStore, (req, res) => {
    const {user_id, username} = req.auth.user;
    let cart = findUserCart.get(user_id);
    if (!cart) cart = {cart_id: Number(insertUserCart.run(username, user_id).lastInsertRowid)};
    res.json(getCart(cart.cart_id));
  });
  app.get('/api/carts/:id/items', checkCart, (req, res) => res.json(getCart(req.params.id)));
  app.post('/api/carts/:id/items', checkCart, (req, res) => {
    const {product_id, quantity} = req.body || {};
    if (!validId(product_id) || !Number.isSafeInteger(quantity) || quantity < 1)
      return res.status(400).json({error: 'product_id must be a positive integer and quantity must be a positive integer'});
    const product = db.prepare('SELECT * FROM products WHERE product_id = ?').get(product_id);
    if (!product) return res.status(404).json({error: 'Product not found'});
    const existing = db.prepare('SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(req.params.id, product_id);
    if ((existing?.quantity || 0) + quantity > MAX_QUANTITY)
      return res.status(400).json({error: 'Maximum quantity per item is 20'});
    if ((existing?.quantity || 0) + quantity > product.stock)
      return res.status(409).json({error: 'Requested quantity exceeds available stock'});
    db.prepare(`INSERT INTO cart_items(cart_id, product_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity`)
      .run(req.params.id, product_id, quantity);
    res.status(201).json(getCart(req.params.id));
  });
  app.patch('/api/carts/:id/items/:productId', checkCart, (req, res) => {
    const {quantity} = req.body || {};
    if (!validId(req.params.productId) || !Number.isSafeInteger(quantity) || quantity < 1)
      return res.status(400).json({error: 'Valid product ID and positive integer quantity required'});
    const item = db.prepare('SELECT 1 FROM cart_items WHERE cart_id = ? AND product_id = ?').get(req.params.id, req.params.productId);
    if (!item) return res.status(404).json({error: 'Cart item not found'});
    if (quantity > MAX_QUANTITY) return res.status(400).json({error: 'Maximum quantity per item is 20'});
    const product = db.prepare('SELECT stock FROM products WHERE product_id = ?').get(req.params.productId);
    if (quantity > product.stock) return res.status(409).json({error: 'Requested quantity exceeds available stock'});
    db.prepare('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?').run(quantity, req.params.id, req.params.productId);
    res.json(getCart(req.params.id));
  });
  app.delete('/api/carts/:id/items/:productId', checkCart, (req, res) => {
    if (!validId(req.params.productId)) return res.status(400).json({error: 'Invalid product ID'});
    const result = db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(req.params.id, req.params.productId);
    if (!result.changes) return res.status(404).json({error: 'Cart item not found'});
    res.json(getCart(req.params.id));
  });
  // Checkout: turns the logged-in user's cart into an order
  app.post('/api/orders', requireAuth, noStore, (req, res) => {
    const result = placeOrder(req.auth.user.user_id);
    if (result.error) return res.status(result.status).json({error: result.error});
    res.status(201).json(getOrder(result.orderId, req.auth.user.user_id));
  });
  // One order with its items. Someone else's order looks the same as a missing one (404).
  app.get('/api/orders/:orderId', requireAuth, noStore, (req, res) => {
    if (!validId(req.params.orderId)) return res.status(400).json({error: 'Invalid order ID'});
    const order = getOrder(req.params.orderId, req.auth.user.user_id);
    if (!order) return res.status(404).json({error: 'Order not found'});
    res.json(order);
  });
  // A customer can only cancel their own order, and only while it is still Placed
  app.patch('/api/orders/:orderId', requireAuth, noStore, (req, res) => {
    if (!validId(req.params.orderId)) return res.status(400).json({error: 'Invalid order ID'});
    if ((req.body || {}).status !== 'Cancelled') return res.status(400).json({error: 'Customers can only change an order to Cancelled'});
    const order = orderRow.get(req.params.orderId, req.auth.user.user_id);
    if (!order) return res.status(404).json({error: 'Order not found'});
    if (order.status !== 'Placed') return res.status(409).json({error: `This order is ${order.status} and can no longer be cancelled`});
    cancelOrder(order.order_id);
    res.json(getOrder(order.order_id, req.auth.user.user_id));
  });
  // Order history with optional filters: status, from and to (YYYY-MM-DD), min_total, max_total, page, limit
  app.get('/api/users/:id/orders', requireAuth, noStore, (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({error: 'Invalid user ID'});
    if (Number(req.params.id) !== req.auth.user.user_id) return res.status(403).json({error: 'You can only see your own orders'});
    const {status, from, to, min_total, max_total, page = '1', limit = '10'} = req.query;
    const isAmount = v => v === undefined || (/^\d+(\.\d{1,2})?$/.test(String(v)));
    if (status !== undefined && !ORDER_STATUSES.includes(status))
      return res.status(400).json({error: `status must be one of: ${ORDER_STATUSES.join(', ')}`});
    if ((from !== undefined && !DATE_PATTERN.test(from)) || (to !== undefined && !DATE_PATTERN.test(to)))
      return res.status(400).json({error: 'from and to must be dates like 2026-11-01'});
    if (!isAmount(min_total) || !isAmount(max_total)) return res.status(400).json({error: 'min_total and max_total must be amounts like 25 or 25.50'});
    if (!validId(page) || !validId(limit) || Number(limit) > MAX_PAGE_SIZE)
      return res.status(400).json({error: `page must be a positive integer and limit must be 1 to ${MAX_PAGE_SIZE}`});
    const where = ['o.user_id = ?'];
    const params = [req.auth.user.user_id];
    if (status) { where.push('o.status = ?'); params.push(status); }
    if (from) { where.push('date(o.created_at) >= ?'); params.push(from); }
    if (to) { where.push('date(o.created_at) <= ?'); params.push(to); }
    if (min_total !== undefined) { where.push('o.total >= ?'); params.push(Number(min_total)); }
    if (max_total !== undefined) { where.push('o.total <= ?'); params.push(Number(max_total)); }
    const whereSql = where.join(' AND ');
    const totalCount = db.prepare(`SELECT COUNT(*) AS n FROM orders o WHERE ${whereSql}`).get(...params).n;
    const orders = db.prepare(`SELECT o.order_id, o.status, o.total, o.gst_included, o.created_at,
      (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.order_id) AS item_count
      FROM orders o WHERE ${whereSql} ORDER BY o.order_id DESC LIMIT ? OFFSET ?`)
      .all(...params, Number(limit), (Number(page) - 1) * Number(limit));
    res.json({orders, page: Number(page), limit: Number(limit), total_count: totalCount});
  });
  // Website pages, served from the same origin as the API so the forms need no CORS.
  // Allow-list: root .html pages plus the css and js folders. Everything else in the
  // repo (backend/, the database, .git, docs, dotfiles) is never served.
  const staticOptions = {index: false, redirect: false, dotfiles: 'ignore'};
  app.use('/css', express.static(path.join(SITE_ROOT, 'css'), staticOptions));
  app.use('/js', express.static(path.join(SITE_ROOT, 'js'), staticOptions));
  app.get(PAGE_PATTERN, (req, res, next) => {
    res.sendFile(PAGE_PATTERN.exec(req.path)[1], {root: SITE_ROOT, dotfiles: 'deny'}, err => err && next());
  });
  app.locals.closeDatabase = () => db.close();
  return app;
}
if (require.main === module) {
  let app;
  try {
    app = createApp();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Buildmart backend running at http://localhost:${port}`));
}
module.exports = {createApp};
