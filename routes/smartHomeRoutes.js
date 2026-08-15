const express = require("express");
const SmartHome = require("../models/SmartHome");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================
// Create Smart Home
// =====================================

router.post("/user/smart-home", protect, async (req, res) => {

    try {

        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Smart home name is required",
            });
        }

        // Check if user already has a smart home
        const existingHome = await SmartHome.findOne({
            owner: req.user.userId,
        });

        if (existingHome) {
            return res.status(409).json({
                success: false,
                message: "You already have a smart home",
            });
        }

        const smartHome = await SmartHome.create({
            owner: req.user.userId,
            name,
        });

        res.status(201).json({
            success: true,
            message: "Smart home created successfully",
            smartHome,
        });

    } catch (error) {

        console.error("Create Smart Home Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

// =====================================
// Get Smart Home for logged-in user
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
            smartHome,
        });

    } catch (error) {

        console.error("Get Smart Home Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

});

module.exports = router;