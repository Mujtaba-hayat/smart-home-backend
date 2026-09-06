const SmartHome = require("../models/SmartHome");

console.log("SENSOR CONTROLLER LOADED");

// =====================================================
// RECEIVE SENSOR DATA FROM ESP32
//
// POST /esp32/sensors
//
// ESP32 sends:
//
// {
//     "esp32Id": "ESP32-XXXX",
//     "temperature": 27.50,
//     "humidity": 61.20,
//     "doorStatus": "closed"
// }
//
// =====================================================

async function receiveSensorData(req, res) {

    try {

        const {
            esp32Id,
            temperature,
            humidity,
            doorStatus,
        } = req.body;

        console.log();
        console.log("==============================");
        console.log("ESP32 SENSOR DATA RECEIVED");
        console.log("==============================");

        console.log("ESP32 ID:", esp32Id);
        console.log("Temperature:", temperature);
        console.log("Humidity:", humidity);
        console.log("Door:", doorStatus);

        // =================================================
        // VALIDATE ESP32 ID
        // =================================================

        if (!esp32Id) {

            return res.status(400).json({
                success: false,
                message: "ESP32 ID is required",
            });
        }

        const cleanEsp32Id =
            String(esp32Id).trim();

        // =================================================
        // VALIDATE TEMPERATURE
        // =================================================

        const numericTemperature =
            Number(temperature);

        if (
            temperature === undefined ||
            temperature === null ||
            !Number.isFinite(
                numericTemperature
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Valid temperature is required",
            });
        }

        // =================================================
        // VALIDATE HUMIDITY
        // =================================================

        const numericHumidity =
            Number(humidity);

        if (
            humidity === undefined ||
            humidity === null ||
            !Number.isFinite(
                numericHumidity
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Valid humidity is required",
            });
        }

        // =================================================
        // VALIDATE DOOR STATUS
        // =================================================

        const normalizedDoorStatus =
            String(doorStatus || "")
                .trim()
                .toLowerCase();

        if (
            !["open", "closed"].includes(
                normalizedDoorStatus
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Door status must be either "open" or "closed"',
            });
        }

        // =================================================
        // FIND PAIRED SMART HOME
        // =================================================

        const smartHome =
            await SmartHome.findOne({
                esp32Id: cleanEsp32Id,
            });

        if (!smartHome) {

            console.log(
                "ESP32 is not paired:",
                cleanEsp32Id
            );

            return res.status(404).json({
                success: false,
                message:
                    "ESP32 is not paired with any Smart Home",
            });
        }

        console.log(
            "Smart Home:",
            smartHome.name
        );

        console.log(
            "Smart Home ID:",
            smartHome._id.toString()
        );

        // =================================================
        // SAVE SENSOR DATA
        // =================================================

        smartHome.temperature =
            numericTemperature;

        smartHome.humidity =
            numericHumidity;

        smartHome.doorStatus =
            normalizedDoorStatus;

        smartHome.sensorLastUpdated =
            new Date();

        // =================================================
        // UPDATE ESP32 CONNECTION
        // =================================================

        smartHome.status =
            "connected";

        smartHome.lastSeen =
            new Date();

        // =================================================
        // DOOR ALARM LOGIC
        //
        // R7 = DOOR ALARM
        //
        // Alarm enabled + Door open
        //          ↓
        //      R7 = ON
        //
        // Alarm disabled
        //          ↓
        //      R7 = OFF
        //
        // Door closed
        //          ↓
        //      R7 = OFF
        //
        // =================================================

        if (
            smartHome.alarmEnabled === true
        ) {

            if (
                normalizedDoorStatus === "open"
            ) {

                smartHome.alarmIsOn =
                    true;

                console.log();
                console.log("==============================");
                console.log("DOOR ALARM TRIGGERED");
                console.log("==============================");

                console.log(
                    "Alarm Enabled: TRUE"
                );

                console.log(
                    "Door Status: OPEN"
                );

                console.log(
                    "R7 Alarm: ON"
                );

                console.log("==============================");

            } else {

                smartHome.alarmIsOn =
                    false;

                console.log(
                    "Alarm enabled but door is closed."
                );

                console.log(
                    "R7 Alarm: OFF"
                );
            }

        } else {

            smartHome.alarmIsOn =
                false;

            console.log(
                "Alarm is disabled."
            );

            console.log(
                "R7 Alarm: OFF"
            );
        }

        // =================================================
        // SAVE SMART HOME
        // =================================================

        await smartHome.save();

        // =================================================
        // SUCCESS LOG
        // =================================================

        console.log();
        console.log(
            "SENSOR DATA SAVED SUCCESSFULLY"
        );

        console.log(
            "Smart Home:",
            smartHome.name
        );

        console.log(
            "ESP32:",
            smartHome.esp32Id
        );

        console.log(
            "Temperature:",
            smartHome.temperature,
            "°C"
        );

        console.log(
            "Humidity:",
            smartHome.humidity,
            "%"
        );

        console.log(
            "Door:",
            smartHome.doorStatus
        );

        console.log(
            "Alarm Enabled:",
            smartHome.alarmEnabled
        );

        console.log(
            "R7 Alarm:",
            smartHome.alarmIsOn
                ? "ON"
                : "OFF"
        );

        console.log(
            "Sensor Updated:",
            smartHome.sensorLastUpdated
        );

        console.log(
            "ESP32 Last Seen:",
            smartHome.lastSeen
        );

        console.log(
            "=============================="
        );

        // =================================================
        // RESPONSE
        // =================================================

        return res.status(200).json({

            success: true,

            message:
                "Sensor data received successfully",

            esp32Id:
                smartHome.esp32Id,

            sensors: {

                temperature:
                    smartHome.temperature,

                humidity:
                    smartHome.humidity,

                doorStatus:
                    smartHome.doorStatus,

                sensorLastUpdated:
                    smartHome.sensorLastUpdated,
            },

            alarm: {

                name:
                    "Door Alarm",

                relay:
                    "R7",

                enabled:
                    smartHome.alarmEnabled === true,

                isOn:
                    smartHome.alarmIsOn === true,
            },
        });

    } catch (error) {

        console.error(
            "ESP32 Sensor Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}


// =====================================================
// GET SENSOR DATA
//
// GET /esp32/sensors/:esp32Id
//
// Used by Flutter
//
// =====================================================

async function getSensorData(
    req,
    res
) {

    try {

        const {
            esp32Id,
        } = req.params;

        // =================================================
        // VALIDATE ESP32 ID
        // =================================================

        if (!esp32Id) {

            return res.status(400).json({
                success: false,
                message:
                    "ESP32 ID is required",
            });
        }

        const cleanEsp32Id =
            String(esp32Id).trim();

        // =================================================
        // FIND SMART HOME
        // =================================================

        const smartHome =
            await SmartHome.findOne({
                esp32Id: cleanEsp32Id,
            });

        if (!smartHome) {

            return res.status(404).json({
                success: false,
                message:
                    "ESP32 is not paired with any Smart Home",
            });
        }

        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            success: true,

            sensors: {

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

            alarm: {

                name:
                    "Door Alarm",

                relay:
                    "R7",

                enabled:
                    smartHome.alarmEnabled === true,

                isOn:
                    smartHome.alarmIsOn === true,
            },

            smartHome: {

                id:
                    smartHome._id,

                name:
                    smartHome.name,

                esp32Id:
                    smartHome.esp32Id,

                status:
                    smartHome.status,

                lastSeen:
                    smartHome.lastSeen ??
                    null,
            },
        });

    } catch (error) {

        console.error(
            "GET SENSOR DATA ERROR:",
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
    receiveSensorData,
    getSensorData,
};