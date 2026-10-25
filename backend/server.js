const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const {ensureAuthTables} = require('./auth/schema');
const {createAuthRouter} = require('./auth/routes');
// Same per-item limit as the front end (shop.html)
const MAX_QUANTITY = 20;
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
  // Adds the user tables to an existing buildmart.db without re-running init-db
  ensureAuthTables(db);
  app.use(express.json());

  const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
  const cartExists = id => !!db.prepare('SELECT 1 FROM carts WHERE cart_id = ?').get(id);
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
  const checkCart = (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({error: 'Invalid cart ID'});
    if (!cartExists(req.params.id)) return res.status(404).json({error: 'Cart not found'});
    next();
  };

  app.get('/', (_req, res) => res.json({message: 'Buildmart backend running'}));
  app.use('/auth', createAuthRouter(db, {...options, jwtSecret}));
  app.get('/api/products', (_req, res) => res.json(db.prepare('SELECT * FROM products ORDER BY product_id').all()));
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
