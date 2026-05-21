const jwt = require('jsonwebtoken');

/**
 * Middleware للتحقق من صحة التوكن
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please login again'
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token format is incorrect'
      });
    }
    
    return res.status(403).json({ 
      error: 'Token verification failed',
      message: 'Please provide a valid token'
    });
  }
};

/**
 * Middleware للتحقق من صلاحيات الأدوار
 * @param {...string} roles - الأدوار المسموح لها بالدخول
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login first'
      });
    }

    if (!roles.includes(req.user.role)) {
      console.warn(`⚠️ Access denied: User ${req.user.id} with role "${req.user.role}" tried to access restricted resource`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to perform this action',
        requiredRoles: roles
      });
    }

    next();
  };
};

/**
 * Middleware اختياري للتحقق من ملكية المورد
 * @param {string} resourceIdField - اسم الحقل في الطلب الذي يحتوي على معرف المورد
 */
const authorizeOwnership = (resourceIdField = 'id') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // إذا كان المستخدم أدمن، يسمح له بالدخول
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
    
    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID is required' });
    }

    // إذا كان المورد يخص المستخدم، يسمح له
    if (String(resourceId) === String(req.user.id)) {
      return next();
    }

    return res.status(403).json({ 
      error: 'Access denied',
      message: 'You can only access your own resources'
    });
  };
};

module.exports = { 
  authenticateToken, 
  authorizeRoles,
  authorizeOwnership
};