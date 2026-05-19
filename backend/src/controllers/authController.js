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

    // ⚠️ مقارنة كلمة المرور
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