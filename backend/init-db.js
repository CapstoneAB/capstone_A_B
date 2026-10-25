const Database = require('better-sqlite3');
const {ensureAuthTables} = require('./auth/schema');
const db = new Database('buildmart.db');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS products (product_id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL CHECK(stock >= 0));
CREATE TABLE IF NOT EXISTS carts (cart_id INTEGER PRIMARY KEY, customer_name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS cart_items (cart_item_id INTEGER PRIMARY KEY, cart_id INTEGER NOT NULL REFERENCES carts(cart_id), product_id INTEGER NOT NULL REFERENCES products(product_id), quantity INTEGER NOT NULL CHECK(quantity > 0), UNIQUE(cart_id, product_id));`);
// User tables start empty (no sample users)
ensureAuthTables(db);
const insertProduct=db.prepare('INSERT OR IGNORE INTO products(product_id,name,price,stock) VALUES (?,?,?,?)');
[[1,'Hammer',19.95,20],[2,'Screwdriver Set',24.50,15],[3,'Paint Brush',8.99,30]].forEach(x=>insertProduct.run(...x));
db.prepare('INSERT OR IGNORE INTO carts(cart_id,customer_name) VALUES (?,?)').run(1,'Sample Customer');
const insertItem=db.prepare('INSERT OR IGNORE INTO cart_items(cart_item_id,cart_id,product_id,quantity) VALUES (?,?,?,?)');
[[1,1,1,2],[2,1,3,1]].forEach(x=>insertItem.run(...x));
console.log('Database ready: buildmart.db'); db.close();
