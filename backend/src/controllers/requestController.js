const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

exports.submitRequest = async (req, res) => {
  try {
    const { type: request_type, personData } = req.body;
    const requester_id = req.user.id;
    const requester_name = req.user.full_name;
    const tree_id = 1;

    if (!request_type || !['add', 'edit', 'delete'].includes(request_type)) {
      return res.status(400).json({ error: 'نوع الطلب غير صالح' });
    }

    if (!personData) {
      return res.status(400).json({ error: 'بيانات الشخص مطلوبة' });
    }

    const person_name = personData.full_name || '';
    const father_name = personData.father_name || '';
    let parent_id = personData.parent_id || null;

    const id = uuidv4();

    // ✅ إدخال الطلب في قاعدة البيانات
    await pool.query(
      `INSERT INTO pending_requests (
        id, requester_id, tree_id, request_type, person_data, 
        person_name, father_name, parent_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        requester_id,
        tree_id,
        request_type,
        JSON.stringify(personData),
        person_name,
        father_name,
        parent_id,
        'pending'
      ]
    );

    // ✅ إرسال إشعار للمديرين والمشرفين
    try {
      const [admins] = await pool.query(
        "SELECT id, full_name FROM users WHERE role IN ('admin', 'supervisor') AND is_active = 1"
      );

      const notificationTitle = '📥 طلب جديد';
      const notificationMessage = `تم إرسال طلب "${request_type === 'add' ? 'إضافة' : request_type === 'edit' ? 'تعديل' : 'حذف'}" من قبل ${requester_name}`;

      for (const admin of admins) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, title, message, type, link, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            uuidv4(),
            admin.id,
            notificationTitle,
            notificationMessage,
            'request',
            '/tree?tab=requests', // رابط لصفحة الطلبات
            new Date()
          ]
        );
      }
      console.log(`✅ Notification sent to ${admins.length} admin(s)`);
    } catch (notifErr) {
      // إذا فشل الإشعار، لا نوقف العملية الرئيسية
      console.error('⚠️ Failed to send notification:', notifErr.message);
    }

    res.status(201).json({ message: 'تم إرسال الطلب بنجاح', id });

  } catch (err) {
    console.error('❌ Submit request error:', err);
    res.status(500).json({ error: 'فشل إرسال الطلب: ' + err.message });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT pr.*, u.full_name as requester_name 
       FROM pending_requests pr 
       LEFT JOIN users u ON pr.requester_id = u.id 
       WHERE pr.status = "pending" 
       ORDER BY pr.created_at DESC`
    );
    
    // ✅ التصحيح: person_data مع النقطتين
    const formattedRequests = requests.map(r => ({
      ...r,
      person_data: typeof r.person_data === 'string' ? JSON.parse(r.person_data) : r.person_data
    }));
    
    res.json({ requests: formattedRequests });
  } catch (err) {
    console.error('❌ Get pending requests error:', err);
    res.status(500).json({ error: 'فشل جلب الطلبات' });
  }
};

exports.processRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, admin_note } = req.body;

    const [requests] = await pool.query('SELECT * FROM pending_requests WHERE id = ?', [id]);
    
    if (requests.length === 0) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    const request = requests[0];
    const personData = typeof request.person_data === 'string' 
      ? JSON.parse(request.person_data) 
      : request.person_data;

    if (action === 'approve') {
      if (request.request_type === 'add') {
        await pool.query(
          `INSERT INTO persons (id, first_name, full_name, father_name, status, parent_id, family_tree_id, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
          [uuidv4(), personData.first_name, personData.full_name, personData.father_name, personData.status || 'alive', personData.parent_id]
        );
      } else if (request.request_type === 'edit') {
        await pool.query(
          `UPDATE persons SET full_name = ?, status = ?, updated_at = NOW() WHERE id = ?`,
          [personData.full_name, personData.status, personData.id]
        );
      } else if (request.request_type === 'delete') {
        await pool.query('DELETE FROM persons WHERE id = ?', [personData.id]);
      }

      await pool.query(
        'UPDATE pending_requests SET status = "approved", admin_note = ?, reviewed_at = NOW() WHERE id = ?',
        [admin_note || null, id]
      );

      res.json({ message: '✅ تمت الموافقة وتنفيذ الطلب بنجاح' });
    } else {
      await pool.query(
        'UPDATE pending_requests SET status = "rejected", admin_note = ?, reviewed_at = NOW() WHERE id = ?',
        [admin_note || null, id]
      );
      res.json({ message: '❌ تم رفض الطلب' });
    }

  } catch (err) {
    console.error('❌ Process request error:', err);
    res.status(500).json({ error: 'فشل معالجة الطلب: ' + err.message });
  }
};