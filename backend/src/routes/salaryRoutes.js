const express = require('express');
const router = express.Router();
const {
  calculateSalaryPreview,
  generateSalary,
  generateAllSalaries,
  getAllSalaryReports,
  getSalarySummary,
  getMySalaryHistory,
  getTeacherSalaryHistory,
  approveSalary,
  markSalaryPaid,
  updateSalaryStatus
} = require('../controllers/salaryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

// Teacher self salary history
router.get('/me', authorize(ROLES.TEACHER), getMySalaryHistory);

// Salary preview — Admin full access; Teacher can view their own only (enforced in controller)
router.get('/calculate/:teacherId', authorize(ROLES.ADMIN, ROLES.TEACHER), calculateSalaryPreview);
router.get('/preview', authorize(ROLES.ADMIN), calculateSalaryPreview);
router.post('/preview', authorize(ROLES.ADMIN), calculateSalaryPreview);
router.get('/summary', authorize(ROLES.ADMIN), getSalarySummary);
router.get('/teacher/:teacherId', authorize(ROLES.ADMIN, ROLES.TEACHER), getTeacherSalaryHistory);

router.post('/generate', authorize(ROLES.ADMIN), generateSalary);
router.post('/generate-all', authorize(ROLES.ADMIN), generateAllSalaries);

// Individual salary lifecycle actions — Admin only
router.patch('/:id/approve', authorize(ROLES.ADMIN), approveSalary);
router.patch('/:id/pay', authorize(ROLES.ADMIN), markSalaryPaid);
router.put('/:id/status', authorize(ROLES.ADMIN), updateSalaryStatus);

// General salary records — Admin only
router.get('/', authorize(ROLES.ADMIN), getAllSalaryReports);

module.exports = router;
