# Sprint 4 — Live Demonstration Runbook

Everything demonstrated here is a test that has already passed. Nothing untested is shown.
Target: **3 minutes**. Kalyan drives, Dipesh narrates.

## Before you start — do this 10 minutes early

```bash
cd backend
npm install          # first time only
npm run reset-db     # wipes everything and rebuilds the 8 products + cart 1
JWT_SECRET=demo npm start
```

Then open **`http://localhost:3000/shop.html`**.

> **Critical:** opening `shop.html` straight from the folder will **not** load products.
> The page fetches them from the API, so it must be served by the backend. If the grid is
> empty, you opened the file instead of the URL.

**Set up the second window.** Open `backend/buildmart.db` in DB Browser for SQLite,
positioned beside the browser so both are visible. Press **F5** after each step to refresh
the `cart_items` table.

**Checks before you present**

- [ ] `npm test` shows 77 passing — run it once so you can say so with confidence
- [ ] Products visible at `http://localhost:3000/shop.html`
- [ ] DB Browser open on `cart_items`, beside the browser
- [ ] Browser zoom at 100%, console closed
- [ ] **Do not click "Forgot password?"** — it is a Version 2 placeholder (`href="#"`)

## The eight steps

Register a demo account **before** you present, so step 2 is a login rather than a signup.

| # | Operation | Action | What to point out |
| --- | --- | --- | --- |
| 1 | **Read** | Open the shop | 8 products with price, unit and stock — all from SQLite. Try the category filter |
| 2 | **Accounts** | Log in | Header shows the account; the cart is now saved to it. Check `carts.user_id` in the database |
| 3 | **Create** | Add two products | New rows in `cart_items`, linked to this user's cart. **F5 in DB Browser** |
| 4 | **Update** | Click **+** on a line | Line total and GST recalculate; `quantity` changes in the table |
| 5 | **Delete** | Click **Remove** | The row disappears from `cart_items` |
| 6 | **Validate** | Add Safety Glasses 4 times | Stock is 3; the 4th is refused with 409 and the table stays at 3 |
| 7 | **Checkout** | Click **Checkout** | **The strongest moment.** An `orders` row appears, `order_items` copies the prices, `products.stock` drops, and the cart empties — all in one transaction |
| 8 | **Read** | Open **My Orders** | The order reads back with its status, total and lines |

**If something fails:** stop, say "that is the stock validation working / let me reset",
run `npm run reset-db`, restart and continue. Do not debug live.

## Narration for the integration question

While doing step 4, say this — it is the highest-value sentence in the demo:

> "One click sends `PATCH /api/carts/1/items/2` with quantity 5. Express validates the
> quantity, checks the 20-item cap and the stock level, runs an UPDATE on `cart_items`,
> recalculates the total and GST with a JOIN, and returns JSON. The page re-draws from
> that response — the browser never calculates the total itself."

---

# Screenshot evidence

`docs/screenshots/` now holds 19 images. The CRUD, API-testing, validation and database
screenshots were captured from the running system and are indexed in
[`crud-evidence.md`](crud-evidence.md).

**One shot still needs a team member:** `T18-github-actions-green.png` — the repository's
Actions tab showing both workflows green. It needs a signed-in browser session, so it
cannot be captured automatically. Open the Actions tab, pick the most recent run on
`main`, screenshot it, and save it under that name.
