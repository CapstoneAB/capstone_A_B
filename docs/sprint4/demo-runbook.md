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

# Screenshot shot list — still outstanding

`docs/screenshots/` currently holds 11 images: T01, T02, T09, T10, T11, T15 (×2), T19,
T20, T21, T24. **The Create, Update and Delete tests have no screenshots**, and CRUD
demonstration plus testing evidence are worth 9 marks between them.

Capture each shot with **the browser and the `cart_items` table both visible**, and save it
to `docs/screenshots/` under the filename given.

These shots close all four outstanding boxes on the workbook's evidence checklist:

| Workbook checklist item | Shots that satisfy it |
| --- | --- |
| CRUD screenshots collected | T03, T04, T05, T06, T07, T08 |
| API testing screenshots collected | T12, T13, T14, T22 |
| Validation testing screenshots collected | T10, T11 *(already captured)*, T12 |
| Database screenshots collected | every shot above — the `cart_items` table must be in frame |

| Filename | Test | What must be in frame |
| --- | --- | --- |
| `T03-create-add-item.png` | T03 | Cart drawer showing Claw Hammer ×1, and the new `cart_items` row (cart 1, product 2, qty 1) |
| `T04-create-add-same-item.png` | T04 | Drawer showing qty 2, and `cart_items` with **one** row at qty 2 — not two rows |
| `T05-update-increase.png` | T05 | Drawer showing the raised quantity and new line total, and the matching `quantity` in the table |
| `T06-update-decrease.png` | T06 | Drawer after clicking **−**, quantity reduced by one, table matching |
| `T07-delete-remove.png` | T07 | Drawer with the item gone, and `cart_items` with no row for that product |
| `T08-delete-to-zero.png` | T08 | Drawer after **−** on a qty-1 item: item removed, row deleted |
| `T12-validation-bad-quantity.png` | T12 | Thunder Client or Postman showing the PATCH with `quantity: -1` and the 400 response |
| `T13-error-product-missing.png` | T13 | POST with `product_id: 999` returning 404 "Product not found" |
| `T14-error-cart-missing.png` | T14 | `GET /api/carts/999/items` returning 404 "Cart not found" |
| `T17-npm-test-pass.png` | T17 | Terminal showing `# pass 77` and `# fail 0` |
| `T18-github-actions-green.png` | T18 | The Actions tab with both workflows green |
| `T22-logout-401.png` | T22 | After logout, the old token returning 401 from `/auth/verify` |

Once captured, tick the last two boxes in `crud-evidence.md`.
