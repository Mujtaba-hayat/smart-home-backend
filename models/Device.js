const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
    {
        // =====================================================
        // DEVICE NAME
        // =====================================================

        // Name shown in Flutter
        // Examples:
        // Living Room Light
        // Bedroom Fan
        // Door Alarm

        name: {
            type: String,
            required: true,
            trim: true,
        },

        // =====================================================
        // DEVICE ID
        // =====================================================

        deviceId: {
            type: String,
            required: true,
            trim: true,
        },

        // =====================================================
        // DEVICE TYPE
        // =====================================================

        type: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,

            enum: [
                "light",
                "fan",
                "socket",
                "appliance",
                "alarm",
                "other",
            ],
        },

        // =====================================================
        // RELAY
        // =====================================================

        // R1-R6 = Normal devices
        // R7    = Door Alarm
        // R8    = Water Pump
        //
        // R8 is NOT stored in Device collection.
        //
        // R7 can only be used by an alarm device.

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
            ],
        },

        // =====================================================
        // CURRENT DEVICE STATE
        // =====================================================

        isOn: {
            type: Boolean,
            default: false,
        },

        // =====================================================
        // SMART HOME
        // =====================================================

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

// =====================================================
// ONE RELAY PER SMART HOME
// =====================================================

deviceSchema.index(
    {
        home: 1,
        relay: 1,
    },
    {
        unique: true,
    }
);

// =====================================================
// ONE DEVICE ID PER SMART HOME
// =====================================================

deviceSchema.index(
    {
        home: 1,
        deviceId: 1,
    },
    {
        unique: true,
    }
);

module.exports = mongoose.model(
    "Device",
    deviceSchema
);