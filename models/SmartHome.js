const mongoose = require("mongoose");

const smartHomeSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

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

        pumpRelay: {
            type: String,
            enum: ["R8"],
            default: "R8",
        },

        pumpIsOn: {
            type: Boolean,
            default: false,
        },

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

module.exports = mongoose.model("SmartHome", smartHomeSchema);