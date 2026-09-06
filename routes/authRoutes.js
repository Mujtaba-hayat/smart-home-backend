const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    deleteAccount,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

// =====================================
// Authentication
// =====================================

router.post(
    "/auth/register",
    registerUser
);

router.post(
    "/auth/login",
    loginUser
);

// =====================================
// Password Reset
// =====================================

router.post(
    "/auth/forgot-password",
    forgotPassword
);

router.post(
    "/auth/reset-password",
    resetPassword
);

// =====================================
// Delete Account Permanently
// =====================================

router.delete(
    "/auth/delete-account",
    protect,
    deleteAccount
);

module.exports = router;