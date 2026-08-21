const express = require("express");

const router = express.Router();

const {
    getDevices,
    getUserDevices,
    addDevice,
    controlDevice,
    deleteDevice,
    controlPump,
} = require("../controllers/deviceController");

const protect = require("../middleware/authMiddleware");


// =====================================
// ESP32
// =====================================

// ESP32 polls this endpoint every 5 seconds
router.get("/devices", getDevices);


// =====================================
// User Device Management
// =====================================

// Get logged-in user's devices
router.get(
    "/user/devices",
    protect,
    getUserDevices
);


// Add device
router.post(
    "/user/devices",
    protect,
    addDevice
);


// Control device
router.put(
    "/user/devices/:deviceId/control",
    protect,
    controlDevice
);


// Delete device
router.delete(
    "/user/devices/:deviceId",
    protect,
    deleteDevice
);

// =====================================
// Water Pump Control
// R8 is permanently reserved
// =====================================

router.put(
    "/user/pump/control",
    protect,
    controlPump
);


module.exports = router;