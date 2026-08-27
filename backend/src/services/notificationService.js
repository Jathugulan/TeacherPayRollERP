const Notification = require('../models/Notification');
const { NOTIFICATION_TYPE } = require('../constants/salaryConfig');

/**
 * Create a notification for a specific user.
 */
const createNotification = async ({
  recipient,
  title,
  message,
  type = NOTIFICATION_TYPE.GENERAL,
  link = '',
  relatedId = null,
  relatedModel = ''
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      title,
      message,
      type,
      link,
      relatedId,
      relatedModel
    });
    return notification;
  } catch (err) {
    // Notification creation must never crash the main request
    console.error('[NotificationService Error]:', err.message);
    return null;
  }
};

/**
 * Create notifications for multiple recipients at once.
 */
const createBulkNotifications = async (notifications) => {
  try {
    return await Notification.insertMany(notifications, { ordered: false });
  } catch (err) {
    console.error('[NotificationService Bulk Error]:', err.message);
    return [];
  }
};

/**
 * Get unread notification count for a user.
 */
const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({ recipient: userId, isRead: false });
  } catch (err) {
    console.error('[NotificationService Count Error]:', err.message);
    return 0;
  }
};

/**
 * Mark notifications as read.
 */
const markAsRead = async (notificationIds, userId) => {
  return Notification.updateMany(
    { _id: { $in: notificationIds }, recipient: userId },
    { isRead: true }
  );
};

/**
 * Mark all notifications as read for a user.
 */
const markAllAsRead = async (userId) => {
  return Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
};

// ─── Predefined notification templates ────────────────────────────────────────

const notifyLeaveSubmitted = async (adminUserId, teacherName, leaveId) => {
  return createNotification({
    recipient: adminUserId,
    title: 'New Leave Request',
    message: `${teacherName} has submitted a new leave request awaiting your approval.`,
    type: NOTIFICATION_TYPE.LEAVE_SUBMITTED,
    relatedId: leaveId,
    relatedModel: 'Leave',
    link: '/leaves'
  });
};

const notifyLeaveApproved = async (teacherUserId, leaveId) => {
  return createNotification({
    recipient: teacherUserId,
    title: 'Leave Approved ✅',
    message: 'Your leave request has been approved by the administrator.',
    type: NOTIFICATION_TYPE.LEAVE_APPROVED,
    relatedId: leaveId,
    relatedModel: 'Leave',
    link: '/leaves'
  });
};

const notifyLeaveRejected = async (teacherUserId, leaveId, remarks = '') => {
  return createNotification({
    recipient: teacherUserId,
    title: 'Leave Rejected ❌',
    message: `Your leave request has been rejected.${remarks ? ` Reason: ${remarks}` : ''}`,
    type: NOTIFICATION_TYPE.LEAVE_REJECTED,
    relatedId: leaveId,
    relatedModel: 'Leave',
    link: '/leaves'
  });
};

const notifyAttendanceCorrected = async (teacherUserId, date, newStatus) => {
  return createNotification({
    recipient: teacherUserId,
    title: 'Attendance Record Updated',
    message: `Your attendance for ${new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} has been corrected to ${newStatus}.`,
    type: NOTIFICATION_TYPE.ATTENDANCE_CORRECTED,
    link: '/attendance/calendar'
  });
};

const notifySalaryCalculated = async (teacherUserId, month, year, netSalary) => {
  const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  return createNotification({
    recipient: teacherUserId,
    title: 'Salary Calculated 💰',
    message: `Your salary for ${monthName} ${year} has been calculated. Net payout: Rs. ${netSalary.toLocaleString()}.`,
    type: NOTIFICATION_TYPE.SALARY_CALCULATED,
    link: '/salary'
  });
};

const notifySalaryApproved = async (teacherUserId, month, year) => {
  const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  return createNotification({
    recipient: teacherUserId,
    title: 'Salary Approved ✅',
    message: `Your salary for ${monthName} ${year} has been approved and will be processed soon.`,
    type: NOTIFICATION_TYPE.SALARY_APPROVED,
    link: '/salary'
  });
};

const notifySalaryPaid = async (teacherUserId, month, year, netSalary) => {
  const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  return createNotification({
    recipient: teacherUserId,
    title: 'Salary Paid 🎉',
    message: `Your salary of Rs. ${netSalary.toLocaleString()} for ${monthName} ${year} has been paid successfully.`,
    type: NOTIFICATION_TYPE.SALARY_PAID,
    link: '/salary'
  });
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  notifyLeaveSubmitted,
  notifyLeaveApproved,
  notifyLeaveRejected,
  notifyAttendanceCorrected,
  notifySalaryCalculated,
  notifySalaryApproved,
  notifySalaryPaid
};
