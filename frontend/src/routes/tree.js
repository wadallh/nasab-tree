const express = require('express');
const router = express.Router();
const treeController = require('../controllers/treeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', authenticateToken, treeController.getFamilyTree);
router.post('/persons', authenticateToken, authorizeRoles('admin', 'supervisor'), treeController.addPersonDirect);
router.patch('/persons/:personId/status', authenticateToken, authorizeRoles('admin', 'supervisor'), treeController.updatePersonStatusDirect);
router.delete('/persons/:personId', authenticateToken, authorizeRoles('admin'), treeController.deletePersonDirect);

module.exports = router;