const storage = require("../data/storage");

// ===============================
// Start Pump
// ===============================

function startPumpTimer(minutes) {

    // Stop old timer if running
    if (storage.pump.timer) {
        clearInterval(storage.pump.timer);
    }

    storage.pump.running = true;
    storage.pump.duration = minutes;
    storage.pump.remaining = minutes * 60;

    storage.devices.R8 = "ON";

    storage.pump.timer = setInterval(() => {

        storage.pump.remaining--;

        if (storage.pump.remaining <= 0) {

            clearInterval(storage.pump.timer);

            storage.pump.timer = null;

            storage.pump.running = false;
            storage.pump.duration = 0;
            storage.pump.remaining = 0;

            storage.devices.R8 = "OFF";

            console.log("Pump Finished");
        }

    }, 1000);
}


// ===============================
// Stop Pump
// ===============================

function stopPumpTimer() {

    if (storage.pump.timer) {

        clearInterval(storage.pump.timer);

        storage.pump.timer = null;
    }

    storage.pump.running = false;

    storage.pump.duration = 0;

    storage.pump.remaining = 0;

    storage.devices.R8 = "OFF";
}


module.exports = {
    startPumpTimer,
    stopPumpTimer,
};