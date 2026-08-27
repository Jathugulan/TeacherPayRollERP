const mongoose = require('mongoose');
const { ATTENDANCE_STATUS } = require('../constants/salaryConfig');

const correctionEntrySchema = new mongoose.Schema(
  {
    previousStatus: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS)
    },
    newStatus: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS)
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
      index: true
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ATTENDANCE_STATUS),
        message: '{VALUE} is not a valid attendance status'
      },
      required: [true, 'Attendance status is required'],
      default: ATTENDANCE_STATUS.PRESENT
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    // Locking — prevents edits once Admin locks a date
    isLocked: {
      type: Boolean,
      default: false,
      index: true
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
    // Correction history — every status change is audited
    correctionHistory: {
      type: [correctionEntrySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: Prevent duplicate attendance for same teacher on same date
attendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });

// Useful query indexes
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ teacherId: 1, date: 1, isLocked: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
