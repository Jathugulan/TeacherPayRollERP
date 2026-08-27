const AuditLog = require('../models/AuditLog');

/**
 * Log an ERP action to the audit trail.
 * @param {Object} params
 * @param {string}  params.userId       - User performing the action
 * @param {string}  params.userEmail    - Email for quick lookup
 * @param {string}  params.role         - Role of the user
 * @param {string}  params.action       - AUDIT_ACTION constant
 * @param {string}  params.module       - AUDIT_MODULE constant
 * @param {string}  [params.recordId]   - Related record ObjectId
 * @param {string}  [params.description]
 * @param {Object}  [params.previousData]
 * @param {Object}  [params.newData]
 * @param {Object}  [params.req]        - Express request (for IP/user-agent)
 */
const logAction = async ({
  userId,
  userEmail = '',
  role = '',
  action,
  module,
  recordId = null,
  description = '',
  previousData = null,
  newData = null,
  req = null
}) => {
  try {
    const ip = req
      ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
      : '';
    const userAgent = req ? (req.headers['user-agent'] || '') : '';

    await AuditLog.create({
      userId,
      userEmail,
      role,
      action,
      module,
      recordId,
      description,
      previousData,
      newData,
      ip,
      userAgent
    });
  } catch (err) {
    // Audit logging must never crash the main request
    console.error('[AuditLog Error]:', err.message);
  }
};

/**
 * Get audit logs with filters and pagination
 */
const getAuditLogs = async ({
  userId = null,
  module: mod = null,
  action = null,
  startDate = null,
  endDate = null,
  page = 1,
  limit = 50
} = {}) => {
  const filter = {};
  if (userId) filter.userId = userId;
  if (mod) filter.module = mod;
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'name email role'),
    AuditLog.countDocuments(filter)
  ]);

  return { logs, total, page: Number(page), limit: Number(limit) };
};

module.exports = { logAction, getAuditLogs };
