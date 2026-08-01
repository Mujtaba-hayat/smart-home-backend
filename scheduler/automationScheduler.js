const storage = require("../data/storage");

const {
    startPumpTimer,
    stopPumpTimer,
} = require("../services/pumpService");

const executedAutomations = new Set();

function startAutomationScheduler() {

    console.log("Automation Scheduler Started");

    setInterval(() => {

        const now = new Date();

        const currentTime = now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

        storage.automations.forEach((automation) => {

            if (!automation.enabled) return;
            
            const today = now.toLocaleDateString("en-US", {
    weekday: "short",
});

if (
    automation.repeatDays.length > 0 &&
    !automation.repeatDays.includes(today)
) {
    return;
}
            const key = `${automation.id}-${currentTime}`;

            if (
                automation.time === currentTime &&
                !executedAutomations.has(key)
            ) {

                console.log("Automation MATCH:", automation.deviceName);

                // ===============================
                // Water Pump
                // ===============================

                if (automation.deviceId === "R8") {

                    if (automation.turnOn) {

                        const minutes =
                            automation.durationMinutes || 5;

                        startPumpTimer(minutes);

                        console.log(
                            `Water Pump started for ${minutes} minutes`
                        );

                    } else {

                        stopPumpTimer();

                        console.log("Water Pump stopped");

                    }

                }

                // ===============================
                // Other Devices
                // ===============================

                else {

                    storage.devices[automation.deviceId] =
                        automation.turnOn ? "ON" : "OFF";

                    console.log(
                        automation.deviceName,
                        automation.turnOn ? "ON" : "OFF"
                    );
                }

                executedAutomations.add(key);
            }

        });

        // Remove old execution keys
        for (const key of executedAutomations) {

            if (!key.endsWith(currentTime)) {
                executedAutomations.delete(key);
            }

        }

    }, 1000);
}

module.exports = {
    startAutomationScheduler,
};