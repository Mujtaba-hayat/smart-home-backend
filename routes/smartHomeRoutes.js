const express = require("express");
const SmartHome = require("../models/SmartHome");
const protect = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================
// Generate ESP32 pairing code
// =====================================

router.post("/user/smart-home/pairing-code", protect, async (req, res) => {

    try {

        // Find smart home belonging to logged-in user
        const smartHome = await SmartHome.findOne({
            owner: req.user.userId,
        });

        if (!smartHome) {

            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });

        }

        // Generate 6-character pairing code
        const pairingCode = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

        // Code expires after 10 minutes
        const pairingCodeExpiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        // Save pairing information
        smartHome.pairingCode = pairingCode;
        smartHome.pairingCodeExpiresAt = pairingCodeExpiresAt;

        await smartHome.save();

        res.json({
            success: true,
            message: "Pairing code generated successfully",
            pairingCode,
            expiresAt: pairingCodeExpiresAt,
        });

    } catch (error) {

        console.error(
            "Generate Pairing Code Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

// =====================================
// Pair ESP32 with Smart Home
// =====================================

router.post("/esp32/pair", async (req, res) => {

    try {

        const {
            pairingCode,
            esp32Id,
        } = req.body;

        // Check required fields
        if (!pairingCode || !esp32Id) {

            return res.status(400).json({
                success: false,
                message: "Pairing code and ESP32 ID are required",
            });

        }

        // Find Smart Home using pairing code
        const smartHome = await SmartHome.findOne({
            pairingCode: pairingCode.toUpperCase(),
        });

        if (!smartHome) {

            return res.status(404).json({
                success: false,
                message: "Invalid pairing code",
            });

        }

        // Check code expiration
        if (
            !smartHome.pairingCodeExpiresAt ||
            smartHome.pairingCodeExpiresAt < new Date()
        ) {

            return res.status(401).json({
                success: false,
                message: "Pairing code has expired",
            });

        }

        // Check whether this ESP32 is already connected
        const existingESP32 = await SmartHome.findOne({
            esp32Id,
            _id: { $ne: smartHome._id },
        });

        if (existingESP32) {

            return res.status(409).json({
                success: false,
                message: "This ESP32 is already connected to another smart home",
            });

        }

        // Connect ESP32
        smartHome.esp32Id = esp32Id;
        smartHome.status = "connected";

        // Pairing code can no longer be reused
        smartHome.pairingCode = null;
        smartHome.pairingCodeExpiresAt = null;

        await smartHome.save();

        res.json({
            success: true,
            message: "ESP32 paired successfully",
            smartHome: {
                id: smartHome._id,
                name: smartHome.name,
                esp32Id: smartHome.esp32Id,
                status: smartHome.status,
            },
        });

    } catch (error) {

        console.error(
            "ESP32 Pairing Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

// =====================================
// Get Smart Home of logged-in user
// =====================================

router.get("/user/smart-home", protect, async (req, res) => {

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

        res.json({
            success: true,
            smartHome: {
                id: smartHome._id,
                name: smartHome.name,
                esp32Id: smartHome.esp32Id,
                status: smartHome.status,
                pumpRelay: smartHome.pumpRelay,
            },
        });

    } catch (error) {

        console.error(
            "Get Smart Home Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

// =====================================
// Create Smart Home for logged-in user
// =====================================

router.post("/user/smart-home", protect, async (req, res) => {

    try {

        const { name } = req.body;

        // Check required field
        if (!name || !name.trim()) {

            return res.status(400).json({
                success: false,
                message: "Smart home name is required",
            });

        }

        // Check if user already has a Smart Home
        const existingSmartHome = await SmartHome.findOne({
            owner: req.user.userId,
        });

        if (existingSmartHome) {

            return res.status(409).json({
                success: false,
                message: "User already has a smart home",
            });

        }

        // Create Smart Home
        const smartHome = await SmartHome.create({

            owner: req.user.userId,

            name: name.trim(),

            // ESP32 is not connected initially
            status: "disconnected",

            // Fixed pump relay
            pumpRelay: "R8",

        });

        res.status(201).json({
            success: true,
            message: "Smart home created successfully",

            smartHome: {
                id: smartHome._id,
                name: smartHome.name,
                esp32Id: smartHome.esp32Id,
                status: smartHome.status,
                pumpRelay: smartHome.pumpRelay,
            },
        });

    } catch (error) {

        console.error(
            "Create Smart Home Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

// =====================================
// Get Smart Home connection status
// =====================================

router.get("/user/smart-home/status", protect, async (req, res) => {

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

        res.json({
            success: true,

            status: smartHome.status,

            esp32Connected:
                smartHome.status === "connected",

            esp32Id: smartHome.esp32Id || null,
        });

    } catch (error) {

        console.error(
            "Smart Home Status Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

// =====================================
// Unpair ESP32 from Smart Home
// =====================================

router.post("/user/smart-home/unpair", protect, async (req, res) => {

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

        // Check whether ESP32 is actually paired
        if (!smartHome.esp32Id) {

            return res.status(400).json({
                success: false,
                message: "No ESP32 is currently paired",
            });

        }

        // Remove ESP32 information
        smartHome.esp32Id = null;
        smartHome.status = "disconnected";

        // Remove any old pairing code
        smartHome.pairingCode = null;
        smartHome.pairingCodeExpiresAt = null;

        await smartHome.save();

        res.json({
            success: true,
            message: "ESP32 unpaired successfully",

            smartHome: {
                id: smartHome._id,
                name: smartHome.name,
                esp32Id: smartHome.esp32Id,
                status: smartHome.status,
                pumpRelay: smartHome.pumpRelay,
            },
        });

    } catch (error) {

        console.error(
            "Unpair ESP32 Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

// =====================================
// Check ESP32 pairing status
// =====================================

router.get("/esp32/status/:esp32Id", async (req, res) => {

    try {

        const { esp32Id } = req.params;

        if (!esp32Id) {

            return res.status(400).json({
                success: false,
                message: "ESP32 ID is required",
            });

        }

        const smartHome = await SmartHome.findOne({
            esp32Id: esp32Id,
        });

        // ESP32 is not paired with any Smart Home
        if (!smartHome) {

            return res.json({
                success: true,
                paired: false,
                status: "disconnected",
            });

        }

        res.json({
            success: true,
            paired: true,
            status: smartHome.status,
            smartHomeId: smartHome._id,
        });

    } catch (error) {

        console.error(
            "ESP32 Status Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

module.exports = router;