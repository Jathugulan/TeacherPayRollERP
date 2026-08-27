const { getAuditLogs } = require('../services/auditService');

/**
 * @desc    Get audit logs with search, module, action, date range, pagination
 * @route   GET /api/audit-logs
 * @access  Private (Admin)
 */
const getAuditLogsController = async (req, res, next) => {
  try {
    const { userId, module: mod, action, startDate, endDate, page = 1, limit = 50 } = req.query;

    const result = await getAuditLogs({
      userId,
      module: mod,
      action,
      startDate,
      endDate,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          total: result.total,
          page: result.page,
          pages: Math.ceil(result.total / result.limit),
          limit: result.limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs: getAuditLogsController
};
