const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../db');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// مجلد حفظ النسخ
const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ✅ إنشاء نسخة احتياطية يدوية
router.post('/create', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const dbName = process.env.DB_NAME || 'nasab_db';
    const dbUser = process.env.DB_USER || 'root';
    const dbPass = process.env.DB_PASSWORD || '';
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.DB_PORT || '3306';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `nasab_backup_${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, fileName);

    // أمر mysqldump
    const dumpCommand = `mysqldump -h${dbHost} -P${dbPort} -u${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} > "${filePath}"`;

    exec(dumpCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Backup error:', error);
        return res.status(500).json({ error: 'فشل إنشاء النسخة: ' + error.message });
      }

      // ضغط الملف (اختياري)
      // يمكن إضافة gzip هنا إذا أردت

      res.json({ 
        message: '✅ تم إنشاء النسخة الاحتياطية بنجاح', 
        file: fileName,
        size: fs.statSync(filePath).size,
        downloadUrl: `/api/backup/download/${fileName}`
      });
    });

  } catch (err) {
    console.error('❌ Backup route error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ✅ تحميل نسخة احتياطية
router.get('/download/:filename', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'الملف غير موجود' });
    }

    res.download(filePath, filename);
  } catch (err) {
    res.status(500).json({ error: 'فشل التحميل' });
  }
});

// ✅ قائمة النسخ الاحتياطية
router.get('/list', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          size: stats.size,
          created: stats.birthtime,
          downloadUrl: `/api/backup/download/${f}`
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({ backups: files });
  } catch (err) {
    res.status(500).json({ error: 'فشل جلب القائمة' });
  }
});

// ✅ حذف نسخة احتياطية
router.delete('/:filename', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'الملف غير موجود' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: '✅ تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'فشل الحذف' });
  }
});

// ✅ جدولة نسخ احتياطي يومي تلقائي (3 صباحاً)
cron.schedule('0 3 * * *', async () => {
  console.log('🔄 Starting scheduled backup...');
  
  const dbName = process.env.DB_NAME || 'nasab_db';
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASSWORD || '';
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = process.env.DB_PORT || '3306';

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `nasab_auto_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  const dumpCommand = `mysqldump -h${dbHost} -P${dbPort} -u${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} > "${filePath}"`;

  exec(dumpCommand, (error) => {
    if (error) {
      console.error('❌ Scheduled backup failed:', error);
    } else {
      console.log('✅ Scheduled backup completed:', fileName);
      
      // حذف النسخ الأقدم من 7 أيام (تنظيف تلقائي)
      cleanupOldBackups();
    }
  });
});

// تنظيف النسخ القديمة
function cleanupOldBackups(days = 7) {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'));
  const now = Date.now();
  const maxAge = days * 24 * 60 * 60 * 1000;

  files.forEach(f => {
    const filePath = path.join(BACKUP_DIR, f);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Deleted old backup:', f);
    }
  });
}

module.exports = router;