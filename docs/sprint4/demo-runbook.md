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

## The seven steps

| # | Operation | Action | What to point out |
| --- | --- | --- | --- |
| 1 | **Read** | Open the shop | 8 products with price, unit and stock — all from SQLite, none hard-coded |
| 2 | **Create** | Add Claw Hammer to cart | Toast appears, badge shows 1, **press F5 in DB Browser** — a new row in `cart_items` |
| 3 | **Read** | Refresh the browser page | The cart is still there. This proves it lives in the database, not the browser |
| 4 | **Update** | Click **+** until quantity is 5 | Line total $124.75, GST included $11.34. F5 — `quantity` is now 5 |
| 5 | **Delete** | Click **Remove** | Line disappears from the drawer. F5 — the row is gone from `cart_items` |
| 6 | **Validate** | Add Safety Glasses 4 times | Stock is 3. The 4th is refused: "Requested quantity exceeds available stock". F5 — still 3 |
| 7 | **Accounts** | Register, then log in | In DB Browser open `users` — `password_hash` begins `$2b$12$`. The password itself is never stored |

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
