# Sprint 4 — Database Design

**Project:** Buildmart Secure Retail System
**Group:** Group 2 — Ranjan, Kalyan, Shailendra, Diya, Dipesh, Sujan, Anjan
**Database:** SQLite, through the `better-sqlite3` package
**Created by:** `backend/schema.js` (shop and order tables), `backend/auth/schema.js` (account tables) and `backend/init-db.js` (sample data)

This describes the database as it is built now. It replaces the planned model in [`docs/week4/data-dictionary.md`](../week4/data-dictionary.md), which was written before the backend existed.

## Entity Relationship Diagram

The database has **8 entities**: three for the shop, two for orders and three for user accounts.

```mermaid
erDiagram
    PRODUCTS ||--o{ CART_ITEMS : "appears in"
    CARTS ||--o{ CART_ITEMS : "contains"
    USERS |o--o| CARTS : "owns"
    USERS ||--o{ ORDERS : "places"
    ORDERS ||--|{ ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ ORDER_ITEMS : "appears in"
    USERS ||--o{ PASSWORD_RESETS : "requests"

    PRODUCTS {
        INTEGER product_id PK
        TEXT name
        TEXT description
        TEXT category
        REAL price
        TEXT unit
        INTEGER stock
    }
    CARTS {
        INTEGER cart_id PK
        TEXT customer_name
        INTEGER user_id FK "UK, empty for the guest cart"
        TEXT created_at
    }
    ORDERS {
        INTEGER order_id PK
        INTEGER user_id FK
        TEXT status
        REAL total
        REAL gst_included
        TEXT created_at
    }
    ORDER_ITEMS {
        INTEGER order_item_id PK
        INTEGER order_id FK
        INTEGER product_id FK
        TEXT product_name
        REAL unit_price
        INTEGER quantity
        REAL subtotal
    }
    CART_ITEMS {
        INTEGER cart_item_id PK
        INTEGER cart_id FK
        INTEGER product_id FK
        INTEGER quantity
    }
    USERS {
        INTEGER user_id PK
        TEXT username UK
        TEXT email UK
        TEXT password_hash
        TEXT created_at
        TEXT password_changed_at
    }
    PASSWORD_RESETS {
        INTEGER reset_id PK
        INTEGER user_id FK
        TEXT token_hash UK
        INTEGER expires_at
        INTEGER used_at
    }
    REVOKED_TOKENS {
        TEXT jti PK
        INTEGER expires_at
    }
```

## Relationships

| Relationship | Type | Foreign key | What it means |
| --- | --- | --- | --- |
| carts → cart_items | One-to-many | `cart_items.cart_id` | One cart holds many lines |
| products → cart_items | One-to-many | `cart_items.product_id` | One product can be in many carts |
| users → carts | One-to-zero-or-one | `carts.user_id` (unique) | A user has at most one saved cart. Guest cart 1 has no user |
| users → orders | One-to-many | `orders.user_id` | One user can place many orders |
| orders → order_items | One-to-many | `order_items.order_id` | One order holds one or more lines |
| products → order_items | One-to-many | `order_items.product_id` | One product can be in many orders |
| users → password_resets | One-to-many | `password_resets.user_id` | One user can request many resets |

`cart_items` resolves the many-to-many relationship between carts and products, and `order_items` does the same for orders and products. `revoked_tokens` stands alone because it stores the ID of a logged-out token, not a link to a user.

**Why order_items copies the name and price:** a product's price can change after an order is placed. Keeping `product_name` and `unit_price` on each order line means an old order always shows what the customer actually paid.

## Data dictionary

### products

| Column | Type | Rules | Description |
| --- | --- | --- | --- |
| product_id | INTEGER | Primary key | Unique product number. `shop.html` uses it to pick the icon |
| name | TEXT | Required | Name shown to the customer |
| description | TEXT | Optional | Short detail, for example "Fibreglass handle" |
| category | TEXT | Required, defaults to General | Hardware, Tools, Paint, Timber, Garden or Safety. Used by the shop's category filter |
| price | REAL | Required, 0 or more | Price in AUD, including GST |
| unit | TEXT | Required, defaults to each | Selling unit: each, tin, length or pair |
| stock | INTEGER | Required, 0 or more | Units available |

### carts

| Column | Type | Rules | Description |
| --- | --- | --- | --- |
| cart_id | INTEGER | Primary key | Unique cart number |
| customer_name | TEXT | Required | Name on the cart (the username for a user's cart) |
| user_id | INTEGER | Optional, foreign key to users, unique | The account that owns the cart. Empty for the guest cart |
| created_at | TEXT | Required, defaults to now | When the cart was created |

### cart_items

| Column | Type | Rules | Description |
| --- | --- | --- | --- |
| cart_item_id | INTEGER | Primary key | Unique line number |
| cart_id | INTEGER | Required, foreign key to carts | The cart this line belongs to |
| product_id | INTEGER | Required, foreign key to products | The product on this line |
| quantity | INTEGER | Required, more than 0 | Units of the product |

`cart_id` and `product_id` are unique together, so a product appears only once per cart. Adding it again raises the quantity.

### orders

| Column | Type | Rules | Description |
| --- | --- | --- | --- |
| order_id | INTEGER | Primary key | Unique order number |
| user_id | INTEGER | Required, foreign key to users | Who placed the order |
| status | TEXT | Required, one of Placed, Processing, Shipped, Delivered, Cancelled. Defaults to Placed | Where the order is up to |
| total | REAL | Required, 0 or more | Order total, including GST |
| gst_included | REAL | Required, 0 or more | The GST part of the total |
| created_at | TEXT | Required, defaults to now | When the order was placed (UTC) |

### order_items

| Column | Type | Rules | Description |
| --- | --- | --- | --- |
| order_item_id | INTEGER | Primary key | Unique line number |
| order_id | INTEGER | Required, foreign key to orders | The order this line belongs to |
| product_id | INTEGER | Required, foreign key to products | The product bought |
| product_name | TEXT | Required | Product name when the order was placed |
| unit_price | REAL | Required, 0 or more | Price per unit when the order was placed |
| quantity | INTEGER | Required, more than 0 | Units bought |
| subtotal | REAL | Required, 0 or more | unit_price × quantity |

### users

| Column | Type | Rules | Description |
| --- | --- | --- | --- |
| user_id | INTEGER | Primary key | Unique user number |
| username | TEXT | Required, unique in any letter case | Login display name |
| email | TEXT | Required, unique in any letter case | Used to log in |
| password_hash | TEXT | Required | bcrypt hash. The password itself is never stored |
| created_at | TEXT | Required, defaults to now | When the account was created |
| password_changed_at | TEXT | Optional | Login tokens issued before this time stop working |

### password_resets

| Column | Type | Rules | Description |
| --- | --- | --- | --- |
| reset_id | INTEGER | Primary key | Unique reset number |
| user_id | INTEGER | Required, foreign key to users | Who asked for the reset |
| token_hash | TEXT | Required, unique | SHA-256 hash of the reset token |
| expires_at | INTEGER | Required | When the token expires (30 minutes after it is made) |
| used_at | INTEGER | Optional | When the token was used. Tokens work once |

### revoked_tokens

| Column | Type | Rules | Description |
| --- | --- | --- | --- |
| jti | TEXT | Primary key | ID of a login token that was logged out |
| expires_at | INTEGER | Required | When the token would expire. Expired rows are cleaned up on logout |

## Business rules

| # | Rule | Where it is enforced |
| --- | --- | --- |
| 1 | A cart line must point to a real cart and a real product | Foreign keys, plus 404 from the API |
| 2 | Quantity must be a whole number above 0 | `CHECK` constraint, plus 400 from the API |
| 3 | A customer can have at most 20 of one product | API returns 400 |
| 4 | A customer cannot add more than the stock available | API returns 409 |
| 5 | A product appears only once per cart | `UNIQUE(cart_id, product_id)` |
| 6 | Prices include GST. GST shown is total − total / 1.1 | `getCart` in `backend/server.js` |
| 7 | Usernames and emails are unique in any letter case | `UNIQUE COLLATE NOCASE` |
| 8 | Passwords are stored only as bcrypt hashes | `backend/auth/passwords.js` |
| 9 | A user has at most one saved cart, and only they can use it | Unique index on `carts.user_id`; API returns 401/403 |
| 10 | Only a logged-in user can check out, and the cart must not be empty | API returns 401 / 400 |
| 11 | Checkout takes the stock; if any product is short, nothing is saved | One database transaction; API returns 409 |
| 12 | A customer can only cancel their own order, only while it is Placed, and the stock goes back | API returns 404 / 409 |
| 13 | Order status must be one of the five allowed values | `CHECK` constraint |

## Indexes

Primary keys and `UNIQUE` columns are indexed automatically. These extra indexes are in `backend/schema.js`:

| Index | Columns | Why |
| --- | --- | --- |
| idx_carts_user | carts(user_id), unique | Find a user's cart quickly, and allow only one per user |
| idx_products_category | products(category) | The category filter |
| idx_cart_items_product | cart_items(product_id) | Foreign key lookups on cart lines |
| idx_orders_user_date | orders(user_id, created_at) | Order history: one user's orders by date |
| idx_order_items_order | order_items(order_id) | Loading the lines of one order |

## Why SQL (SQLite) and not NoSQL

- The data is relational: carts, orders and products link to each other, and foreign keys stop a line pointing at a product or order that doesn't exist.
- Checkout needs a transaction: the order, its lines, the stock change and emptying the cart must all happen or none of them. SQL databases do this well.
- `CHECK`, `UNIQUE` and `NOT NULL` rules keep bad data out even if the API had a bug.
- SQLite is a single file with no server to install, which suits a student project and a classroom demo. For a real store we would move to MySQL or PostgreSQL with the same tables.

## Seed data

`npm run init-db` adds the 8 shop products with stock, plus an empty cart 1. `npm run reset-db` deletes everything, including user accounts, and rebuilds this seed.

| product_id | name | description | category | price | unit | stock |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Bolt | Zinc plated, M10 | Hardware | 12.00 | each | 50 |
| 2 | Claw Hammer 450g | Fibreglass handle | Tools | 24.95 | each | 20 |
| 3 | Interior Paint 4L | Low-sheen, white | Paint | 58.00 | tin | 15 |
| 4 | Pine Timber 2.4m | 90 x 45mm treated | Timber | 12.40 | length | 40 |
| 5 | LED Work Light | 2000 lumen, rechargeable | Tools | 79.50 | each | 8 |
| 6 | Tape Measure 8m | Magnetic hook | Tools | 18.90 | each | 25 |
| 7 | Garden Hose 30m | Kink-resistant | Garden | 44.00 | each | 10 |
| 8 | Safety Glasses | Anti-fog, clear | Safety | 9.95 | pair | 3 |

Stock is checked when items are added and again at checkout. Checkout lowers the stock, and cancelling an order puts it back.
