const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
    {
        // =====================================
        // SMART HOME
        // =====================================

        smartHome: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SmartHome",
            required: true,
        },

        // =====================================
        // MEMBER USER
        // =====================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // =====================================
        // ROLE
        // =====================================

        role: {
            type: String,
            enum: [
                "member",
                "admin",
            ],
            default: "member",
        },

        // =====================================
        // PERMISSIONS
        // =====================================

        canControlDevices: {
            type: Boolean,
            default: true,
        },

        canControlPump: {
            type: Boolean,
            default: false,
        },

        canManageDevices: {
            type: Boolean,
            default: false,
        },

        canManageMembers: {
            type: Boolean,
            default: false,
        },

        // =====================================
        // INVITATION STATUS
        // =====================================

        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "rejected",
            ],
            default: "pending",
        },

        // =====================================
        // INVITED BY
        // =====================================

        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// =====================================
// PREVENT DUPLICATE MEMBERS
// =====================================

memberSchema.index(
    {
        smartHome: 1,
        user: 1,
    },
    {
        unique: true,
    }
);

module.exports =
    mongoose.model("Member", memberSchema);