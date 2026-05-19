const jwt = require('jsonwebtoken');

/**
 * =========================
 * 🔐 التحقق من التوكن
 * =========================
 */
const authenticateToken = (req, res, next) => {
  try {
    // قراءة الهيدر بشكل آمن
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('❌ Missing Authorization header');
      return res.status(401).json({ error: 'لم يتم إرسال التوكن' });
    }

    // التحقق من صيغة Bearer
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('❌ Invalid token format:', authHeader);
      return res.status(401).json({ error: 'صيغة التوكن غير صحيحة' });
    }

    const token = parts[1];

    const jwtSecret =
      process.env.JWT_SECRET || 'your-secret-key-change-in-production';

    // التحقق من التوكن
    const decoded = jwt.verify(token, jwtSecret);

    req.user = decoded;

    console.log('✅ Token verified:', {
      id: decoded.id,
      role: decoded.role,
    });

    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);

    return res.status(403).json({
      error: 'التوكن غير صالح أو منتهي الصلاحية',
    });
  }
};

/**
 * =========================
 * 👮 الصلاحيات (Roles)
 * =========================
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'يجب تسجيل الدخول أولاً',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log('❌ Unauthorized role:', req.user.role);

      return res.status(403).json({
        error: 'ليس لديك صلاحية لهذا الإجراء',
      });
    }

    console.log('✅ Role authorized:', req.user.role);
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
};