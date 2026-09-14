const mongoose = require("mongoose");
require("dotenv").config();

async function connectMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully.");
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message);
    }
}
module.exports = connectMongoDB;