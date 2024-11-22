const resSuccess = (statusCode, message, res) => {
  res.status(statusCode).json({
    success: true,
    message,
  });
};

module.exports = resSuccess;
