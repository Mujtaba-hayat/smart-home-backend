const express = require("express");

const SmartHome = require("../models/SmartHome");
const Member = require("../models/Member");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// ESP32 TEST
// =====================================================

router.get("/esp32/test", (req, res) => {

    res.json({
        success: true,
        message: "ESP32 route is working",
    });

});


// =====================================================
// HELPER
// =====================================================
// Get Smart Home for logged-in user.
//
// User can be:
// 1. Smart Home owner
// 2. Accepted Smart Home member
//
// Pending members do NOT get access.
// =====================================================

async function getUserSmartHome(userId) {

    // -------------------------------------
    // Check if user is the owner
    // -------------------------------------

    let smartHome = await SmartHome.findOne({
        owner: userId,
    });

    if (smartHome) {
        return smartHome;
    }

    // -------------------------------------
    // Check accepted membership
    // -------------------------------------

    const membership = await Member.findOne({
        user: userId,
        status: "accepted",
    });

    if (!membership) {
        return null;
    }

    // -------------------------------------
    // Get member's Smart Home
    // -------------------------------------

    smartHome = await SmartHome.findById(
        membership.smartHome
    );

    return smartHome;
}


// =====================================================
// GENERATE ESP32 PAIRING CODE
// =====================================================

router.post(
    "/user/smart-home/pairing-code",
    protect,
    async (req, res) => {

        try {

            // -------------------------------------
            // Only owner can generate pairing code
            // -------------------------------------

            const smartHome = await SmartHome.findOne({
                owner: req.user.userId,
            });

            if (!smartHome) {

                return res.status(404).json({
                    success: false,
                    message: "Smart home not found",
                });

            }

            // -------------------------------------
            // Generate 6-character pairing code
            // -------------------------------------

            const pairingCode = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();

            // -------------------------------------
            // Expire after 10 minutes
            // -------------------------------------

            const pairingCodeExpiresAt =
                new Date(
                    Date.now() + 10 * 60 * 1000
                );

            smartHome.pairingCode =
                pairingCode;

            smartHome.pairingCodeExpiresAt =
                pairingCodeExpiresAt;

            await smartHome.save();

            res.json({

                success: true,

                message:
                    "Pairing code generated successfully",

                pairingCode,

                expiresAt:
                    pairingCodeExpiresAt,

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

    }
);


// =====================================================
// PAIR ESP32 WITH SMART HOME
// =====================================================

router.post(
    "/esp32/pair",
    async (req, res) => {

        try {

            const {
                pairingCode,
                esp32Id,
            } = req.body;

            // -------------------------------------
            // Validate input
            // -------------------------------------

            if (!pairingCode || !esp32Id) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Pairing code and ESP32 ID are required",

                });

            }

            const normalizedPairingCode =
                pairingCode
                    .toUpperCase()
                    .trim();

            const normalizedESP32Id =
                esp32Id
                    .trim();

            // -------------------------------------
            // Find Smart Home
            // -------------------------------------

            const smartHome =
                await SmartHome.findOne({

                    pairingCode:
                        normalizedPairingCode,

                });

            if (!smartHome) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Invalid pairing code",

                });

            }

            // -------------------------------------
            // Check expiration
            // -------------------------------------

            if (
                !smartHome.pairingCodeExpiresAt ||
                smartHome.pairingCodeExpiresAt < new Date()
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Pairing code has expired",

                });

            }

            // -------------------------------------
            // Check if ESP32 belongs to another home
            // -------------------------------------

            const existingESP32 =
                await SmartHome.findOne({

                    esp32Id:
                        normalizedESP32Id,

                    _id: {
                        $ne: smartHome._id,
                    },

                });

            if (existingESP32) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This ESP32 is already connected to another smart home",

                });

            }

            // -------------------------------------
            // CONNECT ESP32
            // -------------------------------------

            smartHome.esp32Id =
                normalizedESP32Id;

            smartHome.status =
                "connected";

            smartHome.lastSeen =
                new Date();

            // -------------------------------------
            // Pairing code cannot be reused
            // -------------------------------------

            smartHome.pairingCode =
                null;

            smartHome.pairingCodeExpiresAt =
                null;

            await smartHome.save();

            console.log();
            console.log("==============================");
            console.log("ESP32 PAIRED SUCCESSFULLY");
            console.log("==============================");
            console.log(
                "ESP32 ID:",
                normalizedESP32Id
            );
            console.log(
                "Smart Home:",
                smartHome.name
            );
            console.log(
                "Smart Home ID:",
                smartHome._id
            );
            console.log("==============================");

            res.json({

                success: true,

                message:
                    "ESP32 paired successfully",

                smartHome: {

                    id:
                        smartHome._id,

                    name:
                        smartHome.name,

                    esp32Id:
                        smartHome.esp32Id,

                    status:
                        smartHome.status,

                    pumpRelay:
                        smartHome.pumpRelay,

                    pumpIsOn:
                        smartHome.pumpIsOn,

                    lastSeen:
                        smartHome.lastSeen,

                },

            });

        } catch (error) {

            console.error(
                "ESP32 Pairing Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error",

            });

        }

    }
);


// =====================================================
// GET SMART HOME OF LOGGED-IN USER
// =====================================================
//
// Supports:
// Owner
// Accepted Member
//
// =====================================================

router.get(
    "/user/smart-home",
    protect,
    async (req, res) => {

        try {

            const userId =
                req.user.userId;

            const smartHome =
                await getUserSmartHome(
                    userId
                );

            if (!smartHome) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Smart home not found",

                });

            }

            res.json({

                success: true,

                smartHome: {

                    id:
                        smartHome._id,

                    name:
                        smartHome.name,

                    owner:
                        smartHome.owner,

                    esp32Id:
                        smartHome.esp32Id,

                    status:
                        smartHome.status,

                    pumpRelay:
                        smartHome.pumpRelay,

                    pumpIsOn:
                        smartHome.pumpIsOn,

                    lastSeen:
                        smartHome.lastSeen,

                    // =================================
                    // SENSOR DATA
                    // =================================

                    temperature:
                        smartHome.temperature ??
                        null,

                    humidity:
                        smartHome.humidity ??
                        null,

                    doorStatus:
                        smartHome.doorStatus ??
                        null,

                    sensorLastUpdated:
                        smartHome.sensorLastUpdated ??
                        null,

                },

            });

        } catch (error) {

            console.error(
                "Get Smart Home Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error",

            });

        }

    }
);


// =====================================================
// CREATE SMART HOME
// =====================================================

router.post(
    "/user/smart-home",
    protect,
    async (req, res) => {

        try {

            const {
                name
            } = req.body;

            // -------------------------------------
            // Validate name
            // -------------------------------------

            if (
                !name ||
                !name.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Smart home name is required",

                });

            }

            // -------------------------------------
            // Check existing Smart Home
            // -------------------------------------

            const existingSmartHome =
                await SmartHome.findOne({

                    owner:
                        req.user.userId,

                });

            if (existingSmartHome) {

                return res.status(409).json({

                    success: false,

                    message:
                        "User already has a smart home",

                });

            }

            // -------------------------------------
            // Create Smart Home
            // -------------------------------------

            const smartHome =
                await SmartHome.create({

                    owner:
                        req.user.userId,

                    name:
                        name.trim(),

                    status:
                        "disconnected",

                    pumpRelay:
                        "R8",

                    lastSeen:
                        null,

                });

            console.log(
                `Smart Home created: ${smartHome.name}`
            );

            // -------------------------------------
            // Response
            // -------------------------------------

            res.status(201).json({

                success: true,

                message:
                    "Smart home created successfully",

                smartHome: {

                    id:
                        smartHome._id,

                    name:
                        smartHome.name,

                    owner:
                        smartHome.owner,

                    esp32Id:
                        smartHome.esp32Id,

                    status:
                        smartHome.status,

                    pumpRelay:
                        smartHome.pumpRelay,

                    pumpIsOn:
                        smartHome.pumpIsOn,

                    lastSeen:
                        smartHome.lastSeen,

                    temperature:
                        smartHome.temperature ??
                        null,

                    humidity:
                        smartHome.humidity ??
                        null,

                    doorStatus:
                        smartHome.doorStatus ??
                        null,

                    sensorLastUpdated:
                        smartHome.sensorLastUpdated ??
                        null,

                },

            });

        } catch (error) {

            console.error(
                "Create Smart Home Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error",

            });

        }

    }
);


// =====================================================
// GET SMART HOME CONNECTION STATUS
// =====================================================
//
// Supports:
// Owner
// Accepted Member
//
// =====================================================

router.get(
    "/user/smart-home/status",
    protect,
    async (req, res) => {

        try {

            const userId =
                req.user.userId;

            const smartHome =
                await getUserSmartHome(
                    userId
                );

            if (!smartHome) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Smart home not found",

                });

            }

            // -------------------------------------
            // Check heartbeat
            // -------------------------------------

            let isConnected = false;

            if (
                smartHome.esp32Id &&
                smartHome.lastSeen
            ) {

                const difference =
                    Date.now() -
                    smartHome.lastSeen.getTime();

                isConnected =
                    difference <= 15000;

            }

            // -------------------------------------
            // Update status
            // -------------------------------------

            smartHome.status =
                isConnected
                    ? "connected"
                    : "disconnected";

            await smartHome.save();

            // -------------------------------------
            // Response
            // -------------------------------------

            res.json({

                success: true,

                status:
                    smartHome.status,

                esp32Connected:
                    isConnected,

                esp32Id:
                    smartHome.esp32Id ||
                    null,

                lastSeen:
                    smartHome.lastSeen ||
                    null,

            });

        } catch (error) {

            console.error(
                "Smart Home Status Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error",

            });

        }

    }
);


// =====================================================
// UNPAIR ESP32
// =====================================================
//
// Only Smart Home owner can unpair.
//
// =====================================================

router.post(
    "/user/smart-home/unpair",
    protect,
    async (req, res) => {

        try {

            const smartHome =
                await SmartHome.findOne({

                    owner:
                        req.user.userId,

                });

            if (!smartHome) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Smart home not found",

                });

            }

            if (!smartHome.esp32Id) {

                return res.status(400).json({

                    success: false,

                    message:
                        "No ESP32 is currently paired",

                });

            }

            // -------------------------------------
            // Remove ESP32
            // -------------------------------------

            smartHome.esp32Id =
                null;

            smartHome.status =
                "disconnected";

            smartHome.lastSeen =
                null;

            smartHome.pairingCode =
                null;

            smartHome.pairingCodeExpiresAt =
                null;

            await smartHome.save();

            console.log(
                "ESP32 unpaired successfully"
            );

            res.json({

                success: true,

                message:
                    "ESP32 unpaired successfully",

                smartHome: {

                    id:
                        smartHome._id,

                    name:
                        smartHome.name,

                    owner:
                        smartHome.owner,

                    esp32Id:
                        smartHome.esp32Id,

                    status:
                        smartHome.status,

                    pumpRelay:
                        smartHome.pumpRelay,

                    lastSeen:
                        smartHome.lastSeen,

                },

            });

        } catch (error) {

            console.error(
                "Unpair ESP32 Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error",

            });

        }

    }
);


// =====================================================
// ESP32 HEARTBEAT
// =====================================================
//
// POST /esp32/heartbeat
//
// Body:
//
// {
//     "esp32Id": "ESP32-14B1E2F4E9D4"
// }
//
// =====================================================

router.post(
    "/esp32/heartbeat",
    async (req, res) => {

        try {

            console.log();
            console.log(
                "================================="
            );
            console.log(
                "ESP32 HEARTBEAT REQUEST RECEIVED"
            );
            console.log(
                "================================="
            );

            const {
                esp32Id
            } = req.body;

            console.log(
                "ESP32 ID:",
                esp32Id
            );

            if (
                !esp32Id ||
                typeof esp32Id !== "string"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "ESP32 ID is required",

                });

            }

            const normalizedESP32Id =
                esp32Id.trim();

            // -------------------------------------
            // Find Smart Home
            // -------------------------------------

            const smartHome =
                await SmartHome.findOne({

                    esp32Id:
                        normalizedESP32Id,

                });

            if (!smartHome) {

                console.log(
                    `Unknown ESP32 heartbeat: ${normalizedESP32Id}`
                );

                return res.status(404).json({

                    success: false,

                    message:
                        "ESP32 is not paired",

                });

            }

            // -------------------------------------
            // Update heartbeat
            // -------------------------------------

            smartHome.status =
                "connected";

            smartHome.lastSeen =
                new Date();

            await smartHome.save();

            console.log(
                `Heartbeat received from ${normalizedESP32Id}`
            );

            console.log(
                `Last seen: ${smartHome.lastSeen}`
            );

            console.log(
                "================================="
            );

            res.status(200).json({

                success: true,

                message:
                    "ESP32 heartbeat received",

                esp32Id:
                    smartHome.esp32Id,

                status:
                    smartHome.status,

                lastSeen:
                    smartHome.lastSeen,

            });

        } catch (error) {

            console.error(
                "ESP32 Heartbeat Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error",

            });

        }

    }
);


// =====================================================
// CHECK ESP32 PAIRING STATUS
// =====================================================

router.get(
    "/esp32/status/:esp32Id",
    async (req, res) => {

        try {

            const {
                esp32Id
            } = req.params;

            if (
                !esp32Id ||
                !esp32Id.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "ESP32 ID is required",

                });

            }

            const normalizedESP32Id =
                esp32Id.trim();

            // -------------------------------------
            // Find Smart Home
            // -------------------------------------

            const smartHome =
                await SmartHome.findOne({

                    esp32Id:
                        normalizedESP32Id,

                });

            // -------------------------------------
            // ESP32 not paired
            // -------------------------------------

            if (!smartHome) {

                return res.json({

                    success: true,

                    paired: false,

                    status:
                        "disconnected",

                    lastSeen:
                        null,

                });

            }

            // -------------------------------------
            // Check heartbeat
            // -------------------------------------

            let isConnected = false;

            if (smartHome.lastSeen) {

                const difference =
                    Date.now() -
                    smartHome.lastSeen.getTime();

                isConnected =
                    difference <= 15000;

            }

            // -------------------------------------
            // Update status
            // -------------------------------------

            smartHome.status =
                isConnected
                    ? "connected"
                    : "disconnected";

            await smartHome.save();

            // -------------------------------------
            // Response
            // -------------------------------------

            res.json({

                success: true,

                paired: true,

                status:
                    smartHome.status,

                smartHomeId:
                    smartHome._id,

                lastSeen:
                    smartHome.lastSeen,

                esp32Connected:
                    isConnected,

            });

        } catch (error) {

            console.error(
                "ESP32 Status Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error",

            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;