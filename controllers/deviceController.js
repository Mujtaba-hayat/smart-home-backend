const Device = require("../models/Device");
const SmartHome = require("../models/SmartHome");
const Member = require("../models/Member");
const mongoose = require("mongoose");

const {
    createDeviceNotification,
    createPumpNotification,
} = require("./notificationController");


// =====================================================
// RELAY CONFIGURATION
// =====================================================

// R1-R6 = Normal user devices
const NORMAL_RELAYS = [
    "R1",
    "R2",
    "R3",
    "R4",
    "R5",
    "R6",
];

// R7 = Door Alarm
const ALARM_RELAY = "R7";

// R8 = Water Pump
const PUMP_RELAY = "R8";

// Maximum devices:
// R1-R6 = 6 normal devices
// R7    = 1 alarm
//
// Total = 7
const MAX_NORMAL_DEVICES = 7;


// =====================================================
// DEFAULT RELAY STATES
// =====================================================

function defaultRelayStates() {

    return {

        R1: "OFF",
        R2: "OFF",
        R3: "OFF",
        R4: "OFF",
        R5: "OFF",
        R6: "OFF",
        R7: "OFF",
        R8: "OFF",

    };
}


// =====================================================
// FIND OWNER SMART HOME
// =====================================================

async function findOwnerHome(userId) {

    return SmartHome.findOne({

        owner: userId,

    }).sort({

        updatedAt: -1,
        createdAt: -1,

    });
}


// =====================================================
// FIND ACCEPTED MEMBER
// =====================================================

async function findAcceptedMembership(userId) {

    return Member.findOne({

        user: userId,
        status: "accepted",

    }).populate("smartHome");
}


// =====================================================
// FIND USER SMART HOME ACCESS
// =====================================================

async function findUserSmartHome(userId) {

    // -------------------------------------------------
    // FIRST: CHECK ACCEPTED MEMBERSHIP
    // -------------------------------------------------

    const membership =
        await findAcceptedMembership(
            userId
        );

    if (
        membership &&
        membership.smartHome
    ) {

        console.log(
            "================================="
        );

        console.log(
            "USER SMART HOME ACCESS"
        );

        console.log(
            "Selected accepted member Smart Home"
        );

        console.log(
            "User:",
            userId
        );

        console.log(
            "Smart Home:",
            membership.smartHome.name
        );

        console.log(
            "Smart Home ID:",
            membership.smartHome._id.toString()
        );

        console.log(
            "ESP32:",
            membership.smartHome.esp32Id ||
                "NOT PAIRED"
        );

        console.log(
            "Status:",
            membership.smartHome.status
        );

        console.log(
            "Is Owner: false"
        );

        console.log(
            "================================="
        );

        return {

            smartHome:
                membership.smartHome,

            isOwner:
                false,

            membership:
                membership,

        };
    }


    // -------------------------------------------------
    // SECOND: CHECK OWNER
    // -------------------------------------------------

    const ownedHome =
        await findOwnerHome(
            userId
        );

    if (ownedHome) {

        console.log(
            "================================="
        );

        console.log(
            "USER SMART HOME ACCESS"
        );

        console.log(
            "Selected owned Smart Home"
        );

        console.log(
            "User:",
            userId
        );

        console.log(
            "Smart Home:",
            ownedHome.name
        );

        console.log(
            "Smart Home ID:",
            ownedHome._id.toString()
        );

        console.log(
            "ESP32:",
            ownedHome.esp32Id ||
                "NOT PAIRED"
        );

        console.log(
            "Status:",
            ownedHome.status
        );

        console.log(
            "Is Owner: true"
        );

        console.log(
            "================================="
        );

        return {

            smartHome:
                ownedHome,

            isOwner:
                true,

            membership:
                null,

        };
    }

    return null;
}


// =====================================================
// CHECK DEVICE CONTROL PERMISSION
// =====================================================

async function canControlDevices(
    userId,
    smartHome
) {

    if (
        smartHome.owner.toString() ===
        userId.toString()
    ) {

        return true;
    }

    const membership =
        await Member.findOne({

            smartHome:
                smartHome._id,

            user:
                userId,

            status:
                "accepted",

        });

    return (
        membership?.canControlDevices === true
    );
}


// =====================================================
// CHECK PUMP CONTROL PERMISSION
// =====================================================

async function canControlPump(
    userId,
    smartHome
) {

    if (
        smartHome.owner.toString() ===
        userId.toString()
    ) {

        return true;
    }

    const membership =
        await Member.findOne({

            smartHome:
                smartHome._id,

            user:
                userId,

            status:
                "accepted",

        });

    return (
        membership?.canControlPump === true
    );
}


// =====================================================
// CHECK DEVICE MANAGEMENT PERMISSION
// =====================================================

async function canManageDevices(
    userId,
    smartHome
) {

    if (
        smartHome.owner.toString() ===
        userId.toString()
    ) {

        return true;
    }

    const membership =
        await Member.findOne({

            smartHome:
                smartHome._id,

            user:
                userId,

            status:
                "accepted",

        });

    return (
        membership?.canManageDevices === true
    );
}


// =====================================================
// FIND DEVICE FOR HOME
// =====================================================

async function findDeviceForHome(
    deviceId,
    homeId
) {

    let device = null;


    // -------------------------------------------------
    // FIND BY MONGODB _id
    // -------------------------------------------------

    if (
        mongoose.Types.ObjectId.isValid(
            deviceId
        )
    ) {

        device =
            await Device.findOne({

                _id:
                    deviceId,

                home:
                    homeId,

            });
    }


    // -------------------------------------------------
    // FIND BY CUSTOM DEVICE ID
    // -------------------------------------------------

    if (!device) {

        device =
            await Device.findOne({

                deviceId:
                    deviceId,

                home:
                    homeId,

            });
    }

    return device;
}


// =====================================================
// ERROR HANDLER
// =====================================================

function handleDeviceError(
    res,
    error,
    label
) {

    console.error(
        `${label}:`,
        error
    );


    // -------------------------------------------------
    // DUPLICATE KEY
    // -------------------------------------------------

    if (
        error &&
        error.code === 11000
    ) {

        return res.status(409).json({

            success: false,

            message:
                "This relay or device ID is already assigned",

        });
    }


    // -------------------------------------------------
    // MONGOOSE VALIDATION ERROR
    // -------------------------------------------------

    if (
        error &&
        error.name ===
            "ValidationError"
    ) {

        return res.status(400).json({

            success: false,

            message:
                error.message,

        });
    }


    // -------------------------------------------------
    // INVALID OBJECT ID
    // -------------------------------------------------

    if (
        error &&
        error.name ===
            "CastError"
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid ID",

        });
    }


    // -------------------------------------------------
    // SERVER ERROR
    // -------------------------------------------------

    return res.status(500).json({

        success: false,

        message:
            "Server error",

    });
}


// =====================================================
// GET RELAY STATES
//
// ESP32 ONLY
//
// R1-R6 = Device collection
// R7    = SmartHome.alarmIsOn
// R8    = SmartHome.pumpIsOn
// =====================================================

async function getDevices(
    req,
    res
) {

    try {

        console.log();

        console.log(
            "================================="
        );

        console.log(
            "ESP32 RELAY STATE REQUEST"
        );

        console.log(
            "================================="
        );


        const esp32Id =
            req.query.esp32Id;


        console.log(
            "Requested ESP32 ID:",
            esp32Id ||
                "Not provided"
        );


        const relayStates =
            defaultRelayStates();


        let smartHome = null;


        // -------------------------------------------------
        // FIND SMART HOME BY ESP32 ID
        // -------------------------------------------------

        if (esp32Id) {

            smartHome =
                await SmartHome.findOne({

                    esp32Id:
                        String(
                            esp32Id
                        ).trim(),

                });

        } else {

            console.log(
                "WARNING: ESP32 ID was not provided."
            );

            smartHome =
                await SmartHome.findOne({

                    esp32Id: {

                        $exists:
                            true,

                        $nin: [
                            null,
                            "",
                        ],

                    },

                });
        }


        // -------------------------------------------------
        // SMART HOME NOT FOUND
        // -------------------------------------------------

        if (!smartHome) {

            console.log(
                "SMART HOME NOT FOUND"
            );

            console.log(
                "Returning all relay states as OFF."
            );

            console.log(
                "================================="
            );

            return res.json(
                relayStates
            );
        }


        console.log(
            "SmartHome MongoDB ID:",
            smartHome._id.toString()
        );

        console.log(
            "SmartHome Name:",
            smartHome.name
        );

        console.log(
            "SmartHome ESP32 ID:",
            smartHome.esp32Id
        );

        console.log(
            "SmartHome Owner:",
            smartHome.owner?.toString()
        );

        console.log(
            "SmartHome pumpIsOn:",
            smartHome.pumpIsOn
        );

        console.log(
            "SmartHome alarmIsOn:",
            smartHome.alarmIsOn
        );

        console.log(
            "SmartHome alarmEnabled:",
            smartHome.alarmEnabled
        );

        console.log(
            "SmartHome alarmSilenced:",
            smartHome.alarmSilenced
        );


        // -------------------------------------------------
        // GET ALL DEVICES
        // -------------------------------------------------

        const devices =
            await Device.find({

                home:
                    smartHome._id,

            });


        console.log(
            "Number of devices:",
            devices.length
        );

        console.log(
            "---------------------------------"
        );


        // -------------------------------------------------
        // R1-R6 = NORMAL DEVICES
        // -------------------------------------------------

        devices.forEach(
            (device) => {

                console.log(
                    "DATABASE DEVICE:",
                    device.name,
                    "| Relay:",
                    device.relay,
                    "| isOn:",
                    device.isOn,
                    "| Type:",
                    device.type
                );


                if (
                    NORMAL_RELAYS.includes(
                        device.relay
                    )
                ) {

                    relayStates[
                        device.relay
                    ] =
                        device.isOn === true
                            ? "ON"
                            : "OFF";
                }
            }
        );


        // -------------------------------------------------
        // R7 = DOOR ALARM SIREN
        // -------------------------------------------------

        relayStates[
            ALARM_RELAY
        ] =
            smartHome.alarmIsOn === true
                ? "ON"
                : "OFF";


        console.log(
            "R7 ALARM:",
            "Enabled =",
            smartHome.alarmEnabled,
            "| Silenced =",
            smartHome.alarmSilenced,
            "| Siren =",
            smartHome.alarmIsOn,
            "| Relay =",
            relayStates[
                ALARM_RELAY
            ]
        );


        // -------------------------------------------------
        // R8 = WATER PUMP
        // -------------------------------------------------

        relayStates[
            PUMP_RELAY
        ] =
            smartHome.pumpIsOn === true
                ? "ON"
                : "OFF";


        // -------------------------------------------------
        // FINAL STATES
        // -------------------------------------------------

        console.log(
            "---------------------------------"
        );

        console.log(
            "FINAL RELAY STATES SENT TO ESP32:"
        );


        Object.keys(
            relayStates
        ).forEach(
            (relay) => {

                console.log(
                    `${relay} ->`,
                    relayStates[relay]
                );
            }
        );


        console.log(
            "================================="
        );


        return res.json(
            relayStates
        );

    } catch (error) {

        console.error(
            "GET RELAY STATES ERROR:",
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
// GET USER DEVICES
//
// OWNER + ACCEPTED MEMBER
// =====================================================

async function getUserDevices(
    req,
    res
) {

    try {

        const userId =
            req.user.userId;


        const access =
            await findUserSmartHome(
                userId
            );


        if (!access) {

            return res.status(404).json({

                success: false,

                message:
                    "Smart home not found",

            });
        }


        const {
            smartHome,
            isOwner,
            membership,
        } = access;


        // -------------------------------------------------
        // GET DEVICES
        // -------------------------------------------------

        const devices =
            await Device.find({

                home:
                    smartHome._id,

            }).sort({

                createdAt:
                    1,

            });


        // -------------------------------------------------
        // PERMISSIONS
        // -------------------------------------------------

        const permissions =
            isOwner

                ? {

                    canControlDevices:
                        true,

                    canControlPump:
                        true,

                    canManageDevices:
                        true,

                }

                : {

                    canControlDevices:
                        membership
                            ?.canControlDevices === true,

                    canControlPump:
                        membership
                            ?.canControlPump === true,

                    canManageDevices:
                        membership
                            ?.canManageDevices === true,

                };


        // -------------------------------------------------
        // LOG
        // -------------------------------------------------

        console.log();

        console.log(
            "================================="
        );

        console.log(
            "USER DEVICES REQUEST"
        );

        console.log(
            "================================="
        );

        console.log(
            "User:",
            userId
        );

        console.log(
            "Is Owner:",
            isOwner
        );

        console.log(
            "SmartHome:",
            smartHome._id.toString()
        );

        console.log(
            "SmartHome Name:",
            smartHome.name
        );

        console.log(
            "ESP32 ID:",
            smartHome.esp32Id ||
                "NOT PAIRED"
        );

        console.log(
            "ESP32 Status:",
            smartHome.status
        );

        console.log(
            "Number of devices:",
            devices.length
        );

        console.log(
            "Pump R8:",
            smartHome.pumpIsOn === true
        );

        console.log(
            "Alarm Enabled:",
            smartHome.alarmEnabled === true
        );

        console.log(
            "Alarm Silenced:",
            smartHome.alarmSilenced === true
        );

        console.log(
            "Alarm Siren:",
            smartHome.alarmIsOn === true
        );

        console.log(
            "Permissions:",
            permissions
        );


        devices.forEach(
            (device) => {

                console.log(
                    `FLUTTER DEVICE STATE: ` +
                    `${device.name} | ` +
                    `Type: ${device.type} | ` +
                    `Relay: ${device.relay} | ` +
                    `isOn: ${device.isOn}`
                );
            }
        );


        console.log(
            "================================="
        );


        return res.json({

            success: true,


            // -------------------------------------------------
            // DEVICES
            // -------------------------------------------------

            devices,

            deviceCount:
                devices.length,

            maxDevices:
                MAX_NORMAL_DEVICES,

            canAddDevice:
                permissions.canManageDevices &&
                devices.length <
                    MAX_NORMAL_DEVICES,


            // -------------------------------------------------
            // ALARM
            // -------------------------------------------------

            alarm:
                devices.find(
                    (device) =>
                        device.relay ===
                        ALARM_RELAY
                ) || null,


            // -------------------------------------------------
            // PUMP
            // -------------------------------------------------

            pump: {

                name:
                    "Water Pump",

                relay:
                    PUMP_RELAY,

                isOn:
                    smartHome.pumpIsOn === true,

            },


            // -------------------------------------------------
            // SMART HOME
            // -------------------------------------------------

            smartHome: {

                id:
                    smartHome._id,

                name:
                    smartHome.name,

                esp32Id:
                    smartHome.esp32Id ||
                    null,

                status:
                    smartHome.status,

                lastSeen:
                    smartHome.lastSeen ||
                    null,

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

                alarmEnabled:
                    smartHome.alarmEnabled === true,

                alarmIsOn:
                    smartHome.alarmIsOn === true,

                // NEW
                alarmSilenced:
                    smartHome.alarmSilenced === true,

            },


            // -------------------------------------------------
            // ACCESS
            // -------------------------------------------------

            isOwner,

            permissions,

        });

    } catch (error) {

        handleDeviceError(
            res,
            error,
            "Get User Devices Error"
        );
    }
}


// =====================================================
// ADD DEVICE
//
// R1-R7
//
// R1-R6 = NORMAL
// R7    = ALARM
// R8    = PUMP
// =====================================================

async function addDevice(
    req,
    res
) {

    try {

        const {
            name,
            deviceId,
            type,
            relay,
        } = req.body;


        // -------------------------------------------------
        // VALIDATE
        // -------------------------------------------------

        if (
            !name ||
            !deviceId ||
            !type ||
            !relay
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Name, deviceId, type and relay are required",

            });
        }


        const cleanType =
            String(type)
                .trim()
                .toLowerCase();


        const cleanRelay =
            String(relay)
                .trim()
                .toUpperCase();


        // -------------------------------------------------
        // R8 RESERVED
        // -------------------------------------------------

        if (
            cleanRelay ===
            PUMP_RELAY
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "R8 is permanently reserved for the water pump",

            });
        }


        // -------------------------------------------------
        // VALID RELAYS
        // -------------------------------------------------

        const validRelays = [

            ...NORMAL_RELAYS,

            ALARM_RELAY,

        ];


        if (
            !validRelays.includes(
                cleanRelay
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Relay must be one of R1 to R7",

            });
        }


        // -------------------------------------------------
        // R7 MUST BE ALARM
        // -------------------------------------------------

        if (
            cleanRelay ===
            ALARM_RELAY &&
            cleanType !==
                "alarm"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "R7 is reserved for the door alarm. Device type must be alarm.",

            });
        }


        // -------------------------------------------------
        // ALARM MUST USE R7
        // -------------------------------------------------

        if (
            cleanType ===
            "alarm" &&
            cleanRelay !==
                ALARM_RELAY
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Alarm device must use relay R7.",

            });
        }


        // -------------------------------------------------
        // FIND USER HOME
        // -------------------------------------------------

        const access =
            await findUserSmartHome(
                req.user.userId
            );


        if (!access) {

            return res.status(404).json({

                success: false,

                message:
                    "Smart home not found",

            });
        }


        const {
            smartHome,
        } = access;


        // -------------------------------------------------
        // MANAGEMENT PERMISSION
        // -------------------------------------------------

        const allowed =
            await canManageDevices(
                req.user.userId,
                smartHome
            );


        if (!allowed) {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to manage devices",

            });
        }


        // -------------------------------------------------
        // MAXIMUM 7 DEVICES
        // -------------------------------------------------

        const deviceCount =
            await Device.countDocuments({

                home:
                    smartHome._id,

            });


        if (
            deviceCount >=
            MAX_NORMAL_DEVICES
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "You can add a maximum of 7 devices including the door alarm",

            });
        }


        // -------------------------------------------------
        // CHECK RELAY
        // -------------------------------------------------

        const existingRelay =
            await Device.findOne({

                home:
                    smartHome._id,

                relay:
                    cleanRelay,

            });


        if (existingRelay) {

            return res.status(409).json({

                success: false,

                message:
                    `${cleanRelay} is already assigned to another device`,

            });
        }


        // -------------------------------------------------
        // CHECK DEVICE ID
        // -------------------------------------------------

        const cleanDeviceId =
            String(deviceId).trim();


        const existingDevice =
            await Device.findOne({

                home:
                    smartHome._id,

                deviceId:
                    cleanDeviceId,

            });


        if (existingDevice) {

            return res.status(409).json({

                success: false,

                message:
                    "This device ID is already in use",

            });
        }


        // -------------------------------------------------
        // CREATE DEVICE
        // -------------------------------------------------

        const device =
            await Device.create({

                name:
                    String(name).trim(),

                deviceId:
                    cleanDeviceId,

                type:
                    cleanType,

                relay:
                    cleanRelay,

                isOn:
                    false,

                home:
                    smartHome._id,

            });


        // -------------------------------------------------
        // IF ALARM DEVICE IS CREATED
        // MAKE SURE SMART HOME ALARM STATE IS CLEAN
        // -------------------------------------------------

        if (
            cleanRelay ===
            ALARM_RELAY
        ) {

            smartHome.alarmEnabled =
                false;

            smartHome.alarmIsOn =
                false;

            smartHome.alarmSilenced =
                false;

            await smartHome.save();
        }


        console.log(
            `DEVICE CREATED: ` +
            `${device.name} | ` +
            `Type: ${device.type} | ` +
            `Relay: ${device.relay} | ` +
            `Home: ${smartHome._id}`
        );


        return res.status(201).json({

            success: true,

            message:
                "Device added successfully",

            device,

        });

    } catch (error) {

        handleDeviceError(
            res,
            error,
            "Add Device Error"
        );
    }
}


// =====================================================
// CONTROL DEVICE
//
// R1-R6 = NORMAL DEVICE
// R7    = ALARM
// R8    = PUMP - NOT ALLOWED HERE
// =====================================================

async function controlDevice(
    req,
    res
) {

    try {

        const {
            deviceId,
        } = req.params;


        const {
            state,
        } = req.body;


        console.log();

        console.log(
            "================================="
        );

        console.log(
            "CONTROL DEVICE REQUEST"
        );

        console.log(
            "================================="
        );

        console.log(
            "User:",
            req.user.userId
        );

        console.log(
            "Device ID:",
            deviceId
        );

        console.log(
            "Requested state:",
            state
        );


        // -------------------------------------------------
        // VALIDATE STATE
        // -------------------------------------------------

        if (
            !["ON", "OFF"].includes(
                state
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "State must be ON or OFF",

            });
        }


        // -------------------------------------------------
        // FIND HOME
        // -------------------------------------------------

        const access =
            await findUserSmartHome(
                req.user.userId
            );


        if (!access) {

            return res.status(404).json({

                success: false,

                message:
                    "Smart home not found",

            });
        }


        const {
            smartHome,
        } = access;


        // -------------------------------------------------
        // PERMISSION
        // -------------------------------------------------

        const allowed =
            await canControlDevices(
                req.user.userId,
                smartHome
            );


        if (!allowed) {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to control devices",

            });
        }


        // -------------------------------------------------
        // FIND DEVICE
        // -------------------------------------------------

        const device =
            await findDeviceForHome(
                deviceId,
                smartHome._id
            );


        if (!device) {

            return res.status(404).json({

                success: false,

                message:
                    "Device not found",

            });
        }


        // -------------------------------------------------
        // R8 PROTECTION
        // -------------------------------------------------

        if (
            device.relay ===
            PUMP_RELAY
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "R8 is reserved for the water pump",

            });
        }


        // =================================================
        // R7 = DOOR ALARM
        // =================================================

        if (
            device.relay ===
            ALARM_RELAY
        ) {

            if (
                device.type !==
                "alarm"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "R7 can only be used by the alarm device",

                });
            }


            const previousAlarmState =
                device.isOn === true;


            const newAlarmState =
                state === "ON";


            // -------------------------------------------------
            // UPDATE ALARM ARM/DISARM STATE
            // -------------------------------------------------

            device.isOn =
                newAlarmState;

            smartHome.alarmEnabled =
                newAlarmState;


            // -------------------------------------------------
            // IMPORTANT:
            // WHEN USER DISARMS THE ALARM,
            // RESET SILENCED STATE TOO.
            // -------------------------------------------------

            if (
                state === "OFF"
            ) {

                smartHome.alarmIsOn =
                    false;

                smartHome.alarmSilenced =
                    false;
            }


            // -------------------------------------------------
            // WHEN USER ARMS THE ALARM,
            // START WITH A FRESH ALARM STATE.
            // -------------------------------------------------

            else {

                smartHome.alarmSilenced =
                    false;
            }


            await device.save();

            await smartHome.save();


            console.log(
                `ALARM STATE CHANGED: ` +
                `R7 | ` +
                `Previous Armed: ${
                    previousAlarmState
                        ? "ON"
                        : "OFF"
                } | ` +
                `New Armed: ${
                    newAlarmState
                        ? "ON"
                        : "OFF"
                } | ` +
                `Silenced: ${
                    smartHome.alarmSilenced
                        ? "YES"
                        : "NO"
                } | ` +
                `Siren: ${
                    smartHome.alarmIsOn
                        ? "ON"
                        : "OFF"
                }`
            );


            return res.json({

                success: true,

                message:
                    `Door alarm ${
                        state === "ON"
                            ? "armed"
                            : "disarmed"
                    }`,

                device,

                alarm: {

                    name:
                        device.name,

                    relay:
                        ALARM_RELAY,

                    enabled:
                        device.isOn === true,

                    isOn:
                        smartHome.alarmIsOn === true,

                    silenced:
                        smartHome.alarmSilenced === true,

                },

            });
        }


        // =================================================
        // R1-R6 = NORMAL DEVICES
        // =================================================

        if (
            !NORMAL_RELAYS.includes(
                device.relay
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid device relay",

            });
        }


        // -------------------------------------------------
        // REMEMBER PREVIOUS STATE
        // -------------------------------------------------

        const previousDeviceState =
            device.isOn === true;


        const newDeviceState =
            state === "ON";


        console.log(
            `BEFORE UPDATE: ` +
            `${device.name} | ` +
            `Relay: ${device.relay} | ` +
            `isOn: ${device.isOn}`
        );


        // -------------------------------------------------
        // UPDATE DEVICE
        // -------------------------------------------------

        device.isOn =
            newDeviceState;


        await device.save();


        // =================================================
        // CREATE DEVICE NOTIFICATION
        //
        // ONLY when the state actually changes.
        // =================================================

        if (
            previousDeviceState !==
            newDeviceState
        ) {

            await createDeviceNotification({

                userId:
                    req.user.userId,

                smartHome:
                    smartHome,

                device:
                    device,

                state:
                    state,

            });

            console.log(
                "DEVICE NOTIFICATION CREATED"
            );
        }


        console.log(
            `DEVICE STATE CHANGED: ` +
            `${device.name} | ` +
            `Relay: ${device.relay} | ` +
            `Previous: ${
                previousDeviceState
                    ? "ON"
                    : "OFF"
            } | ` +
            `New: ${
                newDeviceState
                    ? "ON"
                    : "OFF"
            }`
        );


        console.log(
            "MongoDB document saved successfully."
        );

        console.log(
            "================================="
        );


        return res.json({

            success: true,

            message:
                `${device.name} turned ${state}`,

            device,

        });

    } catch (error) {

        handleDeviceError(
            res,
            error,
            "Control Device Error"
        );
    }
}


// =====================================================
// DELETE DEVICE
//
// R1-R7 CAN BE DELETED
// R8 CANNOT BE DELETED
// =====================================================

async function deleteDevice(
    req,
    res
) {

    try {

        const {
            deviceId,
        } = req.params;


        // -------------------------------------------------
        // FIND HOME
        // -------------------------------------------------

        const access =
            await findUserSmartHome(
                req.user.userId
            );


        if (!access) {

            return res.status(404).json({

                success: false,

                message:
                    "Smart home not found",

            });
        }


        const {
            smartHome,
        } = access;


        // -------------------------------------------------
        // PERMISSION
        // -------------------------------------------------

        const allowed =
            await canManageDevices(
                req.user.userId,
                smartHome
            );


        if (!allowed) {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to manage devices",

            });
        }


        // -------------------------------------------------
        // FIND DEVICE
        // -------------------------------------------------

        const device =
            await findDeviceForHome(
                deviceId,
                smartHome._id
            );


        if (!device) {

            return res.status(404).json({

                success: false,

                message:
                    "Device not found",

            });
        }


        // -------------------------------------------------
        // R8 PROTECTION
        // -------------------------------------------------

        if (
            device.relay ===
            PUMP_RELAY
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Water pump relay R8 cannot be deleted",

            });
        }


        // -------------------------------------------------
        // IF ALARM IS DELETED
        // RESET ALL ALARM STATES
        // -------------------------------------------------

        if (
            device.relay ===
            ALARM_RELAY
        ) {

            smartHome.alarmEnabled =
                false;

            smartHome.alarmIsOn =
                false;

            smartHome.alarmSilenced =
                false;

            await smartHome.save();
        }


        // -------------------------------------------------
        // DELETE DEVICE
        // -------------------------------------------------

        await device.deleteOne();


        console.log(
            `DEVICE DELETED: ` +
            `${device.name} | ` +
            `Type: ${device.type} | ` +
            `Relay: ${device.relay}`
        );


        return res.json({

            success: true,

            message:
                "Device deleted successfully",

            freedRelay:
                device.relay,

        });

    } catch (error) {

        handleDeviceError(
            res,
            error,
            "Delete Device Error"
        );
    }
}


// =====================================================
// CONTROL WATER PUMP R8
// =====================================================

async function controlPump(
    req,
    res
) {

    try {

        const {
            state,
        } = req.body;


        console.log();

        console.log(
            "================================="
        );

        console.log(
            "CONTROL WATER PUMP"
        );

        console.log(
            "================================="
        );

        console.log(
            "User:",
            req.user.userId
        );

        console.log(
            "Requested state:",
            state
        );


        // -------------------------------------------------
        // VALIDATE STATE
        // -------------------------------------------------

        if (
            !["ON", "OFF"].includes(
                state
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "State must be ON or OFF",

            });
        }


        // -------------------------------------------------
        // FIND HOME
        // -------------------------------------------------

        const access =
            await findUserSmartHome(
                req.user.userId
            );


        if (!access) {

            return res.status(404).json({

                success: false,

                message:
                    "Smart home not found",

            });
        }


        const {
            smartHome,
        } = access;


        // -------------------------------------------------
        // PERMISSION
        // -------------------------------------------------

        const allowed =
            await canControlPump(
                req.user.userId,
                smartHome
            );


        if (!allowed) {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to control the water pump",

            });
        }


        // -------------------------------------------------
        // REMEMBER PREVIOUS STATE
        // -------------------------------------------------

        const previousPumpState =
            smartHome.pumpIsOn === true;


        const newPumpState =
            state === "ON";


        console.log(
            `PUMP BEFORE UPDATE: ` +
            `R8 | ` +
            `pumpIsOn: ${
                previousPumpState
                    ? "ON"
                    : "OFF"
            }`
        );


        // -------------------------------------------------
        // UPDATE PUMP STATE
        // -------------------------------------------------

        smartHome.pumpIsOn =
            newPumpState;

        smartHome.pumpRelay =
            PUMP_RELAY;


        await smartHome.save();


        console.log(
            `PUMP STATE CHANGED: ` +
            `R8 | ` +
            `Previous: ${
                previousPumpState
                    ? "ON"
                    : "OFF"
            } | ` +
            `New: ${
                newPumpState
                    ? "ON"
                    : "OFF"
            }`
        );


        // =================================================
        // CREATE PUMP NOTIFICATION
        //
        // ONLY when state actually changes.
        // =================================================

        if (
            previousPumpState !==
            newPumpState
        ) {

            await createPumpNotification({

                smartHome:
                    smartHome,

                state:
                    state,

            });


            console.log(
                "PUMP NOTIFICATION CREATED"
            );
        }


        console.log(
            "Pump MongoDB document saved successfully."
        );

        console.log(
            "================================="
        );


        return res.json({

            success: true,

            message:
                `Water pump turned ${state}`,

            pump: {

                name:
                    "Water Pump",

                relay:
                    PUMP_RELAY,

                isOn:
                    smartHome.pumpIsOn === true,

            },

        });

    } catch (error) {

        handleDeviceError(
            res,
            error,
            "Control Pump Error"
        );
    }
}


// =====================================================
// CONTROL ALARM R7
//
// ON  = Arm alarm
// OFF = Disarm alarm
//
// Actual siren is triggered by sensorController.
// =====================================================

async function controlAlarm(
    req,
    res
) {
    try {
        const {
            state,
        } = req.body;

        console.log();
        console.log("=================================");
        console.log("CONTROL DOOR ALARM");
        console.log("=================================");
        console.log("User:", req.user.userId);
        console.log("Requested state:", state);

        // -------------------------------------------------
        // VALIDATE
        // -------------------------------------------------
        if (!["ON", "OFF"].includes(state)) {
            return res.status(400).json({
                success: false,
                message: "State must be ON or OFF",
            });
        }

        // -------------------------------------------------
        // FIND HOME
        // -------------------------------------------------
        const access = await findUserSmartHome(
            req.user.userId
        );

        if (!access) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        const {
            smartHome,
        } = access;

        // -------------------------------------------------
        // PERMISSION
        // -------------------------------------------------
        const allowed = await canControlDevices(
            req.user.userId,
            smartHome
        );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to control the alarm",
            });
        }

        const previousAlarmState = smartHome.alarmEnabled === true;
        const newAlarmState = state === "ON";

        // -------------------------------------------------
        // UPDATE SMARTHOME MODEL DIRECTLY
        // -------------------------------------------------
        smartHome.alarmEnabled = newAlarmState;
        smartHome.alarmSilenced = false;

        // Disarming stops the siren and clears silenced status
        if (state === "OFF") {
            smartHome.alarmIsOn = false;
            smartHome.alarmSilenced = false;
        }

        await smartHome.save();

        // -------------------------------------------------
        // UPDATE DEVICE (IF REGISTERED, OPTIONAL)
        // -------------------------------------------------
        const alarmDevice = await Device.findOne({
            home: smartHome._id,
            relay: ALARM_RELAY,
        });

        if (alarmDevice) {
            alarmDevice.isOn = newAlarmState;
            await alarmDevice.save();
        }

        console.log(
            `ALARM STATE CHANGED: R7 | ` +
            `Previous Armed: ${previousAlarmState ? "ON" : "OFF"} | ` +
            `New Armed: ${newAlarmState ? "ON" : "OFF"} | ` +
            `Silenced: ${smartHome.alarmSilenced ? "YES" : "NO"} | ` +
            `Siren: ${smartHome.alarmIsOn ? "ON" : "OFF"}`
        );
        console.log("=================================");

        return res.json({
            success: true,
            message: `Door alarm ${state === "ON" ? "armed" : "disarmed"}`,
            alarm: {
                name: alarmDevice ? alarmDevice.name : "Door Alarm",
                relay: ALARM_RELAY,
                enabled: smartHome.alarmEnabled === true,
                isOn: smartHome.alarmIsOn === true,
                silenced: smartHome.alarmSilenced === true,
            },
            smartHome: {
                alarmEnabled: smartHome.alarmEnabled === true,
                alarmIsOn: smartHome.alarmIsOn === true,
                alarmSilenced: smartHome.alarmSilenced === true,
            },
        });

    } catch (error) {
        handleDeviceError(
            res,
            error,
            "Control Alarm Error"
        );
    }
}


// =====================================================
// SILENCE ACTIVE ALARM
//
// IMPORTANT:
//
// This does NOT disarm the alarm.
//
// alarmEnabled remains TRUE.
//
// It only stops the current siren.
//
// Door can remain OPEN.
//
// When the door closes, sensorController will reset
// alarmSilenced = false.
//
// If the door opens again later, the alarm can trigger
// again.
// =====================================================

async function silenceAlarm(
    req,
    res
) {

    try {

        console.log();

        console.log(
            "================================="
        );

        console.log(
            "SILENCE DOOR ALARM"
        );

        console.log(
            "================================="
        );

        console.log(
            "User:",
            req.user.userId
        );


        // -------------------------------------------------
        // FIND HOME
        // -------------------------------------------------

        const access =
            await findUserSmartHome(
                req.user.userId
            );


        if (!access) {

            return res.status(404).json({

                success: false,

                message:
                    "Smart home not found",

            });
        }


        const {
            smartHome,
        } = access;


        // -------------------------------------------------
        // PERMISSION
        // -------------------------------------------------

        const allowed =
            await canControlDevices(
                req.user.userId,
                smartHome
            );


        if (!allowed) {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to control the alarm",

            });
        }


        // -------------------------------------------------
        // ALARM MUST BE ENABLED
        // -------------------------------------------------

        if (
            smartHome.alarmEnabled !== true
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Alarm is not armed",

            });
        }


        // -------------------------------------------------
        // ALARM MUST CURRENTLY BE ACTIVE
        // -------------------------------------------------

        if (
            smartHome.alarmIsOn !== true
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Door alarm is not currently active",

            });
        }


        // -------------------------------------------------
        // SILENCE ALARM
        //
        // Keep alarmEnabled = true
        // Stop siren
        // Remember that user silenced it
        // -------------------------------------------------

        smartHome.alarmIsOn =
            false;

        smartHome.alarmSilenced =
            true;


        await smartHome.save();


        console.log(
            "DOOR ALARM SILENCED"
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
            "R7 Siren:",
            smartHome.alarmIsOn
                ? "ON"
                : "OFF"
        );

        console.log(
            "Door Status:",
            smartHome.doorStatus
        );

        console.log(
            "================================="
        );


        return res.json({

            success: true,

            message:
                "Door alarm silenced",

            alarm: {

                name:
                    "Door Alarm",

                relay:
                    ALARM_RELAY,

                enabled:
                    smartHome.alarmEnabled === true,

                isOn:
                    smartHome.alarmIsOn === true,

                silenced:
                    smartHome.alarmSilenced === true,

            },

        });

    } catch (error) {

        handleDeviceError(
            res,
            error,
            "Silence Alarm Error"
        );
    }
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    getDevices,

    getUserDevices,

    addDevice,

    controlDevice,

    deleteDevice,

    controlPump,

    controlAlarm,

    silenceAlarm,

};

