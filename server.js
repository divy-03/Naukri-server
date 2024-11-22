const app = require("./app.js");
const connectToAtlas = require("./atlas.js");
const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

(async () => {
  try {
    await connectToAtlas(); // Wait for the connection to be established
    app.listen(process.env.PORT, () => {
      console.log(`Server is working on http://localhost:${process.env.PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB Atlas:", err);
  }
})();
