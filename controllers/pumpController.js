const storage = require("../data/storage");

const {
    startPumpTimer,
    stopPumpTimer,
} = require("../services/pumpService");

// ===============================
// Pump Status
// ===============================

function getPumpStatus(req, res) {

    res.json({

        running: storage.pump.running,

        duration: storage.pump.duration,

        remaining: storage.pump.remaining,

    });

}
// ===============================
// Start Pump
// ===============================

function startPump(req, res) {

    const { minutes } = req.body;

    if (!minutes) {

        return res.status(400).json({
            success: false,
            message: "Minutes required",
        });

    }

    startPumpTimer(minutes);

    res.json({

        success: true,

        message: "Pump Started",

        minutes,

    });
}

// ===============================
// Stop Pump
// ===============================

function stopPump(req, res) {

    stopPumpTimer();

    res.json({

        success: true,

        message: "Pump Stopped",

    });
}

module.exports = {
    getPumpStatus,
    startPump,
    stopPump,
};