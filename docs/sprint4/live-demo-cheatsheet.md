# Live Demo — Cheat Sheet

Print this. Keep it next to the laptop. Windows / PowerShell commands.

---

## PART 1 — Set up once, days before

You only do this once. Do it now, not on presentation day.

### 1. Install Node.js

Download the **LTS** version from <https://nodejs.org> and install it.
Check it worked — open **PowerShell** and run:

```powershell
node -v
```

You should see `v20.something` or higher. If you get an error, Node is not installed.

### 2. Get the project onto the laptop

```powershell
cd ~\Desktop
git clone https://github.com/CapstoneAB/capstone_A_B
cd capstone_A_B\backend
npm install
```

`npm install` takes a minute or two. It only has to be done once.

### 3. Install DB Browser for SQLite

Download from <https://sqlitebrowser.org>. This is how the marker sees the database
change. It is the whole point of the demo — do not skip it.

### 4. Test the whole thing once

```powershell
npm run reset-db
npm start
```

Leave that window open, then open a browser at:

```
http://localhost:3000/shop.html
```

If you see 8 products, everything works. Press **Ctrl + C** in PowerShell to stop.

---

## PART 2 — On the day, 10 minutes before

### 1. Start the backend

```powershell
cd ~\Desktop\capstone_A_B\backend
npm run reset-db
npm start
```

`reset-db` wipes old test data and rebuilds the 8 products. **Leave this window open.**
Closing it kills the server.

### 2. Open the shop

```
http://localhost:3000/shop.html
```

> **Do not** double-click `shop.html` in the folder. The page fetches products from the
> API, so opened as a file it shows an empty grid. It must be the `localhost:3000` address.

### 3. Make an account now

Go to `http://localhost:3000/register.html` and register:

- Username: `demo_customer`
- Email: `demo@buildmart.test`
- Password: `Str0ng!Pass1`

Doing this now means step 2 of the demo is a quick login, not a slow signup.

### 4. Open the database beside the browser

Open **DB Browser for SQLite** → *Open Database* → pick:

```
capstone_A_B\backend\buildmart.db
```

Click **Browse Data** and choose the `cart_items` table.
Arrange the two windows side by side — browser on the left, database on the right.

**Press F5 in DB Browser after every step.** It does not refresh on its own.

---

## PART 3 — The demo, 2 minutes 20 seconds

**Diya drives the mouse. Kalyan says what is happening in the database.**

| # | Diya clicks | Kalyan says | Press F5 and show |
| --- | --- | --- | --- |
| 1 | Open the shop, change the category dropdown | "Eight products, read from SQLite. Nothing is hard-coded in the page." | `products` table |
| 2 | Log in as `demo_customer` | "The cart now belongs to this account." | `carts` — `user_id` is filled in |
| 3 | Add 2 products to the cart | "Two new rows, linked to that cart." | `cart_items` — 2 rows |
| 4 | Click **+** on a line | "A PATCH went to the API. The line total and GST came back recalculated." | `cart_items` — quantity changed |
| 5 | Click **Remove** | "The row is gone. Not hidden — deleted." | `cart_items` — row gone |
| 6 | Add **Safety Glasses** 4 times | "Stock is three. The server refused the fourth with a 409, and the table still says three." | `cart_items` — quantity 3 |
| 7 | Click **Checkout** | "One click, three tables: an order row, order_items copying the prices, and the stock dropping. All in one transaction." | `orders`, `order_items`, `products` |
| 8 | Click **My Orders** | "The same order, read back from the API." | `orders` |

**Step 7 is the one that earns the marks.** Slow down. Let the marker see three tables
change from a single click.

---

## If something goes wrong

| Problem | Fix |
| --- | --- |
| Shop page is empty | You opened the file instead of `http://localhost:3000/shop.html` |
| "Could not reach the server" | The PowerShell window was closed. Run `npm start` again |
| Port 3000 already in use | An old server is still running. Close every PowerShell window and start again |
| Cart has leftover junk | `Ctrl + C`, then `npm run reset-db`, then `npm start` |
| Anything else breaks | Say "let me reset", run `reset-db`, carry on. **Never debug in front of the marker** |

## Never do these

- **Do not click "Forgot password?"** — it is a Version 2 placeholder and goes nowhere
- **Do not show a feature that is not in the eight steps** — the brief says a short
  successful demo beats an ambitious one that fails
- **Do not close the PowerShell window** running the server

## One last thing

Run the test suite once before you present, so you can say the number with confidence:

```powershell
npm test
```

You should see `# pass 100` and `# fail 0`.
