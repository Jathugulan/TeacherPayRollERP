const mongoose = require('mongoose');
const { NOTIFICATION_TYPE } = require('../constants/salaryConfig');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    type: {
      type: String,
      enum: {
        values: Object.values(NOTIFICATION_TYPE),
        message: '{VALUE} is not a valid notification type'
      },
      default: NOTIFICATION_TYPE.GENERAL
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    // Optional deep-link reference
    link: {
      type: String,
      default: ''
    },
    // Related record reference (leave ID, salary ID, etc.)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    relatedModel: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fetching a user's notifications efficiently
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
