# Sprint 4 — CRUD Evidence Record

**Project:** Buildmart Secure Retail System
**Group:** Group 2 · Group Leader: Ranjan
**Repository:** https://github.com/CapstoneAB/capstone_A_B
**Verified:** 2 November 2026, against the running server on `http://localhost:3100`

This record completes the evidence checklist in the Sprint Weeks 8 & 9 CRUD workbook.
Every response below was captured from the live API, not written by hand.

## Tables used for CRUD

| Table | Role in CRUD | Why it matters |
| --- | --- | --- |
| `products` | Read | Holds product names, ids, prices, units and stock availability |
| `carts` | Read | Identifies an individual shopping cart and when it was created |
| `cart_items` | Create, Read, Update, Delete | Links products to carts and records the quantity selected |

`cart_items` is the table all four operations act on. `products` supplies the data each
line refers to, and the stock level every write is checked against.

---

## Create

**What users add:** a selected product, with a quantity, to the shopping cart.

**Endpoint:** `POST /api/carts/:id/items`

**Implementation:** the backend validates `product_id` and `quantity`, confirms the
product exists, checks the combined quantity against both the 20-item cap and the
available stock, then inserts the row. An `ON CONFLICT` clause means adding a product
already in the cart raises its quantity instead of creating a duplicate row.

```
$ curl -X POST localhost:3100/api/carts/1/items \
       -H 'Content-Type: application/json' -d '{"product_id":2,"quantity":2}'

201 Created
{"cart_id":1,
 "items":[{"cart_item_id":1,"product_id":2,"name":"Claw Hammer 450g",
           "price":24.95,"quantity":2,"subtotal":49.9}],
 "gst_included":4.54,"total":49.9}
```

| Expected result | Actual result |
| --- | --- |
| Item added, 201 Created, row appears in the database | **Pass** — item added and shown in the cart |

## Read

**What users view:** product records and shopping cart items — names, prices and the
quantities they selected.

**Endpoints:** `GET /api/products` and `GET /api/carts/:id/items`

**Implementation:** the cart query JOINs `cart_items` with `products` so each line
carries the product's name and price, and computes the line subtotal in SQL. The cart
total is summed from those subtotals and the GST component derived as
`total − total / 1.1`, because the stored prices are GST-inclusive.

```
$ curl localhost:3100/api/products

200 OK
[{"product_id":1,"name":"Bolt","description":"Zinc plated, M10",
  "price":12,"unit":"each","stock":50}, ... 8 products]
```

| Expected result | Actual result |
| --- | --- |
| 200 OK, all cart items returned as JSON | **Pass** — item and total displayed |

## Update

**What users modify:** the quantity of an existing cart item.

**Endpoint:** `PATCH /api/carts/:id/items/:productId`

**Implementation:** the backend validates the product id and the new quantity, confirms
the cart line already exists, checks the new quantity against the 20-item cap and the
available stock, then updates the row and returns the recalculated cart.

```
$ curl -X PATCH localhost:3100/api/carts/1/items/2 \
       -H 'Content-Type: application/json' -d '{"quantity":5}'

200 OK
{"cart_id":1,
 "items":[{"cart_item_id":1,"product_id":2,"name":"Claw Hammer 450g",
           "price":24.95,"quantity":5,"subtotal":124.75}],
 "gst_included":11.34,"total":124.75}
```

| Expected result | Actual result |
| --- | --- |
| 200 OK, quantity changed in the database, total updated | **Pass** — quantity and total updated |

## Delete

**What users remove:** a selected product from the cart, by cart id and product id.

**Endpoint:** `DELETE /api/carts/:id/items/:productId`

**Implementation:** the backend validates the product id, confirms the cart line exists,
deletes the row and confirms the deletion through `result.changes`, then returns the
updated cart so the page can re-draw with correct totals.

```
$ curl -X DELETE localhost:3100/api/carts/1/items/2

200 OK
{"cart_id":1,"items":[],"gst_included":0,"total":0}
```

| Expected result | Actual result |
| --- | --- |
| 200 OK, row removed from the database and the page | **Pass** — item removed |

---

## Validation activities

| Scenario | What was sent | Status | Message returned | Database |
| --- | --- | --- | --- | --- |
| Blank input field | `quantity` omitted | 400 | `product_id must be a positive integer and quantity must be a positive integer` | Unchanged |
| Missing information | empty request body | 400 | *(same message as above)* | Unchanged |
| Invalid data type | `quantity: "abc"` or `-2` | 400 | *(same message as above)* | Unchanged |
| Incorrect product id | `product_id: 999` | 404 | `Product not found` | Unchanged |
| Incorrect cart id | cart `999` | 404 | `Cart not found` | Unchanged |
| Incorrect cart item | `PATCH` a product not in the cart | 404 | `Cart item not found` | Unchanged |
| Duplicate record | same product added twice | 201 | No duplicate row — existing quantity raised | 1 row, qty 2 |
| Over the stock limit | 4 × Safety Glasses (stock 3) | 409 | Requested quantity exceeds available stock | Stays at 3 |
| Over the 20-item cap | 21 × Bolt (stock 50) | 400 | Maximum quantity per item is 20 | Stays at 20 |
| Wrong password | valid email, bad password | 401 | Invalid email or password | No session |
| Unknown email | email not registered | 401 | Invalid email or password | No session |
| Server unreachable | API stopped mid-session | — | Could not reach the server | Unchanged |

The first three scenarios return the **same** message. The `POST` handler validates
`product_id` and `quantity` in a single condition, so a blank field, a missing field and a
wrong data type are reported identically. Improving these messages to name the specific
offending field is listed under future improvements.

Captured live:

```
$ curl -X POST localhost:3101/api/carts/1/items -d '{"product_id":2}'
HTTP 400 {"error":"product_id must be a positive integer and quantity must be a positive integer"}

$ curl -X POST localhost:3101/api/carts/1/items -d '{"product_id":2,"quantity":"abc"}'
HTTP 400 {"error":"product_id must be a positive integer and quantity must be a positive integer"}

$ curl localhost:3100/api/carts/999/items
{"error":"Cart not found"}
```

The last two rows return the **same** message on purpose. A different message for a wrong
password than for an unknown email would let an attacker discover which email addresses
have accounts, so both paths answer identically.

---

## Automated test results

```
$ cd backend && npm test

1..77
# tests 77
# suites 0
# pass 77
# fail 0
```

| Test file | Tests | Covers |
| --- | --- | --- |
| `auth.test.js` | 45 | Hashing, register, login, verify, logout, password reset |
| `cart.test.js` | 20 | Full CRUD, stock limits, the 20-item cap, totals and GST |
| `static.test.js` | 7 | Page serving and path-traversal defence |
| `seed.test.js` | 5 | The 8 seeded products and cart 1 |
| **Total** | **77** | **All passing** |

Each test file creates its own temporary database, so `buildmart.db` is never modified by
a test run.

---

## Technical reflection

**The hardest problem.** Connecting the front end to the back end. Our `fetch` requests
were blocked by CORS errors, and the cart total did not refresh after an update or a
delete.

**How we solved it.** Express now serves the website pages itself, so the page and the API
share one origin and CORS never applies. Every cart change re-draws the drawer from the
JSON the API returns rather than from local state, and cart changes are sent one at a
time so rapid clicks cannot arrive out of order. Validation lives in the Express backend,
backed by SQLite primary keys, foreign keys and a unique constraint; stock availability
is checked before any quantity change is accepted.

**With more development time** we would link carts to user accounts, add `orders` and
`order_items` and decrement stock inside a transaction, build the forgot-password page
(the API already exists), extend the automated suite further, improve error messages, and
add structured server-side logging.

## Information flow

```
User → Frontend (HTML/CSS/JS) → Backend API (Node.js/Express) → Database (SQLite) → Response
```

The user interacts with the Buildmart front end to select products or change cart
quantities. The front end sends an HTTP request to the Express REST API. The backend
validates the request and executes the relevant SQLite query to retrieve or modify the
record. For a cart retrieval the backend reads the cart items, calculates each line
subtotal and the overall cart total, and returns the result as JSON so the front end can
display the updated cart to the user.

---

## Evidence checklist

- [x] Create functionality implemented and tested
- [x] Read functionality implemented and tested
- [x] Update functionality implemented and tested
- [x] Delete functionality implemented and tested
- [x] GitHub commits completed — 73 commits on `main`
- [x] GitHub repository updated
- [x] Documentation updated
- [ ] CRUD screenshots collected — **outstanding**
- [ ] API testing screenshots collected — **outstanding**
- [ ] Validation testing screenshots collected — **outstanding**
- [ ] Database screenshots collected — **outstanding**

The four outstanding items all require screenshots. The API responses and validation
results above are captured as text, which is evidence but is **not** what the workbook
asks for. The shot list is in [`demo-runbook.md`](demo-runbook.md).
