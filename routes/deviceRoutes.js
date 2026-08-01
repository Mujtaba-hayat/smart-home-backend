const express = require("express");
const router = express.Router();
const {
    getDevices,
    controlDevice,
} = require("../controllers/deviceController");

// ===============================
// Device Routes
// ===============================

router.get("/devices", getDevices);
router.get("/control", controlDevice);

module.exports = router;