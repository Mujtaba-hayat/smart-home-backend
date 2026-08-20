const storage = require("../data/storage");
const SmartHome = require("../models/SmartHome");

function setPumpInDatabase(isOn) {
    SmartHome.updateMany(
        {},
        { $set: { pumpIsOn: isOn, pumpRelay: "R8" } }
    ).catch((error) => {
        console.error("Pump database update error:", error.message);
    });
}

function startPumpTimer(minutes) {

    if (storage.pump.timer) {
        clearInterval(storage.pump.timer);
    }

    storage.pump.running = true;
    storage.pump.duration = minutes;
    storage.pump.remaining = minutes * 60;
    storage.devices.R8 = "ON";

    setPumpInDatabase(true);

    storage.pump.timer = setInterval(() => {

        storage.pump.remaining--;

        if (storage.pump.remaining <= 0) {

            clearInterval(storage.pump.timer);
            storage.pump.timer = null;

            storage.pump.running = false;
            storage.pump.duration = 0;
            storage.pump.remaining = 0;
            storage.devices.R8 = "OFF";

            setPumpInDatabase(false);

            console.log("Pump Finished");
        }

    }, 1000);
}

function stopPumpTimer() {

    if (storage.pump.timer) {
        clearInterval(storage.pump.timer);
        storage.pump.timer = null;
    }

    storage.pump.running = false;
    storage.pump.duration = 0;
    storage.pump.remaining = 0;
    storage.devices.R8 = "OFF";

    setPumpInDatabase(false);
}

module.exports = {
    startPumpTimer,
    stopPumpTimer,
};