const mongoose = require('mongoose');
const { LEAVE_STATUS, LEAVE_TYPE } = require('../constants/salaryConfig');

const leaveSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
      index: true
    },
    startDate: {
      type: Date,
      required: [true, 'Leave start date is required'],
      index: true
    },
    endDate: {
      type: Date,
      required: [true, 'Leave end date is required']
    },
    totalDays: {
      type: Number,
      required: [true, 'Total leave days is required'],
      min: [0.5, 'Total leave days must be at least 0.5']
    },
    leaveType: {
      type: String,
      enum: {
        values: [
          'Casual Leave',
          'Medical Leave',
          'Annual Leave',
          'Emergency Leave',
          'Duty Leave',
          'CASUAL',
          'MEDICAL',
          'ANNUAL',
          'EMERGENCY',
          'DUTY',
          'SICK',
          'PERSONAL',
          'OTHER'
        ],
        message: '{VALUE} is not a valid leave type'
      },
      default: 'Casual Leave'
    },
    reason: {
      type: String,
      required: [true, 'Reason for leave is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: Object.values(LEAVE_STATUS),
        message: '{VALUE} is not a valid leave status'
      },
      default: LEAVE_STATUS.PENDING,
      index: true
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    adminRemarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying teacher leaves by date
leaveSchema.index({ teacherId: 1, startDate: 1, status: 1 });
// Index for overlap detection
leaveSchema.index({ teacherId: 1, startDate: 1, endDate: 1 });

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
