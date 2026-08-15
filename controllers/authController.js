const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/User");

// ===============================
// Register User
// ===============================

async function registerUser(req, res) {

    try {

        const { fullName, email, password } = req.body;
        console.log("REGISTER BODY:", req.body);

        // Check required fields
        if (!fullName || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required",
            });

        }

        // Check if user already exists
        const existingUser = await User.findOne({
            email: email.toLowerCase(),
        });

        if (existingUser) {

            return res.status(409).json({
                success: false,
                message: "User with this email already exists",
            });

        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
            },
        });

    } catch (error) {

        console.error("Registration Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error",
        });

    }

}

// ===============================
// Login User
// ===============================

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        //Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        // Find user 
        const user = await User.findOne({
            email: email.toLowerCase(),
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        // Compare password 
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return  res.status(401).json({
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

       res.json({
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
        console.error("Login Error: ", error.message);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

module.exports = {
    registerUser,
    loginUser,
};