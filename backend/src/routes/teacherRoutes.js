const express = require('express');
const router = express.Router();
const {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  getMyTeacherProfile,
  updateTeacher,
  updateTeacherStatus,
  bulkUpdateStatus,
  deleteTeacher,
  getTeacherTimeline,
  getTeacherStatistics
} = require('../controllers/teacherController');
const { getTeacherAttendance } = require('../controllers/attendanceController');
const { getTeacherSalaryHistory } = require('../controllers/salaryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

// Teacher own profile
router.get('/me/profile', authorize(ROLES.TEACHER), getMyTeacherProfile);

// Bulk & Single status updates — Admin only
router.patch('/bulk-status', authorize(ROLES.ADMIN), bulkUpdateStatus);
router.patch('/status/:id', authorize(ROLES.ADMIN), updateTeacherStatus);
router.patch('/:id/status', authorize(ROLES.ADMIN), updateTeacherStatus);

// Management — Admin only for creation
router.post('/', authorize(ROLES.ADMIN), createTeacher);
router.get('/', authorize(ROLES.ADMIN, ROLES.TEACHER), getAllTeachers);

// Single teacher sub-resources
router.get('/:id/statistics', authorize(ROLES.ADMIN, ROLES.TEACHER), getTeacherStatistics);
router.get('/:id/timeline', authorize(ROLES.ADMIN, ROLES.TEACHER), getTeacherTimeline);
router.get('/:id/attendance', authorize(ROLES.ADMIN, ROLES.TEACHER), getTeacherAttendance);
router.get('/:id/salary', authorize(ROLES.ADMIN, ROLES.TEACHER), getTeacherSalaryHistory);

// Single teacher CRUD
router.get('/:id', authorize(ROLES.ADMIN, ROLES.TEACHER), getTeacherById);
router.put('/:id', authorize(ROLES.ADMIN), updateTeacher);
router.delete('/:id', authorize(ROLES.ADMIN), deleteTeacher);

module.exports = router;
