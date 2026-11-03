# Sprint 4 — Presentation Running Order

**Group 2** · 26 slides · Brief allows **12–15 minutes** plus 5 minutes of Q&A

The deck is ordered so each member presents **one continuous block**, handing over once.
Nobody is interrupted mid-topic, and the marker always knows who owns what.

## The order, one by one

| Turn | Member | Slides | Section | Time |
| --- | --- | --- | --- | --- |
| **1** | **Ranjan** | 1–4 | Opening, the problem, users and objectives | 1m 45s |
| **2** | **Sujan** | 5–8 | Requirements, sprint journey, GitHub, team | 2m 20s |
| **3** | **Kalyan** | 9–11 | Database decisions, ERD, data dictionary | 2m 20s |
| **4** | **Diya** | 12 | Front-end development | 0m 40s |
| **5** | **Shailendra** | 13–15 | Back end, API endpoints, integration flow | 2m 30s |
| **6** | **Dipesh** | 16–20 | CRUD, CRUD evidence, checkout | 3m 05s |
| **7** | **Anjan** | 21–22 | Testing, validation and error handling | 1m 20s |
| **8** | **Diya + Kalyan** | 23 | **Live demonstration** — Diya drives, Kalyan narrates | 2m 30s |
| **9** | **Anjan** | 24 | Reflection and future improvements | 0m 55s |
| **10** | **Ranjan** | 25 | Conclusion, then open for questions | 0m 25s |
| — | *anyone* | *26* | *Backup — API testing. Q&A only, not presented* | — |

Three people take a second short turn: **Ranjan** returns to close, **Anjan** returns for
the reflection after the demo, and **Diya** returns to drive the demonstration. Everyone
else speaks exactly once.

## Slide by slide

| # | Slide | Presenter | Target |
| --- | --- | --- | --- |
| 1 | Title | Ranjan | 15s |
| 2 | What we will cover | Ranjan | 15s |
| 3 | The problem we set out to solve | Ranjan | 45s |
| 4 | Target users and project objectives | Ranjan | 30s |
| 5 | Requirements analysis | Sujan | 40s |
| 6 | The sprint journey | Sujan | 35s |
| 7 | GitHub evidence | Sujan | 35s |
| 8 | Team contributions | Sujan | 30s |
| 9 | Database design decisions | Kalyan | 40s |
| 10 | Entity relationship diagram | Kalyan | 70s |
| 11 | Data dictionary and constraints | Kalyan | 30s |
| 12 | Front-end development | Diya | 40s |
| 13 | Back-end development | Shailendra | 50s |
| 14 | API endpoints | Shailendra | 30s |
| 15 | How information flows through the system | Shailendra | 70s |
| 16 | CRUD — Create and Read | Dipesh | 40s |
| 17 | CRUD — Update and Delete | Dipesh | 40s |
| 18 | CRUD evidence — Create and Update | Dipesh | 30s |
| 19 | CRUD evidence — Delete and stock validation | Dipesh | 30s |
| 20 | Checkout — cart becomes a real order | Dipesh | 45s |
| 21 | Testing evidence | Anjan | 45s |
| 22 | Validation and error handling | Anjan | 35s |
| 23 | **Live demonstration** | Diya drives, Kalyan narrates | 150s |
| 24 | Reflection and future improvements | Anjan | 55s |
| 25 | Conclusion | Ranjan | 25s |
| 26 | *Backup — API testing evidence* | *Q&A only* | — |

**Full run: 17 minutes 50 seconds — about 3 minutes over the limit.** Rehearse the
trimmed version below, not this one.

---

## Trim to 15 minutes

**Hold four slides for Q&A** (skip in the run, keep in the file):

| # | Slide | Whose | Why it is safe to hold |
| --- | --- | --- | --- |
| 8 | Team contributions | Sujan | A table the marker can read; cover it in one line on slide 7 |
| 14 | API endpoints | Shailendra | Slide 13 already names the important ones |
| 18 | CRUD evidence — Create and Update | Dipesh | The live demo shows the same thing happening |
| 19 | CRUD evidence — Delete and stock validation | Dipesh | Demo steps 5 and 6 cover it |

**Then shave 50 seconds:** ERD 70s → 60s, integration 70s → 60s, reflection 55s → 45s.

**Trimmed total: 15 minutes 0 seconds.** Everyone still presents: Ranjan 4 slides ·
Sujan 3 · Kalyan 3 · Diya 1 plus driving the demo · Shailendra 2 · Dipesh 3 · Anjan 3.

## If you are held to 12 minutes

Also hold slides 4 and 6, and cut the demo to 2 minutes by dropping demo steps 4 and 5
(update and delete) — steps 3, 6 and 7 still show create, validation and checkout. That
lands at roughly 12 minutes 10 seconds. Ranjan folds slide 4's content into one sentence
on slide 3.

---

## Rules for the day

1. **Only the presenter of a slide speaks on it.** Save additions for Q&A.
2. **Hand over by name** — "Sujan will take you through our planning" — so the marker can
   follow who did what.
3. **Q&A goes to the slide's owner.** If a question spans sections, the owner of the slide
   it came from answers first.
4. **Questions 21 and 22 are personal** ("your contribution", "your hardest task"). Every
   member answers for themselves — see `qa-preparation.md`.
5. **Watch the clock at slide 15.** If you reach the integration slide later than 7 minutes
   in, start the trim.

## Before you walk in

- [ ] Backend running: `cd backend && npm run reset-db && JWT_SECRET=demo npm start`
- [ ] Demo account registered, so demo step 2 is a login not a signup
- [ ] Shop open at `http://localhost:3000/shop.html` — **not** the file
- [ ] DB Browser open on `backend/buildmart.db`, beside the browser
- [ ] `npm test` run once, so you can say 100 of 100 with confidence
- [ ] Actions tab open in a tab, showing green
- [ ] Everyone has read `qa-preparation.md` and knows their own Q21 and Q22 answers
