const storage = require("../data/storage");
const Device = require("../models/Device");
const SmartHome = require("../models/SmartHome");

const {
    startPumpTimer,
    stopPumpTimer,
} = require("../services/pumpService");

const executedAutomations = new Set();

// Normalizes strings like "07:05 PM" -> "7:05 PM" for exact string matching
function normalizeTimeString(str) {
    if (!str) return "";
    return str
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^0(\d:)/, "$1"); // removes leading 0 from hour if present
}

function startAutomationScheduler() {
    console.log("=========================================");
    console.log("⏰ AUTOMATION SCHEDULER STARTED");
    console.log("=========================================");

    setInterval(async () => {
        try {
            if (!storage.automations || storage.automations.length === 0) {
                return;
            }

            const now = new Date();

            // Format current time in 12-hour AM/PM format
            const rawCurrentTime = now.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
            const currentTimeNormalized = normalizeTimeString(rawCurrentTime);

            // Get current 3-letter weekday (e.g. "Mon", "Tue", "Wed")
            const currentDay = now.toLocaleDateString("en-US", {
                weekday: "short",
            });

            for (const automation of storage.automations) {
                if (!automation.enabled) continue;

                // Day of week check
                if (
                    Array.isArray(automation.repeatDays) &&
                    automation.repeatDays.length > 0 &&
                    !automation.repeatDays.includes(currentDay)
                ) {
                    continue;
                }

                const scheduledTimeNormalized = normalizeTimeString(automation.time);
                const executionKey = `${automation.id}-${currentDay}-${scheduledTimeNormalized}`;

                // Check if time matches and has not fired yet in this minute
                if (
                    scheduledTimeNormalized === currentTimeNormalized &&
                    !executedAutomations.has(executionKey)
                ) {
                    executedAutomations.add(executionKey);

                    console.log();
                    console.log("-----------------------------------------");
                    console.log(`⚡ AUTOMATION TRIGGERED: ${automation.deviceName}`);
                    console.log(`Target State: ${automation.turnOn ? "ON" : "OFF"}`);
                    console.log(`Scheduled Time: ${scheduledTimeNormalized}`);
                    console.log("-----------------------------------------");

                    // =====================================
                    // 1. UPDATE IN-MEMORY STORAGE
                    // =====================================
                    if (!storage.devices) storage.devices = {};
                    storage.devices[automation.deviceId] = automation.turnOn ? "ON" : "OFF";

                    // =====================================
                    // 2. FIND DEVICE IN MONGODB
                    // =====================================
                    let device = null;
                    if (automation.deviceId && automation.deviceId.match(/^[0-9a-fA-F]{24}$/)) {
                        device = await Device.findById(automation.deviceId);
                    }
                    if (!device) {
                        device = await Device.findOne({ name: automation.deviceName });
                    }

                    const isPump =
                        automation.deviceId === "R8" ||
                        (device && device.relay === "R8") ||
                        automation.deviceName.toLowerCase().includes("pump");

                    // =====================================
                    // 3. EXECUTE: WATER PUMP (R8)
                    // =====================================
                    if (isPump) {
                        if (automation.turnOn) {
                            const minutes = automation.durationMinutes || 5;
                            if (typeof startPumpTimer === "function") {
                                startPumpTimer(minutes);
                            }
                            console.log(`🚰 Water Pump started for ${minutes} minutes`);
                        } else {
                            if (typeof stopPumpTimer === "function") {
                                stopPumpTimer();
                            }
                            console.log("🚰 Water Pump stopped");
                        }

                        // Sync state directly in MongoDB SmartHome document
                        await SmartHome.updateMany({}, { pumpIsOn: automation.turnOn });
                    }

                    // =====================================
                    // 4. EXECUTE: STANDARD RELAY APPLIANCES
                    // =====================================
                    if (device) {
                        device.isOn = automation.turnOn;
                        await device.save();

                        console.log(`✅ MongoDB Device "${device.name}" (${device.relay}) updated to: ${device.isOn ? "ON" : "OFF"}`);
                    } else {
                        console.log(`⚠️ Device "${automation.deviceName}" not matched in MongoDB. Storage updated.`);
                    }
                }
            }

            // Cleanup execution cache for previous minutes to prevent memory leaks
            for (const key of executedAutomations) {
                if (!key.endsWith(currentTimeNormalized)) {
                    executedAutomations.delete(key);
                }
            }
        } catch (error) {
            console.error("Automation Scheduler Loop Error:", error);
        }
    }, 1000);
}

module.exports = {
    startAutomationScheduler,
};