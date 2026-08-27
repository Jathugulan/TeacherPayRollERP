const Holiday = require('../models/Holiday');
const SystemConfig = require('../models/SystemConfig');

// In-memory cache for weekend config (refreshed on change)
let _weekendDays = null;
let _weekendCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Get configured weekend days from SystemConfig.
 * Default: [0, 6] = Sunday and Saturday.
 */
const getWeekendDays = async () => {
  const now = Date.now();
  if (_weekendDays && now - _weekendCacheTime < CACHE_TTL_MS) {
    return _weekendDays;
  }
  try {
    const config = await SystemConfig.findOne({ key: 'WEEKLY_OFF_DAYS' });
    _weekendDays = config ? config.value : [0, 6];
    _weekendCacheTime = now;
    return _weekendDays;
  } catch (err) {
    return [0, 6]; // Safe default
  }
};

/**
 * Invalidate cached weekend days (call after config update).
 */
const invalidateWeekendCache = () => {
  _weekendDays = null;
  _weekendCacheTime = 0;
};

/**
 * Check if a specific date is a configured weekend.
 */
const isWeekend = async (date) => {
  const d = new Date(date);
  const weekendDays = await getWeekendDays();
  return weekendDays.includes(d.getUTCDay());
};

/**
 * Get all active holidays for a given month/year.
 */
const getHolidaysForMonth = async (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return Holiday.find({ date: { $gte: start, $lte: end }, isActive: true });
};

/**
 * Check if a specific date is a configured holiday.
 */
const isDateHoliday = async (date) => {
  const d = new Date(date);
  const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const endOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  const holiday = await Holiday.findOne({ date: { $gte: startOfDay, $lte: endOfDay }, isActive: true });
  return !!holiday;
};

/**
 * Get holiday record for a date (or null).
 */
const getHolidayForDate = async (date) => {
  const d = new Date(date);
  const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const endOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return Holiday.findOne({ date: { $gte: startOfDay, $lte: endOfDay }, isActive: true });
};

/**
 * Get all holiday dates for a month as a Set of UTC timestamp strings.
 */
const getHolidayDateSetForMonth = async (month, year) => {
  const holidays = await getHolidaysForMonth(month, year);
  const set = new Set();
  for (const h of holidays) {
    const d = new Date(h.date);
    set.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`);
  }
  return set;
};

module.exports = {
  getWeekendDays,
  invalidateWeekendCache,
  isWeekend,
  getHolidaysForMonth,
  isDateHoliday,
  getHolidayForDate,
  getHolidayDateSetForMonth
};
