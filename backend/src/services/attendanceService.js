const Attendance = require('../models/Attendance');
const { ATTENDANCE_STATUS } = require('../constants/salaryConfig');
const { getWeekendDays, getHolidayDateSetForMonth } = require('./holidayService');

/**
 * Normalize date to UTC start-of-day (00:00:00.000Z) for consistent indexing and uniqueness
 */
const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided');
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Get date range for an entire calendar month in UTC
 */
const getMonthDateRange = (month, year) => {
  const m = Number(month);
  const y = Number(year);
  const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { startOfMonth, endOfMonth };
};

/**
 * Count attendance days by status for a teacher in a given month and year.
 * Now also accounts for HOLIDAY and WEEKEND statuses.
 *
 * @param {string} teacherId
 * @param {number} month (1-12)
 * @param {number} year
 * @returns {Promise<{ presentDays, absentDays, leaveDays, holidayDays, weekendDays, totalRecords, records }>}
 */
const getTeacherMonthlyAttendanceStats = async (teacherId, month, year) => {
  const { startOfMonth, endOfMonth } = getMonthDateRange(month, year);

  const records = await Attendance.find({
    teacherId,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  }).sort({ date: 1 });

  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let weekendDays = 0;

  for (const record of records) {
    switch (record.status) {
      case ATTENDANCE_STATUS.PRESENT:
        presentDays++;
        break;
      case ATTENDANCE_STATUS.ABSENT:
        absentDays++;
        break;
      case ATTENDANCE_STATUS.LEAVE:
        leaveDays++;
        break;
      case ATTENDANCE_STATUS.HOLIDAY:
        holidayDays++;
        break;
      case ATTENDANCE_STATUS.WEEKEND:
        weekendDays++;
        break;
      default:
        break;
    }
  }

  return {
    presentDays,
    absentDays,
    leaveDays,
    holidayDays,
    weekendDays,
    totalRecords: records.length,
    records
  };
};

/**
 * Determine correct attendance status for a date, considering holidays and weekends.
 * Returns HOLIDAY or WEEKEND if the date matches config, otherwise null (manual entry needed).
 */
const getAutoStatusForDate = async (date) => {
  const d = new Date(date);
  const weekendDays = await getWeekendDays();
  const dayOfWeek = d.getUTCDay();

  if (weekendDays.includes(dayOfWeek)) {
    return ATTENDANCE_STATUS.WEEKEND;
  }

  // Check holiday
  const { isDateHoliday } = require('./holidayService');
  const holiday = await isDateHoliday(d);
  if (holiday) {
    return ATTENDANCE_STATUS.HOLIDAY;
  }

  return null;
};

/**
 * Get summary statistics for all teachers on a given date (today's attendance).
 */
const getDailyAttendanceSummary = async (date) => {
  const normalizedDate = normalizeDate(date);
  const records = await Attendance.find({ date: normalizedDate }).populate('teacherId', 'employeeId fullName department');

  const summary = {
    date: normalizedDate,
    present: 0,
    absent: 0,
    onLeave: 0,
    holiday: 0,
    weekend: 0,
    total: records.length,
    records
  };

  for (const rec of records) {
    switch (rec.status) {
      case ATTENDANCE_STATUS.PRESENT: summary.present++; break;
      case ATTENDANCE_STATUS.ABSENT: summary.absent++; break;
      case ATTENDANCE_STATUS.LEAVE: summary.onLeave++; break;
      case ATTENDANCE_STATUS.HOLIDAY: summary.holiday++; break;
      case ATTENDANCE_STATUS.WEEKEND: summary.weekend++; break;
      default: break;
    }
  }

  return summary;
};

module.exports = {
  normalizeDate,
  getMonthDateRange,
  getTeacherMonthlyAttendanceStats,
  getAutoStatusForDate,
  getDailyAttendanceSummary
};
