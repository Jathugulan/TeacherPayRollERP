const Holiday = require('../models/Holiday');
const { HOLIDAY_TYPE } = require('../constants/salaryConfig');
const { logAction } = require('../services/auditService');
const { AUDIT_ACTION, AUDIT_MODULE } = require('../constants/salaryConfig');

/**
 * @desc    Create a new holiday
 * @route   POST /api/holidays
 * @access  Admin
 */
const createHoliday = async (req, res, next) => {
  try {
    const { name, date, description, type } = req.body;
    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Holiday name and date are required.' });
    }

    // Check for duplicate date
    const existing = await Holiday.findOne({
      date: { $gte: new Date(new Date(date).setUTCHours(0,0,0,0)), $lte: new Date(new Date(date).setUTCHours(23,59,59,999)) }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: `A holiday already exists for ${new Date(date).toDateString()}: "${existing.name}"` });
    }

    const holiday = await Holiday.create({
      name: name.trim(),
      date: new Date(date),
      description: description?.trim() || '',
      type: type || HOLIDAY_TYPE.CUSTOM,
      createdBy: req.user._id
    });

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.HOLIDAY_CREATED, module: AUDIT_MODULE.HOLIDAY,
      recordId: holiday._id, description: `Holiday "${holiday.name}" created for ${new Date(holiday.date).toDateString()}`,
      newData: { name: holiday.name, date: holiday.date, type: holiday.type }, req
    });

    res.status(201).json({ success: true, message: 'Holiday created successfully.', data: holiday });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all holidays with optional month/year filter
 * @route   GET /api/holidays
 * @access  Admin + Teacher
 */
const getHolidays = async (req, res, next) => {
  try {
    const { month, year, type, isActive } = req.query;
    const filter = {};

    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      filter.date = {
        $gte: new Date(Date.UTC(y, m - 1, 1)),
        $lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
      };
    } else if (year) {
      filter.date = {
        $gte: new Date(Date.UTC(Number(year), 0, 1)),
        $lte: new Date(Date.UTC(Number(year), 11, 31, 23, 59, 59, 999))
      };
    }

    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const holidays = await Holiday.find(filter)
      .sort({ date: 1 })
      .populate('createdBy', 'name email');

    res.status(200).json({ success: true, count: holidays.length, data: holidays });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a holiday
 * @route   PUT /api/holidays/:id
 * @access  Admin
 */
const updateHoliday = async (req, res, next) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found.' });

    const previousData = { name: holiday.name, date: holiday.date, type: holiday.type, isActive: holiday.isActive };
    const { name, date, description, type, isActive } = req.body;

    if (name) holiday.name = name.trim();
    if (date) holiday.date = new Date(date);
    if (description !== undefined) holiday.description = description.trim();
    if (type) holiday.type = type;
    if (isActive !== undefined) holiday.isActive = isActive;
    holiday.updatedBy = req.user._id;

    await holiday.save();

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.HOLIDAY_UPDATED, module: AUDIT_MODULE.HOLIDAY,
      recordId: holiday._id, description: `Holiday "${holiday.name}" updated`,
      previousData, newData: { name: holiday.name, date: holiday.date, type: holiday.type }, req
    });

    res.status(200).json({ success: true, message: 'Holiday updated successfully.', data: holiday });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a holiday
 * @route   DELETE /api/holidays/:id
 * @access  Admin
 */
const deleteHoliday = async (req, res, next) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found.' });

    const previousData = { name: holiday.name, date: holiday.date };
    await Holiday.deleteOne({ _id: holiday._id });

    await logAction({
      userId: req.user._id, userEmail: req.user.email, role: req.user.role,
      action: AUDIT_ACTION.HOLIDAY_DELETED, module: AUDIT_MODULE.HOLIDAY,
      recordId: holiday._id, description: `Holiday "${holiday.name}" deleted`, previousData, req
    });

    res.status(200).json({ success: true, message: 'Holiday deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createHoliday, getHolidays, updateHoliday, deleteHoliday };
