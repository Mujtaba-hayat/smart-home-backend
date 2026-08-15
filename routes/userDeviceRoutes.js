const express = require("express");
const Device = require("../models/Device");
const SmartHome = require("../models/SmartHome");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================
// Get devices belonging to logged-in user's home
// =====================================

router.get("/user/devices", protect, async (req, res) => {

    try {

        // Find user's Smart Home
        const smartHome = await SmartHome.findOne({
            owner: req.user.userId,
        });

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        // Get devices belonging to that home
        const devices = await Device.find({
            home: smartHome._id,
        });

        res.json({
            success: true,
            devices,
        });

    } catch (error) {

        console.error("Get User Devices Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});


// =====================================
// Create device for logged-in user's home
// =====================================

router.post("/user/devices", protect, async (req, res) => {

    try {

        const {
            name,
            deviceId,
            type,
            relay,
        } = req.body;

        // Check required fields
        if (!name || !deviceId || !type || !relay) {

            return res.status(400).json({
                success: false,
                message: "Name, deviceId, type and relay are required",
            });

        }

        // Find user's Smart Home
        const smartHome = await SmartHome.findOne({
            owner: req.user.userId,
        });

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        // Pump relay is reserved
        if (relay === smartHome.pumpRelay && type !== "pump") {
            return res.status(400).json({
                success: false,
                message: `${relay} is reserved for the pump`,
            });
        }

        // Check if relay is already assigned
        const existingDevice = await Device.findOne({
            home: smartHome._id,
            relay,
        });

        if (existingDevice) {
            return res.status(409).json({
                success: false,
                message: `${relay} is already assigned to another device`,
            });
        }

        // Create device
        const device = await Device.create({

            name,
            deviceId,
            type,
            relay,

            home: smartHome._id,

        });

        res.status(201).json({
            success: true,
            message: "Device created successfully",
            device,
        });

    } catch (error) {

        console.error("Create Device Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});


// =====================================
// Update device
// =====================================

router.put("/user/devices/:id", protect, async (req, res) => {

    try {

        // Find user's Smart Home
        const smartHome = await SmartHome.findOne({
            owner: req.user.userId,
        });

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        // Find device belonging to user's home
        const device = await Device.findOne({
            _id: req.params.id,
            home: smartHome._id,
        });

        if (!device) {

            return res.status(404).json({
                success: false,
                message: "Device not found",
            });

        }

        const {
            name,
            deviceId,
            type,
            relay,
            isOn,
        } = req.body;

        if (name !== undefined) {
            device.name = name;
        }

        if (deviceId !== undefined) {
            device.deviceId = deviceId;
        }

        if (type !== undefined) {
            device.type = type;
        }

        if (relay !== undefined) {

            // Don't allow another device to use pump relay
            if (
                relay === smartHome.pumpRelay &&
                device.type !== "pump" &&
                type !== "pump"
            ) {
                return res.status(400).json({
                    success: false,
                    message: `${relay} is reserved for the pump`,
                });
            }

            // Check whether relay belongs to another device
            const existingDevice = await Device.findOne({
                home: smartHome._id,
                relay,
                _id: { $ne: device._id },
            });

            if (existingDevice) {
                return res.status(409).json({
                    success: false,
                    message: `${relay} is already assigned to another device`,
                });
            }

            device.relay = relay;
        }

        if (isOn !== undefined) {
            device.isOn = isOn;
        }

        await device.save();

        res.json({
            success: true,
            message: "Device updated successfully",
            device,
        });

    } catch (error) {

        console.error("Update Device Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});


// =====================================
// Delete device
// =====================================

router.delete("/user/devices/:id", protect, async (req, res) => {

    try {

        const smartHome = await SmartHome.findOne({
            owner: req.user.userId,
        });

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        const device = await Device.findOneAndDelete({
            _id: req.params.id,
            home: smartHome._id,
        });

        if (!device) {

            return res.status(404).json({
                success: false,
                message: "Device not found",
            });

        }

        res.json({
            success: true,
            message: "Device deleted successfully",
        });

    } catch (error) {

        console.error("Delete Device Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});


// =====================================
// Control user's physical device
// =====================================

router.post("/user/devices/:id/control", protect, async (req, res) => {

    try {

        const { state } = req.body;

        // Check state
        if (state !== "ON" && state !== "OFF") {

            return res.status(400).json({
                success: false,
                message: "State must be ON or OFF",
            });

        }

        // Find user's Smart Home
        const smartHome = await SmartHome.findOne({
            owner: req.user.userId,
        });

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        // Find device belonging to user's home
        const device = await Device.findOne({
            _id: req.params.id,
            home: smartHome._id,
        });

        if (!device) {

            return res.status(404).json({
                success: false,
                message: "Device not found",
            });

        }

        // Update MongoDB
        device.isOn = state === "ON";

        await device.save();

        // Update current ESP32 relay state
        const storage = require("../data/storage");

        if (!storage.devices.hasOwnProperty(device.relay)) {

            return res.status(400).json({
                success: false,
                message: "Invalid relay",
            });

        }

        storage.devices[device.relay] = state;

        res.json({
            success: true,
            message: `${device.name} turned ${state}`,
            device,
        });

    } catch (error) {

        console.error("Control Device Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

module.exports = router;