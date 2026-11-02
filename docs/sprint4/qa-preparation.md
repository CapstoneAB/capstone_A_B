# Sprint 4 — Q&A Preparation

All 28 questions published in the Sprint 4 brief, answered from this repository's actual
code. The Q&A session is 5 minutes. Whoever owns the topic answers; everyone else stays
quiet unless asked directly.

**Questions 21 and 22 are personal.** Each member writes their own answer — there is no
group answer for those two.

---

## Project questions

**1. What problem does your project solve?**
Buildmart is a hardware and home improvement retailer whose customers need to browse
stock, build a basket across a visit, and trust that what they see is actually available.
Before Sprint 4 the product data lived in the page, so prices and stock could drift from
reality; the cart existed only in browser memory, so a refresh lost it; and nothing
stopped a customer ordering more than existed in stock. We built a three-tier system
where the database is the single source of truth.

**2. Who are the users of the system?**
Retail customers who browse the catalogue, build a cart and create an account; returning
customers, who find their cart as they left it because it is stored server-side; and in
future store staff, since the schema already separates stock from display.

**3. What are the major features of your solution?**
A product catalogue loaded from the database, a database-backed shopping cart with
quantity controls and GST-inclusive totals, and secure user accounts with registration,
login, logout and password reset.

## Database questions

**4. How many entities are included in your ERD?**
**Six.** `products`, `carts`, `cart_items`, `users`, `password_resets` and
`revoked_tokens`.

**5. What is a primary key?**
A column that uniquely identifies each row in a table — no two rows can share a value and
it cannot be null. In our schema `product_id` is the primary key of `products`, so
product 2 always means the Claw Hammer.

**6. What is a foreign key?**
A column that points at another table's primary key, so the database can enforce that the
reference is real. `cart_items.cart_id` is a foreign key to `carts.cart_id` — SQLite will
refuse a cart line for a cart that does not exist. We turn this on explicitly with
`PRAGMA foreign_keys = ON`.

**7. Explain one important relationship in your database.**
`carts` to `cart_items` is one-to-many: one cart holds many lines, and each line belongs
to exactly one cart. Combined with the one-to-many from `products` to `cart_items`,
`cart_items` acts as the junction table resolving the many-to-many between carts and
products. A `UNIQUE(cart_id, product_id)` constraint means a product appears only once
per cart — adding it again raises the quantity instead of creating a second row.

**8. How does your database support the application?**
It holds every product, price, stock level and cart line, and enforces the rules itself
rather than trusting the application: `CHECK(quantity > 0)`, `CHECK(price >= 0)`, foreign
keys for referential integrity, and `UNIQUE COLLATE NOCASE` so usernames and emails are
unique regardless of letter case. Even if the API had a bug, the database would refuse
invalid data.

## Backend questions

**9. What is the role of the backend?**
Six things: validate every input, authorise the request by checking the bearer token,
enforce the business rules such as stock levels and the 20-item cap, query the database
with prepared statements, calculate the subtotals, total and GST, and respond with the
correct HTTP status and a consistent JSON shape.

**10. How does your backend connect to the database?**
Through the `better-sqlite3` package. `new Database(databasePath)` opens `buildmart.db`,
and every query uses a prepared statement — `db.prepare(...).get()` or `.all()` or
`.run()` — never string concatenation, which is what protects us from SQL injection.
`better-sqlite3` is synchronous, which kept the route handlers simple to read.

**11. What API endpoints were created?**
Five cart endpoints providing full CRUD — `GET /api/products`,
`GET /api/carts/:id/items`, `POST /api/carts/:id/items`,
`PATCH /api/carts/:id/items/:productId`, `DELETE /api/carts/:id/items/:productId` — and
six auth endpoints: `POST /auth/register`, `/auth/login`, `/auth/logout`,
`GET /auth/verify`, `POST /auth/forgot-password` and `/auth/reset-password`. Plus a
health check at `GET /`.

**12. Why did you choose your technology stack?**
Our data is strongly relational — a cart line is meaningless without its cart and its
product — so SQL rather than NoSQL, and foreign keys let the database refuse an orphaned
line. SQLite specifically because it needs zero configuration: the database is a single
file, so every member runs the same thing after one npm command, and each test file can
create its own temporary copy. Node and Express because the team already knew JavaScript
from the front end, so one language covers the whole stack.
*The trade-off:* SQLite handles one writer at a time. Fine for a single-store prototype;
a multi-store deployment would move to MySQL or PostgreSQL, and the schema would port
directly.

## Integration questions

**13. Explain how a user action reaches the database.**
Take clicking **+** on a cart line. `shop.html` sends
`PATCH /api/carts/1/items/2` with `{"quantity": 5}`. Express validates the id and
quantity, checks the 20-item cap and the stock level, then runs
`UPDATE cart_items SET quantity = 5 WHERE cart_id = 1 AND product_id = 2`. A JOIN
recalculates the line subtotal, cart total and GST, and the result returns as JSON. The
drawer re-draws showing quantity 5, line total $124.75 and GST included $11.34.

**14. How does the frontend retrieve data from the backend?**
With `fetch` to the API endpoints, which return JSON. Because Express serves the website
pages from the same origin as the API, no CORS configuration is needed.

**15. How is information displayed to users?**
The page renders whatever the API returned. After every cart change the drawer is
re-drawn from the response rather than from local state, which is what keeps the
displayed total and the stored total in step.

**16. What happens when a user submits new information?**
It is validated twice. The browser validates first for fast feedback — the registration
form checks the username, email and password rules as you type. Then the server re-checks
everything, because a browser can be bypassed. Only after the server's checks pass is
anything written to the database.

## Testing questions

**17. How did you test CRUD functionality?**
Three ways. 77 automated tests via `npm test`, of which 20 cover cart CRUD directly. 25
manual integration tests recorded in `TESTING.md`, run against the real pages with the
database open beside them. And direct API testing with curl, captured in
`docs/sprint4/crud-evidence.md`.

**18. What bugs were discovered?**
Seven, all recorded in `TESTING.md`. The significant ones: the shop page kept the cart
only in browser memory, so a refresh lost it; the database held 3 sample products while
the page showed 8; the front end allowed more items than were in stock; checkout claimed
"Order placed!" although no order is saved; and rapid clicking could send cart changes
out of order.

**19. How were those bugs resolved?**
The shop page now calls the cart API for every add, update and remove and draws the cart
from the server's response. `init-db.js` seeds the same 8 products the page shows. The
API checks stock and returns 409. The checkout message now says it is a demo checkout.
Cart changes are sent one at a time, so five quick clicks correctly save a quantity of
five.

**20. How does your system handle invalid input?**
With the correct HTTP status and a clear message, and the database unchanged. 400 for a
blank field, a missing field, a bad data type or exceeding the 20-item cap; 404 for an
unknown product or cart; 409 for exceeding available stock; 401 for bad credentials. The
full table is in `docs/sprint4/crud-evidence.md`.

## Contribution questions

**21. What was your personal contribution?**
*Each member answers for themselves.* Use your row in
`docs/sprint4/team-contributions.md` and name a specific pull request.

**22. What was the most difficult task?**
*Each member answers for themselves.* Name a specific problem, what you tried, and what
finally worked — not a general difficulty.

**23. How did GitHub support teamwork?**
Every feature started as an issue assigned to its owner, who worked on a feature branch
and opened a pull request that another member reviewed before merging. Nobody pushed
straight to `main` — 19 merged pull requests across 73 commits is the evidence. Two CI
workflows run the tests and validate the HTML on every pull request, so a change that
breaks the build cannot be merged.

**24. How was work divided across the group?**
By feature, matching the delivery plan in the README: Ranjan coordination, Kalyan product
display and data, Shailendra add-to-cart, Diya cart interface, Dipesh quantity update,
Sujan price calculation, Anjan testing and documentation. In Sprint 4 those widened into
back-end and integration work as the API and accounts were built.

## Future improvement questions

**25. What would you improve with more development time?**
First, link `carts` to `users` so each customer has their own cart rather than the one
shared cart the shop uses now. That single change unblocks most of the rest.

**26. What additional features would you add?**
An `orders` and `order_items` pair so checkout records a real order and decrements stock
inside a transaction; the forgot-password page, since the API already exists; and an
order history view.

**27. How could security be enhanced?**
Rate-limit the login endpoint to slow brute-force attempts; move the JWT from
`sessionStorage` into an httpOnly cookie so JavaScript cannot read it; add CSRF
protection once the token is in a cookie; enforce HTTPS in deployment; and add structured
logging of authentication failures.

**28. How could the project be expanded?**
An admin view for stock management, product search and category filtering, real payment
through Stripe or PayPal — the checkout flow is already structured so the payment step can
be dropped in — email confirmations, and a move to MySQL or PostgreSQL for multi-store use.

---

## Three things to volunteer before being asked

Presenting a known limitation as a deliberate scope decision reads as engineering
maturity. Being caught by one reads as an oversight.

1. **`carts` is not linked to `users`.** The shop uses one shared cart (cart 1), so the
   cart is saved in the database but does not belong to a logged-in account.
2. **There is no `orders` table.** Checkout clears the cart and reports a demo checkout;
   no order is recorded.
3. **Stock never decreases.** It is checked when items are added, but nothing decrements
   it, because orders do not exist yet.
