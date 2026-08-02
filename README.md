# PlantCare — Backend API

An Express API providing CRUD endpoints for a "plants" resource, secured
behind JWT authentication, with server-side validation and a standalone
image upload endpoint. Built as a full-stack internship project, in
stages: CRUD → authentication → validation & uploads → decoupled upload
endpoint. The matching frontend lives in a separate repo:
[plant-care](https://github.com/muzzammilahmed18/plant-care).

## Tech stack

- Node.js + Express
- CORS enabled, so a frontend on a different port/origin can call it
- `bcrypt` — hashes passwords before they're ever stored
- `jsonwebtoken` — issues a signed JWT on signup/login, verified on every
  protected request
- `multer` — parses multipart form data for file uploads (stored on disk
  under `uploads/`, served back as static files)
- In-memory storage (plain arrays for `users` and `plants`) — data resets
  whenever the server restarts

## Auth endpoints

| Method | Route      | Description                                    |
|--------|------------|-------------------------------------------------|
| POST   | `/signup`  | Create an account, returns `{ token, email }`  |
| POST   | `/login`   | Log into an existing account, returns a token  |

## Upload endpoint

| Method | Route      | Description                                       |
|--------|------------|-----------------------------------------------------|
| POST   | `/upload`  | Upload a single image, returns `{ url }`           |

This is a **standalone** endpoint, separate from plant creation. The
frontend's drag-and-drop component calls this immediately when a file is
dropped/selected — before the rest of the plant form is even filled out
— and gets back a URL it can show a live progress bar for. That URL then
just travels as a plain string field when the plant itself is created.

Rejects non-image files and anything over 5MB (`multer`'s `fileFilter`
and `limits`), returning a clear `400` error either way.

## Plant endpoints (all require a valid token)

| Method | Route          | Description                            |
|--------|----------------|------------------------------------------|
| GET    | `/plants`      | Get all plants belonging to this user  |
| GET    | `/plants/:id`  | Get a single plant (must belong to you) |
| POST   | `/plants`      | Create a new plant (plain JSON)        |
| PUT    | `/plants/:id`  | Update a plant (plain JSON)           |
| DELETE | `/plants/:id`  | Delete a plant (must belong to you)   |

`POST`/`PUT` no longer accept a file directly — they expect a `photoUrl`
string (the result of an earlier `POST /upload` call), keeping "upload a
file" and "save a plant's data" as two separate, single-purpose
operations rather than one route doing both.

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

All validated **server-side** (`validatePlantInput`) in addition to the
frontend's own checks, with `400` responses carrying a field-keyed
`errors` object so the frontend can show messages next to the right
input.

## Run locally

```bash
npm install
mkdir -p uploads
node server.js
```

Server runs on `http://localhost:5000` by default.

## Test it directly (without the frontend)

```bash
# Sign up
curl -X POST http://localhost:5000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Upload a photo first, get back its URL
curl -X POST http://localhost:5000/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "photo=@/path/to/image.jpg"

# Then create the plant with that URL
curl -X POST http://localhost:5000/plants \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Snake Plant","category":"Succulent","wateringFrequencyDays":14,"dateAcquired":"2025-06-01","photoUrl":"/uploads/169...-image.jpg"}'
```

## Notes

- `uploads/` is git-ignored — uploaded photos aren't committed, only
  referenced by path in the in-memory plant records
- `JWT_SECRET` sits as a plain constant in `server.js` for simplicity in
  this learning project; in any real deployment it should live in an
  environment variable instead