const mongoose = require('mongoose');
const { SALARY_CONFIG, TEACHER_STATUS } = require('../constants/salaryConfig');

const timelineEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    relation: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    branchCode: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    firstName: {
      type: String,
      trim: true,
      default: ''
    },
    lastName: {
      type: String,
      trim: true,
      default: ''
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'MALE', 'FEMALE', 'OTHER', ''],
      default: 'Male'
    },
    nic: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ],
      index: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
      default: Date.now
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    subject: {
      type: String,
      trim: true,
      default: ''
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true
    },
    qualification: {
      type: String,
      trim: true,
      default: ''
    },
    salaryPerDay: {
      type: Number,
      default: SALARY_CONFIG.DEFAULT_DAILY_SALARY,
      min: [0, 'Salary per day cannot be negative']
    },
    profilePicture: {
      type: String,
      default: ''
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({})
    },
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({})
    },
    status: {
      type: String,
      enum: Object.values(TEACHER_STATUS),
      default: TEACHER_STATUS.ACTIVE,
      index: true
    },
    timeline: {
      type: [timelineEntrySchema],
      default: []
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtuals for alias compatibility with prompt naming
teacherSchema.virtual('dailySalary').get(function () {
  return this.salaryPerDay;
}).set(function (val) {
  this.salaryPerDay = val;
});

teacherSchema.virtual('monthlySalary').get(function () {
  return (this.salaryPerDay || SALARY_CONFIG.DEFAULT_DAILY_SALARY) * 30;
});

teacherSchema.virtual('profileImage').get(function () {
  return this.profilePicture;
}).set(function (val) {
  this.profilePicture = val;
});

// Pre-save to synchronize fullName / firstName / lastName
teacherSchema.pre('save', function (next) {
  if (this.firstName || this.lastName) {
    const computedName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
    if (computedName && (!this.fullName || this.isModified('firstName') || this.isModified('lastName'))) {
      this.fullName = computedName;
    }
  } else if (this.fullName && (!this.firstName && !this.lastName)) {
    const parts = this.fullName.trim().split(' ');
    this.firstName = parts[0] || '';
    this.lastName = parts.slice(1).join(' ') || '';
  }
  next();
});

// Full-text search index on searchable fields
teacherSchema.index({
  fullName: 'text',
  email: 'text',
  employeeId: 'text',
  department: 'text',
  designation: 'text'
});

// Compound department + status index for analytics
teacherSchema.index({ department: 1, status: 1 });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;
