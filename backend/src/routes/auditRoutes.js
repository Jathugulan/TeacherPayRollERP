const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);
router.use(authorize(ROLES.ADMIN));

router.get('/', getAuditLogs);

module.exports = router;
