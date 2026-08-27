const PayrollPeriod = require('../models/PayrollPeriod');
const { generateMonthlyPayroll } = require('./salaryService');
const { PAYROLL_STATUS } = require('../constants/salaryConfig');
const Salary = require('../models/Salary');

/**
 * Get or create the payroll period record for a given month/year.
 */
const getOrCreatePayrollPeriod = async (month, year) => {
  const m = Number(month);
  const y = Number(year);
  const startDate = new Date(Date.UTC(y, m - 1, 1));
  const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

  let period = await PayrollPeriod.findOne({ month: m, year: y });
  if (!period) {
    period = await PayrollPeriod.create({
      month: m,
      year: y,
      startDate,
      endDate,
      status: PAYROLL_STATUS.OPEN
    });
  }
  return period;
};

/**
 * Open a payroll period (marks it OPEN so attendance can be finalized).
 */
const openPayrollPeriod = async (month, year, adminId) => {
  let period = await PayrollPeriod.findOne({ month: Number(month), year: Number(year) });
  if (period) {
    if (period.status === PAYROLL_STATUS.LOCKED) {
      throw new Error('Payroll period is locked and cannot be reopened.');
    }
    period.status = PAYROLL_STATUS.OPEN;
    await period.save();
    return period;
  }
  return getOrCreatePayrollPeriod(month, year);
};

/**
 * Calculate payroll for all active teachers in the period.
 * Moves status → CALCULATED.
 */
const calculatePayrollPeriod = async (month, year, adminId) => {
  const period = await getOrCreatePayrollPeriod(month, year);
  if (period.status === PAYROLL_STATUS.LOCKED) {
    throw new Error('Payroll period is locked. Unlock before recalculating.');
  }

  period.status = PAYROLL_STATUS.PROCESSING;
  await period.save();

  const result = await generateMonthlyPayroll(month, year, adminId, true);

  period.status = PAYROLL_STATUS.CALCULATED;
  period.processedCount = result.processedCount;
  period.totalTeachers = result.totalActiveTeachers;
  period.generatedBy = adminId;
  period.generatedAt = new Date();
  period.totalNetSalary = result.salaries.reduce((s, r) => s + (r.netSalary || 0), 0);
  period.totalDeductions = result.salaries.reduce((s, r) => s + (r.totalDeduction || 0), 0);
  await period.save();

  return { period, payroll: result };
};

/**
 * Approve the payroll period — moves all CALCULATED salaries to APPROVED.
 */
const approvePayrollPeriod = async (month, year, adminId) => {
  const period = await PayrollPeriod.findOne({ month: Number(month), year: Number(year) });
  if (!period) throw new Error('Payroll period not found. Calculate first.');
  if (period.status !== PAYROLL_STATUS.CALCULATED) {
    throw new Error(`Cannot approve payroll in status: ${period.status}. Must be CALCULATED.`);
  }

  // Approve all CALCULATED salaries for this period
  const { approveSalary } = require('./salaryService');
  const salaries = await Salary.find({ month: Number(month), year: Number(year), status: 'CALCULATED' });
  for (const salary of salaries) {
    try {
      await approveSalary(salary._id, adminId);
    } catch (err) {
      console.error(`Failed to approve salary for teacher ${salary.teacherId}:`, err.message);
    }
  }

  period.status = PAYROLL_STATUS.APPROVED;
  period.approvedBy = adminId;
  period.approvedAt = new Date();
  await period.save();

  return period;
};

/**
 * Lock payroll period — prevents any further attendance or salary changes.
 */
const lockPayrollPeriod = async (month, year, adminId) => {
  const period = await PayrollPeriod.findOne({ month: Number(month), year: Number(year) });
  if (!period) throw new Error('Payroll period not found.');
  if (period.status !== PAYROLL_STATUS.APPROVED) {
    throw new Error(`Cannot lock payroll in status: ${period.status}. Must be APPROVED first.`);
  }

  // Lock all salaries for this period
  await Salary.updateMany(
    { month: Number(month), year: Number(year) },
    { isLocked: true, status: 'LOCKED' }
  );

  period.status = PAYROLL_STATUS.LOCKED;
  period.lockedBy = adminId;
  period.lockedAt = new Date();
  await period.save();

  return period;
};

/**
 * Get payroll period status summary.
 */
const getPayrollPeriodStatus = async (month, year) => {
  const period = await PayrollPeriod.findOne({ month: Number(month), year: Number(year) })
    .populate('generatedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('lockedBy', 'name email');

  return period || null;
};

/**
 * List all payroll periods with pagination.
 */
const listPayrollPeriods = async ({ page = 1, limit = 12 } = {}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const [periods, total] = await Promise.all([
    PayrollPeriod.find()
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('generatedBy', 'name email')
      .populate('approvedBy', 'name email'),
    PayrollPeriod.countDocuments()
  ]);
  return { periods, total };
};

module.exports = {
  getOrCreatePayrollPeriod,
  openPayrollPeriod,
  calculatePayrollPeriod,
  approvePayrollPeriod,
  lockPayrollPeriod,
  getPayrollPeriodStatus,
  listPayrollPeriods
};
