// ✅ هذا الملف مثالي ولا يحتاج تعديل
// المسار المقترح: backend/routes/tree.js

const express = require('express');
const router = express.Router();
const treeController = require('../controllers/treeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// ✅ جميع المسارات صحيحة وتبدأ من /api/tree (لأنها مجهزة في الباك-إند)
router.get('/', authenticateToken, treeController.getFamilyTree);

router.post('/persons', authenticateToken, authorizeRoles('admin', 'supervisor'), treeController.addPersonDirect);

router.patch('/persons/:personId/status', authenticateToken, authorizeRoles('admin', 'supervisor'), treeController.updatePersonStatusDirect);

router.delete('/persons/:personId', authenticateToken, authorizeRoles('admin'), treeController.deletePersonDirect);

module.exports = router;