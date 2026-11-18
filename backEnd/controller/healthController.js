const mongoose = require('mongoose');
const ApiResponse = require('../utils/apiResponse');

/**
 * @desc    Check Backend Server and Database Connectivity Health
 * @route   GET /api/v1/health
 * @access  Public
 */
const getHealthStatus = (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const isDbHealthy = dbState === 1;

  const healthData = {
    service: 'Abu Bakar Medical Store API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbStateMap[dbState] || 'unknown',
      connected: isDbHealthy,
      name: isDbHealthy ? mongoose.connection.name : null,
      host: isDbHealthy ? mongoose.connection.host : null,
    },
    memoryUsage: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100,
    },
  };

  const statusCode = isDbHealthy ? 200 : 503;
  const message = isDbHealthy
    ? 'All system components operational.'
    : 'System degraded: Database is not connected.';

  return ApiResponse.success(res, message, healthData, statusCode);
};

module.exports = {
  getHealthStatus,
};
