Capstone A - Buildmart (Secure Retail System)
Project Overview

Buildmart is a front-end e-commerce site for a hardware and home goods store, built as a Capstone A team project. Its centrepiece is the Shopping Cart module, delivered feature-by-feature by the team using a real Git workflow: issues, feature branches, pull requests, and code review.
Features

    Home page with hero section and feature highlights
    About page with project overview, description, and the team's delivery plan
    Shop page - the Shopping Cart module: product catalogue, add to cart, cart drawer, quantity controls, and GST-inclusive price calculation
    Contact page with name, email, subject, and message fields
    Login page (UI only, sign-in planned for Version 2)
    Registration page with real-time validation: username and email checks, a password strength meter, a live checklist of the password rules and a confirm password field. It creates the account through the backend auth API
    User accounts in the backend: register, login with a JWT token, logout, token check and password reset, with passwords hashed using bcrypt
    Shared stylesheet for a consistent colour scheme, typography, and responsive layout across all pages

Project Structure

capstone_A_B/
├── index.html        # Home page
├── about.html         # About page (project overview + delivery plan)
├── shop.html          # Shopping cart module
├── contact.html       # Contact page
├── login.html         # Login page (UI only)
├── register.html      # Registration page (sends the form to POST /auth/register)
├── css/style.css      # Shared stylesheet
├── css/login.css      # Login page styles
├── css/register.css   # Registration page styles (strength meter, rules checklist)
├── js/login.js        # Login form validation
├── js/register.js     # Registration form validation and API call
├── TESTING.md         # Shopping cart test plan and results
├── intro_ranjan.txt   # Introduction file
├── docs/              # Week 2 data analysis, Week 4 data dictionary
├── backend/           # Sprint 3 Node.js + SQLite cart API
│   ├── server.js      # Express server and cart routes
│   ├── init-db.js     # Creates buildmart.db and loads sample data
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

Backend (Sprint 3), needs Node.js 18 or later:

    cd backend
    npm install
    npm run init-db     (creates buildmart.db; it is gitignored, so run this after every fresh clone)
    npm start           (http://localhost:3000)
    npm test

The registration page needs the backend because it sends the form to the API. Start the backend and open http://localhost:3000/register.html. The backend also serves the website pages, so every page works from http://localhost:3000 (for example http://localhost:3000/index.html).

Running with a fixed JWT secret:

If JWT_SECRET is not set, the server makes a random secret each time it starts and prints a warning. That is fine for testing, but everyone is logged out when the server restarts. To use a fixed secret:

    JWT_SECRET=your-long-random-secret npm start                  (macOS, Linux or Git Bash)
    $env:JWT_SECRET="your-long-random-secret"; npm start          (Windows PowerShell)

To make a random secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Never commit the secret to the repo. With NODE_ENV=production the server will not start without JWT_SECRET.

Testing & CI

To run the tests, go into backend and run npm test (after npm install and npm run init-db). The tests use their own temporary database, so buildmart.db is not changed.

There are 20 API tests in backend/tests/cart.test.js. They cover the health check, the product list, adding, updating and removing cart items, totals and GST, bad input (zero, negative or non-number quantities), missing carts, products and items, stock limits and the 20-item quantity cap.

There are also 45 tests in backend/tests/auth.test.js (password hashing, register, login, verify, logout and password reset) and 7 tests in backend/tests/static.test.js (which files the server will and will not serve), so 72 tests in total. See TESTING.md for the full list.

GitHub Actions (.github/workflows/backend-tests.yml) runs the tests automatically on every push and pull request to main.

The Frontend check workflow (.github/workflows/frontend-check.yml) runs html-validate on every HTML page on each push and pull request to main, using the rules in .htmlvalidate.json. To run the same check yourself, run npx --yes html-validate@9 *.html in the project folder.

Backend API

    GET    /                                health check
    GET    /api/products                    list products
    GET    /api/carts/:id/items             cart items, line subtotals, gst_included and total
    POST   /api/carts/:id/items             body {"product_id": 1, "quantity": 2}; adds or increases quantity
    PATCH  /api/carts/:id/items/:productId  body {"quantity": 5}; sets quantity
    DELETE /api/carts/:id/items/:productId  removes the item

Prices are GST-inclusive, matching shop.html, so gst_included is total minus total / 1.1.
Errors: 400 for bad input, 404 for a missing cart or product, 409 when quantity is more than stock.
A quantity over 20 per item returns 400 (same limit as the front end).

Database tables: products, carts, cart_items (see docs/week4/data-dictionary.md).

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
    The backend only serves the root .html pages and the css and js folders. backend/ (code and buildmart.db), node_modules, .git, docs and dotfiles are never served

Technologies Used

    HTML, CSS, JavaScript
    Node.js, Express, SQLite (better-sqlite3)
    bcryptjs (password hashing), jsonwebtoken (JWT login tokens)
    Git & GitHub
