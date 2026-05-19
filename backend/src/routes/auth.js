const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// حماية من crash (اختياري لكن مفيد)
if (!authController) {
  throw new Error('authController is missing');
}

// مسارات المصادقة الأساسية
router.post('/login', authController.login);
router.post('/register', authController.register);

// المسارات المحمية ✅ الآن تعمل لأن الدوال موجودة في الكونترولر
router.get('/me', authenticateToken, authController.getMe);

router.post(
  '/reset-password/:user_id',
  authenticateToken,
  authorizeRoles('admin'),
  authController.resetPassword
);

router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;