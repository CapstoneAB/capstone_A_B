# Sprint 4 — Final Project Showcase

Submission evidence for Capstone B Sprint 4. **Group 2** · Group Leader: **Ranjan**

## What is here

| File | Covers |
| --- | --- |
| [`presentation/`](presentation/) | The final presentation deck (22 slides) as `.pptx` and `.pdf`, with speaker notes on every slide |
| [`database-design.md`](database-design.md) | ERD, the 6 entities, relationships, data dictionary, business rules and seed data |
| [`crud-evidence.md`](crud-evidence.md) | Create, Read, Update and Delete evidence with live API responses, plus the validation table |
| [`qa-preparation.md`](qa-preparation.md) | All 28 Q&A questions from the brief, answered from this codebase |
| [`demo-runbook.md`](demo-runbook.md) | Step-by-step live demonstration script and the outstanding screenshot shot list |
| [`team-contributions.md`](team-contributions.md) | Per-member responsibilities, work delivered, evidence and presentation sections |
| [`../../TESTING.md`](../../TESTING.md) | The 25 manual integration tests, cart tests, account tests and the bugs resolved |
| [`../screenshots/`](../screenshots/) | 19 test screenshots, named by test ID — each CRUD shot pairs the live page with the `cart_items` table |

## Submission checklist

- [x] **Final presentation slides** — `presentation/Buildmart-Sprint4-Final-Presentation.pptx`
- [x] **GitHub repository link** — https://github.com/CapstoneAB/capstone_A_B
- [x] **Working application** — `cd backend && npm install && npm run reset-db && npm start`
- [x] **Testing evidence** — 77 automated tests passing, 25 manual integration tests
- [x] **Team contribution record** — `team-contributions.md`
- [x] **CRUD screenshots** — captured from the running system, indexed in `crud-evidence.md`
- [ ] **Presentation sections confirmed by the team** — currently a proposal in `team-contributions.md`

## Running the system

```bash
cd backend
npm install
npm run reset-db          # rebuilds the 8 products and cart 1
JWT_SECRET=demo npm start # http://localhost:3000
npm test                  # 77 tests
```

Open **`http://localhost:3000/shop.html`** — not the file directly, or the products will
not load.
