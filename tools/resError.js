const resError = (statusCode, message, res) => {
  if (!res.headersSent) {
    return res.status(statusCode).json({ success: false, message });
  }
};

module.exports = resError;
