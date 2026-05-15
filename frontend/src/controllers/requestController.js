const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

exports.submitRequest = async (req, res) => {
  try {
    const { type, personData } = req.body;
    if (!['add', 'edit', 'delete'].includes(type)) return res.status(400).json({ error: 'نوع الطلب غير صالح' });
    const id = uuidv4();
    await pool.query('INSERT INTO pending_requests (id, requester_id, tree_id, request_type, person_data) VALUES (?, ?, 1, ?, ?)', [id, req.user.id, type, JSON.stringify(personData)]);
    res.status(201).json({ message: 'تم إرسال الطلب للموافقة بنجاح', requestId: id });
  } catch (err) {
    console.error('Submit request error:', err);
    res.status(500).json({ error: 'فشل إرسال الطلب' });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const [requests] = await pool.query(`SELECT pr.*, u.full_name as requester_name FROM pending_requests pr JOIN users u ON pr.requester_id = u.id WHERE pr.status = 'pending' ORDER BY pr.created_at DESC`);
    res.json({ requests });
  } catch (err) {
    console.error('Get pending error:', err);
    res.status(500).json({ error: 'فشل جلب الطلبات المعلقة' });
  }
};

exports.processRequest = async (req, res) => {
  const { requestId } = req.params;
  const { action, admin_note } = req.body;
  try {
    const [reqs] = await pool.query('SELECT * FROM pending_requests WHERE id = ? AND status = "pending"', [requestId]);
    if (reqs.length === 0) return res.status(404).json({ error: 'الطلب غير موجود أو تمت معالجته مسبقاً' });

    const request = reqs[0];
    const data = JSON.parse(request.person_data);
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      if (action === 'approve') {
        if (request.request_type === 'add') {
          await connection.query('INSERT INTO persons (id, first_name, full_name, father_name, status, birth_date, parent_id, family_tree_id, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)', [uuidv4(), data.first_name, data.full_name, data.father_name || '', data.status || 'alive', data.birth_date || null, data.parent_id || null, req.user.id]);
        } else if (request.request_type === 'edit') {
          await connection.query('UPDATE persons SET status = ? WHERE id = ?', [data.status, data.id]);
        } else if (request.request_type === 'delete') {
          const [children] = await connection.query('SELECT id FROM persons WHERE parent_id = ?', [data.id]);
          if (children.length > 0) throw new Error('لا يمكن حذف شخص لديه أبناء.');
          await connection.query('DELETE FROM persons WHERE id = ?', [data.id]);
        }
        await connection.query('UPDATE pending_requests SET status = "approved", admin_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?', [admin_note || null, req.user.id, requestId]);
      } else if (action === 'reject') {
        await connection.query('UPDATE pending_requests SET status = "rejected", admin_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?', [admin_note || 'مرفوض', req.user.id, requestId]);
      } else {
        throw new Error('إجراء غير صالح');
      }
      await connection.commit();
      res.json({ message: action === 'approve' ? 'تمت الموافقة على الطلب وتنفيذه' : 'تم رفض الطلب' });
    } catch (dbErr) {
      await connection.rollback();
      throw dbErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Process request error:', err);
    res.status(500).json({ error: err.message || 'فشلت معالجة الطلب' });
  }
};