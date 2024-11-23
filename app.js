const express = require("express");
require("dotenv").config(); // For loading environment variables
const cookieParser = require("cookie-parser");
const cors = require("cors");
const errorMid = require("./middlewares/error");
const app = express();

// Increase payload size limit (e.g., to 10MB)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  cors({
    origin: process.env.CLIENT_BASE_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ hello: "Hello World!" });
});

const user = require("./routes/userRoute.js");
app.use("/api", user);


app.use(errorMid);

module.exports = app;
