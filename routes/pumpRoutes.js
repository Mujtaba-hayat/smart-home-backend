const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    getPumpStatus,
    startPump,
    stopPump,
} = require("../controllers/pumpController");

// =====================================================
// PUMP ROUTES
// =====================================================

router.get(
    "/pump/status",
    protect,
    getPumpStatus
);

router.post(
    "/pump/start",
    protect,
    startPump
);

router.post(
    "/pump/stop",
    protect,
    stopPump
);

module.exports = router;