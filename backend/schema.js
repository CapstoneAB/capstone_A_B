// Creates the shop tables (products, carts, cart_items, orders, order_items).
// Safe to run every time the app starts (CREATE TABLE IF NOT EXISTS), and it
// adds any newer columns to a buildmart.db made by an earlier sprint.
const ORDER_STATUSES = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

function ensureShopTables(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS products (product_id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT, category TEXT NOT NULL DEFAULT 'General', price REAL NOT NULL CHECK(price >= 0), unit TEXT NOT NULL DEFAULT 'each', stock INTEGER NOT NULL CHECK(stock >= 0));
CREATE TABLE IF NOT EXISTS carts (cart_id INTEGER PRIMARY KEY, customer_name TEXT NOT NULL, user_id INTEGER REFERENCES users(user_id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS cart_items (cart_item_id INTEGER PRIMARY KEY, cart_id INTEGER NOT NULL REFERENCES carts(cart_id), product_id INTEGER NOT NULL REFERENCES products(product_id), quantity INTEGER NOT NULL CHECK(quantity > 0), UNIQUE(cart_id, product_id));`);

  // Columns added after Sprint 3. SQLite can't add a UNIQUE column, so carts.user_id
  // gets a unique index instead (one cart per user; guest carts have no user_id).
  const has = (table, column) => db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
  if (!has('products', 'description')) db.exec('ALTER TABLE products ADD COLUMN description TEXT');
  if (!has('products', 'unit')) db.exec("ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'each'");
  if (!has('products', 'category')) db.exec("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'General'");
  if (!has('carts', 'user_id')) db.exec('ALTER TABLE carts ADD COLUMN user_id INTEGER REFERENCES users(user_id)');

  const statusList = ORDER_STATUSES.map(s => `'${s}'`).join(',');
  db.exec(`CREATE TABLE IF NOT EXISTS orders (order_id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(user_id), status TEXT NOT NULL DEFAULT 'Placed' CHECK(status IN (${statusList})), total REAL NOT NULL CHECK(total >= 0), gst_included REAL NOT NULL CHECK(gst_included >= 0), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items (order_item_id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(order_id), product_id INTEGER NOT NULL REFERENCES products(product_id), product_name TEXT NOT NULL, unit_price REAL NOT NULL CHECK(unit_price >= 0), quantity INTEGER NOT NULL CHECK(quantity > 0), subtotal REAL NOT NULL CHECK(subtotal >= 0));
CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_date ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`);
}

module.exports = {ensureShopTables, ORDER_STATUSES};
