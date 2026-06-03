const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.DB_URL;

async function connectDB() {
  if (!mongoUri) {
    throw new Error("MongoDB connection string missing. Set DB_URL or MONGODB_URI in backend/.env.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(mongoUri);
  console.log("[DB] MongoDB connected");
  return mongoose.connection;
}

module.exports = { connectDB, mongoose };
