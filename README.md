# PlantCare — Backend API

An Express API providing CRUD endpoints for a "plants" resource, secured
behind JWT authentication. Built in two stages: first plain CRUD, then
real user accounts on top. The matching frontend lives in a separate
repo: [plant-care](https://github.com/muzzammilahmed18/plant-care).

## Tech stack

- Node.js + Express
- CORS enabled, so a frontend on a different port/origin can call it
- `bcrypt` — hashes passwords before they're ever stored; plain-text
  passwords are never saved
- `jsonwebtoken` — issues a signed JWT on signup/login, verified on every
  protected request
- In-memory storage (plain arrays for `users` and `plants`) — data resets
  whenever the server restarts. Simple on purpose; swap in a real database
  if you want data to persist.

## Auth endpoints

| Method | Route      | Description                                    |
|--------|------------|-------------------------------------------------|
| POST   | `/signup`  | Create an account, returns `{ token, email }`  |
| POST   | `/login`   | Log into an existing account, returns a token  |

- Passwords must be at least 8 characters (enforced server-side, not
  just on the frontend)
- Signup rejects duplicate emails with a `409`
- Login returns a generic "Invalid email or password" on failure —
  intentionally vague, so it doesn't reveal whether the email exists

## Plant endpoints (all require a valid token)

| Method | Route          | Description                            |
|--------|----------------|------------------------------------------|
| GET    | `/plants`      | Get all plants belonging to this user  |
| GET    | `/plants/:id`  | Get a single plant (must belong to you) |
| POST   | `/plants`      | Create a new plant, tied to your account|
| PUT    | `/plants/:id`  | Update a plant (must belong to you)    |
| DELETE | `/plants/:id`  | Delete a plant (must belong to you)   |

Every plant is stamped with the `userId` of whoever created it, and every
route checks that ownership before returning or modifying anything — so
one account can never see or edit another account's plants.

### How authentication is checked

Requests must include:
```
Authorization: Bearer <token>
```
A middleware (`authenticateToken`) verifies the token before the request
reaches any plant route. Missing token → `401`. Invalid/expired token →
`403`.

## Run locally

```bash
npm install
node server.js
```

Server runs on `http://localhost:5000` by default.

## Test it directly (without the frontend)

```bash
# Sign up
curl -X POST http://localhost:5000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use the returned token to create a plant
curl -X POST http://localhost:5000/plants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"Snake Plant","wateringFrequencyDays":14}'
```

## Notes on the JWT secret

`JWT_SECRET` currently sits as a plain constant in `server.js` for
simplicity in this learning project. In any real deployment, this should
live in an environment variable (`.env`, excluded from git) instead of
being committed to source control.