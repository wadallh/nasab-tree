// backend/src/controllers/treeController.js
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

// =========================
// 🌳 جلب الشجرة العائلية
// =========================
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

// =========================
// 👤 إضافة شخص مباشر
// =========================
exports.addPersonDirect = async (req, res) => {
  try {
    const { first_name, full_name, father_name, status, birth_date, death_date, bio, parent_id, family_tree_id } = req.body;
    const added_by = req.user?.id || null;
    const id = uuidv4();

    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    await pool.query(
      `INSERT INTO persons (id, first_name, full_name, father_name, status, birth_date, death_date, bio, parent_id, family_tree_id, added_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, 
        first_name?.trim(), 
        full_name?.trim(), 
        father_name?.trim(), 
        status || 'alive', 
        formatDate(birth_date), 
        formatDate(death_date), 
        bio?.trim() || null, 
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

// =========================
// ✏️ تحديث بيانات شخص (كامل)
// =========================
exports.updatePersonDirect = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, status, birth_date, death_date, bio } = req.body;

    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    const [result] = await pool.query(
      `UPDATE persons SET 
        full_name = ?, 
        status = ?, 
        birth_date = ?, 
        death_date = ?, 
        bio = ?, 
        updated_at = NOW() 
       WHERE id = ?`,
      [
        full_name?.trim(), 
        status, 
        formatDate(birth_date), 
        formatDate(death_date), 
        bio?.trim() || null, 
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'الشخص غير موجود' });
    }

    console.log('✅ Person updated successfully:', id);
    res.json({ message: 'تم التحديث بنجاح' });
  } catch (err) {
    console.error('❌ Update Person Error:', err);
    res.status(500).json({ error: 'فشل التحديث: ' + err.message });
  }
};

// =========================
// 🔄 تحديث حالة شخص فقط (✅ تم تعديل الاسم ليطابق الـ Route)
// =========================
// ⚠️ هذا هو التعديل الحاسم: تغيير الاسم من updateStatusDirect إلى updatePersonStatusDirect
exports.updatePersonStatusDirect = async (req, res) => {
  try {
    const { personId } = req.params; // ✅ ملاحظة: الـ Route يستخدم personId وليس id
    const { status } = req.body;
    
    // التحقق من صحة الحالة
    if (!status || !['alive', 'deceased', 'martyr'].includes(status)) {
      return res.status(400).json({ error: 'حالة غير صالحة. القيم المسموحة: alive, deceased, martyr' });
    }
    
    const [result] = await pool.query(
      'UPDATE persons SET status = ?, updated_at = NOW() WHERE id = ?', 
      [status, personId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'الشخص غير موجود' });
    }
    
    console.log('✅ Status updated successfully:', personId);
    res.json({ message: 'تم تحديث الحالة بنجاح' });
  } catch (err) {
    console.error('❌ Update Status Error:', err);
    res.status(500).json({ error: 'فشل تحديث الحالة: ' + err.message });
  }
};

// =========================
// 🗑️ حذف شخص
// =========================
exports.deletePersonDirect = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ⚠️ تحقق اختياري: هل الشخص له أبناء؟ (يمكن تفعيله لاحقاً)
    // const [children] = await pool.query('SELECT id FROM persons WHERE parent_id = ?', [id]);
    // if (children.length > 0) {
    //   return res.status(400).json({ error: 'لا يمكن حذف شخص لديه أبناء' });
    // }
    
    const [result] = await pool.query('DELETE FROM persons WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'الشخص غير موجود' });
    }
    
    console.log('✅ Person deleted successfully:', id);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) {
    console.error('❌ Delete Person Error:', err);
    res.status(500).json({ error: 'فشل حذف الفرد: ' + err.message });
  }
};

// =========================
// 🔗 Alias للتوافق مع الأسماء القديمة (اختياري)
// =========================
// هذا السطر يضمن أن أي كود قديم يستخدم الاسم القديم لا ينكسر
// يمكنك حذفه إذا كنت متأكداً أن كل الكود يستخدم الأسماء الجديدة
// exports.updateStatusDirect = exports.updatePersonStatusDirect;