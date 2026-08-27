const SystemConfig = require('../models/SystemConfig');
const { invalidateWeekendCache } = require('../services/holidayService');
const { logAction } = require('../services/auditService');
const { AUDIT_ACTION, AUDIT_MODULE } = require('../constants/salaryConfig');

// Default initial config seed values
const DEFAULT_CONFIGS = [
  { key: 'WEEKLY_OFF_DAYS', value: [0, 6], description: 'Weekly off days (0=Sunday, 6=Saturday)' },
  { key: 'DEFAULT_DAILY_SALARY', value: 500, description: 'Default daily salary in INR' },
  { key: 'ALLOWED_LEAVE_DAYS', value: 5, description: 'Free leave allowance days per month' },
  { key: 'ABSENCE_DEDUCTION_PER_DAY', value: 100, description: 'Deduction per unexcused absent day' },
  { key: 'EXTRA_LEAVE_DEDUCTION_PER_DAY', value: 100, description: 'Deduction per extra leave day exceeding quota' },
  { key: 'INSTITUTION_NAME', value: 'Teacher ERP Academy', description: 'Institution name for reports' },
  { key: 'PAYROLL_DAY', value: 28, description: 'Day of the month payroll calculation is scheduled' }
];

/**
 * Seed or get all system configurations
 * @desc    Get all system configurations
 * @route   GET /api/config
 * @access  Private (Admin)
 */
const getAllConfigs = async (req, res, next) => {
  try {
    let configs = await SystemConfig.find().sort({ key: 1 });

    // Seed defaults if empty
    if (configs.length === 0) {
      await SystemConfig.insertMany(DEFAULT_CONFIGS);
      configs = await SystemConfig.find().sort({ key: 1 });
    }

    const configMap = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });

    res.status(200).json({
      success: true,
      data: {
        configs,
        configMap
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update system configuration by key
 * @route   PUT /api/config/:key
 * @access  Private (Admin)
 */
const updateConfig = async (req, res, next) => {
  try {
    const key = req.params.key.toUpperCase();
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required.'
      });
    }

    let config = await SystemConfig.findOne({ key });
    const previousValue = config ? config.value : null;

    config = await SystemConfig.findOneAndUpdate(
      { key },
      {
        key,
        value,
        description: description || config?.description || '',
        updatedBy: req.user._id
      },
      { new: true, upsert: true, runValidators: true }
    );

    // If weekly off days changed, invalidate holidayService memory cache
    if (key === 'WEEKLY_OFF_DAYS') {
      invalidateWeekendCache();
    }

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.SETTINGS_UPDATED,
      module: AUDIT_MODULE.SETTINGS,
      description: `Updated configuration ${key} to ${JSON.stringify(value)}`,
      previousData: { key, value: previousValue },
      newData: { key, value },
      req
    });

    res.status(200).json({
      success: true,
      message: `Configuration for ${key} updated successfully.`,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk update system configurations
 * @route   POST /api/config/bulk
 * @access  Private (Admin)
 */
const bulkUpdateConfigs = async (req, res, next) => {
  try {
    const { configs } = req.body; // e.g. { WEEKLY_OFF_DAYS: [0,6], DEFAULT_DAILY_SALARY: 500 }

    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'configs object required in body.'
      });
    }

    const updated = [];
    for (const [key, value] of Object.entries(configs)) {
      const upperKey = key.toUpperCase();
      const cfg = await SystemConfig.findOneAndUpdate(
        { key: upperKey },
        { key: upperKey, value, updatedBy: req.user._id },
        { new: true, upsert: true }
      );
      updated.push(cfg);
    }

    invalidateWeekendCache();

    await logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      role: req.user.role,
      action: AUDIT_ACTION.SETTINGS_UPDATED,
      module: AUDIT_MODULE.SETTINGS,
      description: `Bulk updated system configurations`,
      newData: configs,
      req
    });

    res.status(200).json({
      success: true,
      message: 'System configurations updated successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllConfigs,
  updateConfig,
  bulkUpdateConfigs
};
