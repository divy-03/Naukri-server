const jwt = require("jsonwebtoken");

module.exports = async (statusCode, user, res) => {
  const data = {
    user: {
      id: user.id,
    },
  };

  // Create the JWT token
  const authToken = jwt.sign(data, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_TIME || "1d", // Default 1 day
  });

  // Cookie options
  const options = {
    expires: new Date(
      Date.now() + Number(process.env.COOKIE_EXPIRE || 1) * 24 * 60 * 60 * 1000 // Default 1 day
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Only HTTPS in production
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Cross-site in production, Lax in development
  };

  // Set the cookie
  res.cookie("nToken", authToken, options);

  // Return response with the token
  return res.status(statusCode).json({
    success: true,
    authToken,
    user,
  });
};
