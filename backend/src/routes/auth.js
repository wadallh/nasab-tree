const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// ✅ التحقق من وجود الكونترولر (لأغراض التصحيح)
if (!authController || typeof authController !== 'object') {
  console.error('❌ authController is missing or invalid');
  throw new Error('Authentication controller not found');
}

// 🛡️ دالة تغليف للتحكم في الأخطاء للـ async handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// =========================
// 🔐 مسارات المصادقة العامة
// =========================

/**
 * @route POST /api/auth/login
 * @desc تسجيل الدخول للمستخدم
 * @access Public
 */
router.post('/login', asyncHandler(authController.login));

/**
 * @route POST /api/auth/register
 * @desc إنشاء حساب جديد
 * @access Public
 */
router.post('/register', asyncHandler(authController.register));

// =========================
// 🔐 المسارات المحمية (تتطلب توكن)
// =========================

/**
 * @route GET /api/auth/me
 * @desc جلب بيانات المستخدم الحالي
 * @access Private
 */
router.get('/me', authenticateToken, asyncHandler(authController.getMe));

/**
 * @route POST /api/auth/change-password
 * @desc تغيير كلمة المرور
 * @access Private
 */
router.post('/change-password', authenticateToken, asyncHandler(authController.changePassword));

// =========================
// 👑 مسارات المسؤولين فقط
// =========================

/**
 * @route POST /api/auth/reset-password/:user_id
 * @desc إعادة تعيين كلمة مرور مستخدم (للمسؤولين فقط)
 * @access Private/Admin
 */
router.post(
  '/reset-password/:user_id',
  authenticateToken,
  authorizeRoles('admin'),
  asyncHandler(authController.resetPassword)
);

module.exports = router;