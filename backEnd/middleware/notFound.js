/**
 * 404 Not Found Handler for undefined endpoints
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found on endpoint: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = notFoundHandler;
