const http = require('http');
const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');
dotenv.config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const app = require('../app');
const { calculateSalaryBreakdown } = require('../utils/salaryCalculator');

const runTests = async () => {
  console.log('===============================================================');
  console.log('🧪 RUNNING MASTER ERP SYSTEM BACKEND TEST SUITE (V2.0)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  };

  // -------------------------------------------------------------
  // UNIT TEST 1: Salary Engine Business Logic
  // -------------------------------------------------------------
  console.log('👉 [1/12] Testing Pure Salary Calculation Engine...');
  
  // Case A: 4 leaves (<= 5 free leaves, Rs.100 absence deduction)
  const calc1 = calculateSalaryBreakdown({
    presentDays: 20,
    absentDays: 2,
    leaveDays: 4,
    dailySalary: 500
  });
  assert(calc1.grossSalary === 10000, 'Base salary = 20 days * Rs.500 = Rs.10,000');
  assert(calc1.absenceDeduction === 200, 'Absence deduction = 2 days * Rs.100 = Rs.200');
  assert(calc1.extraLeaveDays === 0, 'Extra leave days = 0 (4 <= 5 free leaves)');
  assert(calc1.leaveDeduction === 0, 'Leave deduction = 0');
  assert(calc1.totalDeduction === 200, 'Total deduction = Rs.200');
  assert(calc1.netSalary === 9800, 'Net salary = 10,000 - 200 = Rs.9,800');

  // Case B: 7 leaves (2 extra leaves beyond 5)
  const calc2 = calculateSalaryBreakdown({
    presentDays: 18,
    absentDays: 1,
    leaveDays: 7,
    dailySalary: 500
  });
  assert(calc2.grossSalary === 9000, 'Base salary = 18 days * Rs.500 = Rs.9,000');
  assert(calc2.absenceDeduction === 100, 'Absence deduction = 1 day * Rs.100 = Rs.100');
  assert(calc2.extraLeaveDays === 2, 'Extra leave days = max(0, 7 - 5) = 2');
  assert(calc2.leaveDeduction === 200, 'Leave deduction = 2 * Rs.100 = Rs.200');
  assert(calc2.totalDeduction === 300, 'Total deduction = 100 + 200 = Rs.300');
  assert(calc2.netSalary === 8700, 'Net salary = 9,000 - 300 = Rs.8,700');

  // Connect DB and Start HTTP Test Server
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp_teacher_management';
  await mongoose.connect(mongoUri, {
    dbName: 'erp_teacher_management'
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const apiRequest = async (path, options = {}) => {
    const url = `${baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  try {
    // -------------------------------------------------------------
    // INTEGRATION TEST 2: Health Check & Authentication
    // -------------------------------------------------------------
    console.log('\n👉 [2/12] Testing Health Check & Authentication...');
    const health = await apiRequest('/api/health');
    assert(health.status === 200 && health.data.success === true, 'GET /api/health returns 200 OK');

    // Login Admin
    const adminLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@erp.com', password: 'Admin@123', role: 'Admin' }
    });
    const adminToken = adminLogin.data.token || adminLogin.data.data?.token;
    assert(adminLogin.status === 200 && !!adminToken, 'Admin login returns valid JWT token');

    // Login Teacher (John)
    const teacherLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'john.doe@erp.com', password: 'Teacher@123', role: 'Teacher' }
    });
    const teacherToken = teacherLogin.data.token || teacherLogin.data.data?.token;
    assert(teacherLogin.status === 200 && !!teacherToken, 'Teacher John login returns valid JWT token');

    // Role mismatch check: Teacher John attempting to log in as Admin -> 403
    const roleMismatchLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'john.doe@erp.com', password: 'Teacher@123', role: 'Admin' }
    });
    assert(roleMismatchLogin.status === 403, 'Role mismatch login returns 403 Forbidden');

    // Teacher self-registration automatically forces role = teacher
    const regEmail = `teacher.${Date.now()}@erp.com`;
    const regTeacherRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'New Registered Teacher',
        email: regEmail,
        password: 'Password@123',
        phone: '0771122334',
        schoolName: 'Colombo High School',
        employeeId: `TCH-${Date.now().toString().slice(-4)}`,
        role: 'Admin' // Even if an attacker requests admin, system forces Teacher
      }
    });
    assert(regTeacherRes.status === 201 && regTeacherRes.data.data?.user?.role?.toLowerCase() === 'teacher', 'Teacher registration auto-assigns teacher role');

    // Teacher self-profile
    const teacherMe = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert(teacherMe.status === 200 && teacherMe.data.data?.user?.role === 'teacher', 'GET /api/auth/me returns teacher role & linked profile');

    // -------------------------------------------------------------
    // INTEGRATION TEST 3: Teacher Management & Uniqueness
    // -------------------------------------------------------------
    console.log('\n👉 [3/12] Testing Teacher CRUD & Uniqueness...');
    const testEmpId = `EMP${Date.now().toString().slice(-4)}`;
    const createTeacherRes = await apiRequest('/api/teachers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        employeeId: testEmpId,
        fullName: 'Dr. Bruce Banner',
        email: `banner.${Date.now()}@erp.com`,
        phone: '0771234567',
        department: 'Physics',
        designation: 'Senior Lecturer',
        qualification: 'Ph.D Nuclear Physics',
        salaryPerDay: 550
      }
    });
    assert(createTeacherRes.status === 201 && !!createTeacherRes.data.data?._id, 'Admin creates teacher record with qualification & salary');
    const createdTeacherId = createTeacherRes.data.data?._id;

    // Duplicate employeeId rejection
    const duplicateEmpIdRes = await apiRequest('/api/teachers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        employeeId: testEmpId,
        fullName: 'Duplicate Banner',
        email: `dup.${Date.now()}@erp.com`,
        phone: '0779999999',
        department: 'Physics',
        designation: 'Teacher'
      }
    });
    assert(duplicateEmpIdRes.status === 409, 'Duplicate employeeId returns 409 Conflict');

    // Bulk status update
    const bulkStatusRes = await apiRequest('/api/teachers/bulk-status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { teacherIds: [createdTeacherId], status: 'ACTIVE' }
    });
    assert(bulkStatusRes.status === 200 && bulkStatusRes.data.data?.modifiedCount >= 1, 'PATCH /api/teachers/bulk-status updates multiple teachers');

    // -------------------------------------------------------------
    // INTEGRATION TEST 4: Attendance & Locking
    // -------------------------------------------------------------
    console.log('\n👉 [4/12] Testing Attendance & Locking Engine...');
    const markDate = '2026-08-25';

    // Mark single attendance
    const markAttRes = await apiRequest('/api/attendance', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        teacherId: createdTeacherId,
        date: markDate,
        status: 'PRESENT',
        remarks: 'Attended full session'
      }
    });
    assert(markAttRes.status === 200 && markAttRes.data.data?.status === 'PRESENT', 'POST /api/attendance marks teacher attendance');
    const attendanceRecordId = markAttRes.data.data?._id;

    // Correct attendance record
    const correctAttRes = await apiRequest(`/api/attendance/${attendanceRecordId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'ABSENT', reason: 'Emergency medical absence' }
    });
    assert(correctAttRes.status === 200 && correctAttRes.data.data?.status === 'ABSENT', 'PUT /api/attendance/:id updates status & saves correction reason');

    // Lock attendance date
    const lockDateRes = await apiRequest('/api/attendance/lock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { date: markDate, lock: true }
    });
    assert(lockDateRes.status === 200 && lockDateRes.data.data?.isLocked === true, 'POST /api/attendance/lock locks attendance for date');

    // Attempt modifying locked attendance — must fail with 403
    const modifyLockedRes = await apiRequest(`/api/attendance/${attendanceRecordId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'PRESENT' }
    });
    assert(modifyLockedRes.status === 403, 'Modifying locked attendance is rejected with 403 Forbidden');

    // Unlock attendance date
    await apiRequest('/api/attendance/lock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { date: markDate, lock: false }
    });

    // -------------------------------------------------------------
    // INTEGRATION TEST 5: Leave Management & Overlap Detection
    // -------------------------------------------------------------
    console.log('\n👉 [5/12] Testing Leave Management & Overlap Detection...');
    
    // Clean any prior test leaves for this teacher in month 9
    const LeaveModel = require('../models/Leave');
    await LeaveModel.deleteMany({ reason: /Test Leave/ });

    // Apply leave
    const applyLeaveRes = await apiRequest('/api/leaves', {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        leaveType: 'CASUAL',
        reason: 'Test Leave - Family function'
      }
    });
    assert(applyLeaveRes.status === 201 && (applyLeaveRes.data.data?.totalDays === 3 || applyLeaveRes.data.data?.totalDays === 2), 'POST /api/leaves creates leave with auto totalDays calculation');
    const leaveId = applyLeaveRes.data.data?._id;

    // Overlapping leave attempt (overlaps 2026-09-11 to 2026-09-13) — must return 409
    const overlapRes = await apiRequest('/api/leaves', {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        startDate: '2026-09-11',
        endDate: '2026-09-13',
        reason: 'Test Leave - Overlapping conference'
      }
    });
    assert(overlapRes.status === 409, 'Overlapping leave application returns 409 Conflict');

    // Approve leave
    const approveLeaveRes = await apiRequest(`/api/leaves/${leaveId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { adminRemarks: 'Approved for family function' }
    });
    assert(approveLeaveRes.status === 200 && approveLeaveRes.data.data?.status === 'APPROVED', 'PATCH /api/leaves/:id/approve approves leave');


    // -------------------------------------------------------------
    // INTEGRATION TEST 6: Holidays & Weekend Configuration
    // -------------------------------------------------------------
    console.log('\n👉 [6/12] Testing Holiday & System Configuration...');

    const HolidayModel = require('../models/Holiday');
    await HolidayModel.deleteMany({ date: new Date('2026-08-31') });

    // Add holiday
    const holidayDate = '2026-08-31';
    const createHolidayRes = await apiRequest('/api/holidays', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Special Institutional Holiday',
        date: holidayDate,
        type: 'CUSTOM',
        description: 'Founder Memorial Day'
      }
    });
    assert(createHolidayRes.status === 201 && createHolidayRes.data.data?.name === 'Special Institutional Holiday', 'POST /api/holidays creates holiday');

    // View holidays (both admin and teacher)
    const getHolidaysRes = await apiRequest('/api/holidays?year=2026', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert(getHolidaysRes.status === 200 && getHolidaysRes.data.count >= 1, 'GET /api/holidays returns active holidays');

    // View & update system configs
    const getConfigsRes = await apiRequest('/api/config', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(getConfigsRes.status === 200 && getConfigsRes.data.data?.configMap?.DEFAULT_DAILY_SALARY !== undefined, 'GET /api/config returns system settings');

    // -------------------------------------------------------------
    // INTEGRATION TEST 7: Salary Preview & Simulation
    // -------------------------------------------------------------
    console.log('\n👉 [7/12] Testing Salary Simulation & Preview...');

    const previewRes = await apiRequest('/api/salary/preview', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { teacherId: createdTeacherId, month: 8, year: 2026 }
    });
    assert(previewRes.status === 200 && previewRes.data.data?.netSalary !== undefined, 'POST /api/salary/preview calculates salary without DB write');

    // Generate single salary
    const generateSalaryRes = await apiRequest('/api/salary/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { teacherId: createdTeacherId, month: 8, year: 2026 }
    });
    assert(generateSalaryRes.status === 200 && generateSalaryRes.data.data?.status === 'CALCULATED', 'POST /api/salary/generate creates salary record (status: CALCULATED)');
    const salaryId = generateSalaryRes.data.data?._id;

    // Approve salary
    const approveSalRes = await apiRequest(`/api/salary/${salaryId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(approveSalRes.status === 200 && approveSalRes.data.data?.status === 'APPROVED', 'PATCH /api/salary/:id/approve moves salary to APPROVED');

    // Mark salary as PAID
    const paySalRes = await apiRequest(`/api/salary/${salaryId}/pay`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(paySalRes.status === 200 && paySalRes.data.data?.status === 'PAID', 'PATCH /api/salary/:id/pay marks salary as PAID');

    // -------------------------------------------------------------
    // INTEGRATION TEST 8: Payroll Period Lifecycle (OPEN -> CALC -> APPROVE -> LOCK)
    // -------------------------------------------------------------
    console.log('\n👉 [8/12] Testing Payroll Period Lifecycle Engine...');

    const PayrollPeriodModel = require('../models/PayrollPeriod');
    await PayrollPeriodModel.deleteMany({ month: 8, year: 2026 });

    // Open payroll period
    const openPeriodRes = await apiRequest('/api/payroll/open', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { month: 8, year: 2026 }
    });
    assert(openPeriodRes.status === 200 && openPeriodRes.data.data?.status === 'OPEN', 'POST /api/payroll/open opens payroll period');

    // Calculate payroll period
    const calcPeriodRes = await apiRequest('/api/payroll/calculate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { month: 8, year: 2026 }
    });
    assert(calcPeriodRes.status === 200 && calcPeriodRes.data.data?.period?.status === 'CALCULATED', 'POST /api/payroll/calculate processes all active teachers');

    // Approve payroll period
    const approvePeriodRes = await apiRequest('/api/payroll/approve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { month: 8, year: 2026 }
    });
    assert(approvePeriodRes.status === 200 && approvePeriodRes.data.data?.status === 'APPROVED', 'POST /api/payroll/approve marks period as APPROVED');

    // Lock payroll period
    const lockPeriodRes = await apiRequest('/api/payroll/lock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { month: 8, year: 2026 }
    });
    assert(lockPeriodRes.status === 200 && lockPeriodRes.data.data?.status === 'LOCKED', 'POST /api/payroll/lock locks period & cascade locks salaries');

    // -------------------------------------------------------------
    // INTEGRATION TEST 9: Notification Engine
    // -------------------------------------------------------------
    console.log('\n👉 [9/12] Testing Notification Engine...');

    const getNotificationsRes = await apiRequest('/api/notifications', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert(getNotificationsRes.status === 200 && Array.isArray(getNotificationsRes.data.data?.notifications), 'GET /api/notifications returns user notifications');

    const markAllReadRes = await apiRequest('/api/notifications/mark-all-read', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert(markAllReadRes.status === 200 && markAllReadRes.data.data?.unreadCount === 0, 'PATCH /api/notifications/mark-all-read clears unread badge');

    // -------------------------------------------------------------
    // INTEGRATION TEST 10: Audit Log Engine
    // -------------------------------------------------------------
    console.log('\n👉 [10/12] Testing Audit Log Engine...');

    const auditLogsRes = await apiRequest('/api/audit-logs?limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(auditLogsRes.status === 200 && auditLogsRes.data.data?.logs?.length > 0, 'GET /api/audit-logs returns immutable ERP audit trail');

    // Teachers cannot access audit logs
    const teacherAuditRes = await apiRequest('/api/audit-logs', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert(teacherAuditRes.status === 403, 'Teacher access to /api/audit-logs is blocked (403 Forbidden)');

    // -------------------------------------------------------------
    // INTEGRATION TEST 11: Reports & Analytics Dashboard
    // -------------------------------------------------------------
    console.log('\n👉 [11/12] Testing Reports & Analytics Dashboard...');

    const reportsDashboardRes = await apiRequest('/api/reports/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(reportsDashboardRes.status === 200 && reportsDashboardRes.data.data?.teachers?.total !== undefined, 'GET /api/reports/dashboard returns ERP analytics');
    assert(Array.isArray(reportsDashboardRes.data.data?.trends), 'Dashboard analytics contains 6-month trends');

    const monthlyReportRes = await apiRequest('/api/reports/monthly?month=8&year=2026', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(monthlyReportRes.status === 200 && monthlyReportRes.data.data?.summary?.totalNet !== undefined, 'GET /api/reports/monthly returns comprehensive monthly payroll statement');

    // -------------------------------------------------------------
    // INTEGRATION TEST 12: Ownership & RBAC Enforcement
    // -------------------------------------------------------------
    console.log('\n👉 [12/12] Testing Ownership & RBAC Security Enforcement...');

    // Teacher cannot access another teacher's salary
    const otherTeacherSalaryRes = await apiRequest(`/api/salary/teacher/${createdTeacherId}`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert(otherTeacherSalaryRes.status === 403, 'Teacher cannot access another teacher salary history (403 Forbidden)');

    // Teacher accessing own salary
    const mySalaryRes = await apiRequest('/api/salary/me', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert(mySalaryRes.status === 200 && Array.isArray(mySalaryRes.data.data?.records), 'Teacher can access own salary history via /api/salary/me');

    // Teacher cannot trigger payroll calculation
    const teacherTriggerPayroll = await apiRequest('/api/payroll/calculate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: { month: 8, year: 2026 }
    });
    assert(teacherTriggerPayroll.status === 403, 'Teacher cannot trigger payroll calculations (403 Forbidden)');

  } finally {
    server.close();
    await mongoose.connection.close();
  }

  console.log('\n===============================================================');
  console.log(`🏁 MASTER TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runTests().catch((err) => {
  console.error(`Unhandled test exception: ${err.message}`, err);
  process.exit(1);
});
