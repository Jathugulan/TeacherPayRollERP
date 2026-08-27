const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const AuditLog = require('../models/AuditLog');
const { ROLES } = require('../constants/roles');
const { TEACHER_STATUS, SALARY_CONFIG, ATTENDANCE_STATUS, AUDIT_ACTION, AUDIT_MODULE } = require('../constants/salaryConfig');
const { getMonthDateRange, normalizeDate } = require('../services/attendanceService');
const { calculateTeacherSalary } = require('../services/salaryService');
const { logAction } = require('../services/auditService');

/**
 * Generate next unique employee ID if not provided (e.g. TCH-0001)
 */
const generateNextEmployeeId = async () => {
  const latest = await Teacher.findOne().sort({ createdAt: -1 });
  if (!latest || !latest.employeeId) return 'TCH-0001';
  const match = latest.employeeId.match(/\d+$/);
  if (match) {
    const nextNum = parseInt(match[0], 10) + 1;
    return `TCH-${String(nextNum).padStart(4, '0')}`;
  }
  return `TCH-${Date.now().toString().slice(-4)}`;
};

/**
 * @desc    Create a new teacher
 * @route   POST /api/teachers
 * @access  Private (Admin)
 */
const createTeacher = async (req, res, next) => {
  try {
    let {
      employeeId,
      firstName,
      lastName,
      fullName,
      gender,
      nic,
      email,
      phone,
      address,
      dateOfBirth,
      dob,
      joiningDate,
      department,
      subject,
      designation,
      qualification,
      salaryPerDay,
      dailySalary,
      profileImage,
      profilePicture,
      emergencyContact,
      bankDetails,
      status
    } = req.body;

    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName || ''} ${lastName || ''}`.trim();
    }

    if (!fullName || !email || !phone || !department || !designation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fullName (or firstName/lastName), email, phone, department, and designation.',
        errors: ['Missing required fields']
      });
    }

    // Auto-generate employeeId if not given
    if (!employeeId) {
      employeeId = await generateNextEmployeeId();
    } else {
      employeeId = employeeId.toUpperCase().trim();
    }

    const existingEmpId = await Teacher.findOne({ employeeId });
    if (existingEmpId) {
      return res.status(409).json({
        success: false,
        message: `A teacher with Employee ID '${employeeId}' already exists.`,
        errors: [`Duplicate employeeId: ${employeeId}`]
      });
    }

    const existingEmail = await Teacher.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: `A teacher with Email '${email}' already exists.`,
        errors: [`Duplicate email: ${email}`]
      });
    }

    // Auto-link to user if matching email exists
    let linkedUserId = null;
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      linkedUserId = existingUser._id;
    }

    const finalSalaryPerDay = salaryPerDay !== undefined ? Number(salaryPerDay) : (dailySalary !== undefined ? Number(dailySalary) : SALARY_CONFIG.DEFAULT_DAILY_SALARY);

    const teacher = await Teacher.create({
      userId: linkedUserId,
      employeeId,
      firstName: firstName ? firstName.trim() : '',
      lastName: lastName ? lastName.trim() : '',
      fullName: fullName.trim(),
      gender: gender || 'Male',
      nic: nic ? nic.trim() : '',
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address || '',
      dateOfBirth: dateOfBirth || dob || null,
      joiningDate: joiningDate || Date.now(),
      department: department.trim(),
      subject: subject ? subject.trim() : '',
      designation: designation.trim(),
      qualification: qualification ? qualification.trim() : '',
      salaryPerDay: finalSalaryPerDay,
      profilePicture: profileImage || profilePicture || '',
      emergencyContact: emergencyContact || { name: '', relationship: '', phone: '' },
      bankDetails: bankDetails || { accountName: '', accountNumber: '', bankName: '', ifscOrRoutingCode: '' },
      status: status || TEACHER_STATUS.ACTIVE,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.TEACHER_CREATED,
      module: AUDIT_MODULE.TEACHER,
      recordId: teacher._id,
      description: `Created teacher ${teacher.fullName} (${teacher.employeeId}) in department ${teacher.department}`,
      newData: { employeeId: teacher.employeeId, fullName: teacher.fullName, department: teacher.department },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: teacher
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all teachers with search, filtering, sorting, and pagination
 * @route   GET /api/teachers
 * @access  Private (Admin)
 */
const getAllTeachers = async (req, res, next) => {
  try {
    const { search, department, designation, status, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 50 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    if (designation) {
      query.designation = { $regex: designation, $options: 'i' };
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Teacher.countDocuments(query);
    const teachers = await Teacher.find(query)
      .populate('userId', 'name email role isActive avatar')
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: {
        teachers,
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
 * @desc    Get single teacher by ID
 * @route   GET /api/teachers/:id
 * @access  Private (Admin, Teacher - own profile)
 */
const getTeacherById = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('userId', 'name email role isActive avatar')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.',
        errors: ['Teacher ID does not match any record']
      });
    }

    // Role check: Teacher can only view their own profile
    if (
      req.user.role === ROLES.TEACHER &&
      teacher.email !== req.user.email &&
      (!teacher.userId || !teacher.userId.equals(req.user._id))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You may only view your own teacher profile.'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently logged in teacher's profile (derived purely from JWT)
 * @route   GET /api/teachers/me/profile
 * @access  Private (Teacher)
 */
const getMyTeacherProfile = async (req, res, next) => {
  try {
    const { getOrEnsureTeacherProfile } = require('../services/teacherService');
    const teacher = await getOrEnsureTeacherProfile(req.user);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'No teacher profile linked to your user account.'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update teacher information
 * @route   PUT /api/teachers/:id
 * @access  Private (Admin)
 */
const updateTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.'
      });
    }

    const previousData = {
      fullName: teacher.fullName,
      department: teacher.department,
      designation: teacher.designation,
      salaryPerDay: teacher.salaryPerDay,
      status: teacher.status
    };

    const {
      firstName,
      lastName,
      fullName,
      gender,
      nic,
      phone,
      address,
      dateOfBirth,
      dob,
      joiningDate,
      department,
      subject,
      designation,
      qualification,
      salaryPerDay,
      dailySalary,
      profileImage,
      profilePicture,
      emergencyContact,
      bankDetails,
      status,
      email,
      employeeId
    } = req.body;

    if (employeeId && employeeId.toUpperCase().trim() !== teacher.employeeId) {
      const duplicateEmpId = await Teacher.findOne({
        employeeId: employeeId.toUpperCase().trim(),
        _id: { $ne: teacher._id }
      });
      if (duplicateEmpId) {
        return res.status(409).json({
          success: false,
          message: `Employee ID '${employeeId}' is already in use by another teacher.`
        });
      }
      teacher.employeeId = employeeId.toUpperCase().trim();
    }

    if (email && email.toLowerCase().trim() !== teacher.email) {
      const duplicateEmail = await Teacher.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: teacher._id }
      });
      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message: `Email '${email}' is already registered to another teacher.`
        });
      }
      teacher.email = email.toLowerCase().trim();
    }

    if (firstName !== undefined) teacher.firstName = firstName.trim();
    if (lastName !== undefined) teacher.lastName = lastName.trim();
    if (fullName) {
      teacher.fullName = fullName.trim();
    } else if (firstName !== undefined || lastName !== undefined) {
      teacher.fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
    }
    if (gender !== undefined) teacher.gender = gender;
    if (nic !== undefined) teacher.nic = nic.trim();
    if (phone) teacher.phone = phone.trim();
    if (address !== undefined) teacher.address = address;
    if (dateOfBirth !== undefined) teacher.dateOfBirth = dateOfBirth;
    if (dob !== undefined) teacher.dateOfBirth = dob;
    if (joiningDate !== undefined) teacher.joiningDate = joiningDate;
    if (department) teacher.department = department.trim();
    if (subject !== undefined) teacher.subject = subject.trim();
    if (designation) teacher.designation = designation.trim();
    if (qualification !== undefined) teacher.qualification = qualification.trim();
    if (salaryPerDay !== undefined) teacher.salaryPerDay = Number(salaryPerDay);
    if (dailySalary !== undefined) teacher.salaryPerDay = Number(dailySalary);
    if (profileImage !== undefined || profilePicture !== undefined) {
      teacher.profilePicture = profileImage || profilePicture || '';
    }
    if (emergencyContact !== undefined) teacher.emergencyContact = emergencyContact;
    if (bankDetails !== undefined) teacher.bankDetails = bankDetails;
    if (status) teacher.status = status;

    teacher.updatedBy = req.user._id;

    await teacher.save();

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.TEACHER_UPDATED,
      module: AUDIT_MODULE.TEACHER,
      recordId: teacher._id,
      description: `Updated teacher details for ${teacher.fullName} (${teacher.employeeId})`,
      previousData,
      newData: {
        fullName: teacher.fullName,
        department: teacher.department,
        designation: teacher.designation,
        salaryPerDay: teacher.salaryPerDay,
        status: teacher.status
      },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Teacher details updated successfully',
      data: teacher
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk update status for teachers
 * @route   PATCH /api/teachers/bulk-status
 * @access  Private (Admin)
 */
const bulkUpdateStatus = async (req, res, next) => {
  try {
    const { teacherIds, status } = req.body;

    if (!Array.isArray(teacherIds) || teacherIds.length === 0 || !status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of teacherIds and a target status.'
      });
    }

    const upperStatus = status.toUpperCase();
    if (!Object.values(TEACHER_STATUS).includes(upperStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${Object.values(TEACHER_STATUS).join(', ')}`
      });
    }

    const result = await Teacher.updateMany(
      { _id: { $in: teacherIds } },
      { status: upperStatus, updatedBy: req.user._id }
    );

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.TEACHER_UPDATED,
      module: AUDIT_MODULE.TEACHER,
      description: `Bulk updated status to ${upperStatus} for ${result.modifiedCount} teachers`,
      newData: { teacherIds, status: upperStatus, count: result.modifiedCount },
      req
    });

    res.status(200).json({
      success: true,
      message: `Updated status to ${upperStatus} for ${result.modifiedCount} teacher(s).`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update single teacher status (Activate / Deactivate)
 * @route   PATCH /api/teachers/status/:id or /api/teachers/:id/status
 * @access  Private (Admin)
 */
const updateTeacherStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required (ACTIVE or INACTIVE).'
      });
    }

    const upperStatus = status.toUpperCase();
    if (!Object.values(TEACHER_STATUS).includes(upperStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${Object.values(TEACHER_STATUS).join(', ')}`
      });
    }

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.'
      });
    }

    const prevStatus = teacher.status;
    teacher.status = upperStatus;
    teacher.updatedBy = req.user._id;
    await teacher.save();

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: upperStatus === TEACHER_STATUS.ACTIVE ? AUDIT_ACTION.TEACHER_ACTIVATED : AUDIT_ACTION.TEACHER_DEACTIVATED,
      module: AUDIT_MODULE.TEACHER,
      recordId: teacher._id,
      description: `Teacher ${teacher.fullName} status updated from ${prevStatus} to ${upperStatus}`,
      previousData: { status: prevStatus },
      newData: { status: upperStatus },
      req
    });

    res.status(200).json({
      success: true,
      message: `Teacher status successfully updated to ${upperStatus}`,
      data: teacher
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate or Delete a teacher
 * @route   DELETE /api/teachers/:id
 * @access  Private (Admin)
 */
const deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.'
      });
    }

    const { hard } = req.query;

    if (hard === 'true') {
      await teacher.deleteOne();

      await logAction({
        userId: req.user._id,
        userEmail: req.user.email,
        role: req.user.role,
        action: AUDIT_ACTION.TEACHER_DELETED,
        module: AUDIT_MODULE.TEACHER,
        recordId: teacher._id,
        description: `Hard deleted teacher ${teacher.fullName} (${teacher.employeeId})`,
        previousData: { fullName: teacher.fullName, employeeId: teacher.employeeId },
        req
      });

      return res.status(200).json({
        success: true,
        message: `Teacher ${teacher.fullName} (${teacher.employeeId}) permanently deleted.`
      });
    }

    // Soft deactivation (default)
    teacher.status = TEACHER_STATUS.INACTIVE;
    teacher.updatedBy = req.user._id;
    await teacher.save();

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.TEACHER_DEACTIVATED,
      module: AUDIT_MODULE.TEACHER,
      recordId: teacher._id,
      description: `Deactivated teacher ${teacher.fullName} (${teacher.employeeId})`,
      newData: { status: TEACHER_STATUS.INACTIVE },
      req
    });

    res.status(200).json({
      success: true,
      message: `Teacher ${teacher.fullName} (${teacher.employeeId}) deactivated successfully.`,
      data: teacher
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get teacher activity timeline / audit trail
 * @route   GET /api/teachers/:id/timeline
 * @access  Private (Admin, Teacher - own)
 */
const getTeacherTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    if (
      req.user.role === ROLES.TEACHER &&
      teacher.email !== req.user.email &&
      (!teacher.userId || !teacher.userId.equals(req.user._id))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You may only view your own timeline.'
      });
    }

    const filter = {
      $or: [
        { recordId: teacher._id },
        ...(teacher.userId ? [{ userId: teacher.userId }] : [])
      ]
    };

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          employeeId: teacher.employeeId,
          fullName: teacher.fullName
        },
        timeline: logs
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get comprehensive statistics for a single teacher
 * @route   GET /api/teachers/:id/statistics
 * @access  Private (Admin, Teacher - own)
 */
const getTeacherStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);
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
        message: 'Access denied: You may only view your own statistics.'
      });
    }

    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();

    const attendanceStats = await Attendance.aggregate([
      { $match: { teacherId: teacher._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    let totalAttendance = 0;
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let holidayDays = 0;
    let weekendDays = 0;

    for (const item of attendanceStats) {
      totalAttendance += item.count;
      if (item._id === ATTENDANCE_STATUS.PRESENT) presentDays = item.count;
      if (item._id === ATTENDANCE_STATUS.ABSENT) absentDays = item.count;
      if (item._id === ATTENDANCE_STATUS.LEAVE) leaveDays = item.count;
      if (item._id === ATTENDANCE_STATUS.HOLIDAY) holidayDays = item.count;
      if (item._id === ATTENDANCE_STATUS.WEEKEND) weekendDays = item.count;
    }

    const workingMarked = presentDays + absentDays + leaveDays;
    const attendancePercentage = workingMarked > 0
      ? Number(((presentDays / workingMarked) * 100).toFixed(2))
      : 0;

    let currentMonthSalary = 0;
    let totalDeductions = 0;

    try {
      const salaryCalc = await calculateTeacherSalary(teacher._id, currentMonth, currentYear);
      currentMonthSalary = salaryCalc.netSalary;
      totalDeductions = salaryCalc.totalDeduction;
    } catch (err) {
      console.warn(`[Stats] Could not calculate real-time salary: ${err.message}`);
    }

    res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          employeeId: teacher.employeeId,
          fullName: teacher.fullName,
          department: teacher.department,
          designation: teacher.designation,
          status: teacher.status,
          joiningDate: teacher.joiningDate
        },
        totalAttendance,
        presentDays,
        absentDays,
        leaveDays,
        holidayDays,
        weekendDays,
        attendancePercentage,
        currentMonthSalary,
        totalDeductions
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  getMyTeacherProfile,
  updateTeacher,
  updateTeacherStatus,
  bulkUpdateStatus,
  deleteTeacher,
  getTeacherTimeline,
  getTeacherStatistics
};
