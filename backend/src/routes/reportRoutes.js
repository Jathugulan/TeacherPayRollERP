const express = require('express');
const router = express.Router();
const {
  getAdminDashboardAnalytics,
  getMonthlyReport,
  getAttendanceReport,
  getPayrollReport,
  getTeacherReport,
  getLeaveReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);
router.use(authorize(ROLES.ADMIN));

router.get('/dashboard', getAdminDashboardAnalytics);
router.get('/monthly', getMonthlyReport);
router.get('/attendance', getAttendanceReport);
router.get('/payroll', getPayrollReport);
router.get('/teachers', getTeacherReport);
router.get('/leaves', getLeaveReport);

module.exports = router;
