const Notification = require('../models/Notification');
const { getUnreadCount, markAsRead, markAllAsRead } = require('../services/notificationService');

/**
 * @desc    Get my notifications (paginated)
 * @route   GET /api/notifications
 * @access  Private (Admin + Teacher)
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
      getUnreadCount(req.user._id)
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadNotificationCount = async (req, res, next) => {
  try {
    const count = await getUnreadCount(req.user._id);
    res.status(200).json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark specific notifications as read
 * @route   PATCH /api/notifications/mark-read
 * @access  Private
 */
const markNotificationsRead = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of notification IDs.' });
    }
    await markAsRead(ids, req.user._id);
    const unreadCount = await getUnreadCount(req.user._id);
    res.status(200).json({ success: true, message: 'Notifications marked as read.', data: { unreadCount } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/mark-all-read
 * @access  Private
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    await markAllAsRead(req.user._id);
    res.status(200).json({ success: true, message: 'All notifications marked as read.', data: { unreadCount: 0 } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
    await Notification.deleteOne({ _id: notification._id });
    res.status(200).json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  markAllNotificationsRead,
  deleteNotification
};
