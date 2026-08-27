const express = require('express');
const router = express.Router();
const {
  markAttendance,
  bulkMarkAttendance,
  getAttendance,
  getAttendanceById,
  deleteAttendance,
  getAttendanceHistory,
  getTodayAttendance,
  getAttendanceSummary,
  getTeacherAttendance,
  updateAttendance,
  lockAttendanceDate
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

// Lock date attendance — Admin only
router.post('/lock', authorize(ROLES.ADMIN), lockAttendanceDate);

// Mark / bulk mark attendance — Admin only
router.post('/bulk', authorize(ROLES.ADMIN), bulkMarkAttendance);
router.post('/', authorize(ROLES.ADMIN), markAttendance);

// Specific summary & history endpoints
router.get('/today', authorize(ROLES.ADMIN), getTodayAttendance);
router.get('/summary', authorize(ROLES.ADMIN), getAttendanceSummary);
router.get('/history/:teacherId', authorize(ROLES.ADMIN, ROLES.TEACHER), getAttendanceHistory);
router.get('/teacher/:teacherId', authorize(ROLES.ADMIN, ROLES.TEACHER), getTeacherAttendance);

// General attendance query
router.get('/', authorize(ROLES.ADMIN, ROLES.TEACHER), getAttendance);

// Single record endpoints
router.get('/:id', authorize(ROLES.ADMIN, ROLES.TEACHER), getAttendanceById);
router.put('/:id', authorize(ROLES.ADMIN), updateAttendance);
router.delete('/:id', authorize(ROLES.ADMIN), deleteAttendance);

module.exports = router;
