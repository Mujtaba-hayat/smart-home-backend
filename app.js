const smartHomeRoutes = require("./routes/smartHomeRoutes");
const userDeviceRoutes = require("./routes/userDeviceRoutes");
const express = require("express");
const app = express();

const connectDB = require("./database/db");
const userRoutes = require("./routes/userRoutes");

const deviceRoutes = require("./routes/deviceRoutes");
const pumpRoutes = require("./routes/pumpRoutes");
const automationRoutes = require("./routes/automationRoutes");
const authRoutes = require("./routes/authRoutes");

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
app.use(authRoutes);
app.use(userRoutes);
app.use(userDeviceRoutes);
app.use(smartHomeRoutes);

// ===============================
// Home
// ===============================

app.get("/", (req, res) => {
  res.send("Smart Home Backend Running");
});

// ===============================
// Start Server
// ===============================

async function startServer() {

  await connectDB();

  startAutomationScheduler();

  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });

}

startServer();