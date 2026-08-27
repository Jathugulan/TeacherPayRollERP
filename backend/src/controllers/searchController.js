const Teacher = require('../models/Teacher');

/**
 * @desc    Global Search API across ERP entities
 * @route   GET /api/search
 * @access  Private (Admin, HR, Accountant)
 */
const searchERP = async (req, res, next) => {
  try {
    const q = req.query.q || req.query.query || req.query.search;

    if (!q || q.trim() === '') {
      return res.status(200).json({
        success: true,
        data: {
          teachers: []
        }
      });
    }

    const searchTerm = q.trim();
    const regex = new RegExp(searchTerm, 'i');

    const teachers = await Teacher.find({
      $or: [
        { fullName: regex },
        { employeeId: regex },
        { email: regex },
        { department: regex },
        { designation: regex },
        { phone: regex }
      ]
    })
      .select('employeeId fullName email phone department designation status salaryPerDay')
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        query: searchTerm,
        resultsCount: teachers.length,
        teachers
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchERP
};
