const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Salary = require('../models/Salary');
const { ATTENDANCE_STATUS, LEAVE_STATUS, TEACHER_STATUS } = require('../constants/salaryConfig');
const { normalizeDate, getMonthDateRange } = require('../services/attendanceService');

/**
 * @desc    Get dashboard overview
 * @route   GET /api/dashboard/overview
 * @access  Private (Admin, HR, Accountant)
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    const today = normalizeDate(new Date());
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();

    // 1. Teacher Counts
    const totalTeachers = await Teacher.countDocuments({});
    const activeTeachers = await Teacher.countDocuments({ status: TEACHER_STATUS.ACTIVE });

    // 2. Today's Attendance
    const todayRecords = await Attendance.aggregate([
      { $match: { date: today } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    let presentToday = 0;
    let absentToday = 0;
    let leaveToday = 0;

    for (const item of todayRecords) {
      if (item._id === ATTENDANCE_STATUS.PRESENT) presentToday = item.count;
      if (item._id === ATTENDANCE_STATUS.ABSENT) absentToday = item.count;
      if (item._id === ATTENDANCE_STATUS.LEAVE) leaveToday = item.count;
    }

    const markedTotal = presentToday + absentToday + leaveToday;
    const notMarked = Math.max(0, activeTeachers - markedTotal);

    // 3. Pending Leaves
    const pendingLeaves = await Leave.countDocuments({ status: LEAVE_STATUS.PENDING });

    // 4. Current Month Salary
    const salaryData = await Salary.aggregate([
      {
        $match: {
          month: currentMonth,
          year: currentYear
        }
      },
      {
        $group: {
          _id: null,
          totalNet: { $sum: '$netSalary' },
          totalDeductions: { $sum: '$totalDeduction' }
        }
      }
    ]);

    const currentMonthSalary = salaryData.length > 0 ? salaryData[0].totalNet : 0;
    const deductions = salaryData.length > 0 ? salaryData[0].totalDeductions : 0;

    res.status(200).json({
      success: true,
      data: {
        teachers: {
          total: totalTeachers,
          active: activeTeachers
        },
        attendance: {
          presentToday,
          absentToday,
          leaveToday,
          notMarked
        },
        leave: {
          pending: pendingLeaves
        },
        salary: {
          currentMonth: currentMonthSalary,
          deductions
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed ERP dashboard statistics using MongoDB aggregation
 * @route   GET /api/dashboard/stats
 * @access  Private (Admin, HR, Accountant)
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const today = normalizeDate(new Date());
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();
    const { startOfMonth, endOfMonth } = getMonthDateRange(currentMonth, currentYear);

    // 1. Teacher Counts Aggregation
    const teacherCountsPromise = Teacher.aggregate([
      {
        $group: {
          _id: null,
          totalTeachers: { $sum: 1 },
          activeTeachers: {
            $sum: { $cond: [{ $eq: ['$status', TEACHER_STATUS.ACTIVE] }, 1, 0] }
          },
          inactiveTeachers: {
            $sum: { $cond: [{ $eq: ['$status', TEACHER_STATUS.INACTIVE] }, 1, 0] }
          }
        }
      }
    ]);

    // 2. Today's Attendance Aggregation
    const todayAttendancePromise = Attendance.aggregate([
      {
        $match: {
          date: today
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Current Month Attendance Percentage Aggregation
    const monthAttendancePromise = Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalMarked: { $sum: 1 },
          totalPresent: {
            $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUS.PRESENT] }, 1, 0] }
          },
          totalAbsent: {
            $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUS.ABSENT] }, 1, 0] }
          },
          totalLeave: {
            $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUS.LEAVE] }, 1, 0] }
          }
        }
      }
    ]);

    // 4. Pending Leave Requests Count
    const pendingLeavesPromise = Leave.countDocuments({ status: LEAVE_STATUS.PENDING });

    // 5. Current Month Salary & Expenditure Aggregation
    const monthSalaryPromise = Salary.aggregate([
      {
        $match: {
          month: currentMonth,
          year: currentYear
        }
      },
      {
        $group: {
          _id: null,
          totalGrossSalary: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeduction' },
          totalNetSalaryExpenditure: { $sum: '$netSalary' },
          processedSalariesCount: { $sum: 1 },
          paidSalariesCount: {
            $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] }
          }
        }
      }
    ]);

    // 6. Department-wise Teacher Breakdown Aggregation
    const departmentBreakdownPromise = Teacher.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const [
      teacherStatsResult,
      todayAttendanceResult,
      monthAttendanceResult,
      pendingLeavesCount,
      salaryStatsResult,
      departmentStatsResult
    ] = await Promise.all([
      teacherCountsPromise,
      todayAttendancePromise,
      monthAttendancePromise,
      pendingLeavesPromise,
      monthSalaryPromise,
      departmentBreakdownPromise
    ]);

    // Parse Teacher Counts
    const teacherData = teacherStatsResult[0] || {
      totalTeachers: 0,
      activeTeachers: 0,
      inactiveTeachers: 0
    };

    // Parse Today's Attendance
    let presentToday = 0;
    let absentToday = 0;
    let leaveToday = 0;

    for (const item of todayAttendanceResult) {
      if (item._id === ATTENDANCE_STATUS.PRESENT) presentToday = item.count;
      if (item._id === ATTENDANCE_STATUS.ABSENT) absentToday = item.count;
      if (item._id === ATTENDANCE_STATUS.LEAVE) leaveToday = item.count;
    }

    const todayMarkedTotal = presentToday + absentToday + leaveToday;
    const todayAttendancePercentage = todayMarkedTotal > 0
      ? Number(((presentToday / todayMarkedTotal) * 100).toFixed(2))
      : 0;

    // Parse Month Attendance
    const monthAttData = monthAttendanceResult[0] || {
      totalMarked: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalLeave: 0
    };

    const monthlyAttendancePercentage = monthAttData.totalMarked > 0
      ? Number(((monthAttData.totalPresent / monthAttData.totalMarked) * 100).toFixed(2))
      : 0;

    // Parse Salary / Payroll Stats
    const salaryData = salaryStatsResult[0] || {
      totalGrossSalary: 0,
      totalDeductions: 0,
      totalNetSalaryExpenditure: 0,
      processedSalariesCount: 0,
      paidSalariesCount: 0
    };

    res.status(200).json({
      success: true,
      data: {
        teachers: {
          total: teacherData.totalTeachers,
          active: teacherData.activeTeachers,
          inactive: teacherData.inactiveTeachers,
          byDepartment: departmentStatsResult.map((d) => ({
            department: d._id,
            count: d.count
          }))
        },
        todayAttendance: {
          date: today,
          presentToday,
          absentToday,
          leaveToday,
          totalMarked: todayMarkedTotal,
          unmarked: Math.max(0, teacherData.activeTeachers - todayMarkedTotal),
          attendancePercentage: todayAttendancePercentage
        },
        monthlyAttendance: {
          month: currentMonth,
          year: currentYear,
          totalRecords: monthAttData.totalMarked,
          presentDays: monthAttData.totalPresent,
          absentDays: monthAttData.totalAbsent,
          leaveDays: monthAttData.totalLeave,
          attendancePercentage: monthlyAttendancePercentage
        },
        leaves: {
          pendingRequests: pendingLeavesCount
        },
        payroll: {
          month: currentMonth,
          year: currentYear,
          grossSalary: salaryData.totalGrossSalary,
          totalDeductions: salaryData.totalDeductions,
          netSalaryExpenditure: salaryData.totalNetSalaryExpenditure,
          processedCount: salaryData.processedSalariesCount,
          paidCount: salaryData.paidSalariesCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complete Admin Dashboard payload matching Enterprise ERP requirements
 * @route   GET /api/dashboard/admin
 * @access  Private (Admin)
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const today = normalizeDate(new Date());
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();
    const { startOfMonth, endOfMonth } = getMonthDateRange(currentMonth, currentYear);

    // 1. Teachers
    const [totalTeachers, activeTeachers] = await Promise.all([
      Teacher.countDocuments({}),
      Teacher.countDocuments({ status: TEACHER_STATUS.ACTIVE })
    ]);

    // 2. Today's Attendance
    const todayRecords = await Attendance.aggregate([
      { $match: { date: today } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    let presentToday = 0;
    let absentToday = 0;
    let leaveToday = 0;

    for (const item of todayRecords) {
      if (item._id === ATTENDANCE_STATUS.PRESENT) presentToday = item.count;
      if (item._id === ATTENDANCE_STATUS.ABSENT) absentToday = item.count;
      if (item._id === ATTENDANCE_STATUS.LEAVE) leaveToday = item.count;
    }

    const markedToday = presentToday + absentToday + leaveToday;
    const attendancePercentage = markedToday > 0 ? Number(((presentToday / markedToday) * 100).toFixed(1)) : 0;

    // 3. Pending Leaves
    const pendingLeaveRequests = await Leave.countDocuments({ status: LEAVE_STATUS.PENDING });

    // 4. Monthly Payroll / Salary
    const salaryData = await Salary.aggregate([
      { $match: { month: currentMonth, year: currentYear } },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeduction' },
          totalNet: { $sum: '$netSalary' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSalary = salaryData[0]?.totalGross || 0;
    const monthlyPayroll = salaryData[0]?.totalNet || 0;

    // 5. Recent 6-Month Trends (Monthly Attendance & Payroll Trend)
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
          { $group: { _id: null, netSalary: { $sum: '$netSalary' }, grossSalary: { $sum: '$grossSalary' } } }
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
        grossSalary: salStats[0]?.grossSalary || 0,
        netSalary: salStats[0]?.netSalary || 0
      });
    }

    // 6. Leave Statistics by Type
    const leaveStats = await Leave.aggregate([
      { $match: { startDate: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$totalDays' } } }
    ]);

    // 7. Department Salary & Staff Analytics
    const departmentAnalytics = await Teacher.aggregate([
      {
        $group: {
          _id: '$department',
          teacherCount: { $sum: 1 },
          avgSalaryPerDay: { $avg: '$salaryPerDay' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        cards: {
          totalTeachers,
          activeTeachers,
          presentToday,
          absentToday,
          pendingLeaveRequests,
          monthlyPayroll,
          totalSalary,
          attendancePercentage
        },
        charts: {
          monthlyAttendance: trends,
          payrollTrend: trends,
          leaveStatistics: leaveStats.map(l => ({ type: l._id || 'Casual Leave', count: l.count, totalDays: l.totalDays })),
          salaryAnalytics: departmentAnalytics.map(d => ({
            department: d._id || 'General',
            teacherCount: d.teacherCount,
            avgDailyRate: Math.round(d.avgSalaryPerDay || 500)
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complete Teacher Dashboard payload
 * @route   GET /api/dashboard/teacher
 * @access  Private (Teacher)
 */
const getTeacherDashboard = async (req, res, next) => {
  try {
    const { getOrEnsureTeacherProfile } = require('../services/teacherService');
    const teacher = await getOrEnsureTeacherProfile(req.user);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'No teacher profile linked to your user account.'
      });
    }

    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();
    const { startOfMonth, endOfMonth } = getMonthDateRange(currentMonth, currentYear);

    // 1. Current Month Attendance
    const attendanceRecords = await Attendance.find({
      teacherId: teacher._id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;

    attendanceRecords.forEach(r => {
      if (r.status === ATTENDANCE_STATUS.PRESENT) presentDays++;
      if (r.status === ATTENDANCE_STATUS.ABSENT) absentDays++;
      if (r.status === ATTENDANCE_STATUS.LEAVE) leaveDays++;
    });

    const totalMarked = presentDays + absentDays + leaveDays;
    const attendancePercentage = totalMarked > 0 ? Number(((presentDays / totalMarked) * 100).toFixed(1)) : 0;

    // 2. Leave Balance
    const approvedLeaves = await Leave.find({
      teacherId: teacher._id,
      status: LEAVE_STATUS.APPROVED,
      startDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const usedLeaveDays = approvedLeaves.reduce((sum, l) => sum + (l.totalDays || 1), 0);
    const freeQuota = 5;
    const remainingFreeLeaves = Math.max(0, freeQuota - usedLeaveDays);
    const extraLeaveDays = Math.max(0, usedLeaveDays - freeQuota);

    // 3. Current Salary Calculation
    const dailySalary = teacher.salaryPerDay || 500;
    const grossEarned = presentDays * dailySalary;
    const leaveDeduction = extraLeaveDays * 100;
    const currentSalary = Math.max(0, grossEarned - leaveDeduction);

    // 4. Payroll History
    const payrollHistory = await Salary.find({ teacherId: teacher._id })
      .sort({ year: -1, month: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          employeeId: teacher.employeeId,
          fullName: teacher.fullName,
          email: teacher.email,
          department: teacher.department,
          designation: teacher.designation,
          salaryPerDay: teacher.salaryPerDay
        },
        cards: {
          presentDays,
          absentDays,
          leaveDays,
          leaveBalance: remainingFreeLeaves,
          usedLeaveDays,
          currentSalary,
          attendancePercentage
        },
        payrollHistory,
        recentAttendance: attendanceRecords.slice(-10)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardOverview,
  getDashboardStats,
  getAdminDashboard,
  getTeacherDashboard
};
