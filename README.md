Capstone A - Buildmart (Secure Retail System)
Project Overview

Buildmart is a front-end e-commerce site for a hardware and home goods store, built as a Capstone A team project. Its centrepiece is the Shopping Cart module, delivered feature-by-feature by the team using a real Git workflow: issues, feature branches, pull requests, and code review.
Features

    Home page with hero section and feature highlights
    About page with project overview, description, and the team's delivery plan
    Shop page - the Shopping Cart module: product catalogue, add to cart, cart drawer, quantity controls, and GST-inclusive price calculation
    Contact page with name, email, subject, and message fields
    Shared stylesheet for a consistent colour scheme, typography, and responsive layout across all pages

Project Structure

capstone_A_B/
├── index.html        # Home page
├── about.html         # About page (project overview + delivery plan)
├── shop.html          # Shopping cart module
├── contact.html       # Contact page
├── css/style.css      # Shared stylesheet
├── TESTING.md         # Shopping cart test plan and results
├── intro_ranjan.txt   # Introduction file
├── docs/              # Week 2 data analysis, Week 4 data dictionary
├── backend/           # Sprint 3 Node.js + SQLite cart API
│   ├── server.js      # Express server and cart routes
│   ├── init-db.js     # Creates buildmart.db and loads sample data
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

Backend API

    GET    /                                health check
    GET    /api/products                    list products
    GET    /api/carts/:id/items             cart items, line subtotals, gst_included and total
    POST   /api/carts/:id/items             body {"product_id": 1, "quantity": 2}; adds or increases quantity
    PATCH  /api/carts/:id/items/:productId  body {"quantity": 5}; sets quantity
    DELETE /api/carts/:id/items/:productId  removes the item

Prices are GST-inclusive, matching shop.html, so gst_included is total minus total / 1.1.
Errors: 400 for bad input, 404 for a missing cart or product, 409 when quantity is more than stock.

Database tables: products, carts, cart_items (see docs/week4/data-dictionary.md).

Technologies Used

    HTML, CSS, JavaScript
    Node.js, Express, SQLite (better-sqlite3)
    Git & GitHub
