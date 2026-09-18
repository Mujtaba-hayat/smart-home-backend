
const mongoose = require("mongoose");


// =====================================================
// SENSOR SCHEMA
//
// Stores historical sensor readings from ESP32.
//
// DHT22:
// - Temperature
// - Humidity
//
// Magnetic Reed Sensor:
// - Door status
//
// Each reading is stored separately so the Analytics
// screen can later display historical data.
// =====================================================

const sensorSchema = new mongoose.Schema(
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
        // ESP32
        // =============================================

        esp32Id: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },


        // =============================================
        // TEMPERATURE - DHT22
        // =============================================

        temperature: {
            type: Number,
            required: true,
        },


        // =============================================
        // HUMIDITY - DHT22
        // =============================================

        humidity: {
            type: Number,
            required: true,
        },


        // =============================================
        // DOOR STATUS - MAGNETIC REED SENSOR
        // =============================================

        doorStatus: {
            type: String,
            enum: [
                "open",
                "closed",
            ],
            required: true,
        },

    },

    {
        timestamps: true,
    }
);


// =====================================================
// INDEXES
// =====================================================

// Latest readings for a Smart Home
sensorSchema.index({
    smartHome: 1,
    createdAt: -1,
});


// Latest readings for an ESP32
sensorSchema.index({
    esp32Id: 1,
    createdAt: -1,
});


module.exports = mongoose.model(
    "Sensor",
    sensorSchema
);

