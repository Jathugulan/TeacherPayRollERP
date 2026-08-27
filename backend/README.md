# ERP Teacher Attendance & Salary Management System - REST API

A modular, scalable, and secure RESTful backend for the **ERP Teacher Attendance & Salary Management System** (MERN Stack).

---

## 🚀 Key Specifications & Environment

- **Backend Base URL**: `http://localhost:5000`
- **API Prefix**: `http://localhost:5000/api`
- **Frontend Allowed Origins (CORS)**: `http://localhost:5173`, `http://localhost:5174`, `http://localhost:3000`
- **Authentication**: Bearer Token JWT (`Authorization: Bearer <TOKEN>`) + Google OAuth ID Token verification via `google-auth-library`
- **Database**: MongoDB / Mongoose with connection pooling and DNS SRV support

---

## 💼 Business Rules & Salary Engine

- **Daily Rate**: Rs. 500
- **Present Day**: Rs. 500 earned
- **Absent Day Deduction**: Rs. 100 deduction
- **Free Allowed Leaves**: Up to 5 approved leave days per month without deduction
- **Excess Leave Deduction**: Rs. 100 deduction for each leave day beyond 5 days
- **Salary Calculation Formulas**:
  $$\text{baseSalary} = \text{totalPresentDays} \times 500$$
  $$\text{absenceDeduction} = \text{totalAbsentDays} \times 100$$
  $$\text{extraLeaveDays} = \max(0, \text{totalLeaveDays} - 5)$$
  $$\text{extraLeaveDeduction} = \text{extraLeaveDays} \times 100$$
  $$\text{totalDeduction} = \text{absenceDeduction} + \text{extraLeaveDeduction}$$
  $$\text{netSalary} = \max(0, \text{baseSalary} - \text{totalDeduction})$$

---

## 🔒 Role-Based Permissions (RBAC)

| Resource / Endpoint | HTTP Method | Admin | HR | Accountant | Teacher |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Auth** | | | | | |
| `/api/auth/register` | `POST` | ✅ | ❌ | ❌ | ❌ |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/google` | `POST` | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/me` | `GET` | ✅ | ✅ | ✅ | ✅ |
| **Teachers** | | | | | |
| `/api/teachers` | `POST` | ✅ | ✅ | ❌ | ❌ |
| `/api/teachers` | `GET` | ✅ | ✅ | ✅ | ❌ |
| `/api/teachers/:id` | `GET` | ✅ | ✅ | ✅ | ✅ (Own) |
| `/api/teachers/me/profile` | `GET` | ❌ | ❌ | ❌ | ✅ |
| `/api/teachers/:id` | `PUT` | ✅ | ✅ | ❌ | ❌ |
| `/api/teachers/:id` | `DELETE` | ✅ | ❌ | ❌ | ❌ |
| `/api/teachers/:id/statistics` | `GET` | ✅ | ✅ | ✅ | ✅ (Own) |
| `/api/teachers/:id/attendance` | `GET` | ✅ | ✅ | ✅ | ✅ (Own) |
| `/api/teachers/:id/salary` | `GET` | ✅ | ❌ | ✅ | ✅ (Own) |
| **Attendance** | | | | | |
| `/api/attendance` | `POST` | ✅ | ✅ | ❌ | ❌ |
| `/api/attendance/bulk` | `POST` | ✅ | ✅ | ❌ | ❌ |
| `/api/attendance` | `GET` | ✅ | ✅ | ✅ | ❌ |
| `/api/attendance/today` | `GET` | ✅ | ✅ | ✅ | ❌ |
| `/api/attendance/summary` | `GET` | ✅ | ✅ | ✅ | ❌ |
| `/api/attendance/teacher/:id`| `GET` | ✅ | ✅ | ✅ | ✅ (Own) |
| `/api/attendance/:id` | `PUT` | ✅ | ✅ | ❌ | ❌ |
| **Leaves** | | | | | |
| `/api/leaves` | `POST` | ✅ | ✅ | ❌ | ✅ |
| `/api/leaves` | `GET` | ✅ | ✅ | ❌ | ❌ |
| `/api/leaves/me` | `GET` | ❌ | ❌ | ❌ | ✅ |
| `/api/leaves/summary/:teacherId` | `GET` | ✅ | ✅ | ✅ | ✅ (Own) |
| `/api/leaves/teacher/:id` | `GET` | ✅ | ✅ | ✅ | ✅ (Own) |
| `/api/leaves/:id/approve` | `PATCH` | ✅ | ✅ | ❌ | ❌ |
| `/api/leaves/:id/reject` | `PATCH` | ✅ | ✅ | ❌ | ❌ |
| **Salary** | | | | | |
| `/api/salary/calculate/:id` | `GET` | ✅ | ❌ | ✅ | ❌ |
| `/api/salary/generate` | `POST` | ✅ | ❌ | ✅ | ❌ |
| `/api/salary/generate-all` | `POST` | ✅ | ❌ | ✅ | ❌ |
| `/api/salary` | `GET` | ✅ | ❌ | ✅ | ❌ |
| `/api/salary/summary` | `GET` | ✅ | ❌ | ✅ | ❌ |
| `/api/salary/me` | `GET` | ❌ | ❌ | ❌ | ✅ |
| `/api/salary/:id/status` | `PUT` | ✅ | ❌ | ✅ | ❌ |
| **Dashboard & Search** | | | | | |
| `/api/dashboard/overview` | `GET` | ✅ | ✅ | ✅ | ❌ |
| `/api/dashboard/stats` | `GET` | ✅ | ✅ | ✅ | ❌ |
| `/api/search` | `GET` | ✅ | ✅ | ✅ | ❌ |

---

## 📡 REST API Reference & Examples

### 1. Authentication
#### `POST /api/auth/google`
**Request:**
```json
{
  "token": "GOOGLE_ID_TOKEN"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "66c5e219...",
    "name": "Alex Turner",
    "email": "alex.turner@erp.com",
    "picture": "https://lh3.googleusercontent.com/...",
    "role": "teacher"
  }
}
```

---

### 2. Teacher APIs
#### `POST /api/teachers`
**Request:**
```json
{
  "employeeId": "EMP001",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "0771234567",
  "address": "Colombo",
  "joiningDate": "2026-08-01",
  "department": "ICT",
  "designation": "Teacher",
  "salaryPerDay": 500
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "Teacher created successfully",
  "data": {
    "_id": "66c5e34...",
    "employeeId": "EMP001",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "0771234567",
    "department": "ICT",
    "designation": "Teacher",
    "salaryPerDay": 500,
    "status": "ACTIVE"
  }
}
```

#### `GET /api/teachers/:id/statistics`
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "teacher": {
      "id": "66c5e34...",
      "employeeId": "EMP001",
      "fullName": "John Doe",
      "department": "ICT",
      "designation": "Teacher",
      "status": "ACTIVE"
    },
    "totalAttendance": 26,
    "presentDays": 20,
    "absentDays": 2,
    "leaveDays": 4,
    "attendancePercentage": 76.92,
    "currentMonthSalary": 9800,
    "totalDeductions": 200
  }
}
```

---

### 3. Attendance APIs
#### `POST /api/attendance/bulk`
**Request:**
```json
{
  "date": "2026-08-21",
  "records": [
    { "teacherId": "66c5e34...", "status": "PRESENT" },
    { "teacherId": "66c5e35...", "status": "ABSENT" }
  ]
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bulk attendance processed. 2 records updated/inserted, 0 invalid.",
  "data": {
    "totalReceived": 2,
    "successfulCount": 2,
    "failedCount": 0,
    "failed": []
  }
}
```

#### `GET /api/attendance/today`
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2026-08-21T00:00:00.000Z",
    "totalTeachers": 4,
    "present": 4,
    "absent": 0,
    "leave": 0,
    "notMarked": 0
  }
}
```

#### `GET /api/attendance/summary?month=8&year=2026`
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "month": 8,
    "year": 2026,
    "totalTeachers": 4,
    "present": 77,
    "absent": 7,
    "leave": 17,
    "attendancePercentage": 76.24
  }
}
```

---

### 4. Leave APIs
#### `POST /api/leaves`
**Request:**
```json
{
  "teacherId": "66c5e34...",
  "startDate": "2026-08-20",
  "endDate": "2026-08-25",
  "reason": "Personal"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "Leave application submitted successfully",
  "data": {
    "_id": "66c5e40...",
    "teacherId": {
      "employeeId": "EMP001",
      "fullName": "John Doe"
    },
    "startDate": "2026-08-20T00:00:00.000Z",
    "endDate": "2026-08-25T00:00:00.000Z",
    "totalDays": 6,
    "reason": "Personal",
    "status": "PENDING"
  }
}
```

#### `PATCH /api/leaves/:id/approve`
**Request:**
```json
{
  "adminRemarks": "Approved by HOD"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Leave application approved successfully",
  "data": {
    "_id": "66c5e40...",
    "status": "APPROVED",
    "approvedAt": "2026-08-21T13:00:00.000Z"
  }
}
```

#### `GET /api/leaves/summary/:teacherId`
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "teacherId": "66c5e34...",
    "employeeId": "EMP001",
    "month": 8,
    "year": 2026,
    "allowedLeaveDays": 5,
    "usedLeaveDays": 4,
    "remainingLeaveDays": 1,
    "extraLeaveDays": 0,
    "extraLeaveDeduction": 0
  }
}
```

---

### 5. Salary APIs
#### `GET /api/salary/calculate/:teacherId?month=8&year=2026`
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "teacherId": "66c5e34...",
    "employeeId": "EMP001",
    "month": 8,
    "year": 2026,
    "presentDays": 20,
    "absentDays": 2,
    "leaveDays": 3,
    "dailySalary": 500,
    "grossSalary": 10000,
    "absenceDeduction": 200,
    "extraLeaveDays": 0,
    "leaveDeduction": 0,
    "totalDeduction": 200,
    "netSalary": 9800
  }
}
```

#### `POST /api/salary/generate-all`
**Request:**
```json
{
  "month": 8,
  "year": 2026
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payroll processed for 4 teacher(s).",
  "data": {
    "numberProcessed": 4,
    "successfulCount": 4,
    "failedCount": 0,
    "salaryTotals": {
      "grossSalary": 39500,
      "totalDeductions": 1000,
      "netSalary": 38500
    }
  }
}
```

#### `GET /api/salary/summary?month=8&year=2026`
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "month": 8,
    "year": 2026,
    "totalTeachers": 4,
    "grossSalary": 39500,
    "absenceDeductions": 700,
    "leaveDeductions": 300,
    "totalDeductions": 1000,
    "netSalary": 38500,
    "averageSalary": 9625
  }
}
```

---

### 6. Dashboard & Search APIs
#### `GET /api/dashboard/overview`
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "teachers": {
      "total": 4,
      "active": 4
    },
    "attendance": {
      "presentToday": 4,
      "absentToday": 0,
      "leaveToday": 0,
      "notMarked": 0
    },
    "leave": {
      "pending": 1
    },
    "salary": {
      "currentMonth": 38500,
      "deductions": 1000
    }
  }
}
```

#### `GET /api/search?q=john`
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "query": "john",
    "resultsCount": 1,
    "teachers": [
      {
        "_id": "66c5e34...",
        "employeeId": "EMP001",
        "fullName": "John Doe",
        "email": "john.doe@erp.com",
        "phone": "0771234567",
        "department": "ICT",
        "designation": "Teacher",
        "salaryPerDay": 500,
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

## 📮 Postman Collection Import

Import `ERP_Teacher_Management.postman_collection.json` into Postman. It includes:
- Configured collection variables (`baseUrl`, `adminToken`, `teacherToken`, `teacherId`, `leaveId`)
- Pre-built requests for all 23+ endpoints
- Auto-token assignment test scripts for fast testing

---

## 🛠️ Testing & Seeding Commands

```bash
# Seed the database
npm run seed

# Run automated 36-step test suite
npm run test:api

# Start development server
npm run dev
```
