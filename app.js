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

router.get("/devices", getDevices);

router.get("/user/devices", protect, getUserDevices);
router.post("/user/devices", protect, addDevice);

router.put("/user/devices/:deviceId/control", protect, controlDevice);
router.post("/user/devices/:deviceId/control", protect, controlDevice);

router.delete("/user/devices/:deviceId", protect, deleteDevice);

router.put("/user/pump/control", protect, controlPump);

module.exports = router;