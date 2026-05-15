const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// ✅ تسجيل جلسة دخول/خروج
router.post('/log', async (req, res) => {
  try {
    const { user_id, user_email, user_name, action, ip_address, user_agent } = req.body;
    
    await pool.query(
      `INSERT INTO user_sessions (id, user_id, user_email, user_name, action, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), user_id, user_email || null, user_name, action, ip_address || null, user_agent || null]
    );
    
    res.json({ message: 'تم التسجيل' });
  } catch (err) {
    console.error('❌ Session log error:', err);
    res.status(500).json({ error: 'فشل التسجيل' });
  }
});

// ✅ جلب سجل الجلسات (للمدير فقط)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [sessions] = await pool.query(
      `SELECT s.*, u.phone, u.role 
       FROM user_sessions s 
       LEFT JOIN users u ON s.user_id = u.id 
       ORDER BY s.created_at DESC 
       LIMIT 100`
    );
    res.json({ sessions });
  } catch (err) {
    console.error('❌ Get sessions error:', err);
    res.status(500).json({ error: 'فشل جلب السجل' });
  }
});

module.exports = router;