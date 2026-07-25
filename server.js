const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// In-memory "database" — resets every time the server restarts.
// Fine for learning; swap for a real database later if you want data to persist.
let plants = [
  {
    id: "1",
    name: "Fiddle Leaf Fig",
    species: "Ficus lyrata",
    wateringFrequencyDays: 7,
    lastWateredDate: new Date().toISOString(),
  },
];
let nextId = 2;

// GET /plants — read all
app.get("/plants", (req, res) => {
  res.json(plants);
});

// GET /plants/:id — read one
app.get("/plants/:id", (req, res) => {
  const plant = plants.find((p) => p.id === req.params.id);
  if (!plant) {
    return res.status(404).json({ error: "Plant not found" });
  }
  res.json(plant);
});

// POST /plants — create
app.post("/plants", (req, res) => {
  const { name, species, wateringFrequencyDays, lastWateredDate } = req.body;

  if (!name || !wateringFrequencyDays) {
    return res
      .status(400)
      .json({ error: "name and wateringFrequencyDays are required" });
  }

  const newPlant = {
    id: String(nextId++),
    name,
    species: species || "",
    wateringFrequencyDays: Number(wateringFrequencyDays),
    lastWateredDate: lastWateredDate || new Date().toISOString(),
  };

  plants.push(newPlant);
  res.status(201).json(newPlant);
});

// PUT /plants/:id — update (e.g. mark as watered, or edit details)
app.put("/plants/:id", (req, res) => {
  const plant = plants.find((p) => p.id === req.params.id);
  if (!plant) {
    return res.status(404).json({ error: "Plant not found" });
  }

  Object.assign(plant, req.body);
  res.json(plant);
});

// DELETE /plants/:id — delete
app.delete("/plants/:id", (req, res) => {
  const index = plants.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Plant not found" });
  }

  plants.splice(index, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`PlantCare API running on http://localhost:${PORT}`);
});