const mongoose = require('mongoose');
const { SALARY_CONFIG, SALARY_STATUS } = require('../constants/salaryConfig');

const salarySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
      index: true
    },
    month: {
      type: Number,
      required: [true, 'Month is required (1-12)'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
      index: true
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      index: true
    },
    // Attendance breakdown
    totalWorkingDays: {
      type: Number,
      default: 0,
      min: 0
    },
    presentDays: {
      type: Number,
      default: 0,
      min: 0
    },
    absentDays: {
      type: Number,
      default: 0,
      min: 0
    },
    leaveDays: {
      type: Number,
      default: 0,
      min: 0
    },
    holidayDays: {
      type: Number,
      default: 0,
      min: 0
    },
    weekendDays: {
      type: Number,
      default: 0,
      min: 0
    },
    allowedLeaveDays: {
      type: Number,
      default: SALARY_CONFIG.ALLOWED_LEAVE_DAYS,
      min: 0
    },
    extraLeaveDays: {
      type: Number,
      default: 0,
      min: 0
    },
    // Salary computation
    dailySalary: {
      type: Number,
      default: SALARY_CONFIG.DEFAULT_DAILY_SALARY,
      min: 0
    },
    baseSalary: {
      type: Number,
      default: 0,
      min: 0
    },
    grossSalary: {
      type: Number,
      default: 0,
      min: 0
    },
    absenceDeduction: {
      type: Number,
      default: 0,
      min: 0
    },
    leaveDeduction: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDeduction: {
      type: Number,
      default: 0,
      min: 0
    },
    netSalary: {
      type: Number,
      default: 0,
      min: 0
    },
    // Lifecycle
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'CALCULATED', 'APPROVED', 'PAID', 'LOCKED'],
        message: '{VALUE} is not a valid salary status'
      },
      default: 'CALCULATED',
      index: true
    },
    // Snapshot versioning — prevents historical changes
    calculationVersion: {
      type: Number,
      default: 1,
      min: 1
    },
    // Audit trail
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    paymentMethod: {
      type: String,
      default: 'BANK_TRANSFER'
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate salary records for same teacher in same month/year
salarySchema.index({ teacherId: 1, month: 1, year: 1 }, { unique: true });

// Useful query indexes
salarySchema.index({ month: 1, year: 1, status: 1 });
salarySchema.index({ teacherId: 1, status: 1 });

const Salary = mongoose.model('Salary', salarySchema);

module.exports = Salary;
