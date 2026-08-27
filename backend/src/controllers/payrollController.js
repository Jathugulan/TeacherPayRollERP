const {
  openPayrollPeriod,
  calculatePayrollPeriod,
  approvePayrollPeriod,
  lockPayrollPeriod,
  getPayrollPeriodStatus,
  listPayrollPeriods,
  getOrCreatePayrollPeriod
} = require('../services/payrollService');
const { logAction } = require('../services/auditService');
const { AUDIT_ACTION, AUDIT_MODULE } = require('../constants/salaryConfig');

/**
 * @desc    Open a payroll period
 * @route   POST /api/payroll/open
 * @access  Admin
 */
const openPeriod = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required.' });

    const period = await openPayrollPeriod(month, year, req.user._id);

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.PAYROLL_OPENED, module: AUDIT_MODULE.PAYROLL,
      recordId: period._id, description: `Payroll period ${month}/${year} opened`, req
    });

    res.status(200).json({ success: true, message: `Payroll period ${month}/${year} is now open.`, data: period });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Calculate/run payroll for all active teachers
 * @route   POST /api/payroll/calculate
 * @access  Admin
 */
const calculatePeriod = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required.' });

    const { period, payroll } = await calculatePayrollPeriod(month, year, req.user._id);

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.PAYROLL_CALCULATED, module: AUDIT_MODULE.PAYROLL,
      recordId: period._id,
      description: `Payroll calculated for ${month}/${year}: ${payroll.processedCount} teachers processed`,
      newData: { processedCount: payroll.processedCount, totalNetSalary: period.totalNetSalary }, req
    });

    res.status(200).json({
      success: true,
      message: `Payroll calculated for ${payroll.processedCount} teachers.`,
      data: { period, payroll }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve the payroll period (approves all teacher salaries)
 * @route   POST /api/payroll/approve
 * @access  Admin
 */
const approvePeriod = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required.' });

    const period = await approvePayrollPeriod(month, year, req.user._id);

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.PAYROLL_APPROVED, module: AUDIT_MODULE.PAYROLL,
      recordId: period._id, description: `Payroll period ${month}/${year} approved`, req
    });

    res.status(200).json({ success: true, message: `Payroll for ${month}/${year} approved.`, data: period });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lock the payroll period (prevents any further changes)
 * @route   POST /api/payroll/lock
 * @access  Admin
 */
const lockPeriod = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year are required.' });

    const period = await lockPayrollPeriod(month, year, req.user._id);

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.PAYROLL_LOCKED, module: AUDIT_MODULE.PAYROLL,
      recordId: period._id, description: `Payroll period ${month}/${year} LOCKED`, req
    });

    res.status(200).json({ success: true, message: `Payroll for ${month}/${year} is now locked.`, data: period });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all payroll periods
 * @route   GET /api/payroll
 * @access  Admin
 */
const getPeriods = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const { periods, total } = await listPayrollPeriods({ page, limit });
    res.status(200).json({
      success: true,
      data: { periods, total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payroll period status for a specific month/year
 * @route   GET /api/payroll/status?month=8&year=2026
 * @access  Admin
 */
const getPeriodStatus = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year query params required.' });

    const period = await getPayrollPeriodStatus(month, year);
    res.status(200).json({ success: true, data: period || null });
  } catch (error) {
    next(error);
  }
};

module.exports = { openPeriod, calculatePeriod, approvePeriod, lockPeriod, getPeriods, getPeriodStatus };
