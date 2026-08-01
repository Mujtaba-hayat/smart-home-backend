const express = require("express");
const router = express.Router();

const {
    getPumpStatus,
    startPump,
    stopPump,
} = require ("../controllers/pumpController");

// ===============================
// Pump Routes
// ===============================

router.get("/pump/status", getPumpStatus);
router.post("/pump/start", startPump);

router.post("/pump/stop", stopPump);

module.exports = router;