const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

exports.getFamilyTree = async (req, res) => {
  try {
    const [persons] = await pool.query(
      'SELECT id, first_name, full_name, father_name, status, birth_date, death_date, bio, parent_id, family_tree_id, added_by, created_at FROM persons ORDER BY birth_date ASC, full_name ASC'
    );
    res.json({ persons });
  } catch (err) {
    console.error('❌ Get Tree Error:', err);
    res.status(500).json({ error: 'فشل جلب بيانات الشجرة' });
  }
};

exports.addPersonDirect = async (req, res) => {
  try {
    const { first_name, full_name, father_name, status, birth_date, death_date, bio, parent_id, family_tree_id } = req.body;
    const added_by = req.user?.id || null;
    const id = uuidv4();

    const formatDate = (date) => {
      if (!date) return null;
      return date.split('T')[0];
    };

    await pool.query(
      `INSERT INTO persons (id, first_name, full_name, father_name, status, birth_date, death_date, bio, parent_id, family_tree_id, added_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, 
        first_name, 
        full_name, 
        father_name, 
        status || 'alive', 
        formatDate(birth_date), 
        formatDate(death_date), 
        bio || null, 
        parent_id || null, 
        family_tree_id || 1, 
        added_by
      ]
    );

    console.log('✅ Person added successfully:', id);
    res.status(201).json({ message: 'تمت الإضافة بنجاح', id });
  } catch (err) {
    console.error('❌ Add Person Error:', err);
    res.status(500).json({ error: 'فشل إضافة الفرد: ' + err.message });
  }
};

exports.updatePersonDirect = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, status, birth_date, death_date, bio } = req.body;

    const formatDate = (date) => {
      if (!date) return null;
      return date.split('T')[0];
    };

    await pool.query(
      `UPDATE persons SET 
        full_name = ?, 
        status = ?, 
        birth_date = ?, 
        death_date = ?, 
        bio = ?, 
        updated_at = NOW() 
       WHERE id = ?`,
      [
        full_name, 
        status, 
        formatDate(birth_date), 
        formatDate(death_date), 
        bio || null, 
        id
      ]
    );

    console.log('✅ Person updated successfully:', id);
    res.json({ message: 'تم التحديث بنجاح' });
  } catch (err) {
    console.error('❌ Update Person Error:', err);
    res.status(500).json({ error: 'فشل التحديث: ' + err.message });
  }
};

exports.updateStatusDirect = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['alive', 'deceased', 'martyr'].includes(status)) {
      return res.status(400).json({ error: 'حالة غير صالحة' });
    }
    await pool.query('UPDATE persons SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
    res.json({ message: 'تم التحديث بنجاح' });
  } catch (err) {
    console.error('❌ Update Status Error:', err);
    res.status(500).json({ error: 'فشل تحديث الحالة' });
  }
};

exports.deletePersonDirect = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM persons WHERE id = ?', [id]);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) {
    console.error('❌ Delete Person Error:', err);
    res.status(500).json({ error: 'فشل حذف الفرد' });
  }
};