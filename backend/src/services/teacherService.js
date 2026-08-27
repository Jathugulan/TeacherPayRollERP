const Teacher = require('../models/Teacher');
const { ROLES } = require('../constants/roles');
const { TEACHER_STATUS, SALARY_CONFIG } = require('../constants/salaryConfig');

/**
 * Generate next unique employee ID (e.g. EMP005)
 */
const generateUniqueEmployeeId = async () => {
  const count = await Teacher.countDocuments({});
  let candidateNum = count + 1;
  let candidateId = `EMP${String(candidateNum).padStart(3, '0')}`;
  
  let exists = await Teacher.findOne({ employeeId: candidateId });
  while (exists) {
    candidateNum++;
    candidateId = `EMP${String(candidateNum).padStart(3, '0')}`;
    exists = await Teacher.findOne({ employeeId: candidateId });
  }
  return candidateId;
};

/**
 * Ensure or auto-create a Teacher profile document for any user with role TEACHER
 */
const getOrEnsureTeacherProfile = async (user) => {
  if (!user) return null;

  let teacher = await Teacher.findOne({
    $or: [{ userId: user._id }, { email: user.email }]
  });

  if (!teacher && user.role === ROLES.TEACHER) {
    const employeeId = user.employeeId?.trim() || await generateUniqueEmployeeId();
    const fullName = user.fullName || user.name || user.email.split('@')[0] || 'Teacher';

    try {
      teacher = await Teacher.create({
        userId: user._id,
        employeeId: employeeId.toUpperCase(),
        fullName,
        email: user.email.toLowerCase().trim(),
        phone: user.phone?.trim() || '0770000000',
        schoolName: user.schoolName?.trim() || '',
        department: 'General',
        designation: 'Teacher',
        qualification: 'B.Ed / Faculty',
        salaryPerDay: SALARY_CONFIG?.DEFAULT_DAILY_SALARY || 500,
        profilePicture: user.avatar || user.picture || '',
        status: TEACHER_STATUS?.ACTIVE || 'ACTIVE',
        joiningDate: new Date()
      });

      if (!user.employeeId) {
        user.employeeId = employeeId.toUpperCase();
        await user.save();
      }
    } catch (err) {
      // In case of race condition / unique constraint, re-fetch
      teacher = await Teacher.findOne({
        $or: [{ userId: user._id }, { email: user.email }]
      });
      if (!teacher) {
        console.error('[TeacherService] Failed to auto-provision teacher profile:', err.message);
      }
    }
  }

  // If teacher exists but userId is not linked, link it
  if (teacher && !teacher.userId && user._id) {
    teacher.userId = user._id;
    await teacher.save();
  }

  return teacher;
};

module.exports = {
  generateUniqueEmployeeId,
  getOrEnsureTeacherProfile
};
