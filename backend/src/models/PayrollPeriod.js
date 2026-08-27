const mongoose = require('mongoose');
const { PAYROLL_STATUS } = require('../constants/salaryConfig');

const payrollPeriodSchema = new mongoose.Schema(
  {
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
    startDate: {
      type: Date,
      required: [true, 'Payroll period start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'Payroll period end date is required']
    },
    status: {
      type: String,
      enum: {
        values: Object.values(PAYROLL_STATUS),
        message: '{VALUE} is not a valid payroll period status'
      },
      default: PAYROLL_STATUS.OPEN,
      index: true
    },
    // Counts snapshot
    totalTeachers: {
      type: Number,
      default: 0
    },
    processedCount: {
      type: Number,
      default: 0
    },
    totalNetSalary: {
      type: Number,
      default: 0
    },
    totalDeductions: {
      type: Number,
      default: 0
    },
    // Lifecycle audit
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    generatedAt: {
      type: Date,
      default: null
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
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lockedAt: {
      type: Date,
      default: null
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

// One payroll period per month/year
payrollPeriodSchema.index({ month: 1, year: 1 }, { unique: true });

const PayrollPeriod = mongoose.model('PayrollPeriod', payrollPeriodSchema);

module.exports = PayrollPeriod;
