const jwt = require('jsonwebtoken');

/**
 * Middleware للتحقق من صحة التوكن
 */
const authenticateToken = (req, res, next) => {
  // الحصول على التوكن من الهيدر
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'لم يتم تقديم توكن' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  try {
    // التحقق من التوكن
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    console.log('✅ Token verified:', decoded);
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return res.status(403).json({ error: 'التوكن غير صالح أو منتهي الصلاحية' });
  }
};

/**
 * Middleware للتحقق من الصلاحيات (Admin/Supervisor فقط)
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      console.log('❌ Unauthorized role:', req.user.role);
      return res.status(403).json({ error: 'ليس لديك الصلاحية لتنفيذ هذا الإجراء' });
    }
    console.log('✅ Role authorized:', req.user.role);
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };