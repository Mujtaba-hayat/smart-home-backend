const Device = require("../models/Device");
const SmartHome = require("../models/SmartHome");
const Member = require("../models/Member");
const mongoose = require("mongoose");

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

// Maximum number of devices that can be stored
// in Device collection:
//
// R1-R6 normal devices
// R7 alarm
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

            isOwner: false,

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

            isOwner: true,

            membership: null,
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
    // FIND BY DEVICE ID
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
// R7    = Alarm Device
// R8    = SmartHome.pumpIsOn
//
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
                        esp32Id,

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

        // -------------------------------------------------
        // R1-R6 NORMAL DEVICES
        // -------------------------------------------------

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
    "| Siren =",
    smartHome.alarmIsOn,
    "| Relay =",
    relayStates[ALARM_RELAY]
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
//
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
            // ALL DEVICES INCLUDING ALARM
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
            //
            // If an alarm device exists, return it.
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

                // Keep these fields for compatibility
                alarmEnabled:
                    smartHome.alarmEnabled === true,

                alarmIsOn:
                    smartHome.alarmIsOn === true,
            },

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
// R7 CAN ONLY BE USED BY ALARM
// R8 IS RESERVED FOR PUMP
//
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
        // VALIDATE REQUIRED FIELDS
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
        // VALID RELAY
        //
        // R1-R7
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
        // CHECK MANAGEMENT PERMISSION
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
        //
        // R1-R6 + R7 Alarm
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
// R1-R7
//
// R7 = ALARM
// R8 = NOT ALLOWED HERE
//
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

        // -------------------------------------------------
        // R7 VALIDATION
        //
        // R7 must remain an alarm device.
        // -------------------------------------------------

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

            // -------------------------------------------------
            // ALARM MANUAL ON/OFF
            //
            // ON  = Alarm armed
            // OFF = Alarm disarmed
            //
            // We store the state in the Device document.
            // -------------------------------------------------

            device.isOn =
                state === "ON";

            // Keep SmartHome compatibility fields updated.
            smartHome.alarmEnabled =
                state === "ON";

            // Manual ON does NOT immediately activate
            // the siren.
            //
            // The actual R7 relay will turn ON when
            // the door opens while alarm is armed.

            if (
                state === "OFF"
            ) {

                smartHome.alarmIsOn =
                    false;
            }

            await device.save();

            await smartHome.save();

            console.log(
                `ALARM STATE CHANGED: ` +
                `R7 | ` +
                `Armed: ${device.isOn} | ` +
                `Siren: ${smartHome.alarmIsOn}`
            );

            return res.json({

                success: true,

                message:
                    `Door alarm ${state === "ON" ? "armed" : "disarmed"}`,

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
                },
            });
        }

        // -------------------------------------------------
        // NORMAL DEVICE R1-R6
        // -------------------------------------------------

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
            state === "ON";

        await device.save();

        console.log(
            `DEVICE STATE CHANGED: ` +
            `${device.name} | ` +
            `Relay: ${device.relay} | ` +
            `isOn: ${device.isOn}`
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
//
// However:
// R7 deletion means the alarm device is removed.
// The relay becomes available for a new alarm device.
//
// R8 cannot be deleted.
// =====================================================

async function deleteDevice(
    req,
    res
) {

    try {

        const {
            deviceId,
        } = req.params;

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
        // RESET ALARM STATUS
        // -------------------------------------------------

        if (
            device.relay ===
            ALARM_RELAY
        ) {

            smartHome.alarmEnabled =
                false;

            smartHome.alarmIsOn =
                false;

            await smartHome.save();
        }

        // -------------------------------------------------
        // DELETE
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
        // VALIDATE
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

        console.log(
            `PUMP BEFORE UPDATE: ` +
            `R8 | pumpIsOn: ${smartHome.pumpIsOn}`
        );

        // -------------------------------------------------
        // UPDATE
        // -------------------------------------------------

        smartHome.pumpIsOn =
            state === "ON";

        smartHome.pumpRelay =
            PUMP_RELAY;

        await smartHome.save();

        console.log(
            `PUMP STATE CHANGED: ` +
            `R8 | pumpIsOn: ${smartHome.pumpIsOn}`
        );

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
// This endpoint is kept for compatibility.
//
// ON  = Arm alarm
// OFF = Disarm alarm
//
// The actual siren is triggered by the door sensor.
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

        console.log(
            "================================="
        );

        console.log(
            "CONTROL DOOR ALARM"
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
        // VALIDATE
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
                    "You do not have permission to control the alarm",
            });
        }

        // -------------------------------------------------
        // FIND R7 ALARM DEVICE
        // -------------------------------------------------

        const alarm =
            await Device.findOne({

                home:
                    smartHome._id,

                relay:
                    ALARM_RELAY,

                type:
                    "alarm",

            });

        if (!alarm) {

            return res.status(404).json({

                success: false,

                message:
                    "Door alarm device has not been added yet",
            });
        }

        // -------------------------------------------------
        // ARM / DISARM
        // -------------------------------------------------

        alarm.isOn =
            state === "ON";

        smartHome.alarmEnabled =
            state === "ON";

        // Disarming immediately stops siren
        if (
            state === "OFF"
        ) {

            smartHome.alarmIsOn =
                false;
        }

        await alarm.save();

        await smartHome.save();

        console.log(
            "ALARM DEVICE STATE:",
            alarm.isOn
        );

        console.log(
            "ALARM ENABLED:",
            smartHome.alarmEnabled
        );

        console.log(
            "ALARM SIREN:",
            smartHome.alarmIsOn
        );

        console.log(
            "================================="
        );

        return res.json({

            success: true,

            message:
                `Door alarm ${state === "ON" ? "armed" : "disarmed"}`,

            alarm: {

                name:
                    alarm.name,

                relay:
                    ALARM_RELAY,

                enabled:
                    alarm.isOn === true,

                isOn:
                    smartHome.alarmIsOn === true,
            },

            device:
                alarm,
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
};