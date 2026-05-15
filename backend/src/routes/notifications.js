const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// جلب إشعارات المستخدم
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [notifications] = await pool.query(
      `SELECT id, title, message, type, is_read, link, created_at 
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications });
  } catch (err) {
    console.error('❌ Get notifications error:', err);
    res.status(500).json({ error: 'فشل جلب الإشعارات' });
  }
});

// وضع علامة "مقروء" على إشعار
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'تم' });
  } catch (err) {
    res.status(500).json({ error: 'فشل التحديث' });
  }
});

// وضع علامة "مقروء" على الكل
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'تم' });
  } catch (err) {
    res.status(500).json({ error: 'فشل التحديث' });
  }
});

// حذف إشعار
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'تم الحذف' });
  } catch (err) {
    res.status(500).json({ error: 'فشل الحذف' });
  }
});

// ✅ دالة مساعدة لإنشاء إشعار (تُستخدم من وحدات أخرى)
router.createNotification = async (userId, title, message, type = 'info', link = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, type, link) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, title, message, type, link]
    );
  } catch (err) {
    console.error('❌ Create notification error:', err);
  }
};

module.exports = router;