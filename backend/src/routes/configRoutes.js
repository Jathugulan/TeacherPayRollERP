const express = require('express');
const router = express.Router();
const {
  getAllConfigs,
  updateConfig,
  bulkUpdateConfigs
} = require('../controllers/configController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

// Teachers can view configs (e.g. institution name, weekend days)
router.get('/', getAllConfigs);

// Admin can modify
router.put('/:key', authorize(ROLES.ADMIN), updateConfig);
router.post('/bulk', authorize(ROLES.ADMIN), bulkUpdateConfigs);

module.exports = router;
