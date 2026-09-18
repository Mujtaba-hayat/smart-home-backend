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
    silenceAlarm,
} = require("../controllers/deviceController");

const protect = require("../middleware/authMiddleware");

// =====================================================
// DOOR ALARM CONTROL
//
// R7 = Door Alarm
// =====================================================

// Arm / Disarm Door Alarm
router.put(
    "/user/alarm/control",
    protect,
    controlAlarm
);

// Silence currently active alarm
//
// IMPORTANT:
// This does NOT disarm the alarm.
// alarmEnabled remains true.
// It only stops the current siren.
router.put(
    "/user/alarm/silence",
    protect,
    silenceAlarm
);


// =====================================================
// ESP32
// =====================================================

// ESP32 polls this endpoint every 5 seconds
//
// Returns:
// R1-R6 = Normal devices
// R7    = Door Alarm
// R8    = Water Pump
router.get(
    "/devices",
    getDevices
);


// =====================================================
// USER DEVICE MANAGEMENT
// =====================================================

// Get logged-in user's devices
//
// Works for:
// - Owner
// - Accepted member
router.get(
    "/user/devices",
    protect,
    getUserDevices
);


// =====================================================
// ADD DEVICE
// =====================================================

// Add normal device R1-R6
// Add alarm device R7
//
// R8 is permanently reserved for Water Pump
router.post(
    "/user/devices",
    protect,
    addDevice
);


// =====================================================
// CONTROL DEVICE
// =====================================================

// Control normal devices R1-R6
//
// R7 alarm should preferably be controlled through:
// PUT /user/alarm/control
//
// R8 pump should be controlled through:
// PUT /user/pump/control
router.put(
    "/user/devices/:deviceId/control",
    protect,
    controlDevice
);


// =====================================================
// DELETE DEVICE
// =====================================================

// Delete devices R1-R7
//
// R8 cannot be deleted because it is reserved
// for the Water Pump.
router.delete(
    "/user/devices/:deviceId",
    protect,
    deleteDevice
);


// =====================================================
// WATER PUMP CONTROL
//
// R8 = Water Pump
// =====================================================

router.put(
    "/user/pump/control",
    protect,
    controlPump
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;