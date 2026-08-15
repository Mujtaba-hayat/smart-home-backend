const mongoose = require("mongoose");

const smartHomeSchema = new mongoose.Schema(
    {
        // User who owns this smart home
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Name given to the smart home
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Unique ESP32 hardware identifier
        esp32Id: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },

        // Connection status of ESP32
        status: {
            type: String,
            enum: ["connected", "disconnected"],
            default: "disconnected",
        },

        // Relay permanently reserved for the pump
        pumpRelay: {
            type: String,
            default: "R6",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("SmartHome", smartHomeSchema);