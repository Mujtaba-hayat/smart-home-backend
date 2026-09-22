const express = require("express");
const cors = require("cors");

const app = express();


// =====================================================
// DATABASE
// =====================================================

const connectDB = require("./database/db");


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.use(express.json());


// =====================================================
// ROUTES
// =====================================================

const userRoutes =
    require("./routes/userRoutes");

const authRoutes =
    require("./routes/authRoutes");

const deviceRoutes =
    require("./routes/deviceRoutes");

const pumpRoutes =
    require("./routes/pumpRoutes");

const automationRoutes =
    require("./routes/automationRoutes");

const smartHomeRoutes =
    require("./routes/smartHomeRoutes");

const memberRoutes =
    require("./routes/memberRoutes");

const notificationRoutes =
    require("./routes/notificationRoutes");

const sensorRoutes =
    require("./routes/sensorRoutes");

const analyticsRoutes =
    require("./routes/analyticsRoutes");


// =====================================================
// SCHEDULER
// =====================================================

const {
    startAutomationScheduler,
} = require("./scheduler/automationScheduler");


// =====================================================
// REGISTER ROUTES
// =====================================================

app.use(deviceRoutes);
app.use(pumpRoutes);
app.use(automationRoutes);
app.use(authRoutes);
app.use(userRoutes);
app.use(smartHomeRoutes);

// Mounted directly at root so /esp32/sensors and /user/sensors match cleanly
app.use(sensorRoutes);

app.use(
    "/user/members",
    memberRoutes
);

app.use(
    "/user",
    notificationRoutes
);

app.use(
    "/user",
    analyticsRoutes
);


// =====================================================
// HOME / HEALTH CHECK
// =====================================================

app.get(
    "/",
    (req, res) => {
        res.status(200).send(
            "Smart Home Backend Running"
        );
    }
);


// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    (req, res) => {
        res.status(404).json({
            success: false,
            message:
                "Route not found",
            path:
                req.originalUrl,
        });
    }
);


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "GLOBAL ERROR:",
            error
        );

        res.status(
            error.status || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Internal server error",
        });
    }
);


// =====================================================
// START SERVER
// =====================================================

async function startServer() {
    try {
        await connectDB();
        startAutomationScheduler();

        app.listen(
            3000,
            () => {
                console.log(
                    "================================="
                );
                console.log(
                    "SMART HOME BACKEND"
                );
                console.log(
                    "================================="
                );
                console.log(
                    "Server running on port 3000"
                );
                console.log(
                    "================================="
                );
            }
        );
    } catch (error) {
        console.error(
            "Server startup failed:",
            error
        );
        process.exit(1);
    }
}

// =====================================================
// START APPLICATION
// =====================================================

startServer();