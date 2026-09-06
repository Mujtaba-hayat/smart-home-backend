const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const User = require("../models/User");
const SmartHome = require("../models/SmartHome");
const Device = require("../models/Device");

// =====================================================
// GET USER PROFILE
// =====================================================

router.get(
    "/user/profile",
    protect,
    (req, res) => {

        res.json({
            success: true,
            message: "You are authenticated",
            user: req.user,
        });

    }
);

// =====================================================
// DELETE USER ACCOUNT
// =====================================================
//
// Deletes:
//
// 1. All devices belonging to the user
// 2. Smart Home
// 3. User account
//
// ESP32 itself is NOT deleted.
//
// After SmartHome is deleted, ESP32 heartbeat
// receives 404 and ESP32 automatically becomes
// available for a new account.
// =====================================================

router.delete(
    "/user/account",
    protect,
    async (req, res) => {

        try {

            const userId =
                req.user.userId;

            console.log();
            console.log("=================================");
            console.log("DELETE USER ACCOUNT");
            console.log("=================================");

            console.log(
                "User ID:",
                userId
            );

            // =================================================
            // FIND USER
            // =================================================

            const user =
                await User.findById(userId);

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            // =================================================
            // FIND SMART HOME
            // =================================================

            const smartHome =
                await SmartHome.findOne({
                    owner: userId,
                });

            let deletedDevices = 0;

            // =================================================
            // DELETE SMART HOME DEVICES
            // =================================================

            if (smartHome) {

                const result =
                    await Device.deleteMany({
                        home: smartHome._id,
                    });

                deletedDevices =
                    result.deletedCount;

                console.log(
                    "Devices deleted:",
                    deletedDevices
                );

                // =================================================
                // DELETE SMART HOME
                // =================================================

                await SmartHome.deleteOne({
                    _id: smartHome._id,
                });

                console.log(
                    "Smart Home deleted:",
                    smartHome.name
                );
            }

            // =================================================
            // DELETE USER
            // =================================================

            await User.deleteOne({
                _id: userId,
            });

            console.log(
                "User account deleted:",
                user.email
            );

            console.log(
                "================================="
            );
            console.log();

            // =================================================
            // RESPONSE
            // =================================================

            return res.json({

                success: true,

                message:
                    "Account and all associated smart home data deleted successfully",

                deletedDevices,

            });

        } catch (error) {

            console.error(
                "Delete Account Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;