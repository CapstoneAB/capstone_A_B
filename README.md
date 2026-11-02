Capstone B - Buildmart (Secure Retail System)
Project Overview

Buildmart is a full-stack e-commerce site for a hardware and home goods store, built across Capstone A and Capstone B. The front end (HTML, CSS, JavaScript) talks to a Node.js and Express API, which stores data in a SQLite database. Its centrepiece is the Shopping Cart module, delivered feature-by-feature by the team using a real Git workflow: issues, feature branches, pull requests, and code review.
Features

    Home page with hero section and feature highlights
    About page with project overview, description, and the team's delivery plan
    Shop page - the Shopping Cart module: products loaded from the database, a category filter, add to cart, cart drawer, quantity controls and GST-inclusive totals. Every cart change is saved in the database through the cart API. Guests share a guest cart; a logged-in user gets their own cart that is kept between logins
    Checkout - a logged-in user's cart becomes an order. The server checks stock again, saves the order and its items, takes the stock and empties the cart
    My Orders page - order history with filters (status, date, total), pages, an expandable item list for each order, and cancelling an order that is still Placed (the stock goes back)
    Contact page with name, email, subject, and message fields
    Login page connected to the auth API: log in, stay logged in across pages in the same tab, and log out. The Forgot password link has no page yet (the API for it exists)
    Registration page with real-time validation: username and email checks, a password strength meter, a live checklist of the password rules and a confirm password field. It creates the account through the backend auth API
    User accounts in the backend: register, login with a JWT token, logout, token check and password reset, with passwords hashed using bcrypt
    Shared stylesheet for a consistent colour scheme, typography, and responsive layout across all pages

Project Structure

capstone_A_B/
├── index.html        # Home page
├── about.html         # About page (project overview + delivery plan)
├── shop.html          # Shopping cart module (uses the cart API)
├── contact.html       # Contact page
├── login.html         # Login page (sends the form to POST /auth/login)
├── register.html      # Registration page (sends the form to POST /auth/register)
├── orders.html        # My Orders page (order history, details, cancel)
├── css/style.css      # Shared stylesheet
├── css/login.css      # Login page styles
├── css/register.css   # Registration page styles (strength meter, rules checklist)
├── css/orders.css     # My Orders page styles
├── js/login.js        # Login form validation, login and logout API calls
├── js/register.js     # Registration form validation and API call
├── js/orders.js       # Loads, filters, pages and cancels orders through the order API
├── TESTING.md         # Sprint 4 integrated test plan, cart and account tests
├── intro_ranjan.txt   # Introduction file
├── docs/              # Week 2 data analysis, Week 4 data dictionary, Sprint 4 ERD and database design, test screenshots
├── backend/           # Node.js + Express + SQLite API
│   ├── server.js      # Express server: product, cart and order routes
│   ├── schema.js      # Creates the products, carts, cart_items, orders and order_items tables and indexes
│   ├── init-db.js     # Creates buildmart.db and loads the 8 products (--reset rebuilds it)
│   ├── auth/          # User accounts
│   │   ├── schema.js      # Creates the users, revoked_tokens and password_resets tables
│   │   ├── passwords.js   # bcrypt hashing and the password strength rules
│   │   ├── routes.js      # The /auth endpoints
│   │   └── middleware.js  # requireAuth (checks the Bearer token)
│   └── tests/         # API tests (node:test)
└── README.md          # Project documentation

Delivery Plan - Team & Responsibilities

    Ranjan — Project Coordination
    Kalyan — Product Display Page
    Shailendra — Add to Cart Function
    Diya — Shopping Cart Interface
    Dipesh — Quantity Update Feature
    Sujan — Total Price Calculation
    Anjan — Testing & Documentation

Git Workflow Used

    Each team member works on their own feature branch off main, matching their role above
    Each feature is tracked with a GitHub Issue assigned to its owner
    Changes are committed and pushed on the feature branch
    A Pull Request is opened and code reviewed before merging into main

How to Run

Front end:

    Clone the repo
    Open index.html in your browser

Backend, needs Node.js 18 or later:

    cd backend
    npm install
    npm run init-db     (creates buildmart.db; it is gitignored, so run this after every fresh clone)
    npm run reset-db    (deletes all data, including user accounts, and rebuilds the sample data; use before a demo)
    npm start           (http://localhost:3000)
    npm test

The shop and registration pages need the backend because they use the API. Open http://localhost:3000/shop.html (opening shop.html straight from the folder will not load products). Start the backend and open http://localhost:3000/register.html. The backend also serves the website pages, so every page works from http://localhost:3000 (for example http://localhost:3000/index.html).

Running with a fixed JWT secret:

If JWT_SECRET is not set, the server makes a random secret each time it starts and prints a warning. That is fine for testing, but everyone is logged out when the server restarts. To use a fixed secret:

    JWT_SECRET=your-long-random-secret npm start                  (macOS, Linux or Git Bash)
    $env:JWT_SECRET="your-long-random-secret"; npm start          (Windows PowerShell)

To make a random secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Never commit the secret to the repo. With NODE_ENV=production the server will not start without JWT_SECRET.

Testing & CI

To run the tests, go into backend and run npm test (after npm install and npm run init-db). The tests use their own temporary database, so buildmart.db is not changed.

There are 20 API tests in backend/tests/cart.test.js. They cover the health check, the product list, adding, updating and removing cart items, totals and GST, bad input (zero, negative or non-number quantities), missing carts, products and items, stock limits and the 20-item quantity cap.

There are also 45 tests in backend/tests/auth.test.js (password hashing, register, login, verify, logout and password reset), 7 tests in backend/tests/static.test.js (which files the server will and will not serve), 5 tests in backend/tests/seed.test.js (the seed data and reset-db) and 23 tests in backend/tests/orders.test.js (the product API, carts linked to accounts, checkout, order history, filters and cancelling), so 100 tests in total. See TESTING.md for the full list.

GitHub Actions (.github/workflows/backend-tests.yml) runs the tests automatically on every push and pull request to main.

The Frontend check workflow (.github/workflows/frontend-check.yml) runs html-validate on every HTML page on each push and pull request to main, using the rules in .htmlvalidate.json. To run the same check yourself, run npx --yes html-validate@9 *.html in the project folder.

How the System Works (Frontend - Backend - Database)

    User clicks a button on the page (for example Add to cart on shop.html)
    JavaScript sends a request with fetch(), for example POST /api/carts/1/items with {"product_id": 2, "quantity": 1}
    Express checks the input (valid ids, quantity 1 to 20, enough stock)
    The backend runs a SQL statement on buildmart.db with better-sqlite3 (prepared statements, so input is never joined into the SQL)
    The backend reads the cart back from the database, works out the line subtotals, total and GST, and returns JSON
    The page redraws the cart drawer from that JSON, or shows the error message in a pop-up if the request failed

CRUD in the system

    Create  - Add to cart                POST   /api/carts/:id/items
              Place an order (checkout)  POST   /api/orders
              Register an account        POST   /auth/register
    Read    - Products, categories       GET    /api/products, /api/products/:id, /api/categories
              Cart                       GET    /api/carts/:id/items, /api/my-cart
              Orders                     GET    /api/users/:id/orders, /api/orders/:orderId
    Update  - + / - quantity             PATCH  /api/carts/:id/items/:productId
              Cancel an order            PATCH  /api/orders/:orderId
    Delete  - Remove item                DELETE /api/carts/:id/items/:productId

Backend API

    GET    /                                health check
    GET    /api/products                    list products; optional ?category=Tools, ?page=1&limit=4 (X-Total-Count header gives the full count)
    GET    /api/products/:id                one product (404 if missing)
    GET    /api/products/category/:category products in one category (any letter case)
    GET    /api/categories                  each category with its product count
    GET    /api/my-cart                     the logged-in user's own cart (made the first time); needs a login token
    GET    /api/carts/:id/items             cart items, line subtotals, gst_included and total
    POST   /api/carts/:id/items             body {"product_id": 1, "quantity": 2}; adds or increases quantity
    PATCH  /api/carts/:id/items/:productId  body {"quantity": 5}; sets quantity
    DELETE /api/carts/:id/items/:productId  removes the item

Cart 1 is the guest cart and needs no login. A cart that belongs to an account needs that account's token: no token returns 401, another user's token returns 403.

Prices are GST-inclusive, matching shop.html, so gst_included is total minus total / 1.1.
Errors: 400 for bad input, 404 for a missing cart or product, 409 when quantity is more than stock.
A quantity over 20 per item returns 400 (same limit as the front end).

Order API (all need a login token)

    POST   /api/orders                      checkout: turns the user's cart into an order
    GET    /api/orders/:orderId             one order with its items (another user's order returns 404)
    PATCH  /api/orders/:orderId             body {"status": "Cancelled"}; only while the order is Placed, and the stock goes back
    GET    /api/users/:id/orders            order history, newest first; filters status, from, to (YYYY-MM-DD), min_total, max_total, page, limit

Checkout errors: 400 if the cart is empty, 409 if a product no longer has enough stock (nothing is saved and no stock changes, because checkout runs in one database transaction).
Each order item keeps the product name and price at the time of the order, so later price changes don't change old orders.

Database tables: products, carts, cart_items, orders, order_items, users, password_resets, revoked_tokens. The ERD and full data dictionary are in docs/sprint4/database-design.md.

Auth API

    POST   /auth/register         body {"username", "email", "password"}; creates an account
    POST   /auth/login            body {"email", "password"}; returns a login token
    GET    /auth/verify           header Authorization: Bearer <token>; checks the token
    POST   /auth/logout           header Authorization: Bearer <token>; ends that login
    POST   /auth/forgot-password  body {"email"}; makes a password reset token
    POST   /auth/reset-password   body {"token", "password"}; sets a new password

POST /auth/register
    Username: 3 to 20 letters, numbers or underscore. Email: a valid address (stored in lower case).
    Password: 8 or more characters, at most 72 bytes, with an uppercase letter, a lowercase letter, a number and a symbol.
    201 {"user_id": 1, "username": "alex_b", "email": "alex@example.com"}
    400 {"error": "Please fix the highlighted fields.", "fields": {"username": "...", "email": "...", "password": "..."}}  (only the fields that are wrong)
    409 {"error": "Username or email is already registered.", "fields": {"username": "..."} or {"email": "..."}}
    Usernames and emails are unique in any letter case, so Alex@Example.com and alex@example.com are the same account.

POST /auth/login
    200 {"token": "<JWT>", "expires_in": 3600, "user": {"user_id": 1, "username": "alex_b", "email": "alex@example.com"}}
    400 {"error": "Email and password are required."}
    401 {"error": "Invalid email or password"}  (the same for a wrong password and an unknown email)

GET /auth/verify
    200 {"valid": true, "user": {"user_id": 1, "username": "alex_b", "email": "alex@example.com"}}
    401 {"error": "Invalid or expired token"}  (missing, wrong, expired, logged out, or issued before a password reset)

POST /auth/logout
    200 {"message": "Logged out"}
    401 {"error": "Invalid or expired token"}

POST /auth/forgot-password
    200 {"message": "If that email is registered, a reset link has been sent."}  (always the same answer)
    There is no email service yet, so in development the reset token is printed in the server console.

POST /auth/reset-password
    200 {"message": "Your password has been reset. Please log in with your new password."}
    400 {"error": "This reset link is invalid or has expired."}  (unknown, expired or already used token)
    400 {"error": "Please choose a stronger password.", "fields": {"password": "..."}}  (the token can still be used)

Auth tables: users, revoked_tokens, password_resets. They are created automatically when the server starts and by npm run init-db. No sample users are added.

Security

    Passwords are hashed with bcrypt (bcryptjs, cost factor 12) and are never stored, logged or returned in plain text
    Passwords longer than 72 bytes are refused, because bcrypt ignores anything after 72 bytes
    Login gives a JWT signed with HS256 that expires after 1 hour. Only HS256 is accepted when checking a token
    A wrong email and a wrong password get the same error and take the same time, so login doesn't reveal which emails are registered
    Logout puts the token's id (jti) on a revoked-token list, so that token stops working straight away. Expired entries are cleaned up on logout
    Password reset tokens are random (32 bytes), single-use and expire after 30 minutes. Only their SHA-256 hash is stored in the database
    After a password reset, every login token issued before the reset stops working
    JWT_SECRET comes from the environment and is never in the code. The server refuses to start in production without it
    Passwords and tokens are never put in a URL
    A customer can only see and change their own cart and orders
    The backend only serves the root .html pages and the css and js folders. backend/ (code and buildmart.db), node_modules, .git, docs and dotfiles are never served

Known Limitations and Future Improvements

    Guest to user cart merge: items in the guest cart are not moved into the user's cart when they log in
    Orders: no payment (Stripe or PayPal), no confirmation email and no invoice download yet. Order status only changes by cancelling; there is no staff page to mark orders Shipped or Delivered
    Product API: products have icons, not photos, and the search box is not connected
    User roles: there are customers only, no admin or staff accounts
    Password reset: the API works, but there is no page for it and no email service
    The GitHub Pages site has no backend, so the shop only works from http://localhost:3000. Hosting the backend would fix this

Technologies Used

    HTML, CSS, JavaScript
    Node.js, Express, SQLite (better-sqlite3)
    bcryptjs (password hashing), jsonwebtoken (JWT login tokens)
    Git & GitHub
