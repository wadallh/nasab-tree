const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../db');

// ✅ جلب جميع المستخدمين (للمدير فقط)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, username, full_name, phone, email, role, is_active, created_at, last_login 
       FROM users 
       ORDER BY created_at DESC`
    );
    res.json({ users });
  } catch (err) {
    console.error('❌ Get users error:', err);
    res.status(500).json({ error: 'فشل جلب المستخدمين' });
  }
});

// ✅ ترقية مستخدم إلى مشرف
router.patch('/:id/promote', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE users SET role = 'supervisor' WHERE id = ? AND role = 'member'",
      [id]
    );
    res.json({ message: '✅ تمت الترقية إلى مشرف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل الترقية' });
  }
});

// ✅ إزالة صلاحية المشرف (ت downgrade إلى عضو)
router.patch('/:id/demote', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE users SET role = 'member' WHERE id = ? AND role = 'supervisor'",
      [id]
    );
    res.json({ message: '✅ تمت إزالة صلاحية المشرف' });
  } catch (err) {
    res.status(500).json({ error: 'فشل التعديل' });
  }
});

// ✅ تفعيل/تعطيل حساب مستخدم
router.patch('/:id/toggle-status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    );
    res.json({ message: is_active ? '✅ تم تفعيل الحساب' : '⚠️ تم تعطيل الحساب' });
  } catch (err) {
    res.status(500).json({ error: 'فشل التعديل' });
  }
});

module.exports = router;