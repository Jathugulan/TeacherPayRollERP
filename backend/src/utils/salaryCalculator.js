const { SALARY_CONFIG } = require('../constants/salaryConfig');

/**
 * Pure function to calculate salary components based on attendance and leave days
 * 
 * Business rules:
 * - Daily rate = 500 (default)
 * - Present = Rs. 500 earned
 * - Absent = Rs. 100 deduction (net Rs. 400)
 * - First 5 leave days = No extra deduction
 * - Leaves > 5 = Rs. 100 deduction per extra leave day
 * 
 * Formula:
 * - baseSalary (grossSalary) = presentDays * dailySalary
 * - absenceDeduction = absentDays * absenceDeductionPerDay
 * - extraLeaveDays = max(0, leaveDays - allowedLeaveDays)
 * - leaveDeduction = extraLeaveDays * extraLeaveDeductionPerDay
 * - totalDeduction = absenceDeduction + leaveDeduction
 * - netSalary = max(0, baseSalary - totalDeduction)
 * 
 * @param {Object} params
 * @param {number} params.presentDays
 * @param {number} params.absentDays
 * @param {number} params.leaveDays
 * @param {number} [params.dailySalary]
 * @param {number} [params.allowedLeaveDays]
 * @param {number} [params.absenceDeductionPerDay]
 * @param {number} [params.extraLeaveDeductionPerDay]
 * @returns {Object} Calculated salary breakdown
 */
const calculateSalaryBreakdown = ({
  presentDays = 0,
  absentDays = 0,
  leaveDays = 0,
  dailySalary = SALARY_CONFIG.DEFAULT_DAILY_SALARY,
  allowedLeaveDays = SALARY_CONFIG.ALLOWED_LEAVE_DAYS,
  absenceDeductionPerDay = SALARY_CONFIG.ABSENCE_DEDUCTION_PER_DAY,
  extraLeaveDeductionPerDay = SALARY_CONFIG.EXTRA_LEAVE_DEDUCTION_PER_DAY
}) => {
  const pDays = Number(presentDays) || 0;
  const aDays = Number(absentDays) || 0;
  const lDays = Number(leaveDays) || 0;
  const rate = Number(dailySalary) || SALARY_CONFIG.DEFAULT_DAILY_SALARY;
  const freeLeaves = Number(allowedLeaveDays) || SALARY_CONFIG.ALLOWED_LEAVE_DAYS;
  const absDeductRate = Number(absenceDeductionPerDay) || SALARY_CONFIG.ABSENCE_DEDUCTION_PER_DAY;
  const leaveDeductRate = Number(extraLeaveDeductionPerDay) || SALARY_CONFIG.EXTRA_LEAVE_DEDUCTION_PER_DAY;

  const totalWorkingDays = pDays + aDays + lDays;
  const grossSalary = pDays * rate;
  const baseSalary = grossSalary;
  const absenceDeduction = aDays * absDeductRate;
  const extraLeaveDays = Math.max(0, lDays - freeLeaves);
  const leaveDeduction = extraLeaveDays * leaveDeductRate;
  const totalDeduction = absenceDeduction + leaveDeduction;
  const netSalary = Math.max(0, grossSalary - totalDeduction);

  return {
    dailySalary: rate,
    allowedLeaveDays: freeLeaves,
    presentDays: pDays,
    absentDays: aDays,
    leaveDays: lDays,
    totalWorkingDays,
    grossSalary,
    baseSalary,
    absenceDeduction,
    extraLeaveDays,
    leaveDeduction,
    totalDeduction,
    netSalary
  };
};

module.exports = {
  calculateSalaryBreakdown
};
