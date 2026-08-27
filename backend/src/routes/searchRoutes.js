const express = require('express');
const router = express.Router();
const { searchERP } = require('../controllers/searchController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');

router.use(authenticate);
router.get('/', authorize(ROLES.ADMIN), searchERP);

module.exports = router;

