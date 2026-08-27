/**
 * Middleware factory to validate required request body fields
 * @param {Array<string>} fields - List of required field names
 */
const validateRequired = (fields = []) => {
  return (req, res, next) => {
    const missing = [];
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Validate date format (YYYY-MM-DD or parseable ISO date)
 */
const isValidDateString = (dateStr) => {
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

module.exports = {
  validateRequired,
  isValidDateString
};
