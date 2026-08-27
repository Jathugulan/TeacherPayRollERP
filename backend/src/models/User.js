const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../constants/roles');

const userSchema = new mongoose.Schema(
  {
    // ─── Identity ────────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },

    // ─── Teacher Profile Fields ──────────────────────────────
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    schoolName: {
      type: String,
      trim: true,
      default: ''
    },
    employeeId: {
      type: String,
      trim: true,
      sparse: true,
      default: null
    },

    // ─── Auth ────────────────────────────────────────────────
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: [ROLES.ADMIN, ROLES.TEACHER],
        message: '{VALUE} is not a supported ERP role'
      },
      default: ROLES.TEACHER
    },

    // ─── OAuth ───────────────────────────────────────────────
    provider: {
      type: String,
      enum: ['Local', 'Google'],
      default: 'Local'
    },
    googleId: {
      type: String,
      default: null,
      sparse: true
    },
    avatar: {
      type: String,
      default: ''
    },

    // ─── Security ────────────────────────────────────────────
    emailVerified: {
      type: Boolean,
      default: false
    },
    refreshToken: {
      type: String,
      select: false,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },

    // ─── Session Tracking ────────────────────────────────────
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ─── Virtuals ─────────────────────────────────────────────────
// Backwards compatibility: other parts of the app use user.name
userSchema.virtual('name')
  .get(function () {
    return this.fullName;
  })
  .set(function (val) {
    this.fullName = val;
  });

// Pre-validate hook to sync name -> fullName if needed
userSchema.pre('validate', function (next) {
  if (!this.fullName && this.get('name')) {
    this.fullName = this.get('name');
  }
  next();
});

// ─── Pre-save Hook: Hash Password ─────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.fullName && this.get('name')) {
    this.fullName = this.get('name');
  }
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Instance Methods ─────────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;



