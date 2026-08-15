const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

// ===============================
// Protected User Route
// ===============================

router.get("/user/profile", protect, (req, res) => {

    res.json({
        success: true,
        message: "You are authenticated",
        user: req.user,
    });

});

module.exports = router;