require("dotenv").config();
const mongoose = require("mongoose");

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("CONNECTED");
        console.log("DATABASE:", mongoose.connection.name);

        const collections =
            await mongoose.connection.db
                .listCollections()
                .toArray();

        console.log(
            "COLLECTIONS:",
            collections.map((collection) => collection.name)
        );

        await mongoose.disconnect();
        console.log("Disconnected");
    } catch (error) {
        console.error("ERROR:", error.message);
        process.exit(1);
    }
}

checkDatabase();