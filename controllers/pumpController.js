const SmartHome = require("../models/SmartHome");
const storage = require("../data/storage");

const {
    startPumpTimer,
    stopPumpTimer,
} = require("../services/pumpService");

async function findOwnerHome(req) {
    return SmartHome.findOne({ owner: req.user.userId });
}

async function getPumpStatus(req, res) {
    try {
        const smartHome = await findOwnerHome(req);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        res.json({
            success: true,
            relay: "R8",
            running: Boolean(smartHome.pumpIsOn),
            duration: storage.pump.duration,
            remaining: storage.pump.remaining,
        });
    } catch (error) {
        console.error("Get Pump Status Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

async function startPump(req, res) {
    try {
        const { minutes } = req.body;

        if (!minutes) {
            return res.status(400).json({
                success: false,
                message: "Minutes required",
            });
        }

        const smartHome = await findOwnerHome(req);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        smartHome.pumpIsOn = true;
        smartHome.pumpRelay = "R8";
        await smartHome.save();

        startPumpTimer(minutes);

        res.json({
            success: true,
            message: "Pump started",
            minutes,
            pump: {
                name: "Water Pump",
                relay: "R8",
                isOn: true,
            },
        });
    } catch (error) {
        console.error("Start Pump Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

async function stopPump(req, res) {
    try {
        const smartHome = await findOwnerHome(req);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        stopPumpTimer();

        smartHome.pumpIsOn = false;
        await smartHome.save();

        res.json({
            success: true,
            message: "Pump stopped",
            pump: {
                name: "Water Pump",
                relay: "R8",
                isOn: false,
            },
        });
    } catch (error) {
        console.error("Stop Pump Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

module.exports = {
    getPumpStatus,
    startPump,
    stopPump,
};