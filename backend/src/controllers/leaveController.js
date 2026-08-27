const Leave = require('../models/Leave');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { LEAVE_STATUS, LEAVE_TYPE, ATTENDANCE_STATUS, SALARY_CONFIG, AUDIT_ACTION, AUDIT_MODULE } = require('../constants/salaryConfig');
const { normalizeDate, getMonthDateRange } = require('../services/attendanceService');
const { logAction } = require('../services/auditService');
const {
  notifyLeaveSubmitted, notifyLeaveApproved, notifyLeaveRejected
} = require('../services/notificationService');

/**
 * Calculate difference in days between two dates inclusive
 */
const calculateDaysDifference = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
};

/**
 * @desc    Apply for leave (with overlap detection)
 * @route   POST /api/leaves
 * @access  Private (Admin, Teacher)
 */
const applyLeave = async (req, res, next) => {
  try {
    let { teacherId, startDate, endDate, totalDays, reason, leaveType } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide startDate, endDate, and reason.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid startDate or endDate provided.' });
    }

    if (start > end) {
      return res.status(400).json({ success: false, message: 'startDate cannot be after endDate.' });
    }

    // Resolve teacherId
    let teacher;
    if (req.user.role === ROLES.TEACHER) {
      const { getOrEnsureTeacherProfile } = require('../services/teacherService');
      teacher = await getOrEnsureTeacherProfile(req.user);
      if (!teacher) return res.status(404).json({ success: false, message: 'No teacher profile found for your account.' });
      teacherId = teacher._id;
    } else {
      if (!teacherId) return res.status(400).json({ success: false, message: 'teacherId is required.' });
      teacher = await Teacher.findById(teacherId);
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    // ─── Overlap Detection ────────────────────────────────────────
    const overlapping = await Leave.findOne({
      teacherId,
      status: { $in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });
    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: `This leave overlaps with an existing ${overlapping.status.toLowerCase()} leave (${new Date(overlapping.startDate).toDateString()} – ${new Date(overlapping.endDate).toDateString()}).`
      });
    }

    const calculatedTotalDays = totalDays ? Number(totalDays) : calculateDaysDifference(start, end);

    const leave = await Leave.create({
      teacherId,
      startDate: start,
      endDate: end,
      totalDays: calculatedTotalDays,
      leaveType: leaveType || LEAVE_TYPE.PERSONAL,
      reason: reason.trim(),
      status: LEAVE_STATUS.PENDING,
      appliedBy: req.user._id
    });

    const populatedLeave = await Leave.findById(leave._id)
      .populate('teacherId', 'employeeId fullName email department designation')
      .populate('appliedBy', 'name email');

    // Notify admin about new leave request
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    for (const admin of admins) {
      await notifyLeaveSubmitted(admin._id, teacher.fullName, leave._id);
    }

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.LEAVE_APPLIED, module: AUDIT_MODULE.LEAVE,
      recordId: leave._id,
      description: `Leave applied by ${teacher.fullName}: ${start.toDateString()} – ${end.toDateString()} (${calculatedTotalDays} days)`,
      newData: { startDate: start, endDate: end, totalDays: calculatedTotalDays, reason }, req
    });

    res.status(201).json({ success: true, message: 'Leave application submitted successfully', data: populatedLeave });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all leave requests with filters
 * @route   GET /api/leaves
 * @access  Private (Admin)
 */
const getAllLeaves = async (req, res, next) => {
  try {
    const { status, teacherId, startDate, endDate, leaveType, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status.toUpperCase();
    if (teacherId) query.teacherId = teacherId;
    if (leaveType) query.leaveType = leaveType.toUpperCase();

    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('teacherId', 'employeeId fullName email department designation')
      .populate('appliedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: {
        leaves,
        pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a leave request + mark attendance
 * @route   PATCH /api/leaves/:id/approve
 * @access  Private (Admin)
 */
const approveLeave = async (req, res, next) => {
  try {
    const { adminRemarks } = req.body || {};

    const leave = await Leave.findById(req.params.id).populate('teacherId', 'userId fullName employeeId');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave application not found.' });
    if (leave.status !== LEAVE_STATUS.PENDING) {
      return res.status(400).json({ success: false, message: `Cannot approve a leave that is already ${leave.status}.` });
    }

    leave.status = LEAVE_STATUS.APPROVED;
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    if (adminRemarks !== undefined) leave.adminRemarks = adminRemarks;
    await leave.save();

    // Mark daily attendance as LEAVE for each approved day
    const currentDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    while (currentDate <= endDate) {
      const normalized = normalizeDate(currentDate);
      await Attendance.findOneAndUpdate(
        { teacherId: leave.teacherId._id, date: normalized },
        {
          teacherId: leave.teacherId._id,
          date: normalized,
          status: ATTENDANCE_STATUS.LEAVE,
          remarks: `Approved Leave: ${leave.reason}`,
          markedBy: req.user._id
        },
        { upsert: true, new: true }
      );
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Notify teacher
    if (leave.teacherId?.userId) {
      await notifyLeaveApproved(leave.teacherId.userId, leave._id);
    }

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.LEAVE_APPROVED, module: AUDIT_MODULE.LEAVE,
      recordId: leave._id,
      description: `Leave approved for ${leave.teacherId?.fullName}: ${new Date(leave.startDate).toDateString()} – ${new Date(leave.endDate).toDateString()}`,
      newData: { status: 'APPROVED' }, req
    });

    const updatedLeave = await Leave.findById(leave._id)
      .populate('teacherId', 'employeeId fullName email department designation')
      .populate('approvedBy', 'name email');

    res.status(200).json({ success: true, message: 'Leave application approved successfully', data: updatedLeave });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a leave request
 * @route   PATCH /api/leaves/:id/reject
 * @access  Private (Admin)
 */
const rejectLeave = async (req, res, next) => {
  try {
    const { adminRemarks } = req.body || {};

    const leave = await Leave.findById(req.params.id).populate('teacherId', 'userId fullName');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave application not found.' });
    if (leave.status !== LEAVE_STATUS.PENDING) {
      return res.status(400).json({ success: false, message: `Cannot reject a leave that is already ${leave.status}.` });
    }

    leave.status = LEAVE_STATUS.REJECTED;
    leave.rejectedBy = req.user._id;
    leave.rejectedAt = new Date();
    if (adminRemarks !== undefined) leave.adminRemarks = adminRemarks;
    await leave.save();

    // Notify teacher
    if (leave.teacherId?.userId) {
      await notifyLeaveRejected(leave.teacherId.userId, leave._id, adminRemarks);
    }

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.LEAVE_REJECTED, module: AUDIT_MODULE.LEAVE,
      recordId: leave._id,
      description: `Leave rejected for ${leave.teacherId?.fullName}. Reason: ${adminRemarks || 'N/A'}`,
      newData: { status: 'REJECTED', adminRemarks }, req
    });

    const updatedLeave = await Leave.findById(leave._id)
      .populate('teacherId', 'employeeId fullName email department designation')
      .populate('rejectedBy', 'name email');

    res.status(200).json({ success: true, message: 'Leave application rejected', data: updatedLeave });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a pending leave (Teacher can cancel their own pending leaves)
 * @route   PATCH /api/leaves/:id/cancel
 * @access  Private (Admin, Teacher - own)
 */
const cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id).populate('teacherId', 'userId email fullName');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found.' });

    // Ownership check for teachers
    if (req.user.role === ROLES.TEACHER) {
      const isOwner =
        (leave.teacherId?.userId && leave.teacherId.userId.equals(req.user._id)) ||
        leave.teacherId?.email === req.user.email;
      if (!isOwner) return res.status(403).json({ success: false, message: 'You can only cancel your own leave.' });
    }

    if (leave.status !== LEAVE_STATUS.PENDING) {
      return res.status(400).json({ success: false, message: `Cannot cancel a leave with status: ${leave.status}. Only PENDING leaves can be cancelled.` });
    }

    leave.status = LEAVE_STATUS.CANCELLED;
    leave.cancelledBy = req.user._id;
    leave.cancelledAt = new Date();
    await leave.save();

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.LEAVE_CANCELLED, module: AUDIT_MODULE.LEAVE,
      recordId: leave._id,
      description: `Leave cancelled for ${leave.teacherId?.fullName}`,
      newData: { status: 'CANCELLED' }, req
    });

    res.status(200).json({ success: true, message: 'Leave cancelled successfully.', data: leave });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get leave quota summary for a teacher
 * @route   GET /api/leaves/summary/:teacherId
 * @access  Private (Admin, Teacher - own)
 */
const getLeaveSummary = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getUTCFullYear();

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    if (
      req.user.role === ROLES.TEACHER &&
      teacher.email !== req.user.email &&
      (!teacher.userId || !teacher.userId.equals(req.user._id))
    ) {
      return res.status(403).json({ success: false, message: 'Access denied: You may only view your own leave summary.' });
    }

    const { startOfMonth, endOfMonth } = getMonthDateRange(month, year);

    const leaveAttendanceCount = await Attendance.countDocuments({
      teacherId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      status: ATTENDANCE_STATUS.LEAVE
    });

    const allowedLeaveDays = SALARY_CONFIG.ALLOWED_LEAVE_DAYS;
    const usedLeaveDays = leaveAttendanceCount;
    const remainingLeaveDays = Math.max(0, allowedLeaveDays - usedLeaveDays);
    const extraLeaveDays = Math.max(0, usedLeaveDays - allowedLeaveDays);
    const extraLeaveDeduction = extraLeaveDays * SALARY_CONFIG.EXTRA_LEAVE_DEDUCTION_PER_DAY;

    res.status(200).json({
      success: true,
      data: {
        teacherId: teacher._id, employeeId: teacher.employeeId,
        month, year,
        allowedLeaveDays, usedLeaveDays, remainingLeaveDays, extraLeaveDays, extraLeaveDeduction
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get leave history for logged-in teacher
 * @route   GET /api/leaves/me
 * @access  Private (Teacher)
 */
const getMyLeaves = async (req, res, next) => {
  try {
    const { getOrEnsureTeacherProfile } = require('../services/teacherService');
    const teacher = await getOrEnsureTeacherProfile(req.user);
    if (!teacher) return res.status(404).json({ success: false, message: 'No teacher profile linked to your account.' });

    const leaves = await Leave.find({ teacherId: teacher._id })
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { teacher: { id: teacher._id, employeeId: teacher.employeeId, fullName: teacher.fullName }, leaves }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get leave records for a specific teacher
 * @route   GET /api/leaves/teacher/:teacherId
 * @access  Private (Admin, Teacher - own)
 */
const getTeacherLeaves = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    if (
      req.user.role === ROLES.TEACHER &&
      teacher.email !== req.user.email &&
      (!teacher.userId || !teacher.userId.equals(req.user._id))
    ) {
      return res.status(403).json({ success: false, message: 'Access denied: You may only view your own leave history.' });
    }

    const leaves = await Leave.find({ teacherId })
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { teacher: { id: teacher._id, employeeId: teacher.employeeId, fullName: teacher.fullName }, leaves }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update leave status (proxy dispatcher)
 * @route   PUT /api/leaves/:id/status
 * @access  Private (Admin)
 */
const updateLeaveStatus = async (req, res, next) => {
  const { status } = req.body || {};
  if (status === LEAVE_STATUS.APPROVED) return approveLeave(req, res, next);
  if (status === LEAVE_STATUS.REJECTED) return rejectLeave(req, res, next);
  if (status === LEAVE_STATUS.CANCELLED) return cancelLeave(req, res, next);
  return res.status(400).json({
    success: false,
    message: `Status must be one of: APPROVED, REJECTED, CANCELLED.`
  });
};

/**
 * @desc    Update a leave request details
 * @route   PUT /api/leaves/:id
 * @access  Private (Admin, Teacher - own pending)
 */
const updateLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave application not found.' });

    // Status proxy if status provided
    if (req.body.status && req.user.role === ROLES.ADMIN) {
      return updateLeaveStatus(req, res, next);
    }

    if (leave.status !== LEAVE_STATUS.PENDING && req.user.role !== ROLES.ADMIN) {
      return res.status(400).json({ success: false, message: 'Cannot edit leave that is already processed.' });
    }

    const { startDate, endDate, totalDays, leaveType, reason, adminRemarks } = req.body;
    if (startDate) leave.startDate = new Date(startDate);
    if (endDate) leave.endDate = new Date(endDate);
    if (totalDays) leave.totalDays = Number(totalDays);
    if (leaveType) leave.leaveType = leaveType;
    if (reason) leave.reason = reason.trim();
    if (adminRemarks !== undefined && req.user.role === ROLES.ADMIN) leave.adminRemarks = adminRemarks;

    await leave.save();

    res.status(200).json({
      success: true,
      message: 'Leave application updated successfully',
      data: leave
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a leave request
 * @route   DELETE /api/leaves/:id
 * @access  Private (Admin, Teacher - own pending)
 */
const deleteLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave application not found.' });

    await leave.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Leave application deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveSummary,
  getMyLeaves,
  getTeacherLeaves,
  updateLeaveStatus,
  updateLeave,
  deleteLeave
};
