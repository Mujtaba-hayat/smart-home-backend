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

const userDeviceRoutes =
    require("./routes/userDeviceRoutes");

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
// DEVICE ROUTES
// =====================================================
//
// Normal Devices:
// R1-R6
//
// Door Alarm:
// R7
//
// Water Pump:
// R8
//
// Important endpoints:
//
// GET    /devices
//
// GET    /user/devices
//
// POST   /user/devices
//
// PUT    /user/devices/:deviceId/control
//
// DELETE /user/devices/:deviceId
//
// PUT    /user/alarm/control
//
// PUT    /user/alarm/silence
//
// =====================================================

app.use(deviceRoutes);


// =====================================================
// WATER PUMP ROUTES
// =====================================================
//
// R8 = Water Pump
//
// The pump is permanently reserved for R8.
//
// =====================================================

app.use(pumpRoutes);


// =====================================================
// AUTOMATION ROUTES
// =====================================================
//
// Automation creation
// Automation update
// Automation deletion
// Automation management
//
// =====================================================

app.use(automationRoutes);


// =====================================================
// AUTHENTICATION ROUTES
// =====================================================
//
// Register
// Login
// Logout
// Password reset
// Account management
//
// =====================================================

app.use(authRoutes);


// =====================================================
// USER ROUTES
// =====================================================

app.use(userRoutes);


// =====================================================
// USER DEVICE ROUTES
// =====================================================
//
// Flutter uses these endpoints for
// logged-in user device operations.
//
// =====================================================

app.use(userDeviceRoutes);


// =====================================================
// SMART HOME ROUTES
// =====================================================
//
// Smart Home creation
// Pairing
// Unpairing
// Smart Home information
//
// =====================================================

app.use(smartHomeRoutes);


// =====================================================
// ESP32 SENSOR ROUTES
// =====================================================
//
// ESP32 → Backend:
//
// POST /esp32/sensors
//
// Flutter → Backend:
//
// GET /esp32/sensors/:esp32Id
//
// =====================================================

app.use(
    "/esp32",
    sensorRoutes
);


// =====================================================
// MEMBER ROUTES
// =====================================================
//
// GET    /user/members
// POST   /user/members
// PUT    /user/members/:memberId
// DELETE /user/members/:memberId
//
// =====================================================

app.use(
    "/user/members",
    memberRoutes
);


// =====================================================
// NOTIFICATION ROUTES
// =====================================================
//
// GET
// /user/notifications
//
// PUT
// /user/notifications/:notificationId/read
//
// PUT
// /user/notifications/read-all
//
// DELETE
// /user/notifications/:notificationId
//
// =====================================================

app.use(
    "/user",
    notificationRoutes
);


// =====================================================
// ANALYTICS ROUTES
// =====================================================
//
// GET
// /user/analytics/sensors
//
// GET
// /user/analytics/summary
//
// Both routes require authentication.
//
// =====================================================

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

        // -------------------------------------------------
        // CONNECT DATABASE
        // -------------------------------------------------

        await connectDB();


        // -------------------------------------------------
        // START AUTOMATION SCHEDULER
        // -------------------------------------------------

        startAutomationScheduler();


        // -------------------------------------------------
        // START EXPRESS SERVER
        // -------------------------------------------------

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