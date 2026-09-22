const express = require("express");
const router = express.Router();

const {
    receiveSensorData,
    getSensorData,
    getUserSensorData,
} = require("../controllers/sensorController");

const protect = require("../middleware/authMiddleware");

// =====================================================
// ESP32 INGESTION & STATUS
// =====================================================
router.post(
    "/esp32/sensors",
    receiveSensorData
);

router.get(
    "/esp32/sensors/:esp32Id",
    getSensorData
);

// =====================================================
// USER TELEMETRY (SUPPORTS BOTH PATH CONVENTIONS)
// =====================================================
router.get(
    "/user/sensors",
    protect,
    getUserSensorData
);

router.get(
    "/esp32/user/sensors",
    protect,
    getUserSensorData
);

module.exports = router;