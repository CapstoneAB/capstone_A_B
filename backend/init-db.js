const path = require('path');
const Database = require('better-sqlite3');
const {ensureAuthTables} = require('./auth/schema');
const dbPath = process.env.BUILDMART_DB || path.join(__dirname, 'buildmart.db');
const reset = process.argv.includes('--reset');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
// npm run reset-db: removes all data, including user accounts, so the demo always starts clean.
// Dropping the tables also works while the server is running.
if (reset) db.exec(`DROP TABLE IF EXISTS cart_items; DROP TABLE IF EXISTS carts; DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS password_resets; DROP TABLE IF EXISTS revoked_tokens; DROP TABLE IF EXISTS users;`);
db.exec(`CREATE TABLE IF NOT EXISTS products (product_id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT, price REAL NOT NULL CHECK(price >= 0), unit TEXT NOT NULL DEFAULT 'each', stock INTEGER NOT NULL CHECK(stock >= 0));
CREATE TABLE IF NOT EXISTS carts (cart_id INTEGER PRIMARY KEY, customer_name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS cart_items (cart_item_id INTEGER PRIMARY KEY, cart_id INTEGER NOT NULL REFERENCES carts(cart_id), product_id INTEGER NOT NULL REFERENCES products(product_id), quantity INTEGER NOT NULL CHECK(quantity > 0), UNIQUE(cart_id, product_id));`);
// A buildmart.db made before Sprint 4 has no description or unit column
const columns = db.prepare('PRAGMA table_info(products)').all().map(c => c.name);
if (!columns.includes('description')) db.exec('ALTER TABLE products ADD COLUMN description TEXT');
if (!columns.includes('unit')) db.exec("ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'each'");
// User tables start empty (no sample users)
ensureAuthTables(db);

// The same 8 products the shop page shows (prices include GST). Running init-db again refreshes them.
const insertProduct = db.prepare(`INSERT INTO products(product_id,name,description,price,unit,stock) VALUES (?,?,?,?,?,?)
  ON CONFLICT(product_id) DO UPDATE SET name=excluded.name, description=excluded.description, price=excluded.price, unit=excluded.unit, stock=excluded.stock`);
[
  [1, 'Bolt', 'Zinc plated, M10', 12.00, 'each', 50],
  [2, 'Claw Hammer 450g', 'Fibreglass handle', 24.95, 'each', 20],
  [3, 'Interior Paint 4L', 'Low-sheen, white', 58.00, 'tin', 15],
  [4, 'Pine Timber 2.4m', '90 x 45mm treated', 12.40, 'length', 40],
  [5, 'LED Work Light', '2000 lumen, rechargeable', 79.50, 'each', 8],
  [6, 'Tape Measure 8m', 'Magnetic hook', 18.90, 'each', 25],
  [7, 'Garden Hose 30m', 'Kink-resistant', 44.00, 'each', 10],
  [8, 'Safety Glasses', 'Anti-fog, clear', 9.95, 'pair', 3]
].forEach(row => insertProduct.run(...row));

// Cart 1 is the demo cart the shop page uses. It starts empty.
db.prepare('INSERT OR IGNORE INTO carts(cart_id,customer_name) VALUES (?,?)').run(1, 'Demo Customer');
console.log(`Database ${reset ? 'reset' : 'ready'}: ${path.basename(dbPath)}`);
db.close();
