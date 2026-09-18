const SmartHome = require("../models/SmartHome");
const Sensor = require("../models/Sensor");
const Member = require("../models/Member");

const {
    createDoorAlarmNotification,
} = require("./notificationController");

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

                message:
                    "ESP32 ID is required",

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
            !Number.isFinite(numericTemperature)
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
            !Number.isFinite(numericHumidity)
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

                esp32Id:
                    cleanEsp32Id,

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
        // SAVE HISTORICAL SENSOR READING
        // =================================================

        const sensor =
            await Sensor.create({

                smartHome:
                    smartHome._id,

                esp32Id:
                    cleanEsp32Id,

                temperature:
                    numericTemperature,

                humidity:
                    numericHumidity,

                doorStatus:
                    normalizedDoorStatus,

            });


        console.log(
            "Historical sensor reading saved successfully."
        );

        console.log(
            "Sensor ID:",
            sensor._id.toString()
        );


        // =================================================
        // UPDATE LATEST SENSOR DATA
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
        // REMEMBER PREVIOUS ALARM STATE
        // =================================================

        const alarmWasAlreadyOn =
            smartHome.alarmIsOn === true;


        // =================================================
        // DOOR ALARM LOGIC
        //
        // alarmEnabled:
        //     true  = alarm system armed
        //     false = alarm system disabled
        //
        // alarmSilenced:
        //     true  = current alarm has been silenced
        //     false = alarm may trigger
        //
        // alarmIsOn:
        //     true  = R7 should be ON
        //     false = R7 should be OFF
        // =================================================


        // =================================================
        // ALARM ENABLED
        // =================================================

        if (
            smartHome.alarmEnabled === true
        ) {


            // =================================================
            // DOOR OPEN
            // =================================================

            if (
                normalizedDoorStatus === "open"
            ) {


                // =================================================
                // ALARM HAS NOT BEEN SILENCED
                // =================================================

                if (
                    smartHome.alarmSilenced !== true
                ) {

                    smartHome.alarmIsOn =
                        true;


                    // =================================================
                    // CREATE NOTIFICATION ONLY ON FIRST TRIGGER
                    // =================================================

                    if (
                        !alarmWasAlreadyOn
                    ) {

                        await createDoorAlarmNotification({

                            smartHome:
                                smartHome,

                        });

                        console.log(
                            "DOOR ALARM NOTIFICATION CREATED"
                        );
                    }


                    console.log();
                    console.log(
                        "=============================="
                    );

                    console.log(
                        "DOOR ALARM TRIGGERED"
                    );

                    console.log(
                        "=============================="
                    );

                    console.log(
                        "Alarm Enabled: TRUE"
                    );

                    console.log(
                        "Alarm Silenced: FALSE"
                    );

                    console.log(
                        "Door Status: OPEN"
                    );

                    console.log(
                        "R7 Alarm: ON"
                    );

                    console.log(
                        "=============================="
                    );

                }


                // =================================================
                // ALARM HAS BEEN SILENCED
                // =================================================

                else {

                    smartHome.alarmIsOn =
                        false;


                    console.log();
                    console.log(
                        "=============================="
                    );

                    console.log(
                        "DOOR ALARM SILENCED"
                    );

                    console.log(
                        "=============================="
                    );

                    console.log(
                        "Alarm Enabled: TRUE"
                    );

                    console.log(
                        "Alarm Silenced: TRUE"
                    );

                    console.log(
                        "Door Status: OPEN"
                    );

                    console.log(
                        "R7 Alarm: OFF"
                    );

                    console.log(
                        "=============================="
                    );
                }

            }


            // =================================================
            // DOOR CLOSED
            // =================================================

            else {

                smartHome.alarmIsOn =
                    false;


                // -------------------------------------------------
                // RESET SILENCE
                //
                // Once the door is closed, the current alarm
                // event has ended.
                //
                // The next door opening can trigger the alarm
                // again.
                // -------------------------------------------------

                smartHome.alarmSilenced =
                    false;


                console.log();
                console.log(
                    "=============================="
                );

                console.log(
                    "DOOR CLOSED"
                );

                console.log(
                    "=============================="
                );

                console.log(
                    "Alarm Enabled:",
                    smartHome.alarmEnabled
                );

                console.log(
                    "Alarm Silenced: FALSE"
                );

                console.log(
                    "Door Status: CLOSED"
                );

                console.log(
                    "R7 Alarm: OFF"
                );

                console.log(
                    "=============================="
                );
            }

        }


        // =================================================
        // ALARM DISABLED
        // =================================================

        else {

            smartHome.alarmIsOn =
                false;


            // -------------------------------------------------
            // RESET SILENCE
            // -------------------------------------------------

            smartHome.alarmSilenced =
                false;


            console.log();
            console.log(
                "=============================="
            );

            console.log(
                "ALARM DISABLED"
            );

            console.log(
                "=============================="
            );

            console.log(
                "Alarm Enabled: FALSE"
            );

            console.log(
                "Alarm Silenced: FALSE"
            );

            console.log(
                "Door Status:",
                normalizedDoorStatus
            );

            console.log(
                "R7 Alarm: OFF"
            );

            console.log(
                "=============================="
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
            "Alarm Silenced:",
            smartHome.alarmSilenced
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
        // RESPONSE TO ESP32
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

                silenced:
                    smartHome.alarmSilenced === true,

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

            message:
                "Server error",

        });
    }
}


// =====================================================
// GET SENSOR DATA BY ESP32 ID
//
// GET /esp32/sensors/:esp32Id
//
// Existing endpoint.
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

                esp32Id:
                    cleanEsp32Id,

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

                silenced:
                    smartHome.alarmSilenced === true,

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

            message:
                "Server error",

        });
    }
}


// =====================================================
// GET SENSOR DATA FOR LOGGED-IN USER
//
// GET /user/sensors
//
// Flutter uses this endpoint.
//
// Finds Smart Home using:
//
// 1. Accepted Member
// 2. Owner
//
// =====================================================

async function getUserSensorData(
    req,
    res
) {

    try {

        // =================================================
        // GET LOGGED-IN USER
        // =================================================

        const userId =
            req.user.userId;


        console.log();

        console.log(
            "=============================="
        );

        console.log(
            "GET USER SENSOR DATA"
        );

        console.log(
            "User:",
            userId
        );

        console.log(
            "=============================="
        );


        // =================================================
        // FIND ACCEPTED MEMBERSHIP
        // =================================================

        const membership =
            await Member.findOne({

                user:
                    userId,

                status:
                    "accepted",

            }).populate(
                "smartHome"
            );


        let smartHome = null;


        // =================================================
        // ACCEPTED MEMBER
        // =================================================

        if (
            membership &&
            membership.smartHome
        ) {

            smartHome =
                membership.smartHome;


            console.log(
                "Using accepted member Smart Home:",
                smartHome.name
            );
        }


        // =================================================
        // OWNER
        // =================================================

        if (!smartHome) {

            smartHome =
                await SmartHome.findOne({

                    owner:
                        userId,

                }).sort({

                    updatedAt:
                        -1,

                    createdAt:
                        -1,

                });


            if (smartHome) {

                console.log(
                    "Using owned Smart Home:",
                    smartHome.name
                );
            }
        }


        // =================================================
        // SMART HOME NOT FOUND
        // =================================================

        if (!smartHome) {

            return res.status(404).json({

                success: false,

                message:
                    "Smart home not found",

            });
        }


        // =================================================
        // GET LATEST SENSOR READING
        //
        // SmartHome already contains latest values.
        // Sensor collection contains historical readings.
        // =================================================

        const latestSensor =
            await Sensor.findOne({

                smartHome:
                    smartHome._id,

            }).sort({

                createdAt:
                    -1,

            });


        // =================================================
        // USE LATEST SENSOR DOCUMENT IF AVAILABLE
        //
        // SmartHome values are preferred.
        // Historical Sensor document is fallback.
        // =================================================

        const temperature =
            smartHome.temperature ??
            latestSensor?.temperature ??
            null;


        const humidity =
            smartHome.humidity ??
            latestSensor?.humidity ??
            null;


        const doorStatus =
            smartHome.doorStatus ??
            latestSensor?.doorStatus ??
            null;


        const sensorLastUpdated =
            smartHome.sensorLastUpdated ??
            latestSensor?.createdAt ??
            null;


        // =================================================
        // RESPONSE LOG
        // =================================================

        console.log(
            "Temperature:",
            temperature
        );

        console.log(
            "Humidity:",
            humidity
        );

        console.log(
            "Door:",
            doorStatus
        );

        console.log(
            "Alarm Enabled:",
            smartHome.alarmEnabled
        );

        console.log(
            "Alarm Silenced:",
            smartHome.alarmSilenced
        );

        console.log(
            "Alarm Running:",
            smartHome.alarmIsOn
        );

        console.log(
            "ESP32 Status:",
            smartHome.status
        );

        console.log(
            "=============================="
        );


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(200).json({

            success: true,

            sensors: {

                temperature:
                    temperature,

                humidity:
                    humidity,

                doorStatus:
                    doorStatus,

                sensorLastUpdated:
                    sensorLastUpdated,

            },

            alarm: {

                name:
                    "Door Alarm",

                relay:
                    "R7",

                enabled:
                    smartHome.alarmEnabled === true,

                silenced:
                    smartHome.alarmSilenced === true,

                isOn:
                    smartHome.alarmIsOn === true,

            },

            smartHome: {

                id:
                    smartHome._id,

                name:
                    smartHome.name,

                esp32Id:
                    smartHome.esp32Id ??
                    null,

                status:
                    smartHome.status ??
                    null,

                lastSeen:
                    smartHome.lastSeen ??
                    null,

            },

        });

    } catch (error) {

        console.error(
            "GET USER SENSOR DATA ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error",

        });
    }
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    receiveSensorData,

    getSensorData,

    getUserSensorData,

};

