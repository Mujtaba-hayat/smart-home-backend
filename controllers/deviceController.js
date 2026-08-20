const Device = require("../models/Device");
const SmartHome = require("../models/SmartHome");
const mongoose = require("mongoose");

const NORMAL_RELAYS = ["R1", "R2", "R3", "R4", "R5", "R6", "R7"];
const MAX_NORMAL_DEVICES = 7;
const PUMP_RELAY = "R8";

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

async function findOwnerHome(userId) {
    return SmartHome.findOne({ owner: userId });
}

async function findDeviceForHome(deviceId, homeId) {
    let device = null;

    if (mongoose.Types.ObjectId.isValid(deviceId)) {
        device = await Device.findOne({ _id: deviceId, home: homeId });
    }

    if (!device) {
        device = await Device.findOne({ deviceId, home: homeId });
    }

    return device;
}

function handleDeviceError(res, error, label) {
    console.error(`${label}:`, error.message);

    if (error.code === 11000) {
        return res.status(409).json({
            success: false,
            message: "This relay or device ID is already assigned",
        });
    }

    if (error.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }

    return res.status(500).json({
        success: false,
        message: "Server error",
    });
}

// =====================================
// Get Relay States
// Used by ESP32
// Keep response shape: { "R1": "ON"|"OFF", ... "R8": ... }
// Optional: ?esp32Id=... so only that home is polled
// =====================================

async function getDevices(req, res) {
    try {
        const relayStates = defaultRelayStates();
        const filter = {};
        let smartHome = null;

        if (req.query.esp32Id) {
            smartHome = await SmartHome.findOne({
                esp32Id: req.query.esp32Id,
            });

            if (!smartHome) {
                return res.json(relayStates);
            }

            filter.home = smartHome._id;
        } else {
            smartHome = await SmartHome.findOne({});
            if (smartHome) {
                filter.home = smartHome._id;
            }
        }

        const devices = await Device.find(filter);

        devices.forEach((device) => {
            if (device.relay !== PUMP_RELAY) {
                relayStates[device.relay] = device.isOn ? "ON" : "OFF";
            }
        });

        // Pump is not a normal Device row
        if (smartHome) {
            relayStates[PUMP_RELAY] = smartHome.pumpIsOn ? "ON" : "OFF";
        }

        res.json(relayStates);
    } catch (error) {
        handleDeviceError(res, error, "Get Relay States Error");
    }
}

// =====================================
// Get User Devices
// =====================================

async function getUserDevices(req, res) {
    try {
        const smartHome = await findOwnerHome(req.user.userId);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        const devices = await Device.find({ home: smartHome._id });

        res.json({
            success: true,
            devices,
            deviceCount: devices.length,
            maxDevices: MAX_NORMAL_DEVICES,
            canAddDevice: devices.length < MAX_NORMAL_DEVICES,
            pump: {
                name: "Water Pump",
                relay: PUMP_RELAY,
                isOn: Boolean(smartHome.pumpIsOn),
            },
        });
    } catch (error) {
        handleDeviceError(res, error, "Get User Devices Error");
    }
}

// =====================================
// Add Device
// =====================================

async function addDevice(req, res) {
    try {
        const { name, deviceId, type, relay } = req.body;

        if (!name || !deviceId || !type || !relay) {
            return res.status(400).json({
                success: false,
                message: "Name, deviceId, type and relay are required",
            });
        }

        if (relay === PUMP_RELAY) {
            return res.status(400).json({
                success: false,
                message: "R8 is permanently reserved for the water pump",
            });
        }

        if (!NORMAL_RELAYS.includes(relay)) {
            return res.status(400).json({
                success: false,
                message: "Relay must be one of R1 to R7",
            });
        }

        const smartHome = await findOwnerHome(req.user.userId);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        const deviceCount = await Device.countDocuments({
            home: smartHome._id,
        });

        if (deviceCount >= MAX_NORMAL_DEVICES) {
            return res.status(400).json({
                success: false,
                message: "You can add a maximum of 7 devices",
            });
        }

        const existingRelay = await Device.findOne({
            home: smartHome._id,
            relay,
        });

        if (existingRelay) {
            return res.status(409).json({
                success: false,
                message: `${relay} is already assigned to another device`,
            });
        }

        const existingDevice = await Device.findOne({
            home: smartHome._id,
            deviceId: deviceId.trim(),
        });

        if (existingDevice) {
            return res.status(409).json({
                success: false,
                message: "This device ID is already in use",
            });
        }

        const device = await Device.create({
            name: name.trim(),
            deviceId: deviceId.trim(),
            type: String(type).trim().toLowerCase(),
            relay,
            isOn: false,
            home: smartHome._id,
        });

        res.status(201).json({
            success: true,
            message: "Device added successfully",
            device,
        });
    } catch (error) {
        handleDeviceError(res, error, "Add Device Error");
    }
}

// =====================================
// Control Device
// =====================================

async function controlDevice(req, res) {
    try {
        const { deviceId } = req.params;
        const { state } = req.body;

        if (!["ON", "OFF"].includes(state)) {
            return res.status(400).json({
                success: false,
                message: "State must be ON or OFF",
            });
        }

        const smartHome = await findOwnerHome(req.user.userId);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        const device = await findDeviceForHome(deviceId, smartHome._id);

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found",
            });
        }

        device.isOn = state === "ON";
        await device.save();

        res.json({
            success: true,
            message: `${device.name} turned ${state}`,
            device,
        });
    } catch (error) {
        handleDeviceError(res, error, "Control Device Error");
    }
}

// =====================================
// Delete Device
// =====================================

async function deleteDevice(req, res) {
    try {
        const { deviceId } = req.params;

        const smartHome = await findOwnerHome(req.user.userId);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        const device = await findDeviceForHome(deviceId, smartHome._id);

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found",
            });
        }

        if (device.relay === PUMP_RELAY) {
            return res.status(400).json({
                success: false,
                message: "Water pump relay R8 cannot be deleted",
            });
        }

        await device.deleteOne();

        res.json({
            success: true,
            message: "Device deleted successfully",
            freedRelay: device.relay,
        });
    } catch (error) {
        handleDeviceError(res, error, "Delete Device Error");
    }
}

// =====================================
// Control Water Pump (R8)
// Permanent card — not a Device row
// =====================================

async function controlPump(req, res) {
    try {
        const { state } = req.body;

        if (!["ON", "OFF"].includes(state)) {
            return res.status(400).json({
                success: false,
                message: "State must be ON or OFF",
            });
        }

        const smartHome = await findOwnerHome(req.user.userId);

        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        smartHome.pumpIsOn = state === "ON";
        smartHome.pumpRelay = "R8";
        await smartHome.save();

        res.json({
            success: true,
            message: `Water pump turned ${state}`,
            pump: {
                name: "Water Pump",
                relay: "R8",
                isOn: smartHome.pumpIsOn,
            },
        });
    } catch (error) {
        handleDeviceError(res, error, "Control Pump Error");
    }
}

module.exports = {
    getDevices,
    getUserDevices,
    addDevice,
    controlDevice,
    deleteDevice,
    controlPump,
};