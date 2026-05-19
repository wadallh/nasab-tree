const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// حماية من crash
if (!authController) {
  throw new Error('authController is missing');
}

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authenticateToken, authController.getMe);

router.post(
  '/reset-password/:user_id',
  authenticateToken,
  authorizeRoles('admin'),
  authController.resetPassword
);

router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;