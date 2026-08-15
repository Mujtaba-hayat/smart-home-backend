const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config();

// Use reliable public DNS servers for MongoDB SRV lookup
dns.setServers(["1.1.1.1", "8.8.8.8"]);

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("MongoDB Connection Failed:");
        console.error(error.message);

        process.exit(1);
    }
}

module.exports = connectDB;