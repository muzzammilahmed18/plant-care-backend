# PlantCare — Backend API

An Express API providing CRUD endpoints for a "plants" resource, secured
behind JWT authentication, with server-side validation, image uploads,
and automated tests. Built as a full-stack internship project, in
stages: CRUD → authentication → validation & uploads → decoupled upload
endpoint → automated testing. The matching frontend lives in a separate
repo: [plant-care](https://github.com/muzzammilahmed18/plant-care).

## Tech stack

- Node.js + Express
- `bcrypt` (password hashing), `jsonwebtoken` (JWT auth), `multer`
  (file uploads), `cors`
- `dotenv` — loads config from a `.env` file locally
- In-memory storage (plain arrays) — data resets whenever the server
  restarts
- Vitest + Supertest for automated tests

## Configuration

Copy `.env.example` to `.env`:
```
JWT_SECRET=your-secret-here
PORT=5000
```
In production, these are set directly in your hosting platform's
dashboard (Render, Railway, etc.) instead of committed to the repo —
`.env` is git-ignored for exactly this reason.

## Testing

```bash
npm test
```

This runs 6 tests against the actual Express app (via Supertest — no
real server/port needed), covering both happy paths and failure cases:

- `POST /signup` with valid data → 201 + token
- `POST /signup` with a short password → 400
- `POST /login` with wrong credentials → 401
- `GET /plants` without a token → 401
- `POST /plants` with valid data + token → 201
- `POST /plants` with an invalid category → 400 with field errors

`server.js` exports the Express `app` separately from starting it
(`app.listen` only runs when the file is executed directly, not when
imported by a test) so tests can hit real routes without a live port.

## Auth endpoints

| Method | Route      | Description                                    |
|--------|------------|-------------------------------------------------|
| POST   | `/signup`  | Create an account, returns `{ token, email }`  |
| POST   | `/login`   | Log into an existing account, returns a token  |

## Upload endpoint

| Method | Route      | Description                                       |
|--------|------------|-----------------------------------------------------|
| POST   | `/upload`  | Upload a single image, returns `{ url }`           |

A standalone endpoint — the frontend uploads a photo here first, then
passes the resulting URL along when creating a plant.

## Plant endpoints (all require a valid token)

| Method | Route          | Description                            |
|--------|----------------|------------------------------------------|
| GET    | `/plants`      | Get all plants belonging to this user  |
| GET    | `/plants/:id`  | Get a single plant (must belong to you) |
| POST   | `/plants`      | Create a new plant (plain JSON)        |
| PUT    | `/plants/:id`  | Update a plant (plain JSON)           |
| DELETE | `/plants/:id`  | Delete a plant (must belong to you)   |

## Plant fields & validation

| Field                    | Required | Rule                                            |
|---------------------------|----------|--------------------------------------------------|
| `name`                     | yes      | at least 2 characters                          |
| `species`                    | no       | free text                                       |
| `category`                     | yes      | one of: Succulent, Fern, Flowering, Foliage, Herb, Other |
| `wateringFrequencyDays`          | yes      | positive number                                |
| `dateAcquired`                     | yes      | valid date, cannot be in the future            |
| `notes`                              | no       | free text                                       |
| `photoUrl`                             | no       | string, set via a prior `/upload` call         |

## Run locally

```bash
npm install
mkdir -p uploads
node server.js
```

Server runs on `http://localhost:5000` by default.

## Notes

- `uploads/` and `.env` are both git-ignored
- `JWT_SECRET` falls back to a placeholder for local dev convenience, but
  a real deployment must set a proper one via the environment