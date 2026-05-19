const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

/**
 * LOGIN
 */
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password)
      return res.status(400).json({ error: 'phone & password required' });

    const [users] = await pool.query(
      'SELECT id, name, phone, password FROM users WHERE phone = ?',
      [phone.trim()]
    );

    if (users.length === 0)
      return res.status(404).json({ error: 'User not found' });

    const user = users[0];

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid)
      return res.status(401).json({ error: 'Wrong password' });

    const token = jwt.sign(
      { id: user.id, name: user.name, phone: user.phone },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * REGISTER
 */
exports.register = async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password)
      return res.status(400).json({ error: 'missing fields' });

    const [exist] = await pool.query(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );

    if (exist.length > 0)
      return res.status(409).json({ error: 'Phone already exists' });

    const hash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await pool.query(
      'INSERT INTO users (id, name, phone, password, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, name, phone, hash]
    );

    res.status(201).json({ message: 'User created' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /me - جلب بيانات المستخدم الحالي ✅ جديد
 */
exports.getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (rows.length === 0)
      return res.status(404).json({ error: 'User not found' });
      
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /change-password - تغيير كلمة المرور ✅ جديد
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Current and new password required' });
    
    const [users] = await pool.query(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0)
      return res.status(404).json({ error: 'User not found' });
    
    const isValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValid)
      return res.status(401).json({ error: 'Current password is wrong' });
    
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hash, req.user.id]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /reset-password/:user_id - إعادة تعيين كلمة المرور (للمسؤولين) ✅ جديد
 */
exports.resetPassword = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword)
      return res.status(400).json({ error: 'New password required' });
    
    const hash = await bcrypt.hash(newPassword, 12);
    
    await pool.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hash, user_id]
    );
    
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};