const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {

        // =============================================
        // USER
        // =============================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

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
        // NOTIFICATION TYPE
        // =============================================

        type: {
            type: String,
            enum: [
                "door_alarm",
                "device",
                "pump",
                "system",
                "sensor",
            ],
            required: true,
        },

        // =============================================
        // TITLE
        // =============================================

        title: {
            type: String,
            required: true,
            trim: true,
        },

        // =============================================
        // MESSAGE
        // =============================================

        message: {
            type: String,
            required: true,
            trim: true,
        },

        // =============================================
        // READ STATUS
        // =============================================

        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// =============================================
// NOTIFICATION QUERY INDEX
// =============================================

notificationSchema.index({
    user: 1,
    createdAt: -1,
});

notificationSchema.index({
    user: 1,
    isRead: 1,
    createdAt: -1,
});

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);

