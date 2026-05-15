const express = require('express');
const router = express.Router();
const treeController = require('../controllers/treeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', treeController.getFamilyTree);
router.post('/persons', authenticateToken, authorizeRoles('admin', 'supervisor'), treeController.addPersonDirect);
router.patch('/persons/:id', authenticateToken, authorizeRoles('admin', 'supervisor'), treeController.updatePersonDirect); // ✅ جديد
router.patch('/persons/:id/status', authenticateToken, authorizeRoles('admin', 'supervisor'), treeController.updateStatusDirect);
router.delete('/persons/:id', authenticateToken, authorizeRoles('admin'), treeController.deletePersonDirect);

module.exports = router;