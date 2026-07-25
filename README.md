# PlantCare — Backend API

A small Express API providing CRUD endpoints for a "plants" resource.
Built as a full-stack CRUD exercise — this is the backend half; the
matching frontend lives in a separate repo:
[plant-care](https://github.com/muzzammilahmed18/plant-care).

## Tech stack

- Node.js + Express
- CORS enabled, so a frontend on a different port/origin can call it
- In-memory storage (a plain array) — data resets whenever the server
  restarts. Simple on purpose; swap in a real database (SQLite, Mongo,
  etc.) if you want data to persist between restarts.

## Endpoints

| Method | Route          | Description                          |
|--------|----------------|---------------------------------------|
| GET    | `/plants`      | Get all plants                        |
| GET    | `/plants/:id`  | Get a single plant by id              |
| POST   | `/plants`      | Create a new plant                    |
| PUT    | `/plants/:id`  | Update a plant (e.g. mark as watered) |
| DELETE | `/plants/:id`  | Delete a plant                        |

### Plant object shape

```json
{
  "id": "1",
  "name": "Fiddle Leaf Fig",
  "species": "Ficus lyrata",
  "wateringFrequencyDays": 7,
  "lastWateredDate": "2026-07-25T18:41:27.789Z"
}
```

`name` and `wateringFrequencyDays` are required on create; `species` is
optional and defaults to an empty string.

## Run locally

```bash
npm install
node server.js
```

Server runs on `http://localhost:5000` by default.

## Test it directly (without the frontend)

```bash
curl http://localhost:5000/plants

curl -X POST http://localhost:5000/plants \
  -H "Content-Type: application/json" \
  -d '{"name":"Snake Plant","wateringFrequencyDays":14}'
```

## Notes

- Errors return a proper HTTP status code (`400` for bad input, `404` for
  a missing plant) with a JSON `{ "error": "..." }` body, so the frontend
  can show meaningful error messages instead of guessing.