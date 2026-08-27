const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveSummary,
  getMyLeaves,
  getTeacherLeaves,
  updateLeaveStatus,
  updateLeave,
  deleteLeave
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

// Teacher self leave
router.get('/me', authorize(ROLES.TEACHER), getMyLeaves);

// Leave summary quota — Admin and Teacher (own)
router.get('/summary/:teacherId', authorize(ROLES.ADMIN, ROLES.TEACHER), getLeaveSummary);
router.get('/teacher/:teacherId', authorize(ROLES.ADMIN, ROLES.TEACHER), getTeacherLeaves);

// Approve / Reject / Cancel actions
router.patch('/approve/:id', authorize(ROLES.ADMIN), approveLeave);
router.patch('/:id/approve', authorize(ROLES.ADMIN), approveLeave);
router.patch('/reject/:id', authorize(ROLES.ADMIN), rejectLeave);
router.patch('/:id/reject', authorize(ROLES.ADMIN), rejectLeave);
router.patch('/:id/cancel', authorize(ROLES.ADMIN, ROLES.TEACHER), cancelLeave);
router.put('/:id/status', authorize(ROLES.ADMIN), updateLeaveStatus);

// General leave routes
router.post('/', authorize(ROLES.ADMIN, ROLES.TEACHER), applyLeave);
router.get('/', authorize(ROLES.ADMIN), getAllLeaves);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.TEACHER), updateLeave);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.TEACHER), deleteLeave);

module.exports = router;
