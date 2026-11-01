# Sprint 4 — Integrated System Test Plan (Frontend + Backend + Database)

Run with the backend started (`cd backend`, `npm run reset-db`, `npm start`) and the shop open at http://localhost:3000/shop.html.

Results below are from 1 November 2026. T01 to T16 and T19 to T25 were run in Microsoft Edge (headless) by a script that clicked the real pages and read `buildmart.db` after each step. Repeat them by hand before the live demo.
"Check DB" means open `backend/buildmart.db` in DB Browser for SQLite and look at the `cart_items` table (press F5 to refresh).
Screenshots of the main tests are in `docs/screenshots/`, named by test ID.

| ID | Category | Test | Steps | Expected result | Result |
|----|----------|------|-------|-----------------|--------|
| T01 | Read | Products load from database | Open shop.html | 8 products with price, unit and stock, same as the `products` table | ✅ Pass |
| T02 | Read | Cart loads from database | Refresh the page after adding items | Cart drawer still shows the same items (they are saved in the DB, not the browser) | ✅ Pass |
| T03 | Create | Add item to cart | Click Add to cart on Claw Hammer | Toast shows, badge = 1, new row in `cart_items` (cart 1, product 2, qty 1) | ✅ Pass |
| T04 | Create | Add same item again | Click Add to cart on Claw Hammer again | No new row; quantity in `cart_items` becomes 2 | ✅ Pass |
| T05 | Update | Increase quantity | Click + on a cart item | Quantity, line total and total update; `quantity` changes in DB | ✅ Pass |
| T06 | Update | Decrease quantity | Click − on an item with qty 2 | Quantity becomes 1 in page and DB | ✅ Pass |
| T07 | Delete | Remove item | Click Remove | Item leaves the drawer and its row is deleted from `cart_items` | ✅ Pass |
| T08 | Delete | Decrease to zero | Click − on an item with qty 1 | Item is removed (DELETE request), row gone from DB | ✅ Pass |
| T09 | Calculation | Totals and GST | Add Paint (58.00) x2 and Bolt (12.00) x1 | Total $128.00, GST included $11.64 | ✅ Pass |
| T10 | Validation | Stock limit | Add Safety Glasses (stock 3) four times | 4th click shows "Requested quantity exceeds available stock" (409); DB stays at 3 | ✅ Pass |
| T11 | Validation | 20 item cap | Click + on Bolt (stock 50) until 21 | Shows "Maximum quantity per item is 20" (400); DB stays at 20 | ✅ Pass |
| T12 | Validation | Bad quantity (API) | Send PATCH with quantity -1 or "abc" (Thunder Client / Postman) | 400 error, nothing changes in DB | ✅ Pass |
| T13 | Error handling | Product does not exist (API) | POST product_id 999 | 404 "Product not found" | ✅ Pass |
| T14 | Error handling | Cart does not exist (API) | GET /api/carts/999/items | 404 "Cart not found" | ✅ Pass |
| T15 | Error handling | Backend not running | Lose the connection and click Add to cart, then open shop.html without the server | "Could not reach the server" message both times, no crash, cart unchanged | ✅ Pass |
| T16 | Checkout | Checkout empties cart | Add items, click Checkout | "Demo checkout complete" message with the total, cart empty, `cart_items` has no rows for cart 1 (no order is recorded yet) | ✅ Pass |
| T17 | Automated | Full test suite | `cd backend`, `npm test` | 77 tests, 77 pass, 0 fail | ✅ Pass |
| T18 | Automated | GitHub Actions | Open the Actions tab on GitHub | Backend tests and Frontend check workflows are green | ✅ Pass (PR #53) |
| T19 | Accounts | Register through the page | Fill in register.html and submit | Account created; `users` stores a bcrypt hash, not the password | ✅ Pass |
| T20 | Validation | Wrong password | Log in with the wrong password | "Invalid email or password"; still logged out | ✅ Pass |
| T21 | Accounts | Correct password | Log in with the right password | "You are logged in as ..." and the form is hidden | ✅ Pass |
| T22 | Accounts | Refresh and log out | Refresh login.html, then click Log out | Still logged in after refresh; after log out the old token gets 401 | ✅ Pass |
| T23 | Security | Nothing secret in URLs | Check every URL requested in T19 to T22 | The password and token never appear in a URL | ✅ Pass |
| T24 | Layout | Phone width | Open shop.html at 375px wide | No sideways scrolling | ✅ Pass |
| T25 | Quality | Browser errors | Watch for errors during all tests above | No uncaught JavaScript errors | ✅ Pass |

## Issues found and fixed

| Issue | How we found it | Fix |
|-------|-----------------|-----|
| The shop page kept the cart only in browser memory, so nothing was saved in the database and a refresh lost the cart | Integration testing in Sprint 4 | shop.html now calls the cart API for every add, update and remove, and draws the cart from the server's response |
| Products in the database (3 samples) did not match the 8 products on the shop page | Comparing the `products` table with the page | init-db.js now seeds the same 8 products with stock levels; the page loads them from GET /api/products |
| The front end allowed more items than were in stock | Stock limit test (T10) | The API checks stock and returns 409; the page shows the message |
| Checkout said "Order placed!" although no order is saved | Reviewing the checkout flow against the database | The message now says it is a demo checkout, and the README lists orders as future work |
| Quick clicks could send cart changes out of order | Reviewing the new fetch calls | shop.html sends cart changes one at a time; five quick clicks now save a quantity of 5 |
| The login page never called the login API | Comparing login.js with the auth routes | login.js now logs in and out through /auth/login and /auth/logout |
| Test case 12 in the table below expected Remove to lower the quantity by 1, but Remove takes the whole item out | Comparing the test plan with the code | Corrected the test case. The − button lowers the quantity by 1 |

---

# Shopping Cart Module — Test Plan & Results

Manual test cases run against the Buildmart shopping cart feature before merge.

| # | Test Case | Steps | Expected Result | Result |
|---|-----------|-------|------------------|--------|
| 1 | Product grid loads | Open the shop page | All 8 products display with name, price, and unit | ✅ Pass |
| 2 | Add item to cart | Click "Add to cart" on a product | Cart count badge increments, confirmation toast appears | ✅ Pass |
| 3 | Open/close cart drawer | Click the Cart button, then the close (×) button | Drawer slides open, then slides closed | ✅ Pass |
| 4 | Close cart with Escape key | Open drawer, press Escape | Drawer closes | ✅ Pass |
| 5 | Empty cart state | Open drawer with no items added | "Your cart is empty" message shown, Checkout disabled | ✅ Pass |
| 6 | Increase quantity | Click "+" on a cart item | Quantity and line total update | ✅ Pass |
| 7 | Decrease quantity to zero | Click "−" until quantity reaches 0 | Item is removed from the cart automatically | ✅ Pass |
| 8 | Remove item | Click "Remove" on a cart item | Item disappears from cart, totals recalculate | ✅ Pass |
| 9 | Subtotal / GST / Total accuracy | Add several items, compare displayed totals to manual calculation | Subtotal equals sum of line totals; GST is 10% backed out of GST-inclusive price | ✅ Pass |
| 10 | Checkout with items | Add items, click Checkout | Demo checkout message with the total shown, cart empties, drawer closes | ✅ Pass |
| 11 | Checkout disabled when empty | Open drawer with empty cart | Checkout button is disabled | ✅ Pass |
| 12 | Add same item twice, then remove | Add an item, add it again, then click Remove | The whole item is removed, whatever the quantity | ✅ Pass |
| 13 | Large cart totals | Add 5+ different items, open cart | Subtotal, GST, and Total all match manual calculation | ✅ Pass |

## Notes
- Tested in Chrome and Edge at desktop and mobile widths.
- No known open bugs at time of merge.

# User Accounts (Registration, Auth API, Password Hashing) — Tests

Covers issues #35 (registration form), #36 (auth API) and #37 (password hashing and reset).

## How to run

In the backend folder run `npm install`, then `npm test`. This runs all 77 automated tests: the 20 cart tests, 45 auth tests, 7 static file tests and 5 seed data tests. Every test file makes its own temporary database, so buildmart.db is never changed. The auth tests use a test-only JWT secret and a made-up password.

## Automated tests — backend/tests/auth.test.js (45 tests)

**Password hashing and rules (9)**
- A hash is never equal to the password and uses bcrypt cost 12
- verifyPassword accepts the right password and rejects a wrong or empty one
- Two hashes of the same password are different (salted)
- hashPassword refuses a password longer than 72 bytes
- verifyPassword rejects the right password with extra text after 72 bytes (bcrypt would otherwise ignore the extra part)
- A strong password passes every rule
- Each missing rule is reported: length, uppercase, lowercase, number, symbol
- The 72 byte limit counts bytes, not characters (accented letters use 2 bytes)
- ensureAuthTables creates the three auth tables, can run twice, and adds no users

**Register (8)**
- Success returns 201 with only user_id, username and email, and the email is stored in lower case
- A taken username returns 409, even in a different letter case
- A taken email in a different letter case returns 409
- A weak password returns 400 and lists the missing rules
- Bad emails return 400
- Bad usernames return 400 (too short, too long, spaces, dashes, empty, not text)
- An empty body returns 400 with an error for every field
- The value stored in the users table is a bcrypt hash, not the password

**Login (6)**
- Success returns a token signed with HS256 that lasts 1 hour, with sub, username and jti
- Each login gets a different token id (jti)
- A wrong password returns 401 "Invalid email or password"
- An unknown email returns the same 401
- Missing fields return 400
- The server refuses to start in production without JWT_SECRET

**Verify and logout (13)**
- Verify with a valid token returns the user
- Verify returns 401 with no token, the wrong header format, a garbage token, a token signed with a different secret, an expired token, an unsigned (alg none) or HS512 token, and a token for a user that does not exist
- After logout the same token gets 401 from verify, and logging out again also gets 401
- Logout only ends that login, not the user's other logins
- Logout without a token returns 401
- Logout removes expired rows from revoked_tokens
- Tokens issued before password_changed_at are rejected, and a new login straight after still works

**Password reset (9)**
- Full reset flow: the old password stops working and the new one works
- A login token from before the reset stops working
- An unknown or empty email gets exactly the same response, and no token is made
- Only the SHA-256 hash of the reset token is stored, and it expires after 30 minutes
- A reset token cannot be used twice
- An expired reset token is rejected
- A weak new password is rejected, and the same link can still be used afterwards
- Made-up or missing reset tokens are rejected
- Asking for a new reset link cancels the older one

## Automated tests — backend/tests/static.test.js (7 tests)

- GET /login.html returns the login page as HTML
- Every root .html page is served (including register.html)
- /css/style.css and /js/login.js are served
- The health check at / still returns JSON
- These return 404: /backend/buildmart.db, /backend/server.js, /backend/package.json, node_modules, /.git/config, .github, /.htmlvalidate.json, /docs/, /README.md, /intro_ranjan.txt, and the bare /css/ and /js/ folders
- A missing page returns 404
- Encoded ../ paths (%2e%2e, %2f, %5c) cannot reach files outside css and js

## Manual test cases — Registration page

Start the backend (`npm start` in backend) and open http://localhost:3000/register.html.

| # | Test Case | Steps | Expected Result | Result |
|---|-----------|-------|------------------|--------|
| 1 | Weak password | Type `password` | Meter shows "weak" in red; uppercase, number and symbol rules stay unticked | |
| 2 | Fair and strong password | Type `Sample#P1`, then `Sample#Pass1` | "fair" (amber) for 8 to 11 characters, "strong" (green) for 12 or more; all rules ticked | |
| 3 | Confirm password mismatch | Type a different value in Confirm password | "Passwords do not match." once it is as long as the password; changes to "Passwords match." when fixed | |
| 4 | Show / hide password | Click "Show password" | Both password fields show the text, button changes to "Hide password" | |
| 5 | Bad username or email | Type `ab` or `not-an-email`, then leave the field | Error under the field, clears as soon as it is fixed | |
| 6 | Submit with errors | Click "Create account" with a bad field | No request is sent, message at the top, first bad field gets focus | |
| 7 | Successful registration | Fill in valid details and submit | Green "Account created" message with a "Log in now" link; form is cleared | |
| 8 | Duplicate email | Register again with the same email in different capitals | "An account with that email already exists." under Email | |
| 9 | Duplicate username | Register again with the same username | "That username is already taken." under Username | |
| 10 | Register link | Open login.html and click "Register" | Goes to register.html | |
| 11 | Phone width | DevTools device mode, about 375px wide | No sideways scrolling, rules checklist in one column | |
| 12 | Server stopped | Stop the backend and submit | "Could not reach the server" message, button works again | |
| 13 | Password not stored | DevTools Application and Network tabs | Nothing in Local Storage, Session Storage or Cookies; password only in the POST body, never in a URL | |
