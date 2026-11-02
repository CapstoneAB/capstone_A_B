# Sprint 4 — Authentication Design

**Project:** Buildmart Secure Retail System
**Code:** `backend/auth/` (routes, middleware, passwords, schema), `js/register.js`, `js/login.js`

This document describes how users sign up, log in, stay logged in, log out and reset a password, and how the rest of the API checks who is calling it.

## Sign-up flow

1. The user fills in `register.html`. `js/register.js` checks the fields as they type (username, email, password strength, matching confirm password).
2. The form sends `POST /auth/register` with username, email and password.
3. The server checks the same rules again (the browser checks can be skipped, so the server never trusts them).
4. The password is hashed with **bcrypt** (cost 12) and only the hash is saved in `users.password_hash`.
5. The server returns `201` with the new user's id, username and email. It never returns the password or the hash.

## Login and session management

We use **JWT (JSON Web Token)** login tokens, not server sessions.

1. `login.html` sends `POST /auth/login` with email and password.
2. The server finds the user by email and checks the password against the bcrypt hash.
3. If it matches, the server returns a JWT signed with **HS256** that lasts **1 hour**. The token holds the user id (`sub`), username and a unique token id (`jti`).
4. The browser keeps the token in `sessionStorage`, so it is forgotten when the tab is closed.
5. Every protected request sends it in the header `Authorization: Bearer <token>`.
6. `requireAuth` (`backend/auth/middleware.js`) checks the signature, the expiry, that the token was not logged out, and that the user still exists. If any check fails the answer is `401`.

**Why JWT:** the server does not need to store a session for every logged-in user, and the same token works for the shop, the cart and the orders pages.

## Logout

`POST /auth/logout` puts the token's `jti` into the `revoked_tokens` table. That token is refused from then on, even before it expires. Old rows are cleaned up on each logout.

## Password reset

1. `POST /auth/forgot-password` with an email always returns the same message, so it can't be used to find out which emails are registered.
2. If the email exists, the server makes a random 32-byte token, stores only its **SHA-256 hash** in `password_resets`, and (for now) prints the token in the server console. There is no email service yet.
3. `POST /auth/reset-password` with the token and a new strong password sets the new password. The token works **once** and expires after **30 minutes**.
4. After a reset, every login token issued before the reset stops working.

## What a login protects

| Resource | Without a token | With another user's token |
| --- | --- | --- |
| A user's own cart (`/api/carts/:id/items` when the cart has a user) | 401 | 403 |
| `GET /api/my-cart` | 401 | (always your own cart) |
| Checkout `POST /api/orders` | 401 | (always your own cart) |
| One order `GET/PATCH /api/orders/:orderId` | 401 | 404 (looks the same as a missing order) |
| Order history `GET /api/users/:id/orders` | 401 | 403 |

The guest cart (cart 1) and the product list need no login.

## User roles

There is one role today: **customer**. A customer can only see and change their own cart and orders. Staff or admin roles (for example to mark orders as Shipped) are future work; they would be a `role` column on `users` checked by a second middleware after `requireAuth`.

## Security considerations

| Risk | How we handle it |
| --- | --- |
| Stolen database reveals passwords | Only bcrypt hashes are stored, never passwords |
| Guessing which emails are registered | Login and forgot-password give the same answer and take the same time for a wrong email and a wrong password |
| Forged or altered tokens | Tokens are signed with a secret from `JWT_SECRET`; only HS256 is accepted, so `alg: none` tokens are refused |
| A token keeps working after logout | Logged-out token ids are stored in `revoked_tokens` |
| Reset links being reused or leaked | Single use, 30 minutes, and only a hash is stored |
| SQL injection | Every query uses prepared statements with `?` placeholders |
| Tokens or passwords in logs and history | They are never put in a URL |
| Secret in the code | `JWT_SECRET` comes from the environment; the server refuses to start in production without it |

## Future improvements

- HTTPS when the site is hosted, so tokens can't be read on the network
- Rate limiting on login and forgot-password to slow down guessing
- An email service for reset links and order confirmations
- Staff and admin roles
