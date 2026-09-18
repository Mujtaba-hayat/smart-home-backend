const express = require("express");

const router = express.Router();

const protect =
    require("../middleware/authMiddleware");

const {
    receiveSensorData,
    getSensorData,
    getUserSensorData,
} =
    require("../controllers/sensorController");


// =====================================================
// SENSOR CONTROLLER LOADED
// =====================================================

console.log(
    "SENSOR ROUTES LOADED"
);


// =====================================================
// RECEIVE SENSOR DATA FROM ESP32
//
// POST /esp32/sensors
//
// ESP32 sends:
//
// {
//     "esp32Id": "ESP32-XXXX",
//     "temperature": 27.50,
//     "humidity": 61.20,
//     "doorStatus": "closed"
// }
//
// No authentication required because
// ESP32 sends the sensor data directly.
//
// =====================================================

router.post(
    "/sensors",
    receiveSensorData
);


// =====================================================
// GET SENSOR DATA BY ESP32 ID
//
// GET /esp32/sensors/:esp32Id
//
// Existing endpoint.
//
// Useful when a specific ESP32 ID is known.
//
// =====================================================

router.get(
    "/sensors/:esp32Id",
    getSensorData
);


// =====================================================
// GET SENSOR DATA FOR LOGGED-IN USER
//
// GET /user/sensors
//
// Flutter uses this endpoint.
//
// Authentication required.
//
// The controller finds the Smart Home using:
//
// 1. Accepted Member
// 2. Owner
//
// =====================================================

router.get(
    "/user/sensors",
    protect,
    getUserSensorData
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;

