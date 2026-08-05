# PlantCare — Backend API

🔗 **Live API:** https://plant-care-backend-6qns.onrender.com
🌱 **Live app:** https://plant-care-six-xi.vercel.app
🔗 **Frontend repo:** https://github.com/muzzammilahmed18/plant-care

An Express API providing authenticated CRUD endpoints for a "plants"
resource, with image uploads and automated tests. The matching frontend
lives in a separate repo (linked above).

> ⚠️ **Free tier note:** this runs on Render's free plan, which spins
> down after inactivity. The first request after idle time can take
> 30-60 seconds to respond while it wakes up. Storage is also
> **in-memory and ephemeral** — restarting the service (which happens
> automatically after a spin-down) clears all users, plants, and
> uploaded photos. This is an intentional simplification for a learning
> project; a persistent deployment would use a real database and cloud
> object storage instead.

## Architecture overview

```
Client (React, Vercel)
      │  HTTPS + JWT
      ▼
Express app (Render)
 ├─ /signup, /login        → bcrypt + jsonwebtoken
 ├─ /upload                → multer, saves to uploads/
 └─ /plants (CRUD)          → scoped per-user via JWT payload
      │
      ▼
In-memory arrays (users, plants) — no external database
```

## Tech stack

Node.js + Express, `bcrypt` (password hashing), `jsonwebtoken` (JWT
auth), `multer` (file uploads), `cors`, `dotenv` (config), Vitest +
Supertest (tests).

## Configuration

Copy `.env.example` to `.env`:
```
JWT_SECRET=your-secret-here
PORT=5000
```
In production these are set directly in Render's dashboard, not
committed to the repo — `.env` is git-ignored.

## Auth endpoints

| Method | Route      | Description                                    |
|--------|------------|------------------------------------------------|
| POST   | `/signup`  | Create an account, returns `{ token, email }`  |
| POST   | `/login`   | Log into an existing account, returns a token  |

## Upload endpoint

| Method | Route      | Description                              |
|--------|------------|------------------------------------------|
| POST   | `/upload`  | Upload a single image, returns `{ url }` |

A standalone endpoint — the frontend uploads a photo here first (with
its own progress bar), then passes the resulting URL along as a plain
string field when creating a plant. Rejects non-image files and
anything over 5MB.

## Plant endpoints (all require a valid token)

| Method | Route          | Description                            |
|--------|----------------|----------------------------------------|
| GET    | `/plants`      | Get all plants belonging to this user  |
| GET    | `/plants/:id`  | Get a single plant (must belong to you)|
| POST   | `/plants`      | Create a new plant (plain JSON)        |
| PUT    | `/plants/:id`  | Update a plant (plain JSON)            |
| DELETE | `/plants/:id`  | Delete a plant (must belong to you)    |

## Plant fields & validation

| Field                    | Required | Rule                                            |
|--------------------------|----------|-------------------------------------------------|
| `name`                   | yes      | at least 2 characters                           |
| `species`                | no       | free text                                       |
| `category`               | yes      | one of: Succulent, Fern, Flowering, Foliage, Herb, Other |
| `wateringFrequencyDays`  | yes      | positive number                                 |
| `dateAcquired`           | yes      | valid date, cannot be in the future             |
| `notes`                  | no       | free text                                       |
| `photoUrl`               | no       | string, set via a prior `/upload` call          |

## Testing

```bash
npm test
```
6 tests via Vitest + Supertest, covering happy paths and failure cases:
signup validation, login rejection, protected routes without a token,
plant creation with valid/invalid data. `server.js` exports the Express
`app` separately from `app.listen`, so tests hit real routes without a
live port.

## Run locally

```bash
npm install
mkdir -p uploads
node server.js
```
Server runs on `http://localhost:5000` by default. The `uploads/` folder
is also auto-created at startup if missing, so this step isn't strictly
required — useful since `uploads/` is git-ignored and won't exist on a
fresh clone or deployment.

## Deploy

Deployed on **Render** as a Web Service, connected directly to this
GitHub repo:
- Build command: `npm install`
- Start command: `node server.js`
- Environment variable: `JWT_SECRET` set in Render's dashboard
- `PORT` is provided automatically by Render — `server.js` reads
  `process.env.PORT` with a local fallback of `5000`

Every push to `main` triggers an automatic redeploy.