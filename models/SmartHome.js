const mongoose = require("mongoose");

const smartHomeSchema = new mongoose.Schema(
    {
        // =====================================
        // OWNER
        // =====================================

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // =====================================
        // SMART HOME INFORMATION
        // =====================================

        name: {
            type: String,
            required: true,
            trim: true,
        },

        // =====================================
        // SMART HOME MEMBERS
        // =====================================

        members: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },

                // Can control R1-R7 devices
                controlDevices: {
                    type: Boolean,
                    default: true,
                },

                // Can control R8 water pump
                controlPump: {
                    type: Boolean,
                    default: true,
                },

                // Can add/remove other members
                manageMembers: {
                    type: Boolean,
                    default: false,
                },

                joinedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // =====================================
        // ESP32
        // =====================================

        esp32Id: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },

        status: {
            type: String,
            enum: ["connected", "disconnected"],
            default: "disconnected",
        },

        // =====================================
        // ESP32 LAST SEEN
        // =====================================

        lastSeen: {
            type: Date,
            default: null,
        },

        // =====================================
        // SENSORS
        // =====================================

        // DHT22 temperature
        temperature: {
            type: Number,
            default: null,
        },

        // DHT22 humidity
        humidity: {
            type: Number,
            default: null,
        },

        // Magnetic reed sensor
        doorStatus: {
            type: String,
            enum: ["open", "closed"],
            default: "closed",
        },

        // Last time ESP32 sent sensor data
        sensorLastUpdated: {
            type: Date,
            default: null,
        },


        // =====================================
// DOOR ALARM / BUZZER
// =====================================

// R7 is permanently reserved for alarm
alarmRelay: {
    type: String,
    enum: ["R7"],
    default: "R7",
},

// User preference:
// true  = alarm system enabled
// false = alarm system disabled
alarmEnabled: {
    type: Boolean,
    default: true,
},

// Actual buzzer state
// true  = R7 ON
// false = R7 OFF
alarmIsOn: {
    type: Boolean,
    default: false,
},

        // =====================================
        // WATER PUMP
        // =====================================

        pumpRelay: {
            type: String,
            enum: ["R8"],
            default: "R8",
        },

        pumpIsOn: {
            type: Boolean,
            default: false,
        },

        // =====================================
        // ESP32 PAIRING
        // =====================================

        pairingCode: {
            type: String,
            default: null,
        },

        pairingCodeExpiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "SmartHome",
    smartHomeSchema
);