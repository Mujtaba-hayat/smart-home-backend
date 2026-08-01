const express = require("express");
const app = express();

const deviceRoutes = require("./routes/deviceRoutes");
const pumpRoutes = require("./routes/pumpRoutes");
const automationRoutes = require("./routes/automationRoutes");

const {
  startAutomationScheduler,
} = require("./scheduler/automationScheduler");

app.use(express.json());

// ===============================
// Routes
// ===============================

app.use(deviceRoutes);
app.use(pumpRoutes);
app.use(automationRoutes);


// ===============================
// Home
// ===============================

app.get("/", (req, res) => {
  res.send("Smart Home Backend Running");
});

// ===============================
// Server
// ===============================

startAutomationScheduler();

app.listen(3000, () => {
  console.log("Server running on port 3000");
});