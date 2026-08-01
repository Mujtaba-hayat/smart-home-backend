const express = require("express");
const router = express.Router();

// ===============================
// Add Automation
// ===============================

router.post("/", (req, res) => {

    const {
        deviceId,
        deviceName,
        time,
        turnOn,
        repeatDays,

    } = req.body;

    if (
        !deviceId ||
        !deviceName ||
        !time ||
        !Array.isArray(repeatDays)
    ){
        return res.status(400).json({
            success: false,
            message: "Invalid automation data",
        });
    }

    const automation = {
        id: Date.now().toString(),
        deviceId,
        deviceName,
        time,
        turnOn,
        repeatDays,
        enabled: true,
    };

    automation.push(automation)

    res.status(201).json({
        success: true,
        message: "Automation created successfully",
        automation,
    });
});

// ===============================
// Get All Automations
// ===============================

router.get("/", (req, res) => {

  res.json({
    success: true,
    automations,
  });

});


module.exports = router;