const express = require('express');
const router = express.Router();
const {
  openPeriod,
  calculatePeriod,
  approvePeriod,
  lockPeriod,
  getPeriods,
  getPeriodStatus
} = require('../controllers/payrollController');
const {
  generateSalary,
  generateAllSalaries,
  getTeacherSalaryHistory,
  getSalarySlip,
  getAllSalaryReports
} = require('../controllers/salaryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(protect);

// 1. Period lifecycle routes (Admin)
router.get('/status', authorize(ROLES.ADMIN), getPeriodStatus);
router.post('/open', authorize(ROLES.ADMIN), openPeriod);
router.post('/calculate', authorize(ROLES.ADMIN), calculatePeriod);
router.post('/approve', authorize(ROLES.ADMIN), approvePeriod);
router.post('/lock', authorize(ROLES.ADMIN), lockPeriod);

// 2. Generate payroll (single or batch)
router.post('/generate', authorize(ROLES.ADMIN), (req, res, next) => {
  if (req.body.teacherId) {
    return generateSalary(req, res, next);
  }
  return generateAllSalaries(req, res, next);
});

// 3. Salary Slip PDF / Data retrieval
router.get('/slip/:teacherId/:month', authorize(ROLES.ADMIN, ROLES.TEACHER), getSalarySlip);

// 4. Specific teacher payroll history
router.get('/:teacherId', authorize(ROLES.ADMIN, ROLES.TEACHER), (req, res, next) => {
  if (['periods', 'status'].includes(req.params.teacherId)) {
    return next();
  }
  return getTeacherSalaryHistory(req, res, next);
});

// 5. Get all payrolls / periods
router.get('/', authorize(ROLES.ADMIN), (req, res, next) => {
  if (req.query.view === 'periods') {
    return getPeriods(req, res, next);
  }
  return getAllSalaryReports(req, res, next);
});

module.exports = router;
