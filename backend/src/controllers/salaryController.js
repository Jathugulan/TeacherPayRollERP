const Salary = require('../models/Salary');
const Teacher = require('../models/Teacher');
const { ROLES } = require('../constants/roles');
const { SALARY_STATUS, TEACHER_STATUS, AUDIT_ACTION, AUDIT_MODULE } = require('../constants/salaryConfig');
const {
  calculateTeacherSalary,
  simulateSalaryPreview,
  generateTeacherSalaryRecord,
  generateMonthlyPayroll,
  approveSalary: approveSalaryService,
  markSalaryPaid: markSalaryPaidService
} = require('../services/salaryService');
const { logAction } = require('../services/auditService');

/**
 * @desc    Calculate salary preview for a teacher without saving
 * @route   GET/POST /api/salary/preview, /api/salary/calculate/:teacherId
 * @access  Private (Admin; Teacher can view their own only)
 */
const calculateSalaryPreviewController = async (req, res, next) => {
  try {
    const teacherId = req.params.teacherId || req.query.teacherId || req.body.teacherId;
    const now = new Date();
    const month = req.query.month || req.body.month ? Number(req.query.month || req.body.month) : now.getUTCMonth() + 1;
    const year = req.query.year || req.body.year ? Number(req.query.year || req.body.year) : now.getUTCFullYear();

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: 'teacherId is required in params, query, or body.'
      });
    }

    // Teachers can only view their own salary preview
    if (req.user.role === ROLES.TEACHER) {
      const { getOrEnsureTeacherProfile } = require('../services/teacherService');
      const ownProfile = await getOrEnsureTeacherProfile(req.user);
      if (!ownProfile || String(ownProfile._id) !== String(teacherId)) {
        return res.status(403).json({
          success: false,
          message: 'Teachers can only view their own salary breakdown.'
        });
      }
    }

    const preview = await simulateSalaryPreview(teacherId, month, year);

    res.status(200).json({
      success: true,
      data: preview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate / Process salary for a single teacher
 * @route   POST /api/salary/generate
 * @access  Private (Admin)
 */
const generateSalary = async (req, res, next) => {
  try {
    const { teacherId, month, year } = req.body;

    if (!teacherId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide teacherId, month (1-12), and year.'
      });
    }

    const m = Number(month);
    const y = Number(year);

    if (m < 1 || m > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12.'
      });
    }

    const record = await generateTeacherSalaryRecord(teacherId, m, y, req.user._id, true);

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.SALARY_CALCULATED,
      module: AUDIT_MODULE.SALARY,
      recordId: record._id,
      description: `Generated salary for teacher ${record.teacherId?.fullName || teacherId} (${m}/${y}): Net Rs. ${record.netSalary}`,
      newData: { month: m, year: y, netSalary: record.netSalary },
      req
    });

    res.status(200).json({
      success: true,
      message: `Salary generated successfully for ${m}/${y}.`,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate salaries for all active teachers
 * @route   POST /api/salary/generate-all
 * @access  Private (Admin)
 */
const generateAllSalaries = async (req, res, next) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide month (1-12) and year.'
      });
    }

    const m = Number(month);
    const y = Number(year);

    if (m < 1 || m > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12.'
      });
    }

    const result = await generateMonthlyPayroll(m, y, req.user._id, true);

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const record of result.salaries) {
      totalGross += record.grossSalary || 0;
      totalDeductions += record.totalDeduction || 0;
      totalNet += record.netSalary || 0;
    }

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.PAYROLL_CALCULATED,
      module: AUDIT_MODULE.PAYROLL,
      description: `Batch generated monthly payroll for ${m}/${y}: ${result.processedCount} teachers processed`,
      newData: { month: m, year: y, processedCount: result.processedCount, totalNet },
      req
    });

    res.status(200).json({
      success: true,
      message: `Payroll processed for ${result.processedCount} teacher(s).`,
      data: {
        numberProcessed: result.totalActiveTeachers,
        successfulCount: result.processedCount,
        failedCount: result.failedCount,
        salaryTotals: {
          grossSalary: totalGross,
          totalDeductions,
          netSalary: totalNet
        },
        successful: result.salaries,
        failed: result.errors
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get salary history / reports
 * @route   GET /api/salary or /api/salaries
 * @access  Private (Admin)
 */
const getAllSalaryReports = async (req, res, next) => {
  try {
    const { month, year, teacherId, status, page = 1, limit = 50 } = req.query;

    const query = {};

    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (teacherId) query.teacherId = teacherId;
    if (status) query.status = status.toUpperCase();

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Salary.countDocuments(query);
    const records = await Salary.find(query)
      .populate('teacherId', 'employeeId fullName email department designation salaryPerDay')
      .populate('generatedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('paidBy', 'name email')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get salary summary aggregate for a month/year
 * @route   GET /api/salary/summary
 * @access  Private (Admin)
 */
const getSalarySummary = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getUTCFullYear();

    const query = { month, year };

    const aggregation = await Salary.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTeachers: { $sum: 1 },
          grossSalary: { $sum: '$grossSalary' },
          absenceDeductions: { $sum: '$absenceDeduction' },
          leaveDeductions: { $sum: '$leaveDeduction' },
          totalDeductions: { $sum: '$totalDeduction' },
          netSalary: { $sum: '$netSalary' },
          averageSalary: { $avg: '$netSalary' }
        }
      }
    ]);

    const summary = aggregation[0] || {
      totalTeachers: 0,
      grossSalary: 0,
      absenceDeductions: 0,
      leaveDeductions: 0,
      totalDeductions: 0,
      netSalary: 0,
      averageSalary: 0
    };

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        totalTeachers: summary.totalTeachers,
        grossSalary: summary.grossSalary,
        absenceDeductions: summary.absenceDeductions,
        leaveDeductions: summary.leaveDeductions,
        totalDeductions: summary.totalDeductions,
        netSalary: summary.netSalary,
        averageSalary: Number((summary.averageSalary || 0).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get salary history for logged in teacher (derived from JWT)
 * @route   GET /api/salary/me
 * @access  Private (Teacher)
 */
const getMySalaryHistory = async (req, res, next) => {
  try {
    const { getOrEnsureTeacherProfile } = require('../services/teacherService');
    const teacher = await getOrEnsureTeacherProfile(req.user);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'No teacher profile linked to your user account.'
      });
    }

    const records = await Salary.find({ teacherId: teacher._id })
      .sort({ year: -1, month: -1 });

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          employeeId: teacher.employeeId,
          fullName: teacher.fullName,
          department: teacher.department,
          designation: teacher.designation,
          salaryPerDay: teacher.salaryPerDay
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get salary history for a specific teacher
 * @route   GET /api/teachers/:id/salary or /api/salary/teacher/:teacherId
 * @access  Private (Admin, Teacher - own)
 */
const getTeacherSalaryHistory = async (req, res, next) => {
  try {
    const teacherId = req.params.teacherId || req.params.id;
    const { month, year } = req.query;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.'
      });
    }

    if (
      req.user.role === ROLES.TEACHER &&
      teacher.email !== req.user.email &&
      (!teacher.userId || !teacher.userId.equals(req.user._id))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You may only view your own salary history.'
      });
    }

    const query = { teacherId };
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const records = await Salary.find(query).sort({ year: -1, month: -1 });

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          employeeId: teacher.employeeId,
          fullName: teacher.fullName,
          department: teacher.department,
          designation: teacher.designation,
          salaryPerDay: teacher.salaryPerDay
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a single salary record
 * @route   PATCH /api/salary/:id/approve
 * @access  Private (Admin)
 */
const approveSalaryController = async (req, res, next) => {
  try {
    const salary = await approveSalaryService(req.params.id, req.user._id);

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.SALARY_APPROVED,
      module: AUDIT_MODULE.SALARY,
      recordId: salary._id,
      description: `Approved salary record for teacher ${salary.teacherId?.fullName || salary.teacherId} (${salary.month}/${salary.year})`,
      newData: { status: 'APPROVED' },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Salary approved successfully',
      data: salary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a single salary record as PAID
 * @route   PATCH /api/salary/:id/pay
 * @access  Private (Admin)
 */
const markSalaryPaidController = async (req, res, next) => {
  try {
    const salary = await markSalaryPaidService(req.params.id, req.user._id);

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.SALARY_PAID,
      module: AUDIT_MODULE.SALARY,
      recordId: salary._id,
      description: `Marked salary as PAID for teacher ${salary.teacherId?.fullName || salary.teacherId} (${salary.month}/${salary.year})`,
      newData: { status: 'PAID' },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Salary marked as paid successfully',
      data: salary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update salary status / remarks / lock state
 * @route   PUT /api/salary/:id/status
 * @access  Private (Admin)
 */
const updateSalaryStatus = async (req, res, next) => {
  try {
    const { status, paymentMethod, remarks, isLocked } = req.body;

    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found.'
      });
    }

    if (salary.isLocked && isLocked === undefined) {
      return res.status(403).json({
        success: false,
        message: 'Salary record is locked and cannot be edited without unlocking first.'
      });
    }

    const previousStatus = salary.status;

    if (status) {
      if (!Object.values(SALARY_STATUS).includes(status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${Object.values(SALARY_STATUS).join(', ')}`
        });
      }
      salary.status = status.toUpperCase();
      if (salary.status === SALARY_STATUS.PAID && !salary.paidAt) {
        salary.paidAt = new Date();
        salary.paidBy = req.user._id;
      }
      if (salary.status === SALARY_STATUS.APPROVED && !salary.approvedAt) {
        salary.approvedAt = new Date();
        salary.approvedBy = req.user._id;
      }
    }

    if (isLocked !== undefined) {
      salary.isLocked = Boolean(isLocked);
    }
    if (paymentMethod) salary.paymentMethod = paymentMethod;
    if (remarks !== undefined) salary.remarks = remarks;

    await salary.save();

    const updated = await Salary.findById(salary._id)
      .populate('teacherId', 'employeeId fullName email department designation');

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.SALARY_UPDATED,
      module: AUDIT_MODULE.SALARY,
      recordId: salary._id,
      description: `Salary updated: ${previousStatus} -> ${salary.status}`,
      previousData: { status: previousStatus },
      newData: { status: salary.status, isLocked: salary.isLocked },
      req
    });

    res.status(200).json({
      success: true,
      message: `Salary record status updated to ${salary.status}`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed salary slip for a teacher and month
 * @route   GET /api/payroll/slip/:teacherId/:month or /api/salary/slip/:teacherId/:month
 * @access  Private (Admin, Teacher - own)
 */
const getSalarySlip = async (req, res, next) => {
  try {
    const { teacherId, month } = req.params;
    const now = new Date();
    const year = req.query.year ? Number(req.query.year) : now.getUTCMonth() + 1 >= Number(month) ? now.getUTCFullYear() : now.getUTCFullYear() - 1;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.'
      });
    }

    if (
      req.user.role === ROLES.TEACHER &&
      teacher.email !== req.user.email &&
      (!teacher.userId || !teacher.userId.equals(req.user._id))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You may only view your own salary slip.'
      });
    }

    const m = Number(month);
    const existing = await Salary.findOne({ teacherId, month: m, year });

    let slipData;
    if (existing) {
      slipData = {
        teacher: {
          id: teacher._id,
          employeeId: teacher.employeeId,
          fullName: teacher.fullName,
          email: teacher.email,
          phone: teacher.phone,
          department: teacher.department,
          designation: teacher.designation,
          salaryPerDay: teacher.salaryPerDay
        },
        month: existing.month,
        year: existing.year,
        dailySalary: existing.dailySalary || teacher.salaryPerDay,
        presentDays: existing.presentDays,
        absentDays: existing.absentDays,
        leaveDays: existing.leaveDays,
        allowedLeaveDays: existing.allowedLeaveDays || 5,
        extraLeaveDays: existing.extraLeaveDays || Math.max(0, existing.leaveDays - 5),
        grossSalary: existing.grossSalary,
        absenceDeduction: existing.absenceDeduction,
        leaveDeduction: existing.leaveDeduction,
        totalDeduction: existing.totalDeduction,
        netSalary: existing.netSalary,
        status: existing.status,
        generatedAt: existing.generatedAt || existing.createdAt
      };
    } else {
      const calculated = await simulateSalaryPreview(teacherId, m, year);
      slipData = {
        ...calculated,
        status: 'PREVIEW',
        generatedAt: new Date()
      };
    }

    res.status(200).json({
      success: true,
      data: slipData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateSalaryPreview: calculateSalaryPreviewController,
  simulateSalaryPreview: calculateSalaryPreviewController,
  generateSalary,
  generateAllSalaries,
  getAllSalaryReports,
  getSalarySummary,
  getMySalaryHistory,
  getTeacherSalaryHistory,
  getSalarySlip,
  approveSalary: approveSalaryController,
  markSalaryPaid: markSalaryPaidController,
  updateSalaryStatus
};
