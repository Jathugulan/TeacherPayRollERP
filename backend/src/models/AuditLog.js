const mongoose = require('mongoose');
const { AUDIT_ACTION, AUDIT_MODULE } = require('../constants/salaryConfig');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for audit logging'],
      index: true
    },
    userEmail: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: ''
    },
    action: {
      type: String,
      enum: {
        values: Object.values(AUDIT_ACTION),
        message: '{VALUE} is not a valid audit action'
      },
      required: [true, 'Audit action is required'],
      index: true
    },
    module: {
      type: String,
      enum: {
        values: Object.values(AUDIT_MODULE),
        message: '{VALUE} is not a valid module name'
      },
      required: [true, 'Module is required'],
      index: true
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    // Snapshot of previous state (excluding passwords)
    previousData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    // Snapshot of new state (excluding passwords)
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    // Client IP address (best effort)
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user activity timeline
auditLogSchema.index({ userId: 1, createdAt: -1 });
// Module + action for reporting
auditLogSchema.index({ module: 1, action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
