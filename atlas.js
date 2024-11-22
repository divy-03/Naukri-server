const mongoose = require("mongoose");

const connectToAtlas = async () => {
  try {
    // await mongoose.connect(String(process.env.MONGODB_URI)).then(() => {
    await mongoose.connect(String(process.env.ATLAS_URI)).then(() => {
      console.log("Successfully connected to MongoDB Atlas!");
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB Atlas:", err);
    process.exit(1);
  }
};

module.exports = connectToAtlas;
