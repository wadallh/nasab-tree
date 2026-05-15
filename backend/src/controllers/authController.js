const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

/**
 * تسجيل الدخول - باستخدام رقم الجوال + كلمة المرور ✅
 */
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body; // ✅ تغيير: phone + password
    if (!phone || !password) return res.status(400).json({ error: 'رقم الجوال وكلمة المرور مطلوبان' });

    // جلب المستخدم مع كلمة المرور المشفرة للتحقق
    const [users] = await pool.query(
      'SELECT id, full_name, phone, email, role, is_active, password_hash, must_change_password FROM users WHERE phone = ?', 
      [phone.trim()]
    );
    
    if (users.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const user = users[0];
    if (!user.is_active) return res.status(403).json({ error: 'الحساب معطل' });

    // ✅ التحقق من كلمة المرور المشفرة
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });

    // إنشاء التوكن
    const token = jwt.sign(
      { id: user.id, full_name: user.full_name, role: user.role, phone: user.phone }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '7d' }
    );

    // تحديث آخر دخول
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // تسجيل جلسة الدخول
    try {
      const clientIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      await pool.query(
        `INSERT INTO user_sessions (id, user_id, user_email, user_name, action, ip_address, user_agent, created_at) 
         VALUES (?, ?, ?, ?, 'login', ?, ?, NOW())`,
        [uuidv4(), user.id, user.email || null, user.full_name, clientIP, userAgent]
      );
    } catch (logErr) {
      console.error('⚠️ Failed to log session:', logErr.message);
    }

    res.json({ 
      message: 'تم تسجيل الدخول بنجاح', 
      token, 
      user: { 
        id: user.id, 
        full_name: user.full_name, 
        role: user.role, 
        phone: user.phone,
        must_change_password: user.must_change_password // ✅ لإجبار تغيير كلمة المرور
      } 
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

/**
 * تسجيل مستخدم جديد
 */
exports.register = async (req, res) => {
  try {
    const { full_name, phone, email, password } = req.body;
    if (!full_name || !phone || !password) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });

    const [existing] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone.trim()]);
    if (existing.length > 0) return res.status(409).json({ error: 'رقم الجوال مسجل مسبقاً' });

    const password_hash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const username = `user_${phone.trim()}`;

    await pool.query(
      `INSERT INTO users (id, username, full_name, phone, email, password_hash, role, is_active, must_change_password, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'member', 1, 0, NOW(), NOW())`, // ✅ must_change_password = 0 للتسجيل العادي
      [id, username, full_name.trim(), phone.trim(), email?.trim() || null, password_hash]
    );

    console.log('✅ User registered:', full_name);
    res.status(201).json({ 
      message: 'تم إنشاء الحساب بنجاح', 
      user: { id, full_name, phone, email: email?.trim() || null, role: 'member' } 
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'فشل إنشاء الحساب: ' + err.message });
  }
};

/**
 * ✅ إعادة تعيين كلمة المرور (للمدير فقط)
 */
/**
 * ✅ إعادة تعيين كلمة المرور (للمدير فقط)
 */
exports.resetPassword = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { admin_id } = req.body;

    // كلمة المرور الافتراضية
    const defaultPassword = '000000';
    const password_hash = await bcrypt.hash(defaultPassword, 12);

    // ✅ إعادة تعيين كلمة المرور
    await pool.query(
      `UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = NOW() WHERE id = ?`,
      [password_hash, user_id]
    );

    // ✅ تسجيل العملية (اختياري - لا يوقف العملية إذا فشل)
    try {
      await pool.query(
        `INSERT INTO user_sessions (id, user_id, user_name, action, ip_address, created_at) 
         VALUES (?, ?, ?, 'logout', 'password_reset_by_admin', NOW())`,
        [uuidv4(), user_id, admin_id || 'system']
      );
    } catch (logErr) {
      // تجاهل الخطأ - العملية الرئيسية نجحت
      console.warn('⚠️ Failed to log password reset:', logErr.message);
    }

    console.log(`✅ Password reset for user ${user_id}`);
    res.json({ 
      message: '✅ تم إعادة تعيين كلمة المرور إلى 000000',
      default_password: defaultPassword
    });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ error: 'فشل إعادة تعيين كلمة المرور' });
  }
};

/**
 * ✅ تغيير كلمة المرور (لأي مستخدم)
 */
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user_id = req.user.id;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    // جلب كلمة المرور الحالية للتحقق
    const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const validPassword = await bcrypt.compare(current_password, users[0].password_hash);
    if (!validPassword) return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });

    // تشفير كلمة المرور الجديدة وتحديثها
    const new_password_hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE id = ?`,
      [new_password_hash, user_id]
    );

    console.log('✅ Password changed for user:', user_id);
    res.json({ message: '✅ تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error('❌ Change password error:', err);
    res.status(500).json({ error: 'فشل تغيير كلمة المرور' });
  }
};

/**
 * جلب بيانات المستخدم الحالي
 */
exports.getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, full_name, phone, email, role, is_active, must_change_password, created_at, last_login FROM users WHERE id = ?', 
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    const user = users[0];
    const responseUser = {
      id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      created_at: user.created_at,
      last_login: user.last_login
    };
    
    if (user.role === 'admin') {
      responseUser.email = user.email;
    }
    
    res.json({ user: responseUser });
  } catch (err) {
    console.error('❌ GetMe error:', err);
    res.status(500).json({ error: 'فشل جلب البيانات' });
  }
};