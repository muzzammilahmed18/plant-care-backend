import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server.js";

// Shared across tests in this file — signup happens once, then later
// tests reuse the resulting token. Vitest runs tests within a file in
// order by default, so this is safe.
let token;

describe("Auth endpoints", () => {
  it("POST /signup with valid data returns 201 and a token", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ email: "tester@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("tester@example.com");

    token = res.body.token; // reused by later tests
  });

  it("POST /signup with a short password returns 400", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ email: "shortpass@example.com", password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it("POST /login with wrong credentials returns 401", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "tester@example.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });
});

describe("Plant endpoints", () => {
  it("GET /plants without a token returns 401", async () => {
    const res = await request(app).get("/plants");
    expect(res.status).toBe(401);
  });

  it("POST /plants with valid data and a valid token returns 201", async () => {
    const res = await request(app)
      .post("/plants")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Test Aloe",
        category: "Succulent",
        wateringFrequencyDays: 10,
        dateAcquired: "2026-01-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test Aloe");
    expect(res.body.category).toBe("Succulent");
    expect(res.body).toHaveProperty("id");
  });

  it("POST /plants with an invalid category returns 400 with field errors", async () => {
    const res = await request(app)
      .post("/plants")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Bad Plant",
        category: "Dinosaur",
        wateringFrequencyDays: 5,
        dateAcquired: "2026-01-01",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty("category");
  });
});