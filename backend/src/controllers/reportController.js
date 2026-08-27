const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Salary = require('../models/Salary');
const PayrollPeriod = require('../models/PayrollPeriod');
const { TEACHER_STATUS, ATTENDANCE_STATUS, LEAVE_STATUS } = require('../constants/salaryConfig');
const { normalizeDate, getMonthDateRange } = require('../services/attendanceService');

/**
 * @desc    Get master dashboard analytics for Admin
 * @route   GET /api/reports/dashboard
 * @access  Private (Admin)
 */
const getAdminDashboardAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();
    const today = normalizeDate(now);
    const { startOfMonth, endOfMonth } = getMonthDateRange(currentMonth, currentYear);

    // 1. Teacher Counts
    const [totalTeachers, activeTeachers, inactiveTeachers] = await Promise.all([
      Teacher.countDocuments(),
      Teacher.countDocuments({ status: TEACHER_STATUS.ACTIVE }),
      Teacher.countDocuments({ status: TEACHER_STATUS.INACTIVE })
    ]);

    // 2. Today's Attendance
    const todayRecords = await Attendance.aggregate([
      { $match: { date: today } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    let presentToday = 0;
    let absentToday = 0;
    let onLeaveToday = 0;
    let holidayToday = 0;
    let weekendToday = 0;

    for (const item of todayRecords) {
      if (item._id === ATTENDANCE_STATUS.PRESENT) presentToday = item.count;
      if (item._id === ATTENDANCE_STATUS.ABSENT) absentToday = item.count;
      if (item._id === ATTENDANCE_STATUS.LEAVE) onLeaveToday = item.count;
      if (item._id === ATTENDANCE_STATUS.HOLIDAY) holidayToday = item.count;
      if (item._id === ATTENDANCE_STATUS.WEEKEND) weekendToday = item.count;
    }

    const markedToday = presentToday + absentToday + onLeaveToday + holidayToday + weekendToday;
    const notMarkedToday = Math.max(0, activeTeachers - markedToday);

    // 3. Pending Leaves
    const pendingLeaves = await Leave.countDocuments({ status: LEAVE_STATUS.PENDING });

    // 4. Current Month Payroll Overview
    const salarySummary = await Salary.aggregate([
      { $match: { month: currentMonth, year: currentYear } },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeduction' },
          totalNet: { $sum: '$netSalary' },
          processedCount: { $sum: 1 }
        }
      }
    ]);

    const payrollOverview = salarySummary[0] || {
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      processedCount: 0
    };

    // 5. Department Attendance Breakdown for Current Month
    const deptAttendance = await Attendance.aggregate([
      { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
      {
        $lookup: {
          from: 'teachers',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      { $unwind: '$teacher' },
      {
        $group: {
          _id: { department: '$teacher.department', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    const departmentMap = {};
    for (const item of deptAttendance) {
      const dept = item._id.department || 'General';
      if (!departmentMap[dept]) {
        departmentMap[dept] = { department: dept, present: 0, absent: 0, leave: 0, total: 0 };
      }
      if (item._id.status === ATTENDANCE_STATUS.PRESENT) departmentMap[dept].present += item.count;
      if (item._id.status === ATTENDANCE_STATUS.ABSENT) departmentMap[dept].absent += item.count;
      if (item._id.status === ATTENDANCE_STATUS.LEAVE) departmentMap[dept].leave += item.count;
      departmentMap[dept].total += item.count;
    }

    const departmentStats = Object.values(departmentMap).map(d => ({
      ...d,
      attendanceRate: d.total > 0 ? Number(((d.present / (d.present + d.absent + d.leave || 1)) * 100).toFixed(1)) : 0
    }));

    // 6. Recent 6 Months Attendance & Salary Trends
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(currentYear, currentMonth - 1 - i, 1));
      const m = d.getUTCMonth() + 1;
      const y = d.getUTCFullYear();
      const monthRange = getMonthDateRange(m, y);

      const [attStats, salStats] = await Promise.all([
        Attendance.aggregate([
          { $match: { date: { $gte: monthRange.startOfMonth, $lte: monthRange.endOfMonth } } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Salary.aggregate([
          { $match: { month: m, year: y } },
          { $group: { _id: null, netSalary: { $sum: '$netSalary' }, deductions: { $sum: '$totalDeduction' } } }
        ])
      ]);

      let mPresent = 0, mAbsent = 0, mLeave = 0;
      attStats.forEach(s => {
        if (s._id === ATTENDANCE_STATUS.PRESENT) mPresent = s.count;
        if (s._id === ATTENDANCE_STATUS.ABSENT) mAbsent = s.count;
        if (s._id === ATTENDANCE_STATUS.LEAVE) mLeave = s.count;
      });

      const monthName = d.toLocaleString('en-US', { month: 'short' });
      trends.push({
        month: m,
        year: y,
        label: `${monthName} ${y}`,
        present: mPresent,
        absent: mAbsent,
        leave: mLeave,
        netSalary: salStats[0]?.netSalary || 0,
        deductions: salStats[0]?.deductions || 0
      });
    }

    res.status(200).json({
      success: true,
      data: {
        currentPeriod: { month: currentMonth, year: currentYear },
        teachers: {
          total: totalTeachers,
          active: activeTeachers,
          inactive: inactiveTeachers
        },
        attendanceToday: {
          date: today,
          present: presentToday,
          absent: absentToday,
          onLeave: onLeaveToday,
          holiday: holidayToday,
          weekend: weekendToday,
          notMarked: notMarkedToday,
          attendanceRate: activeTeachers > 0 ? Number(((presentToday / activeTeachers) * 100).toFixed(1)) : 0
        },
        pendingLeaves,
        payroll: {
          totalGross: payrollOverview.totalGross,
          totalDeductions: payrollOverview.totalDeductions,
          totalNet: payrollOverview.totalNet,
          processedTeachers: payrollOverview.processedCount,
          totalTeachers: activeTeachers
        },
        departmentStats,
        trends
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly comprehensive ERP report
 * @route   GET /api/reports/monthly
 * @access  Private (Admin)
 */
const getMonthlyReport = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getUTCFullYear();

    const [salaries, payrollPeriod] = await Promise.all([
      Salary.find({ month, year })
        .populate('teacherId', 'employeeId fullName email department designation salaryPerDay')
        .sort({ 'teacherId.employeeId': 1 }),
      PayrollPeriod.findOne({ month, year })
    ]);

    let totalGross = 0;
    let totalAbsenceDeductions = 0;
    let totalLeaveDeductions = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    salaries.forEach(s => {
      totalGross += s.grossSalary || 0;
      totalAbsenceDeductions += s.absenceDeduction || 0;
      totalLeaveDeductions += s.leaveDeduction || 0;
      totalDeductions += s.totalDeduction || 0;
      totalNet += s.netSalary || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        periodStatus: payrollPeriod?.status || 'NOT_STARTED',
        totalTeachers: salaries.length,
        summary: {
          totalGross,
          totalAbsenceDeductions,
          totalLeaveDeductions,
          totalDeductions,
          totalNet,
          averageNet: salaries.length > 0 ? Number((totalNet / salaries.length).toFixed(2)) : 0
        },
        salaries
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance report with filters
 * @route   GET /api/reports/attendance
 * @access  Private (Admin)
 */
const getAttendanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, month, year, department } = req.query;
    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      const now = new Date();
      const m = month ? Number(month) : now.getUTCMonth() + 1;
      const y = year ? Number(year) : now.getUTCFullYear();
      const range = getMonthDateRange(m, y);
      start = range.startOfMonth;
      end = range.endOfMonth;
    }

    const teacherQuery = {};
    if (department && department !== 'ALL') {
      teacherQuery.department = department;
    }

    const teachers = await Teacher.find(teacherQuery).select('employeeId fullName department designation status');
    const teacherIds = teachers.map(t => t._id);

    const records = await Attendance.find({
      teacherId: { $in: teacherIds },
      date: { $gte: start, $lte: end }
    }).populate('teacherId', 'employeeId fullName department designation');

    // Aggregate statistics
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t._id.toString()] = {
        teacher: t,
        present: 0,
        absent: 0,
        leave: 0,
        total: 0
      };
    });

    records.forEach(r => {
      const tid = r.teacherId?._id?.toString() || r.teacherId?.toString();
      if (r.status === ATTENDANCE_STATUS.PRESENT) {
        presentCount++;
        if (teacherMap[tid]) teacherMap[tid].present++;
      } else if (r.status === ATTENDANCE_STATUS.ABSENT) {
        absentCount++;
        if (teacherMap[tid]) teacherMap[tid].absent++;
      } else if (r.status === ATTENDANCE_STATUS.LEAVE) {
        leaveCount++;
        if (teacherMap[tid]) teacherMap[tid].leave++;
      }
      if (teacherMap[tid]) teacherMap[tid].total++;
    });

    const summaryByTeacher = Object.values(teacherMap).map(item => ({
      ...item,
      attendancePercentage: item.total > 0 ? Number(((item.present / item.total) * 100).toFixed(1)) : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        startDate: start,
        endDate: end,
        totalRecords: records.length,
        summary: {
          presentCount,
          absentCount,
          leaveCount,
          attendanceRate: (presentCount + absentCount + leaveCount) > 0
            ? Number(((presentCount / (presentCount + absentCount + leaveCount)) * 100).toFixed(1))
            : 0
        },
        byTeacher: summaryByTeacher,
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payroll report with filters
 * @route   GET /api/reports/payroll
 * @access  Private (Admin)
 */
const getPayrollReport = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getUTCFullYear();
    const { department } = req.query;

    const query = { month, year };

    let salaries = await Salary.find(query)
      .populate('teacherId', 'employeeId fullName email department designation salaryPerDay')
      .populate('approvedBy', 'name email')
      .sort({ 'teacherId.employeeId': 1 });

    if (department && department !== 'ALL') {
      salaries = salaries.filter(s => s.teacherId?.department === department);
    }

    let totalGross = 0;
    let totalAbsenceDeductions = 0;
    let totalLeaveDeductions = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    salaries.forEach(s => {
      totalGross += s.grossSalary || 0;
      totalAbsenceDeductions += s.absenceDeduction || 0;
      totalLeaveDeductions += s.leaveDeduction || 0;
      totalDeductions += s.totalDeduction || 0;
      totalNet += s.netSalary || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        totalRecords: salaries.length,
        summary: {
          totalGross,
          totalAbsenceDeductions,
          totalLeaveDeductions,
          totalDeductions,
          totalNet,
          averageNet: salaries.length > 0 ? Number((totalNet / salaries.length).toFixed(2)) : 0
        },
        records: salaries
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get teacher directory report
 * @route   GET /api/reports/teachers
 * @access  Private (Admin)
 */
const getTeacherReport = async (req, res, next) => {
  try {
    const { department, status } = req.query;
    const query = {};
    if (department && department !== 'ALL') query.department = department;
    if (status && status !== 'ALL') query.status = status;

    const teachers = await Teacher.find(query).sort({ employeeId: 1 });

    const totalActive = teachers.filter(t => t.status === TEACHER_STATUS.ACTIVE).length;
    const totalInactive = teachers.filter(t => t.status === TEACHER_STATUS.INACTIVE).length;
    const totalDailyPayroll = teachers.reduce((sum, t) => sum + (t.salaryPerDay || 500), 0);

    // Group by department
    const byDepartment = {};
    teachers.forEach(t => {
      const dept = t.department || 'General';
      if (!byDepartment[dept]) byDepartment[dept] = 0;
      byDepartment[dept]++;
    });

    res.status(200).json({
      success: true,
      data: {
        totalTeachers: teachers.length,
        activeTeachers: totalActive,
        inactiveTeachers: totalInactive,
        totalDailyPayroll,
        byDepartment,
        teachers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get leave report
 * @route   GET /api/reports/leaves
 * @access  Private (Admin)
 */
const getLeaveReport = async (req, res, next) => {
  try {
    const { month, year, status, department } = req.query;
    let dateFilter = {};

    if (month && year) {
      const range = getMonthDateRange(Number(month), Number(year));
      dateFilter = { startDate: { $gte: range.startOfMonth, $lte: range.endOfMonth } };
    }

    const query = { ...dateFilter };
    if (status && status !== 'ALL') query.status = status;

    let leaves = await Leave.find(query)
      .populate('teacherId', 'employeeId fullName department designation')
      .populate('appliedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    if (department && department !== 'ALL') {
      leaves = leaves.filter(l => l.teacherId?.department === department);
    }

    const byType = {};
    const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
    let totalLeaveDays = 0;

    leaves.forEach(l => {
      const t = l.leaveType || 'Casual Leave';
      byType[t] = (byType[t] || 0) + (l.totalDays || 1);
      if (byStatus[l.status] !== undefined) byStatus[l.status]++;
      if (l.status === 'APPROVED') totalLeaveDays += l.totalDays || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        totalRequests: leaves.length,
        totalApprovedDays: totalLeaveDays,
        byStatus,
        byType,
        leaves
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboardAnalytics,
  getMonthlyReport,
  getAttendanceReport,
  getPayrollReport,
  getTeacherReport,
  getLeaveReport
};
