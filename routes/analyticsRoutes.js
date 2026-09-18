const express = require("express");

const router = express.Router();


// =====================================================
// CONTROLLER
// =====================================================

const {
    getAnalytics,
} = require("../controllers/analyticsController");


// =====================================================
// AUTHENTICATION
// =====================================================

const protect =
    require("../middleware/authMiddleware");


// =====================================================
// GET SMART HOME ANALYTICS
//
// GET /user/analytics
//
// Authentication required.
//
// Returns:
//
// - Smart Home information
// - Total devices
// - Devices ON
// - Devices OFF
// - Water pump state
// - Pump power
// - Estimated energy per hour
// - Estimated electricity cost
// - Temperature
// - Humidity
// - Door status
//
// =====================================================

router.get(
    "/analytics",
    protect,
    getAnalytics
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;

