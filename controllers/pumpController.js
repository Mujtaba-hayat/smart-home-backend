const SmartHome = require("../models/SmartHome");

// =====================================================
// FIND OWNER SMART HOME
// =====================================================

async function findOwnerHome(userId) {
    return SmartHome.findOne({
        owner: userId,
    });
}

// =====================================================
// GET PUMP STATUS
// =====================================================

async function getPumpStatus(req, res) {
    try {
        const userId = req.user.userId;

        const smartHome =
            await findOwnerHome(userId);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        return res.json({
            success: true,

            pump: {
                relay: smartHome.pumpRelay || "R8",

                isOn:
                    smartHome.pumpIsOn === true,

                status:
                    smartHome.pumpIsOn === true
                        ? "running"
                        : "off",

                lastSeen:
                    smartHome.lastSeen,
            },
        });

    } catch (error) {

        console.error(
            "GET PUMP STATUS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

// =====================================================
// START PUMP
// =====================================================

async function startPump(req, res) {
    try {
        const userId = req.user.userId;

        const smartHome =
            await findOwnerHome(userId);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        // R8 is permanently reserved for pump
        smartHome.pumpRelay = "R8";

        smartHome.pumpIsOn = true;

        await smartHome.save();

        console.log(
            "================================="
        );

        console.log(
            "WATER PUMP STARTED"
        );

        console.log(
            "User:",
            userId
        );

        console.log(
            "Smart Home:",
            smartHome.name
        );

        console.log(
            "Relay:",
            "R8"
        );

        console.log(
            "================================="
        );

        return res.json({
            success: true,

            message:
                "Water pump started successfully",

            pump: {
                relay: "R8",
                isOn: true,
                status: "running",
            },
        });

    } catch (error) {

        console.error(
            "START PUMP ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

// =====================================================
// STOP PUMP
// =====================================================

async function stopPump(req, res) {
    try {
        const userId = req.user.userId;

        const smartHome =
            await findOwnerHome(userId);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        // R8 is permanently reserved for pump
        smartHome.pumpRelay = "R8";

        smartHome.pumpIsOn = false;

        await smartHome.save();

        console.log(
            "================================="
        );

        console.log(
            "WATER PUMP STOPPED"
        );

        console.log(
            "User:",
            userId
        );

        console.log(
            "Smart Home:",
            smartHome.name
        );

        console.log(
            "Relay:",
            "R8"
        );

        console.log(
            "================================="
        );

        return res.json({
            success: true,

            message:
                "Water pump stopped successfully",

            pump: {
                relay: "R8",
                isOn: false,
                status: "off",
            },
        });

    } catch (error) {

        console.error(
            "STOP PUMP ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
    getPumpStatus,
    startPump,
    stopPump,
};