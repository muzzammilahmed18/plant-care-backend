const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const path = require("path");
const fs = require("fs");

// The uploads/ folder is git-ignored (uploaded files shouldn't be
// committed), so it won't exist on a fresh deployment unless we create
// it ourselves at startup.
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const app = express();
const PORT = 5000;

// In a real project this lives in a .env file and is never committed to
// GitHub. For this learning project it's fine as a plain constant, but
// treat this as a placeholder you'd swap out before ever deploying for real.
const JWT_SECRET = "plantcare-dev-secret-change-this-in-production";

const CATEGORY_OPTIONS = ["Succulent", "Fern", "Flowering", "Foliage", "Herb", "Other"];

app.use(cors());
app.use(express.json());

// Serve uploaded photos as static files, e.g. GET /uploads/168...-fig.jpg
app.use("/uploads", express.static("uploads"));

// ---- File upload config (multer) ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed for the photo"));
    }
    cb(null, true);
  },
});

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

// ---- Server-side validation, mirrors the frontend's rules ----
// Only validates fields that are actually present, so a quick "mark as
// watered" patch (which only sends lastWateredDate) doesn't get rejected
// for missing name/category/etc.
function validatePlantInput(body, { isCreate }) {
  const errors = {};

  if (isCreate || body.name !== undefined) {
    if (!body.name || body.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters.";
    }
  }

  if (isCreate || body.wateringFrequencyDays !== undefined) {
    const freq = Number(body.wateringFrequencyDays);
    if (!body.wateringFrequencyDays || isNaN(freq) || freq < 1) {
      errors.wateringFrequencyDays = "Watering frequency must be a positive number.";
    }
  }

  if (isCreate || body.category !== undefined) {
    if (!body.category || !CATEGORY_OPTIONS.includes(body.category)) {
      errors.category = `Category must be one of: ${CATEGORY_OPTIONS.join(", ")}.`;
    }
  }

  if (isCreate || body.dateAcquired !== undefined) {
    const date = new Date(body.dateAcquired);
    if (!body.dateAcquired || isNaN(date.getTime())) {
      errors.dateAcquired = "Enter a valid date.";
    } else if (date > new Date()) {
      errors.dateAcquired = "Date acquired can't be in the future.";
    }
  }

  return errors;
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

// POST /upload — a standalone endpoint just for uploading a photo.
// Used by the frontend's drag-and-drop component BEFORE the plant form
// is even submitted: upload the file, get back a URL, then that URL
// just rides along as a plain string field on the plant itself.
app.post("/upload", authenticateToken, upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file received" });
  }
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

// POST /plants — create (attached to the logged-in user)
// Plain JSON now — photoUrl is just a string, since the actual upload
// already happened separately via POST /upload.
app.post("/plants", authenticateToken, (req, res) => {
  const errors = validatePlantInput(req.body, { isCreate: true });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const { name, species, wateringFrequencyDays, category, dateAcquired, notes, lastWateredDate, photoUrl } = req.body;

  const newPlant = {
    id: String(nextPlantId++),
    userId: req.userId,
    name: name.trim(),
    species: species || "",
    category,
    dateAcquired,
    notes: notes || "",
    wateringFrequencyDays: Number(wateringFrequencyDays),
    lastWateredDate: lastWateredDate || new Date().toISOString(),
    photoUrl: photoUrl || null,
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

  const errors = validatePlantInput(req.body, { isCreate: false });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
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

// ---- Error handler — catches multer errors (bad file type, too large) ----
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || "Something went wrong" });
  }
  next();
});

// Only start listening when this file is run directly (node server.js),
// not when it's imported by a test file — Supertest just needs the `app`
// object itself, it makes fake requests without a real port being open.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PlantCare API running on http://localhost:${PORT}`);
  });
}

module.exports = app;