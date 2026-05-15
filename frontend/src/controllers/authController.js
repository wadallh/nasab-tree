const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

/**
 * تسجيل مستخدم جديد (يستخدمه المدير عادة لإضافة الأعضاء)
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, full_name, phone, role = 'member' } = req.body;
    if (!username || !email || !full_name || !phone) {
      return res.status(400).json({ error: 'اسم المستخدم، البريد، الاسم الكامل ورقم الجوال مطلوبة' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'اسم المستخدم أو البريد موجود مسبقاً' });
    }

    // تشفير كلمة المرور إن وجدت، أو وضع null إذا لم تُرسل
    const password_hash = password ? await bcrypt.hash(password, 12) : null;
    const id = uuidv4();

    await pool.query(
      'INSERT INTO users (id, username, email, password_hash, full_name, phone, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())',
      [id, username, email, password_hash, full_name, phone, role]
    );

    res.status(201).json({ 
      message: 'تم إنشاء الحساب بنجاح', 
      user: { id, username, email, full_name, role } 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'فشل التسجيل في قاعدة البيانات' });
  }
};

/**
 * تسجيل الدخول (الاسم الكامل + رقم الجوال)
 */
exports.login = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
console.log('🟢 تم استلام طلب دخول جديد:', full_name, phone);

    // 1. التحقق من وجود البيانات
    if (!full_name || !phone) {
      return res.status(400).json({ error: 'الاسم الكامل ورقم الجوال مطلوبان' });
    }

    // 2. التحقق من صيغة الرقم اليمني
    const phoneRegex = /^(77|78|71|73|70)\d{7}$/;
    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({ error: 'رقم الجوال غير صالح. يجب أن يبدأ بـ 70، 71، 73، 77، أو 78 ويتكون من 10 أرقام' });
    }

    // 3. البحث في قاعدة البيانات
    const [users] = await pool.query(
      'SELECT id, full_name, phone, role, is_active FROM users WHERE full_name = ? AND phone = ?',
      [full_name.trim(), phone.trim()]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير مسجل مسبقاً. تواصل مع المدير لإضافة بياناتك.' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'هذا الحساب معطل حالياً. تواصل مع المسؤول.' });
    }

    // 4. إنشاء التوكن (JWT)
    const token = jwt.sign(
      { 
        id: user.id, 
        full_name: user.full_name, 
        role: user.role, 
        phone: user.phone 
      },
      process.env.JWT_SECRET || 'secure_jwt_secret_key_change_in_prod',
      { expiresIn: '7d' }
    );

    // 5. تحديث وقت آخر دخول
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // 6. إرجاع الاستجابة الناجحة
    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { 
        id: user.id, 
        full_name: user.full_name, 
        role: user.role, 
        phone: user.phone 
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي أثناء تسجيل الدخول' });
  }
};

/**
 * جلب بيانات المستخدم الحالي من التوكن
 */
exports.getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, full_name, phone, role, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    res.json({ user: users[0] });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ error: 'فشل جلب بيانات المستخدم' });
  }
};