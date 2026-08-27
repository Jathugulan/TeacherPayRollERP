const express = require('express');
const router = express.Router();
const {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday
} = require('../controllers/holidayController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

// All routes require authentication
router.use(protect);

router
  .route('/')
  .get(getHolidays) // Admin + Teacher can view holidays
  .post(authorize(ROLES.ADMIN), createHoliday);

router
  .route('/:id')
  .put(authorize(ROLES.ADMIN), updateHoliday)
  .delete(authorize(ROLES.ADMIN), deleteHoliday);

module.exports = router;
