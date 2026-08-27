const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');
dotenv.config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Salary = require('../models/Salary');
const Holiday = require('../models/Holiday');
const SystemConfig = require('../models/SystemConfig');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const PayrollPeriod = require('../models/PayrollPeriod');
const { ROLES } = require('../constants/roles');
const {
  ATTENDANCE_STATUS,
  LEAVE_STATUS,
  LEAVE_TYPE,
  TEACHER_STATUS,
  HOLIDAY_TYPE,
  NOTIFICATION_TYPE,
  PAYROLL_STATUS,
  AUDIT_ACTION,
  AUDIT_MODULE
} = require('../constants/salaryConfig');
const { normalizeDate } = require('../services/attendanceService');
const { generateTeacherSalaryRecord } = require('../services/salaryService');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp_teacher_management';
    await mongoose.connect(mongoUri, {
      dbName: 'erp_teacher_management'
    });
    console.log(`[Seed] Connected to MongoDB: ${mongoUri}`);

    // Clear existing collections
    console.log('[Seed] Cleaning existing ERP collections...');
    await Promise.all([
      User.deleteMany({}),
      Teacher.deleteMany({}),
      Attendance.deleteMany({}),
      Leave.deleteMany({}),
      Salary.deleteMany({}),
      Holiday.deleteMany({}),
      SystemConfig.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      PayrollPeriod.deleteMany({})
    ]);

    // 1. Seed System Configuration
    console.log('[Seed] Seeding System Configurations...');
    await SystemConfig.insertMany([
      { key: 'WEEKLY_OFF_DAYS', value: [0, 6], description: 'Weekly off days (0=Sunday, 6=Saturday)' },
      { key: 'DEFAULT_DAILY_SALARY', value: 500, description: 'Default daily salary in INR' },
      { key: 'ALLOWED_LEAVE_DAYS', value: 5, description: 'Free leave allowance days per month' },
      { key: 'ABSENCE_DEDUCTION_PER_DAY', value: 100, description: 'Deduction per unexcused absent day' },
      { key: 'EXTRA_LEAVE_DEDUCTION_PER_DAY', value: 100, description: 'Deduction per extra leave day exceeding quota' },
      { key: 'INSTITUTION_NAME', value: 'Teacher ERP Academy', description: 'Institution name for reports' },
      { key: 'PAYROLL_DAY', value: 28, description: 'Day of month payroll is processed' }
    ]);

    // 2. Create Core Users (ADMIN + TEACHERS only)
    console.log('[Seed] Creating core ERP users (Admin + Teachers)...');
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@erp.com',
      password: 'Admin@123',
      role: ROLES.ADMIN,
      isActive: true
    });

    const teacherUser1 = await User.create({
      name: 'John Doe',
      email: 'john.doe@erp.com',
      password: 'Teacher@123',
      role: ROLES.TEACHER,
      isActive: true
    });

    const teacherUser2 = await User.create({
      name: 'Sarah Smith',
      email: 'sarah.smith@erp.com',
      password: 'Teacher@123',
      role: ROLES.TEACHER,
      isActive: true
    });

    const teacherUser3 = await User.create({
      name: 'David Wilson',
      email: 'david.wilson@erp.com',
      password: 'Teacher@123',
      role: ROLES.TEACHER,
      isActive: true
    });

    const teacherUser4 = await User.create({
      name: 'Emily Davis',
      email: 'emily.davis@erp.com',
      password: 'Teacher@123',
      role: ROLES.TEACHER,
      isActive: true
    });

    // 3. Create Teacher Profiles
    console.log('[Seed] Creating Teacher profiles...');
    const teacher1 = await Teacher.create({
      userId: teacherUser1._id,
      employeeId: 'EMP001',
      fullName: 'John Doe',
      email: 'john.doe@erp.com',
      phone: '0771234567',
      address: 'Colombo',
      dateOfBirth: new Date('1988-04-12'),
      joiningDate: new Date('2021-01-15'),
      department: 'ICT',
      designation: 'Senior Teacher',
      qualification: 'B.Sc Computer Science, M.Ed',
      emergencyContact: { name: 'Mary Doe', relationship: 'Spouse', phone: '0779998877' },
      bankDetails: { accountName: 'John Doe', accountNumber: '1234567890', bankName: 'Commercial Bank', ifscOrRoutingCode: 'COMB001' },
      salaryPerDay: 500,
      status: TEACHER_STATUS.ACTIVE,
      createdBy: adminUser._id
    });

    const teacher2 = await Teacher.create({
      userId: teacherUser2._id,
      employeeId: 'EMP002',
      fullName: 'Sarah Smith',
      email: 'sarah.smith@erp.com',
      phone: '0771234568',
      address: 'Kandy',
      dateOfBirth: new Date('1990-08-23'),
      joiningDate: new Date('2022-03-01'),
      department: 'Mathematics',
      designation: 'Teacher',
      qualification: 'B.Sc Mathematics',
      emergencyContact: { name: 'Robert Smith', relationship: 'Father', phone: '0778887766' },
      bankDetails: { accountName: 'Sarah Smith', accountNumber: '9876543210', bankName: 'Hatton National Bank', ifscOrRoutingCode: 'HNTB002' },
      salaryPerDay: 500,
      status: TEACHER_STATUS.ACTIVE,
      createdBy: adminUser._id
    });

    const teacher3 = await Teacher.create({
      userId: teacherUser3._id,
      employeeId: 'EMP003',
      fullName: 'David Wilson',
      email: 'david.wilson@erp.com',
      phone: '0771234569',
      address: 'Galle',
      dateOfBirth: new Date('1985-11-05'),
      joiningDate: new Date('2019-08-10'),
      department: 'Physics',
      designation: 'Head of Department',
      qualification: 'Ph.D Physics',
      emergencyContact: { name: 'Linda Wilson', relationship: 'Spouse', phone: '0777776655' },
      bankDetails: { accountName: 'David Wilson', accountNumber: '5544332211', bankName: 'Sampath Bank', ifscOrRoutingCode: 'SMPB003' },
      salaryPerDay: 600,
      status: TEACHER_STATUS.ACTIVE,
      createdBy: adminUser._id
    });

    const teacher4 = await Teacher.create({
      userId: teacherUser4._id,
      employeeId: 'EMP004',
      fullName: 'Emily Davis',
      email: 'emily.davis@erp.com',
      phone: '0771234570',
      address: 'Jaffna',
      dateOfBirth: new Date('1992-02-17'),
      joiningDate: new Date('2023-05-15'),
      department: 'English Literature',
      designation: 'Teacher',
      qualification: 'BA English Honours',
      emergencyContact: { name: 'James Davis', relationship: 'Brother', phone: '0776665544' },
      bankDetails: { accountName: 'Emily Davis', accountNumber: '6677889900', bankName: 'Bank of Ceylon', ifscOrRoutingCode: 'BCEY004' },
      salaryPerDay: 500,
      status: TEACHER_STATUS.ACTIVE,
      createdBy: adminUser._id
    });

    // 4. Seed Holidays
    console.log('[Seed] Seeding National & Custom Holidays...');
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    await Holiday.insertMany([
      {
        name: 'National Independence Day',
        date: new Date(Date.UTC(currentYear, currentMonth - 1, 4)),
        description: 'National public holiday commemorating freedom and unity.',
        type: HOLIDAY_TYPE.NATIONAL,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Institutional Foundation Day',
        date: new Date(Date.UTC(currentYear, currentMonth - 1, 15)),
        description: 'Annual institutional celebration holiday for all faculty.',
        type: HOLIDAY_TYPE.CUSTOM,
        isActive: true,
        createdBy: adminUser._id
      }
    ]);

    // 5. Create Attendance Records for current month
    console.log('[Seed] Generating attendance records for the month...');
    const teachersConfig = [
      { teacher: teacher1, presentCount: 18, absentCount: 2, leaveCount: 4 },
      { teacher: teacher2, presentCount: 16, absentCount: 1, leaveCount: 7 }, // 7 leaves: 5 free + 2 extra
      { teacher: teacher3, presentCount: 22, absentCount: 0, leaveCount: 0 },
      { teacher: teacher4, presentCount: 14, absentCount: 4, leaveCount: 6 }  // 6 leaves: 5 free + 1 extra
    ];

    for (const item of teachersConfig) {
      let day = 1;

      for (let i = 0; i < item.presentCount; i++) {
        const attDate = normalizeDate(new Date(Date.UTC(currentYear, currentMonth - 1, day)));
        await Attendance.create({
          teacherId: item.teacher._id,
          date: attDate,
          status: ATTENDANCE_STATUS.PRESENT,
          markedBy: adminUser._id,
          remarks: 'Regular schedule'
        });
        day++;
      }

      for (let i = 0; i < item.absentCount; i++) {
        const attDate = normalizeDate(new Date(Date.UTC(currentYear, currentMonth - 1, day)));
        await Attendance.create({
          teacherId: item.teacher._id,
          date: attDate,
          status: ATTENDANCE_STATUS.ABSENT,
          markedBy: adminUser._id,
          remarks: 'Uninformed absence'
        });
        day++;
      }

      for (let i = 0; i < item.leaveCount; i++) {
        const attDate = normalizeDate(new Date(Date.UTC(currentYear, currentMonth - 1, day)));
        await Attendance.create({
          teacherId: item.teacher._id,
          date: attDate,
          status: ATTENDANCE_STATUS.LEAVE,
          markedBy: adminUser._id,
          remarks: 'Approved leave'
        });
        day++;
      }
    }

    // 6. Create Leaves
    console.log('[Seed] Creating Leave requests...');
    await Leave.create({
      teacherId: teacher1._id,
      startDate: new Date(Date.UTC(currentYear, currentMonth - 1, 23)),
      endDate: new Date(Date.UTC(currentYear, currentMonth - 1, 26)),
      totalDays: 4,
      leaveType: LEAVE_TYPE.CASUAL,
      reason: 'Family event attendance',
      status: LEAVE_STATUS.APPROVED,
      appliedBy: teacherUser1._id,
      approvedBy: adminUser._id,
      approvedAt: new Date()
    });

    await Leave.create({
      teacherId: teacher2._id,
      startDate: new Date(Date.UTC(currentYear, currentMonth - 1, 20)),
      endDate: new Date(Date.UTC(currentYear, currentMonth - 1, 26)),
      totalDays: 7,
      leaveType: LEAVE_TYPE.MEDICAL,
      reason: 'Medical recovery',
      status: LEAVE_STATUS.APPROVED,
      appliedBy: teacherUser2._id,
      approvedBy: adminUser._id,
      approvedAt: new Date()
    });

    await Leave.create({
      teacherId: teacher4._id,
      startDate: new Date(Date.UTC(currentYear, currentMonth, 1)),
      endDate: new Date(Date.UTC(currentYear, currentMonth, 3)),
      totalDays: 3,
      leaveType: LEAVE_TYPE.PERSONAL,
      reason: 'Research symposium attendance',
      status: LEAVE_STATUS.PENDING,
      appliedBy: teacherUser4._id
    });

    // 7. Generate Monthly Salaries & Payroll Period
    console.log('[Seed] Generating monthly salary records & Payroll Period...');
    for (const item of teachersConfig) {
      await generateTeacherSalaryRecord(item.teacher._id, currentMonth, currentYear, adminUser._id, false);
    }

    const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const endDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

    await PayrollPeriod.create({
      month: currentMonth,
      year: currentYear,
      startDate,
      endDate,
      status: PAYROLL_STATUS.CALCULATED,
      totalTeachers: 4,
      processedCount: 4,
      generatedBy: adminUser._id,
      generatedAt: new Date()
    });

    // 8. Seed Notifications
    console.log('[Seed] Creating initial user notifications...');
    await Notification.insertMany([
      {
        recipient: teacherUser1._id,
        title: 'Leave Approved ✅',
        message: 'Your leave application for 4 days has been approved.',
        type: NOTIFICATION_TYPE.LEAVE_APPROVED,
        isRead: false,
        link: '/leaves'
      },
      {
        recipient: teacherUser2._id,
        title: 'Salary Calculated 💰',
        message: `Your salary for ${now.toLocaleString('default', { month: 'long' })} ${currentYear} has been calculated. Net payout: Rs. 8,800.`,
        type: NOTIFICATION_TYPE.SALARY_CALCULATED,
        isRead: false,
        link: '/salary'
      },
      {
        recipient: adminUser._id,
        title: 'New Leave Request',
        message: 'Emily Davis has submitted a new leave request (3 days) awaiting approval.',
        type: NOTIFICATION_TYPE.LEAVE_SUBMITTED,
        isRead: false,
        link: '/leaves'
      }
    ]);

    // 9. Seed Audit Logs
    console.log('[Seed] Creating initial Audit Log entries...');
    await AuditLog.insertMany([
      {
        userId: adminUser._id,
        userEmail: adminUser.email,
        role: adminUser.role,
        action: AUDIT_ACTION.TEACHER_CREATED,
        module: AUDIT_MODULE.TEACHER,
        description: 'System seeded 4 active teacher records',
        recordId: teacher1._id
      },
      {
        userId: adminUser._id,
        userEmail: adminUser.email,
        role: adminUser.role,
        action: AUDIT_ACTION.PAYROLL_CALCULATED,
        module: AUDIT_MODULE.PAYROLL,
        description: `Calculated initial payroll for ${currentMonth}/${currentYear}`
      }
    ]);

    console.log('\n=============================================================');
    console.log('✅ ERP DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=============================================================');
    console.log('Default Credentials (ONLY TWO ROLES: ADMIN & TEACHER):');
    console.log('  👑 Admin:      admin@erp.com       / Admin@123');
    console.log('  👨‍🏫 Teacher 1:  john.doe@erp.com    / Teacher@123 (EMP001)');
    console.log('  👩‍🏫 Teacher 2:  sarah.smith@erp.com  / Teacher@123 (EMP002 - 7 leaves: 5 free + 2 extra => Rs.200 leave ded)');
    console.log('  👨‍🏫 Teacher 3:  david.wilson@erp.com / Teacher@123 (EMP003 - Rs.600/day HOD)');
    console.log('  👩‍🏫 Teacher 4:  emily.davis@erp.com  / Teacher@123 (EMP004 - 6 leaves: 5 free + 1 extra => Rs.100 leave ded)');
    console.log('=============================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error]: ${error.message}`);
    process.exit(1);
  }
};

seedData();
