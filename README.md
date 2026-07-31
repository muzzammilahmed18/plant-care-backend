# PlantCare — Backend API

An Express API providing CRUD endpoints for a "plants" resource, secured
behind JWT authentication, with server-side validation and image upload
support. Built as a full-stack internship project, in stages: CRUD →
authentication → richer validation and file uploads. The matching
frontend lives in a separate repo:
[plant-care](https://github.com/muzzammilahmed18/plant-care).

## Tech stack

- Node.js + Express
- CORS enabled, so a frontend on a different port/origin can call it
- `bcrypt` — hashes passwords before they're ever stored
- `jsonwebtoken` — issues a signed JWT on signup/login, verified on every
  protected request
- `multer` — parses multipart form data and handles the plant photo
  upload (stored on disk under `uploads/`, served back as static files)
- In-memory storage (plain arrays for `users` and `plants`) — data resets
  whenever the server restarts

## Auth endpoints

| Method | Route      | Description                                    |
|--------|------------|-------------------------------------------------|
| POST   | `/signup`  | Create an account, returns `{ token, email }`  |
| POST   | `/login`   | Log into an existing account, returns a token  |

## Plant endpoints (all require a valid token)

| Method | Route          | Description                            |
|--------|----------------|------------------------------------------|
| GET    | `/plants`      | Get all plants belonging to this user  |
| GET    | `/plants/:id`  | Get a single plant (must belong to you) |
| POST   | `/plants`      | Create a new plant (multipart form data)|
| PUT    | `/plants/:id`  | Update a plant (JSON or multipart)     |
| DELETE | `/plants/:id`  | Delete a plant (must belong to you)   |

Every plant is stamped with the `userId` of whoever created it, and every
route checks ownership before returning or modifying anything.

## Plant fields & validation

| Field                    | Required | Rule                                            |
|---------------------------|----------|--------------------------------------------------|
| `name`                     | yes      | at least 2 characters                          |
| `species`                    | no       | free text                                       |
| `category`                     | yes      | must be one of: Succulent, Fern, Flowering, Foliage, Herb, Other |
| `wateringFrequencyDays`          | yes      | positive number                                |
| `dateAcquired`                     | yes      | valid date, cannot be in the future            |
| `notes`                              | no       | free text                                       |
| `photo`                                | no       | image file only, 5MB max (multer `fileFilter` + `limits`) |

All of this is validated **server-side** (`validatePlantInput`), on top of
the frontend's own checks — a bypassed or scripted request still can't get
invalid data past this API. Validation errors return `400` with a
field-keyed `errors` object, so the frontend can show them next to the
right input instead of one generic message.

### How photo uploads work

- The frontend sends the plant fields as `multipart/form-data` (via
  `FormData`), not JSON, since JSON can't carry binary files
- `multer` parses the request: text fields land in `req.body`, the image
  lands in `req.file`
- The file is saved to `uploads/` with a unique generated filename, and
  the plant record stores its path as `photoUrl` (e.g. `/uploads/169...-fig.jpg`)
- `app.use("/uploads", express.static("uploads"))` serves those files back
  so the frontend can display them directly

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

# Create a plant with a photo
curl -X POST http://localhost:5000/plants \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "name=Snake Plant" -F "category=Succulent" \
  -F "wateringFrequencyDays=14" -F "dateAcquired=2025-06-01" \
  -F "photo=@/path/to/image.jpg"
```

## Notes

- `uploads/` is git-ignored — uploaded photos aren't committed to the
  repo, only referenced by path in the in-memory plant records
- `JWT_SECRET` currently sits as a plain constant in `server.js` for
  simplicity in this learning project; in any real deployment it should
  live in an environment variable instead