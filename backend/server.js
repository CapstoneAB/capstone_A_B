const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

function createApp(databasePath = path.join(__dirname, 'buildmart.db')) {
  const app = express();
  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  app.use(express.json());

  const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
  const cartExists = id => !!db.prepare('SELECT 1 FROM carts WHERE cart_id = ?').get(id);
  const items = db.prepare(`SELECT ci.cart_item_id, ci.product_id, p.name, p.price, ci.quantity,
    ROUND(p.price * ci.quantity, 2) AS subtotal
    FROM cart_items ci JOIN products p ON p.product_id = ci.product_id
    WHERE ci.cart_id = ? ORDER BY ci.cart_item_id`);
  const getCart = id => {
    const result = items.all(id);
    return {cart_id: Number(id), items: result, total: Math.round(result.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100};
  };
  const checkCart = (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({error: 'Invalid cart ID'});
    if (!cartExists(req.params.id)) return res.status(404).json({error: 'Cart not found'});
    next();
  };

  app.get('/', (_req, res) => res.json({message: 'Buildmart backend running'}));
  app.get('/api/products', (_req, res) => res.json(db.prepare('SELECT * FROM products ORDER BY product_id').all()));
  app.get('/api/carts/:id/items', checkCart, (req, res) => res.json(getCart(req.params.id)));
  app.post('/api/carts/:id/items', checkCart, (req, res) => {
    const {product_id, quantity} = req.body || {};
    if (!validId(product_id) || !Number.isSafeInteger(quantity) || quantity < 1)
      return res.status(400).json({error: 'product_id must be a positive integer and quantity must be a positive integer'});
    const product = db.prepare('SELECT * FROM products WHERE product_id = ?').get(product_id);
    if (!product) return res.status(404).json({error: 'Product not found'});
    const existing = db.prepare('SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(req.params.id, product_id);
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
  app.locals.closeDatabase = () => db.close();
  return app;
}
if (require.main === module) {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Buildmart backend running at http://localhost:${port}`));
}
module.exports = {createApp};
