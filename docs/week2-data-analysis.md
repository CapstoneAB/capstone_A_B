# Week 2 — Data Analysis

**Project:** Buildmart (Secure Retail System) — Capstone A
**Author:** Kalyan
**Scope:** current codebase (`index.html`, `shop.html`, `contact.html`, `about.html`) plus the modules named in the Buildmart delivery plan that are not built yet.

Data items below are tagged **Implemented** (exists in the current code) or **Planned (Capstone B)** (named in the project's own delivery plan / README as a future module, but not built yet). Keeping that distinction so this document doesn't overstate what the current front-end-only build actually does.

---

## Activity 1 — Module Data Discovery

At least 20 data items across the project's modules:

**Product Catalogue** *(Implemented — `shop.html`)*
1. Product ID
2. Product Name
3. Product Description / Meta (e.g. "Fibreglass handle")
4. Price
5. Unit (each / tin / length / pair)
6. Product Icon/Image (currently emoji placeholder)

**Shopping Cart** *(Implemented — `shop.html`)*
7. Product ID (reference into cart)
8. Quantity
9. Line Total
10. Cart Subtotal
11. GST Amount (10%, backed out of GST-inclusive price)
12. Cart Total
13. Cart Item Count (badge)

**Contact / Customer Enquiry** *(Implemented — `contact.html`)*
14. First Name
15. Last Name
16. Email Address
17. Enquiry Subject (General / Technical Support / Billing / Feedback)
18. Message Body

**Search** *(Implemented UI, not wired to logic — `shop.html`)*
19. Search Query Text

**Order Processing** *(Planned — Capstone B)*
20. Order Number
21. Order Line Items (product + quantity snapshot at time of order)
22. Payment Status

**User Management** *(Planned — Capstone B)*
23. Username
24. Email (account)
25. Password (hashed)
26. User Role (Customer / Administrator)

**Order Tracking** *(Planned — Capstone B)*
27. Tracking Number
28. Delivery Status
29. Shipping Date

**Admin Dashboard** *(Planned — Capstone B)*
30. Total Orders
31. Active Users
32. Revenue Statistics

That's 32 items, 19 of them already implemented in the current build.

---

## Activity 2 — Project Data Inventory

| Data Item | Purpose | Who Creates It? | Who Uses It? | Required? |
|---|---|---|---|---|
| Product ID | Uniquely identifies a product in the catalogue | Administrator (hardcoded in `shop.html` today) | System (cart logic), Customer (indirectly) | Yes |
| Product Name | Identifies product | Administrator | Customer | Yes |
| Product Description/Meta | Gives customers extra detail (material, size) | Administrator | Customer | No |
| Price | Determines cost to customer | Administrator | Customer, Cart totals logic | Yes |
| Unit | Clarifies how the product is sold (each/tin/length) | Administrator | Customer | Yes |
| Product Icon/Image | Visual identification of product | Administrator | Customer | No |
| Cart Product ID + Quantity | Tracks what a customer intends to buy | Customer (via "Add to cart") | Cart display, totals logic, (future) Order Processing | Yes |
| Cart Line Total | Shows cost per line item | System (calculated) | Customer | Yes |
| Cart Subtotal / GST / Total | Shows what the customer will pay | System (calculated) | Customer, (future) Payment step | Yes |
| Cart Item Count | Shows how many items are in the cart | System (calculated) | Customer | No |
| First Name / Last Name | Identifies the person making an enquiry | Customer | (future) Support staff | Yes |
| Email Address | Allows a reply to the enquiry | Customer | (future) Support staff | Yes |
| Enquiry Subject | Routes the enquiry to the right team | Customer | (future) Support staff | No |
| Message Body | Describes the customer's question/issue | Customer | (future) Support staff | Yes |
| Search Query Text | Lets a customer find a product | Customer | (future) Search logic | No |
| Order Number | Identifies an order | System | Customer, (future) Support/Admin | Yes |
| Order Line Items | Records what was actually ordered | System | (future) Order Processing, Order Tracking | Yes |
| Payment Status | Shows whether an order has been paid | System / Payment provider | Customer, (future) Admin | Yes |
| Username | Identifies an account | Customer | System, Administrator | Yes |
| Password (hashed) | Authenticates an account | Customer | System (auth) | Yes |
| User Role | Controls access to admin features | Administrator | System (authorization) | Yes |
| Tracking Number | Lets a customer track delivery | System / Courier | Customer | Yes |
| Delivery Status | Shows progress of shipment | Courier / System | Customer | Yes |
| Shipping Date | Records when an order shipped | System | Customer, Admin | No |
| Total Orders / Active Users / Revenue Stats | Summarises business performance | System (aggregated) | Administrator | No |

---

## Activity 3 — Data Flow Investigation

**Current, implemented flow (Shop → Cart → Checkout):**

```
Customer
   ↓
Product Browsing (shop.html catalogue)
   ↓
Add to Cart (in-memory cart object)
   ↓
Cart Review (quantity, subtotal, GST, total)
   ↓
Checkout button (client-side only — mock)
   ↓
Confirmation toast (cart cleared, nothing persisted)
```

**Current, implemented flow (Contact enquiry):**

```
Customer
   ↓
Contact Form (name, email, subject, message)
   ↓
Submit button
   ↓
⚠ No handler wired up — data goes nowhere today
```

**Planned flow once a backend exists (Capstone B):**

```
Customer
   ↓
Product Selection
   ↓
Shopping Cart
   ↓
Checkout (server-side price/total revalidation)
   ↓
Order Processing (order number, payment status)
   ↓
Database
   ↓
Order Tracking (tracking number, delivery status)
   ↓
Admin Dashboard (aggregated stats)
```

---

## Activity 4 — Data Quality and Risk Analysis

| Data Item | Risk | Business Impact | Prevention Strategy |
|---|---|---|---|
| Product Price | Value tampered with in browser DevTools | Customer under/overcharged | Validate price server-side |
| Product ID | Duplicate IDs as catalogue grows | Wrong product/price shown | Enforce unique IDs |
| Cart Quantity | Quantity cap bug (`cast[id]` typo) never fires | Unlimited quantity addable | Fix typo; add quantity limits |
| Cart Total | Calculated only in the browser | Total manipulated at checkout | Recalculate total server-side |
| Email Address | No format validation | Support can't reply to customer | Add email format validation |
| Message Body | No sanitization of free text | XSS if shown in an admin panel | Sanitize/escape all input |
| Contact Form | No CAPTCHA or rate limiting | Spam/bot abuse | Add rate limiting + CAPTCHA |
| Username / Password | No hashing/storage plan yet | Account/credential compromise | Hash passwords (e.g. bcrypt) |
| User Role | No authorization checks yet | Customer reaches admin features | Enforce role checks server-side |
| Order Number | Could collide if made client-side | Duplicate order references | Generate order numbers server-side |
| Payment Status | Client-reported "paid" flag trusted | Goods shipped without payment | Verify payment via provider callback |
| Delivery Status | Manual entry, no courier integration | Wrong delivery info shown | Integrate with courier API |

12 risks total — covering both today's build and the gaps to close before Order Processing/User Management are built.

---

## Activity 5 — Planning for Future Development

Draft answers below, written to bring to the team meeting rather than a finalised team decision — flag anything you'd answer differently before we record this as final.

**What information should be stored permanently?**
Product catalogue, completed orders (line items, totals, payment status), customer accounts, and order tracking history. These are the records the business needs for accounting, support, and repeat customers.

**What information changes frequently?**
Cart contents (changes every click, and should stay session-only/temporary), stock levels, product prices/promotions, and delivery status on in-flight orders.

**What information should be restricted to administrators?**
User roles, revenue/aggregated business statistics, the full customer list, and any backend configuration (payment provider keys, etc.). Customers should only ever see their own orders and account data.

**What information should be included in future reports?**
Total orders and revenue over time, best-selling products, average order value, and enquiry volume/response time from the contact form — useful for both business decisions and for spotting support bottlenecks.

**What information might be required in Capstone B Version 2?**
User accounts (so a cart/order history can persist across sessions), a real order + payment record, delivery tracking data, and admin-facing analytics — i.e. the four "Planned" modules already named in the README's delivery plan (Order Processing, User Management, Order Tracking, Admin Dashboard).

---

## Review Comments & Improvements Log

| Date | Reviewer | Comment | Resulting Action |
|------|----------|---------|-------------------|
| 2026-09-16 | Kalyan (author) | Initial draft based on current `main` branch (no backend yet); flagged the `cast[id]` typo bug found while reviewing `shop.html` for the risk analysis | Opened as PR for team review; typo bug to be filed as a separate issue/fix by whoever owns quantity update |
| 2026-09-16 | Kalyan (author) | Restructured to match the Activity 1–5 worksheet format; separated Implemented vs. Planned (Capstone B) data items so the doc doesn't overstate current functionality | Pushed as an update to the same PR |
