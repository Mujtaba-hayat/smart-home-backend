const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/User");
const SmartHome = require("../models/SmartHome");
const Device = require("../models/Device");

const {
    sendResetCodeEmail,
} = require("../utils/emailService");

// =====================================================
// Register User
// =====================================================

async function registerUser(req, res) {
    try {
        const { fullName, email, password } = req.body;

        console.log("REGISTER BODY:", req.body);

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required",
            });
        }

        const normalizedEmail =
            email.toLowerCase().trim();

        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists",
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const user = await User.create({
            fullName: fullName.trim(),
            email: normalizedEmail,
            password: hashedPassword,
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",

            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
            },
        });

    } catch (error) {
        console.error(
            "Registration Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

// =====================================================
// Login User
// =====================================================

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const normalizedEmail =
            email.toLowerCase().trim();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        return res.json({
            success: true,
            message: "Login successful",

            token,

            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
            },
        });

    } catch (error) {
        console.error(
            "Login Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

// =====================================================
// Forgot Password
// =====================================================

async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const normalizedEmail =
            email.toLowerCase().trim();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "No account found with this email",
            });
        }

        // Generate 6-digit reset code

        const resetCode =
            Math.floor(
                100000 +
                Math.random() * 900000
            ).toString();

        // Code valid for 10 minutes

        const expiresAt =
            new Date(
                Date.now() +
                10 * 60 * 1000
            );

        user.resetPasswordCode =
            resetCode;

        user.resetPasswordCodeExpires =
            expiresAt;

        await user.save();

        // Send reset code

        await sendResetCodeEmail(
            user.email,
            resetCode
        );

        console.log(
            "================================="
        );

        console.log(
            "PASSWORD RESET CODE"
        );

        console.log(
            "Email:",
            user.email
        );

        console.log(
            "Code:",
            resetCode
        );

        console.log(
            "Expires:",
            expiresAt
        );

        console.log(
            "Email sent successfully."
        );

        console.log(
            "================================="
        );

        return res.status(200).json({
            success: true,
            message:
                "Password reset code sent to your email",
        });

    } catch (error) {
        console.error(
            "Forgot Password Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to send password reset code",
        });
    }
}

// =====================================================
// Reset Password
// =====================================================

async function resetPassword(req, res) {
    try {
        const {
            email,
            code,
            newPassword,
        } = req.body;

        if (
            !email ||
            !code ||
            !newPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Email, reset code and new password are required",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters",
            });
        }

        const normalizedEmail =
            email.toLowerCase().trim();

        const normalizedCode =
            code.toString().trim();

        const user =
            await User.findOne({
                email: normalizedEmail,
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (!user.resetPasswordCode) {
            return res.status(400).json({
                success: false,
                message:
                    "No password reset request found",
            });
        }

        if (
            !user.resetPasswordCodeExpires ||
            user.resetPasswordCodeExpires.getTime() <
                Date.now()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Reset code has expired. Please request a new code.",
            });
        }

        if (
            user.resetPasswordCode !==
            normalizedCode
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid reset code",
            });
        }

        // Hash new password

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                10
            );

        user.password =
            hashedPassword;

        // Clear reset information

        user.resetPasswordCode =
            null;

        user.resetPasswordCodeExpires =
            null;

        await user.save();

        return res.status(200).json({
            success: true,
            message:
                "Password reset successfully. Please login with your new password.",
        });

    } catch (error) {
        console.error(
            "Reset Password Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

// =====================================================
// Delete Account Permanently
// =====================================================
//
// Deletes:
// 1. All devices belonging to the user's Smart Home
// 2. Smart Home
// 3. User account
//
// The ESP32 hardware is NOT deleted.
//
// The ESP32 ID is released from MongoDB because the
// SmartHome document containing that ESP32 ID is deleted.
//
// =====================================================

async function deleteAccount(req, res) {
    try {

        // =============================================
        // Get password
        // =============================================

        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message:
                    "Password is required",
            });
        }

        // =============================================
        // Get logged-in user
        // =============================================

        const user =
            await User.findById(
                req.user.userId
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found",
            });
        }

        // =============================================
        // Verify password
        // =============================================

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message:
                    "Incorrect password",
            });
        }

        console.log(
            "================================="
        );

        console.log(
            "ACCOUNT DELETION REQUEST"
        );

        console.log(
            "User:",
            user.email
        );

        // =============================================
        // Find Smart Home
        // =============================================

        const smartHome =
            await SmartHome.findOne({
                owner: user._id,
            });

        // =============================================
        // Delete Smart Home Devices
        // =============================================

        if (smartHome) {

            console.log(
                "Smart Home:",
                smartHome.name
            );

            console.log(
                "ESP32 ID:",
                smartHome.esp32Id
            );

            const deletedDevices =
                await Device.deleteMany({
                    home: smartHome._id,
                });

            console.log(
                "Devices deleted:",
                deletedDevices.deletedCount
            );

            // =========================================
            // Delete Smart Home
            // =========================================

            await SmartHome.deleteOne({
                _id: smartHome._id,
            });

            console.log(
                "Smart Home deleted."
            );

        } else {

            console.log(
                "No Smart Home found for user."
            );
        }

        // =============================================
        // Delete User
        // =============================================

        await User.deleteOne({
            _id: user._id,
        });

        console.log(
            "User account deleted:",
            user.email
        );

        console.log(
            "================================="
        );

        // =============================================
        // Response
        // =============================================

        return res.status(200).json({
            success: true,
            message:
                "Account, Smart Home and all associated devices deleted permanently",
        });

    } catch (error) {

        console.error(
            "Delete Account Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete account",
        });
    }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    deleteAccount,
};