# Sprint 4 — Presentation Running Order

**Group 2** · Slides 1–21 are presented · Slides 22–26 are backup, held for Q&A

**Run time: 14 minutes 55 seconds**, inside the 12–15 minute limit, leaving the 5-minute
Q&A untouched.

Each member presents one continuous block and hands over once.

## The order, one by one

| Turn | Member | Slides | Section | Time |
| --- | --- | --- | --- | --- |
| **1** | **Ranjan** | 1–4 | Opening, problem, users and objectives | 1m 40s |
| **2** | **Sujan** | 5–8 | Requirements, sprint journey, GitHub, team | 2m 15s |
| **3** | **Kalyan** | 9–10 | Database decisions and the ERD | 1m 40s |
| **4** | **Diya** | 11 | Front-end development | 0m 40s |
| **5** | **Shailendra** | 12–13 | Back end and the integration flow | 1m 50s |
| **6** | **Dipesh** | 14–16 | CRUD and checkout | 2m 05s |
| **7** | **Anjan** | 17–18 | Testing, validation and error handling | 1m 20s |
| **8** | **Diya + Kalyan** | 19 | **Live demonstration** | 2m 20s |
| **9** | **Anjan** | 20 | Reflection and future improvements | 0m 45s |
| **10** | **Ranjan** | 21 | Conclusion, then open for questions | 0m 20s |

## Slide by slide

| # | Slide | Presenter | Target |
| --- | --- | --- | --- |
| 1 | Title | Ranjan | 15s |
| 2 | What we will cover | Ranjan | 15s |
| 3 | The problem we set out to solve | Ranjan | 45s |
| 4 | Target users and project objectives | Ranjan | 25s |
| 5 | Requirements analysis | Sujan | 40s |
| 6 | The sprint journey | Sujan | 30s |
| 7 | GitHub evidence | Sujan | 35s |
| 8 | Team contributions | Sujan | 30s |
| 9 | Database design decisions | Kalyan | 40s |
| 10 | Entity relationship diagram | Kalyan | 60s |
| 11 | Front-end development | Diya | 40s |
| 12 | Back-end development | Shailendra | 50s |
| 13 | How information flows through the system | Shailendra | 60s |
| 14 | CRUD — Create and Read | Dipesh | 40s |
| 15 | CRUD — Update and Delete | Dipesh | 40s |
| 16 | Checkout — cart becomes a real order | Dipesh | 45s |
| 17 | Testing evidence | Anjan | 45s |
| 18 | Validation and error handling | Anjan | 35s |
| 19 | **Live demonstration** | Diya drives, Kalyan narrates | 140s |
| 20 | Reflection and future improvements | Anjan | 45s |
| 21 | Conclusion | Ranjan | 20s |
| | **Presented total** | | **14m 55s** |

## Backup slides — in the file, not in the run

Do not show these unless a question calls for them. Every one is cut because something
else in the run already covers it.

| # | Slide | Answers | Covered in the run by |
| --- | --- | --- | --- |
| 22 | Data dictionary and constraints | Schema detail, Q5, Q6 | The ERD on slide 10 |
| 23 | API endpoints | Q11 — what endpoints were created | Back end on slide 12 |
| 24 | CRUD evidence — Create and Update | Q17 — how CRUD was tested | The live demo |
| 25 | CRUD evidence — Delete and stock validation | Q17, Q20 | Demo steps 5 and 6 |
| 26 | API testing evidence | Q17 — testing the API directly | Testing on slide 17 |

The speaker notes on each of these start with **BACKUP SLIDE**, so nobody presents one by
accident.

---

# What the live demonstration is

Slide 19. **Diya drives the browser, Kalyan says what is happening in the database.**
2 minutes 20 seconds. It is worth 4 marks on its own, and it is also where the 5 marks for
CRUD are really earned.

## What you are proving

That the three tiers are genuinely connected — that a click in the browser changes a row
in SQLite, and that the page is showing real stored data rather than something it made up.
Everything else in the deck is a claim; this is the evidence.

## The setup, 10 minutes before you present

```bash
cd backend
npm run reset-db          # rebuilds the 8 products, clears old orders
JWT_SECRET=demo npm start
```

Open **`http://localhost:3000/shop.html`** — *not* the file from the folder, or the
products will not load. Register a demo account now, so step 2 is a login and not a signup.

Put **DB Browser for SQLite** on `backend/buildmart.db` beside the browser. Press **F5**
after each step so the marker watches the table change in real time.

## The eight steps

| # | Operation | Diya does | Kalyan says |
| --- | --- | --- | --- |
| 1 | **Read** | Open the shop, change the category filter | "Eight products, read from SQLite — nothing is hard-coded in the page" |
| 2 | **Accounts** | Log in | "The cart now belongs to this account — `carts.user_id` is set" |
| 3 | **Create** | Add two products | "Two new rows in `cart_items`, linked to that cart" |
| 4 | **Update** | Click **+** on a line | "A PATCH went to the API; the line total and GST came back recalculated" |
| 5 | **Delete** | Click **Remove** | "The row is gone from `cart_items` — not hidden, deleted" |
| 6 | **Validate** | Add Safety Glasses four times | "Stock is three. The server refused the fourth with a 409, and the table still says three" |
| 7 | **Checkout** | Click **Checkout** | "One click, three tables: an `orders` row, `order_items` copying the prices, and the stock dropping — all in one transaction" |
| 8 | **Read** | Open **My Orders** | "The same order, read back through `GET /api/users/:id/orders`" |

**Step 7 is the moment that earns the marks.** Let it land — pause, let the marker see
three tables change from one click.

## Rules while demonstrating

- **Nothing untested is shown.** Every step above is a test that already passed.
- **Do not click "Forgot password?"** — it is a Version 2 placeholder that goes nowhere.
- **If something fails,** say "let me reset" and run `npm run reset-db`. Do not debug live.
- **Short and successful beats ambitious and broken.** The brief says so explicitly.

---

## Rules for the day

1. **Only the presenter of a slide speaks on it.** Save additions for Q&A.
2. **Hand over by name** — "Sujan will take you through our planning."
3. **Q&A goes to the slide's owner.**
4. **Questions 21 and 22 are personal.** Every member answers for themselves — see
   `qa-preparation.md`.
5. **Clock check at slide 13.** Later than 7 minutes in means speed up; the demo must keep
   its full 2m 20s.

## Before you walk in

- [ ] Backend running, database reset
- [ ] Demo account registered
- [ ] Shop open at `http://localhost:3000/shop.html`
- [ ] DB Browser open on `backend/buildmart.db`, beside the browser
- [ ] `npm test` run once — 100 of 100
- [ ] Actions tab open, showing green
- [ ] Everyone knows their own Q21 and Q22 answers
