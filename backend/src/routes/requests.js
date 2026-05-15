const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticateToken } = require('../middleware/auth');

router.post('/submit', authenticateToken, requestController.submitRequest);
router.get('/pending', authenticateToken, requestController.getPendingRequests);
router.patch('/:id/process', authenticateToken, requestController.processRequest);

module.exports = router;