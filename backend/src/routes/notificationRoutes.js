const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  markAllNotificationsRead,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.patch('/mark-read', markNotificationsRead);
router.patch('/mark-all-read', markAllNotificationsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
