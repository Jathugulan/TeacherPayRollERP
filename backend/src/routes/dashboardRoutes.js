const express = require('express');
const router = express.Router();
const {
  getDashboardOverview,
  getDashboardStats,
  getAdminDashboard,
  getTeacherDashboard
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

router.get('/admin', authorize(ROLES.ADMIN), getAdminDashboard);
router.get('/teacher', authorize(ROLES.TEACHER, ROLES.ADMIN), getTeacherDashboard);
router.get('/overview', authorize(ROLES.ADMIN), getDashboardOverview);
router.get('/stats', authorize(ROLES.ADMIN), getDashboardStats);

module.exports = router;

