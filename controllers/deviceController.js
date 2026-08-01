const storage = require("../data/storage");

// ===============================
// Get Devices
// ===============================

function getDevices(req, res) {
    res.json(storage.devices);
}

// ===============================
// Control Device
// ===============================

function controlDevice(req, res){
    const { device, state } = req.query;
    if (!storage.devices.hasOwnProperty(device)) {
        return res.status(400).json({
            success: false,
            message: "Invalid device",
        });
    }

    storage.devices[device] = state;

    res.json({
        success: true,
        message: `${device} turned ${state}`,
    });
}

module.exports = {
    getDevices,
    controlDevice,
};