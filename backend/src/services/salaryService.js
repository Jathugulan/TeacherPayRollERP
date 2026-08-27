const Teacher = require('../models/Teacher');
const Salary = require('../models/Salary');
const { getTeacherMonthlyAttendanceStats } = require('./attendanceService');
const { calculateSalaryBreakdown } = require('../utils/salaryCalculator');
const { TEACHER_STATUS } = require('../constants/salaryConfig');
const { notifySalaryCalculated, notifySalaryApproved, notifySalaryPaid } = require('./notificationService');

/**
 * Calculate salary breakdown for a single teacher — pure calculation, no DB write.
 */
const calculateTeacherSalary = async (teacherId, month, year) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) throw new Error(`Teacher not found with ID ${teacherId}`);

  const attendanceStats = await getTeacherMonthlyAttendanceStats(teacherId, month, year);

  const breakdown = calculateSalaryBreakdown({
    presentDays: attendanceStats.presentDays,
    absentDays: attendanceStats.absentDays,
    leaveDays: attendanceStats.leaveDays,
    dailySalary: teacher.salaryPerDay
  });

  return {
    teacher: {
      id: teacher._id,
      employeeId: teacher.employeeId,
      fullName: teacher.fullName,
      email: teacher.email,
      department: teacher.department,
      designation: teacher.designation,
      salaryPerDay: teacher.salaryPerDay
    },
    month: Number(month),
    year: Number(year),
    holidayDays: attendanceStats.holidayDays || 0,
    weekendDays: attendanceStats.weekendDays || 0,
    ...breakdown
  };
};

/**
 * Simulate salary preview without saving to DB.
 * Identical to calculateTeacherSalary but explicitly named for clarity.
 */
const simulateSalaryPreview = async (teacherId, month, year) => {
  return calculateTeacherSalary(teacherId, month, year);
};

/**
 * Generate or update salary record in DB (upsert).
 * Increments calculationVersion on re-calculation.
 */
const generateTeacherSalaryRecord = async (teacherId, month, year, generatedByUserId, notifyTeacher = false) => {
  const calculated = await calculateTeacherSalary(teacherId, month, year);

  // Get existing record to increment version
  const existing = await Salary.findOne({ teacherId, month: Number(month), year: Number(year) });
  const nextVersion = existing ? existing.calculationVersion + 1 : 1;

  const salaryData = {
    teacherId,
    month: Number(month),
    year: Number(year),
    totalWorkingDays: calculated.totalWorkingDays,
    presentDays: calculated.presentDays,
    absentDays: calculated.absentDays,
    leaveDays: calculated.leaveDays,
    holidayDays: calculated.holidayDays,
    weekendDays: calculated.weekendDays,
    allowedLeaveDays: calculated.allowedLeaveDays,
    extraLeaveDays: calculated.extraLeaveDays,
    dailySalary: calculated.dailySalary,
    baseSalary: calculated.baseSalary,
    grossSalary: calculated.grossSalary,
    absenceDeduction: calculated.absenceDeduction,
    leaveDeduction: calculated.leaveDeduction,
    totalDeduction: calculated.totalDeduction,
    netSalary: calculated.netSalary,
    status: 'CALCULATED',
    calculationVersion: nextVersion,
    generatedBy: generatedByUserId,
    generatedAt: new Date()
  };

  const salaryRecord = await Salary.findOneAndUpdate(
    { teacherId, month: Number(month), year: Number(year) },
    salaryData,
    { new: true, upsert: true, runValidators: true }
  ).populate('teacherId', 'employeeId fullName email department designation salaryPerDay userId');

  // Optionally notify the teacher
  if (notifyTeacher && salaryRecord?.teacherId?.userId) {
    await notifySalaryCalculated(
      salaryRecord.teacherId.userId,
      Number(month),
      Number(year),
      calculated.netSalary
    );
  }

  return salaryRecord;
};

/**
 * Batch generate salary records for all active teachers for a specific month and year.
 */
const generateMonthlyPayroll = async (month, year, generatedByUserId, notifyTeachers = true) => {
  const activeTeachers = await Teacher.find({ status: TEACHER_STATUS.ACTIVE });
  const results = [];
  const errors = [];

  for (const teacher of activeTeachers) {
    try {
      const record = await generateTeacherSalaryRecord(
        teacher._id, month, year, generatedByUserId, notifyTeachers
      );
      results.push(record);
    } catch (err) {
      console.error(`Error processing salary for teacher ${teacher.employeeId}: ${err.message}`);
      errors.push({ teacherId: teacher._id, employeeId: teacher.employeeId, error: err.message });
    }
  }

  return {
    processedCount: results.length,
    failedCount: errors.length,
    totalActiveTeachers: activeTeachers.length,
    // Backward compat alias
    successfulCount: results.length,
    numberProcessed: results.length,
    month: Number(month),
    year: Number(year),
    salaries: results,
    errors
  };
};

/**
 * Approve a salary record — moves status from CALCULATED to APPROVED.
 */
const approveSalary = async (salaryId, adminUserId) => {
  const salary = await Salary.findById(salaryId).populate('teacherId', 'userId fullName month year');
  if (!salary) throw new Error('Salary record not found');
  if (salary.isLocked) throw new Error('Salary is locked and cannot be modified');
  if (!['CALCULATED', 'DRAFT'].includes(salary.status)) {
    throw new Error(`Cannot approve salary in status: ${salary.status}`);
  }

  salary.status = 'APPROVED';
  salary.approvedBy = adminUserId;
  salary.approvedAt = new Date();
  await salary.save();

  // Notify teacher
  if (salary.teacherId?.userId) {
    await notifySalaryApproved(salary.teacherId.userId, salary.month, salary.year);
  }

  return salary;
};

/**
 * Mark a salary record as paid — moves status to PAID.
 */
const markSalaryPaid = async (salaryId, adminUserId) => {
  const salary = await Salary.findById(salaryId).populate('teacherId', 'userId fullName');
  if (!salary) throw new Error('Salary record not found');
  if (salary.isLocked) throw new Error('Salary is locked and cannot be modified');
  if (salary.status !== 'APPROVED') {
    throw new Error(`Cannot mark as paid salary in status: ${salary.status}. Must be APPROVED first.`);
  }

  salary.status = 'PAID';
  salary.paidAt = new Date();
  salary.paidBy = adminUserId;
  await salary.save();

  // Notify teacher
  if (salary.teacherId?.userId) {
    await notifySalaryPaid(salary.teacherId.userId, salary.month, salary.year, salary.netSalary);
  }

  return salary;
};

module.exports = {
  calculateTeacherSalary,
  simulateSalaryPreview,
  generateTeacherSalaryRecord,
  generateMonthlyPayroll,
  approveSalary,
  markSalaryPaid
};
