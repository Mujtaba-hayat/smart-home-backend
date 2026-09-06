const express = require("express");
const cors = require("cors");

const app = express();

// ===============================
// Database
// ===============================

const connectDB = require("./database/db");

// ===============================
// Middleware
// ===============================

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.use(express.json());

// ===============================
// Routes
// ===============================

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");

const deviceRoutes = require("./routes/deviceRoutes");
const userDeviceRoutes = require("./routes/userDeviceRoutes");

const pumpRoutes = require("./routes/pumpRoutes");

const automationRoutes =
    require("./routes/automationRoutes");

const smartHomeRoutes =
    require("./routes/smartHomeRoutes");

const memberRoutes =
    require("./routes/memberRoutes");

// SENSOR ROUTES
const sensorRoutes =
    require("./routes/sensorRoutes");

// ===============================
// Scheduler
// ===============================

const {
    startAutomationScheduler,
} = require("./scheduler/automationScheduler");

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
// Sensor Routes
// ===============================
//
// /esp32/sensors
// /esp32/sensors/:esp32Id
//

app.use("/esp32", sensorRoutes);

// ===============================
// Member Routes
// ===============================

app.use(
    "/user/members",
    memberRoutes
);

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
    try {
        await connectDB();

        startAutomationScheduler();

        app.listen(3000, () => {
            console.log(
                "Server running on port 3000"
            );
        });

    } catch (error) {

        console.error(
            "Server startup failed:",
            error
        );

        process.exit(1);
    }
}

startServer();