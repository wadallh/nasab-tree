// ✅ backend/routes/tree.js
// هذا الملف يحتوي على حماية ذكية ضد أخطاء الـ Controller

const express = require('express');
const router = express.Router();
const treeController = require('../controllers/treeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// =========================
// 🔍 دالة مساعدة للتحقق من وجود الدوال (للحماية من الأخطاء)
// =========================
const safeController = (controller, methodName, fallbackMessage) => {
  if (typeof controller[methodName] !== 'function') {
    console.error(`❌ Missing controller method: ${methodName}`);
    console.error(`👉 ${fallbackMessage}`);
    // نرجع دالة ترسل خطأ واضح بدلاً من انهيار السيرفر
    return (req, res) => {
      res.status(500).json({ 
        error: 'Server configuration error', 
        message: fallbackMessage 
      });
    };
  }
  return controller[methodName];
};

// =========================
// 🌳 مسارات الشجرة (مع حماية)
// =========================

// ✅ جلب الشجرة العائلية
router.get(
  '/',
  authenticateToken,
  safeController(
    treeController, 
    'getFamilyTree', 
    'دالة getFamilyTree غير موجودة في treeController.js'
  )
);

// ✅ إضافة شخص مباشر (للمشرفين والإداريين فقط)
router.post(
  '/persons',
  authenticateToken,
  authorizeRoles('admin', 'supervisor'),
  safeController(
    treeController, 
    'addPersonDirect', 
    'دالة addPersonDirect غير موجودة في treeController.js'
  )
);

// ✅ تحديث حالة شخص (للمشرفين والإداريين فقط)
// ⚠️ هذا هو المسار الذي سبب الخطأ سابقاً
router.patch(
  '/persons/:personId/status',
  authenticateToken,
  authorizeRoles('admin', 'supervisor'),
  safeController(
    treeController, 
    'updatePersonStatusDirect', 
    'دالة updatePersonStatusDirect غير موجودة في treeController.js'
  )
);

// ✅ حذف شخص (للإداريين فقط)
router.delete(
  '/persons/:personId',
  authenticateToken,
  authorizeRoles('admin'),
  safeController(
    treeController, 
    'deletePersonDirect', 
    'دالة deletePersonDirect غير موجودة في treeController.js'
  )
);

// =========================
// 📊 تسجيل المسارات المحملة (للتأكد)
// =========================
console.log('✅ Tree routes loaded with protection layer');

module.exports = router;