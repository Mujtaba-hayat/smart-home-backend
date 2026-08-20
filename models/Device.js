const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
    {
        // Name shown in the Flutter app
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Internal device identifier
        deviceId: {
            type: String,
            required: true,
            trim: true,
        },

        // Device category (expand later if needed)
        type: {
            type: String,
            required: true,
            trim: true,
            enum: ["light", "fan", "socket", "appliance", "other"],
        },

        // User-assignable relays only. R8 is reserved for the water pump.
        relay: {
            type: String,
            required: true,
            enum: ["R1", "R2", "R3", "R4", "R5", "R6", "R7"],
        },

        // Current device state
        isOn: {
            type: Boolean,
            default: false,
        },

        // Smart Home that owns this device
        home: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SmartHome",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// One relay per home (duplicate assignment blocked at the database)
deviceSchema.index({ home: 1, relay: 1 }, { unique: true });

// One deviceId per home
deviceSchema.index({ home: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model("Device", deviceSchema);