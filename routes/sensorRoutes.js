const express = require("express");

const {
    receiveSensorData,
    getSensorData,
} = require("../controllers/sensorController");

const router = express.Router();

// =====================================================
// SENSOR CONTROLLER LOADED
// =====================================================

console.log("SENSOR CONTROLLER LOADED");

// =====================================================
// RECEIVE SENSOR DATA FROM ESP32
//
// POST /esp32/sensors
//
// =====================================================

router.post(
    "/sensors",
    receiveSensorData
);

// =====================================================
// GET SENSOR DATA
//
// GET /esp32/sensors/:esp32Id
//
// =====================================================

router.get(
    "/sensors/:esp32Id",
    getSensorData
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;