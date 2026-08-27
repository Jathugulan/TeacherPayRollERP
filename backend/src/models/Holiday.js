const mongoose = require('mongoose');
const { HOLIDAY_TYPE } = require('../constants/salaryConfig');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true
    },
    date: {
      type: Date,
      required: [true, 'Holiday date is required'],
      unique: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    type: {
      type: String,
      enum: {
        values: Object.values(HOLIDAY_TYPE),
        message: '{VALUE} is not a valid holiday type'
      },
      default: HOLIDAY_TYPE.CUSTOM
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for month/year queries
holidaySchema.index({ date: 1, isActive: 1 });

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;
