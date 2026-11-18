const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  verifyPassword,
  changePassword,
  getDemoAccounts,
} = require('../controller/authController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const {
  validateRegister,
  validateLogin,
  validateVerifyPassword,
  validateChangePassword,
} = require('../middleware/validator');

const router = express.Router();

// Public Authentication Endpoints
router.post('/login', loginRateLimiter, validateLogin, login);
router.post('/logout', logout);
router.get('/demo-accounts', getDemoAccounts);

// Registration (Admin only or bootstrap)
router.post('/register', optionalAuth, validateRegister, register);

// Authenticated Endpoints
router.get('/me', authenticate, getMe);
router.post('/verify-password', authenticate, validateVerifyPassword, verifyPassword);
router.post('/change-password', authenticate, validateChangePassword, changePassword);

module.exports = router;
