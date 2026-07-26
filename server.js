const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;

// In a real project this lives in a .env file and is never committed to
// GitHub. For this learning project it's fine as a plain constant, but
// treat this as a placeholder you'd swap out before ever deploying for real.
const JWT_SECRET = "plantcare-dev-secret-change-this-in-production";

app.use(cors());
app.use(express.json());

// ---- In-memory "databases" — reset every time the server restarts ----
let users = []; // { id, email, passwordHash }
let nextUserId = 1;

let plants = [];
let nextPlantId = 1;

// ---- Auth middleware: checks every protected request for a valid token ----
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization; // expected: "Bearer <token>"
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.userId = payload.userId;
    next();
  });
}

// ---- Auth routes ----

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = { id: String(nextUserId++), email, passwordHash };
  users.push(newUser);

  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, email: newUser.email });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, email: user.email });
});

// ---- Plant routes — all protected, all scoped to the logged-in user ----

// GET /plants — read all (only this user's plants)
app.get("/plants", authenticateToken, (req, res) => {
  res.json(plants.filter((p) => p.userId === req.userId));
});

// GET /plants/:id — read one (only if it belongs to this user)
app.get("/plants/:id", authenticateToken, (req, res) => {
  const plant = plants.find((p) => p.id === req.params.id && p.userId === req.userId);
  if (!plant) {
    return res.status(404).json({ error: "Plant not found" });
  }
  res.json(plant);
});

// POST /plants — create (attached to the logged-in user)
app.post("/plants", authenticateToken, (req, res) => {
  const { name, species, wateringFrequencyDays, lastWateredDate } = req.body;

  if (!name || !wateringFrequencyDays) {
    return res
      .status(400)
      .json({ error: "name and wateringFrequencyDays are required" });
  }

  const newPlant = {
    id: String(nextPlantId++),
    userId: req.userId,
    name,
    species: species || "",
    wateringFrequencyDays: Number(wateringFrequencyDays),
    lastWateredDate: lastWateredDate || new Date().toISOString(),
  };

  plants.push(newPlant);
  res.status(201).json(newPlant);
});

// PUT /plants/:id — update (only if it belongs to this user)
app.put("/plants/:id", authenticateToken, (req, res) => {
  const plant = plants.find((p) => p.id === req.params.id && p.userId === req.userId);
  if (!plant) {
    return res.status(404).json({ error: "Plant not found" });
  }

  Object.assign(plant, req.body);
  res.json(plant);
});

// DELETE /plants/:id — delete (only if it belongs to this user)
app.delete("/plants/:id", authenticateToken, (req, res) => {
  const index = plants.findIndex((p) => p.id === req.params.id && p.userId === req.userId);
  if (index === -1) {
    return res.status(404).json({ error: "Plant not found" });
  }

  plants.splice(index, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`PlantCare API running on http://localhost:${PORT}`);
});