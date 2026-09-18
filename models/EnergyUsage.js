const mongoose = require("mongoose");

// =====================================================
// ENERGY USAGE SCHEMA
//
// Stores historical electricity usage.
//
// Energy is calculated from:
//
// Power (kW) × Runtime (hours) = Energy (kWh)
//
// Example:
//
// 550W pump = 0.55kW
// Running for 30 minutes:
//
// 0.55 × 0.5 = 0.275 kWh
//
// =====================================================

const energyUsageSchema = new mongoose.Schema(
    {
        // =============================================
        // SMART HOME
        // =============================================

        smartHome: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SmartHome",
            required: true,
            index: true,
        },

        // =============================================
        // DEVICE
        // =============================================

        device: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Device",
            default: null,
            index: true,
        },

        // =============================================
        // DEVICE INFORMATION
        //
        // These are stored directly so historical
        // records remain understandable even if the
        // device is later renamed or deleted.
        // =============================================

        deviceName: {
            type: String,
            required: true,
            trim: true,
        },

        relay: {
            type: String,
            required: true,
            trim: true,
        },

        // =============================================
        // POWER
        // =============================================

        powerWatts: {
            type: Number,
            required: true,
            min: 0,
        },

        powerKW: {
            type: Number,
            required: true,
            min: 0,
        },

        // =============================================
        // RUNTIME
        // =============================================

        durationMinutes: {
            type: Number,
            required: true,
            min: 0,
        },

        // =============================================
        // ENERGY
        // =============================================

        energyKWh: {
            type: Number,
            required: true,
            min: 0,
        },

        // =============================================
        // ELECTRICITY COST
        // =============================================

        electricityRate: {
            type: Number,
            required: true,
            min: 0,
            default: 65,
        },

        cost: {
            type: Number,
            required: true,
            min: 0,
        },

        // =============================================
        // START / END TIME
        // =============================================

        startedAt: {
            type: Date,
            required: true,
            index: true,
        },

        endedAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// =====================================================
// ANALYTICS INDEXES
// =====================================================

// Smart Home + newest records
energyUsageSchema.index({
    smartHome: 1,
    createdAt: -1,
});

// Smart Home + date range
energyUsageSchema.index({
    smartHome: 1,
    startedAt: -1,
});

// Smart Home + device + date
energyUsageSchema.index({
    smartHome: 1,
    device: 1,
    startedAt: -1,
});

// Relay-based historical usage
energyUsageSchema.index({
    smartHome: 1,
    relay: 1,
    startedAt: -1,
});

module.exports = mongoose.model(
    "EnergyUsage",
    energyUsageSchema
);

