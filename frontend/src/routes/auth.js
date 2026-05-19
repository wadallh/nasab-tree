const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

console.log('AUTH CONTROLLER:', authController);
console.log('AUTH MIDDLEWARE:', authMiddleware);

// حماية من crash
const authenticateToken = authMiddleware?.authenticateToken;
const authorizeRoles = authMiddleware?.authorizeRoles;

router.post('/login', authController?.login);
router.post('/register', authController?.register);

router.get('/me', authenticateToken, authController?.getMe);

router.post(
  '/reset-password/:user_id',
  authenticateToken,
  authorizeRoles('admin'),
  authController?.resetPassword
);

router.post('/change-password', authenticateToken, authController?.changePassword);

module.exports = router;