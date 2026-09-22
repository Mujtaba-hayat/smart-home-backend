const express = require("express");
const router = express.Router();

const {
    getDevices,
    getUserDevices,
    addDevice,
    controlDevice,
    deleteDevice,
    controlPump,
    controlAlarm,
} = require("../controllers/deviceController");

const protect = require("../middleware/authMiddleware");

// =====================================================
// DOOR ALARM CONTROL (R7)
// =====================================================
router.put(
    "/user/alarm/control",
    protect,
    controlAlarm
);

// =====================================================
// ESP32 POLLING ENDPOINT
// =====================================================
router.get(
    "/devices",
    getDevices
);

// =====================================================
// USER DEVICE MANAGEMENT
// =====================================================
router.get(
    "/user/devices",
    protect,
    getUserDevices
);

router.post(
    "/user/devices",
    protect,
    addDevice
);

router.put(
    "/user/devices/:deviceId/control",
    protect,
    controlDevice
);

router.delete(
    "/user/devices/:deviceId",
    protect,
    deleteDevice
);

// =====================================================
// WATER PUMP CONTROL (R8)
// =====================================================
router.put(
    "/user/pump/control",
    protect,
    controlPump
);

module.exports = router;