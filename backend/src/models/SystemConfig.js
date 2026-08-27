const mongoose = require('mongoose');

/**
 * SystemConfig stores key-value ERP configuration settings.
 * Keys:
 *   WEEKLY_OFF_DAYS   — Array of day numbers (0=Sun, 6=Sat). Default: [0, 6]
 *   DEFAULT_DAILY_SALARY — Number. Default: 500
 *   ALLOWED_LEAVE_DAYS   — Number. Default: 5
 *   ABSENCE_DEDUCTION_PER_DAY — Number. Default: 100
 *   EXTRA_LEAVE_DEDUCTION_PER_DAY — Number. Default: 100
 *   INSTITUTION_NAME  — String
 *   PAYROLL_DAY       — Number (day of month payroll is typically processed)
 */
const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Config key is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Config value is required']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

module.exports = SystemConfig;
