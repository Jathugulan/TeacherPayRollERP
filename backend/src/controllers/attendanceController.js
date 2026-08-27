const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const { ROLES } = require('../constants/roles');
const { ATTENDANCE_STATUS, TEACHER_STATUS, AUDIT_ACTION, AUDIT_MODULE } = require('../constants/salaryConfig');
const { normalizeDate, getMonthDateRange } = require('../services/attendanceService');
const { logAction } = require('../services/auditService');
const { notifyAttendanceCorrected } = require('../services/notificationService');

/**
 * @desc    Mark attendance for a single teacher
 * @route   POST /api/attendance
 * @access  Private (Admin)
 */
const markAttendance = async (req, res, next) => {
  try {
    const { teacherId, date, status, remarks } = req.body;

    if (!teacherId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide teacherId, date, and status.'
      });
    }

    const upperStatus = status.toUpperCase();
    if (!Object.values(ATTENDANCE_STATUS).includes(upperStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${Object.values(ATTENDANCE_STATUS).join(', ')}`
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    const normalizedDate = normalizeDate(date);

    // Check if date is locked
    const existing = await Attendance.findOne({ teacherId, date: normalizedDate });
    if (existing?.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Attendance for this date is locked. Admin must unlock before editing.'
      });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { teacherId, date: normalizedDate },
      {
        teacherId,
        date: normalizedDate,
        status: upperStatus,
        remarks: remarks || '',
        markedBy: req.user._id
      },
      { new: true, upsert: true, runValidators: true }
    ).populate('teacherId', 'employeeId fullName email department designation');

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.ATTENDANCE_MARKED, module: AUDIT_MODULE.ATTENDANCE,
      recordId: attendance._id,
      description: `Attendance for ${teacher.fullName} on ${normalizedDate.toDateString()} marked as ${upperStatus}`,
      newData: { status: upperStatus, date: normalizedDate }, req
    });

    res.status(200).json({ success: true, message: 'Attendance marked successfully', data: attendance });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk mark attendance for multiple teachers on a specific date
 * @route   POST /api/attendance/bulk
 * @access  Private (Admin)
 */
const bulkMarkAttendance = async (req, res, next) => {
  try {
    const { date, records } = req.body;

    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date and a non-empty records array [{ teacherId, status, remarks }].'
      });
    }

    const normalizedDate = normalizeDate(date);
    const validOperations = [];
    const failed = [];

    for (let index = 0; index < records.length; index++) {
      const item = records[index];
      if (!item.teacherId || !item.status) {
        failed.push({ index, item, reason: 'Missing teacherId or status' });
        continue;
      }

      const upperStatus = item.status.toUpperCase();
      if (!Object.values(ATTENDANCE_STATUS).includes(upperStatus)) {
        failed.push({ index, item, reason: `Invalid status '${item.status}'` });
        continue;
      }

      // Check if locked
      const existingLocked = await Attendance.findOne({ teacherId: item.teacherId, date: normalizedDate, isLocked: true });
      if (existingLocked) {
        failed.push({ index, item, reason: 'Attendance for this date is locked.' });
        continue;
      }

      validOperations.push({
        updateOne: {
          filter: { teacherId: item.teacherId, date: normalizedDate },
          update: {
            $set: {
              teacherId: item.teacherId,
              date: normalizedDate,
              status: upperStatus,
              remarks: item.remarks || '',
              markedBy: req.user._id
            }
          },
          upsert: true
        }
      });
    }

    let bulkResult = null;
    if (validOperations.length > 0) {
      bulkResult = await Attendance.bulkWrite(validOperations);
    }

    const successfulCount = bulkResult
      ? (bulkResult.upsertedCount + bulkResult.modifiedCount + bulkResult.matchedCount)
      : 0;

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.ATTENDANCE_BULK, module: AUDIT_MODULE.ATTENDANCE,
      description: `Bulk attendance for ${normalizedDate.toDateString()}: ${successfulCount} processed`, req
    });

    res.status(200).json({
      success: true,
      message: `Bulk attendance processed. ${successfulCount} records updated/inserted, ${failed.length} invalid.`,
      data: { totalReceived: records.length, successfulCount, failedCount: failed.length, failed }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance records with comprehensive filters
 * @route   GET /api/attendance
 * @access  Private (Admin)
 */
const getAttendance = async (req, res, next) => {
  try {
    const { teacherId, date, month, year, startDate, endDate, status, page = 1, limit = 100 } = req.query;

    const query = {};

    if (teacherId) query.teacherId = teacherId;
    if (status) query.status = status.toUpperCase();

    if (date) {
      query.date = normalizeDate(date);
    } else if (startDate && endDate) {
      query.date = { $gte: normalizeDate(startDate), $lte: normalizeDate(endDate) };
    } else if (month && year) {
      const { startOfMonth, endOfMonth } = getMonthDateRange(month, year);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (year) {
      const startOfYear = new Date(Date.UTC(Number(year), 0, 1, 0, 0, 0, 0));
      const endOfYear = new Date(Date.UTC(Number(year), 11, 31, 23, 59, 59, 999));
      query.date = { $gte: startOfYear, $lte: endOfYear };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate('teacherId', 'employeeId fullName email department designation salaryPerDay')
      .populate('markedBy', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get today's attendance summary breakdown
 * @route   GET /api/attendance/today
 * @access  Private (Admin)
 */
const getTodayAttendance = async (req, res, next) => {
  try {
    const today = normalizeDate(new Date());
    const totalTeachers = await Teacher.countDocuments({ status: TEACHER_STATUS.ACTIVE });

    const todayRecords = await Attendance.aggregate([
      { $match: { date: today } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    let present = 0, absent = 0, leave = 0, holiday = 0, weekend = 0;

    for (const item of todayRecords) {
      if (item._id === ATTENDANCE_STATUS.PRESENT) present = item.count;
      if (item._id === ATTENDANCE_STATUS.ABSENT) absent = item.count;
      if (item._id === ATTENDANCE_STATUS.LEAVE) leave = item.count;
      if (item._id === ATTENDANCE_STATUS.HOLIDAY) holiday = item.count;
      if (item._id === ATTENDANCE_STATUS.WEEKEND) weekend = item.count;
    }

    const markedTotal = present + absent + leave + holiday + weekend;
    const notMarked = Math.max(0, totalTeachers - markedTotal);

    res.status(200).json({
      success: true,
      data: { date: today, totalTeachers, present, absent, leave, holiday, weekend, notMarked }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly attendance summary
 * @route   GET /api/attendance/summary
 * @access  Private (Admin)
 */
const getAttendanceSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getUTCFullYear();

    const { startOfMonth, endOfMonth } = getMonthDateRange(month, year);
    const totalTeachers = await Teacher.countDocuments({ status: TEACHER_STATUS.ACTIVE });

    const aggregation = await Attendance.aggregate([
      { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    let present = 0, absent = 0, leave = 0, holiday = 0, weekend = 0;
    for (const item of aggregation) {
      if (item._id === ATTENDANCE_STATUS.PRESENT) present = item.count;
      if (item._id === ATTENDANCE_STATUS.ABSENT) absent = item.count;
      if (item._id === ATTENDANCE_STATUS.LEAVE) leave = item.count;
      if (item._id === ATTENDANCE_STATUS.HOLIDAY) holiday = item.count;
      if (item._id === ATTENDANCE_STATUS.WEEKEND) weekend = item.count;
    }

    const totalMarked = present + absent + leave;
    const attendancePercentage = totalMarked > 0
      ? Number(((present / totalMarked) * 100).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      data: { month, year, totalTeachers, present, absent, leave, holiday, weekend, attendancePercentage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance records for a specific teacher
 * @route   GET /api/attendance/teacher/:teacherId
 * @access  Private (Admin, Teacher - own)
 */
const getTeacherAttendance = async (req, res, next) => {
  try {
    const teacherId = req.params.teacherId || req.params.id;
    const { month, year, startDate, endDate, status } = req.query;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    // Teachers can only view their own attendance
    if (
      req.user.role === ROLES.TEACHER &&
      teacher.email !== req.user.email &&
      (!teacher.userId || !teacher.userId.equals(req.user._id))
    ) {
      return res.status(403).json({ success: false, message: 'Access denied: You may only view your own attendance.' });
    }

    const query = { teacherId };
    if (status) query.status = status.toUpperCase();

    if (startDate && endDate) {
      query.date = { $gte: normalizeDate(startDate), $lte: normalizeDate(endDate) };
    } else if (month && year) {
      const { startOfMonth, endOfMonth } = getMonthDateRange(month, year);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const records = await Attendance.find(query)
      .populate('markedBy', 'name email')
      .sort({ date: 1 });

    const summary = {
      present: records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length,
      absent: records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length,
      leave: records.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length,
      holiday: records.filter((r) => r.status === ATTENDANCE_STATUS.HOLIDAY).length,
      weekend: records.filter((r) => r.status === ATTENDANCE_STATUS.WEEKEND).length,
      total: records.length
    };

    const attendancePercentage = (summary.present + summary.absent + summary.leave) > 0
      ? Number(((summary.present / (summary.present + summary.absent + summary.leave)) * 100).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher._id, employeeId: teacher.employeeId,
          fullName: teacher.fullName, department: teacher.department, designation: teacher.designation
        },
        summary: { ...summary, attendancePercentage },
        attendance: records,
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Correct/update attendance record with history tracking
 * @route   PUT /api/attendance/:id
 * @access  Private (Admin)
 */
const updateAttendance = async (req, res, next) => {
  try {
    const { status, remarks, reason } = req.body;

    const attendance = await Attendance.findById(req.params.id).populate('teacherId', 'userId fullName');
    if (!attendance) return res.status(404).json({ success: false, message: 'Attendance record not found.' });

    if (attendance.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'This attendance record is locked. Unlock the payroll period before making corrections.'
      });
    }

    const previousStatus = attendance.status;

    if (status) {
      const upperStatus = status.toUpperCase();
      if (!Object.values(ATTENDANCE_STATUS).includes(upperStatus)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${Object.values(ATTENDANCE_STATUS).join(', ')}`
        });
      }

      // Record correction history
      if (upperStatus !== previousStatus) {
        attendance.correctionHistory.push({
          previousStatus,
          newStatus: upperStatus,
          changedBy: req.user._id,
          changedAt: new Date(),
          reason: reason || ''
        });
      }

      attendance.status = upperStatus;
    }

    if (remarks !== undefined) attendance.remarks = remarks;
    attendance.markedBy = req.user._id;
    await attendance.save();

    // Notify teacher about correction
    if (status && attendance.teacherId?.userId) {
      await notifyAttendanceCorrected(
        attendance.teacherId.userId,
        attendance.date,
        attendance.status
      );
    }

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.ATTENDANCE_CORRECTED, module: AUDIT_MODULE.ATTENDANCE,
      recordId: attendance._id,
      description: `Attendance corrected: ${previousStatus} → ${attendance.status}. Reason: ${reason || 'N/A'}`,
      previousData: { status: previousStatus },
      newData: { status: attendance.status, reason }, req
    });

    res.status(200).json({ success: true, message: 'Attendance record corrected successfully', data: attendance });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lock or unlock attendance for a specific date
 * @route   POST /api/attendance/lock
 * @access  Private (Admin)
 */
const lockAttendanceDate = async (req, res, next) => {
  try {
    const { date, lock = true } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required.' });

    const normalizedDate = normalizeDate(date);

    const updateData = lock
      ? { isLocked: true, lockedBy: req.user._id, lockedAt: new Date() }
      : { isLocked: false, lockedBy: null, lockedAt: null };

    const result = await Attendance.updateMany({ date: normalizedDate }, { $set: updateData });

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.ATTENDANCE_LOCKED, module: AUDIT_MODULE.ATTENDANCE,
      description: `Attendance for ${normalizedDate.toDateString()} ${lock ? 'LOCKED' : 'UNLOCKED'}`, req
    });

    res.status(200).json({
      success: true,
      message: `Attendance for ${normalizedDate.toDateString()} ${lock ? 'locked' : 'unlocked'} (${result.modifiedCount} records).`,
      data: { date: normalizedDate, isLocked: lock, modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance record by ID
 * @route   GET /api/attendance/:id
 * @access  Private (Admin, Teacher - own)
 */
const getAttendanceById = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('teacherId', 'employeeId fullName department designation')
      .populate('markedBy', 'name email');

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete attendance record
 * @route   DELETE /api/attendance/:id
 * @access  Private (Admin)
 */
const deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    if (attendance.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'This attendance record is locked and cannot be deleted.'
      });
    }

    await attendance.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance history for a specific teacher
 * @route   GET /api/attendance/history/:teacherId
 * @access  Private (Admin, Teacher - own)
 */
const getAttendanceHistory = async (req, res, next) => {
  return getTeacherAttendance(req, res, next);
};

module.exports = {
  markAttendance,
  bulkMarkAttendance,
  getAttendance,
  getAttendanceById,
  deleteAttendance,
  getAttendanceHistory,
  getTodayAttendance,
  getAttendanceSummary,
  getTeacherAttendance,
  updateAttendance,
  lockAttendanceDate
};
