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

        // Device category
        type: {
            type: String,
            required: true,
            trim: true,
        },

        // Physical relay channel
        relay: {
            type: String,
            required: true,
            enum: [
                "R1",
                "R2",
                "R3",
                "R4",
                "R5",
                "R6",
                "R7",
                "R8",
            ],
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

module.exports = mongoose.model("Device", deviceSchema);