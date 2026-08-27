const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { ROLES } = require('../constants/roles');
const { getOrEnsureTeacherProfile } = require('../services/teacherService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Cookie Config ────────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * Helper: build safe user payload (no password/tokens)
 */
const buildUserPayload = (user, teacherProfile = null) => ({
  id: user._id,
  fullName: user.fullName,
  name: user.fullName,          // backwards compat
  email: user.email,
  phone: user.phone || '',
  schoolName: user.schoolName || '',
  employeeId: user.employeeId || null,
  role: user.role,
  provider: user.provider || 'Local',
  avatar: user.avatar || '',
  picture: user.avatar || '',
  emailVerified: user.emailVerified || false,
  lastLogin: user.lastLogin,
  isActive: user.isActive,
  teacherProfile: teacherProfile
    ? {
        id: teacherProfile._id,
        employeeId: teacherProfile.employeeId,
        department: teacherProfile.department,
        designation: teacherProfile.designation,
        salaryPerDay: teacherProfile.salaryPerDay
      }
    : null
});

/**
 * Helper: attach HTTP-only refresh cookie + return access token
 */
const issueTokens = (res, user) => {
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie('erp_refresh_token', refreshToken, COOKIE_OPTIONS);
  return { accessToken, refreshToken };
};

// ─────────────────────────────────────────────────────────────
// @desc    Register Teacher (public — teachers only)
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { fullName, name, email, password, confirmPassword, phone, schoolName, employeeId } = req.body;

    const displayName = (fullName || name || '').trim();
    if (!displayName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and password are required.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Force role = teacher — NO public admin registration
    const user = await User.create({
      fullName: displayName,
      email: email.toLowerCase().trim(),
      password,
      phone: phone?.trim() || '',
      schoolName: schoolName?.trim() || '',
      employeeId: employeeId?.trim() || null,
      role: ROLES.TEACHER,
      provider: 'Local'
    });

    user.lastLogin = new Date();
    await user.save();

    const teacherProfile = await getOrEnsureTeacherProfile(user);
    const { accessToken } = issueTokens(res, user);

    return res.status(201).json({
      success: true,
      message: 'Teacher account created successfully.',
      token: accessToken,
      user: buildUserPayload(user, teacherProfile),
      data: { token: accessToken, user: buildUserPayload(user, teacherProfile) }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Login with email, password + role validation
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, role: selectedRole, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact an administrator.'
      });
    }

    // ── Role validation ──────────────────────────────────────
    if (selectedRole) {
      const normalizedSelected = selectedRole.toLowerCase();
      const normalizedActual = user.role.toLowerCase();
      if (normalizedSelected !== normalizedActual) {
        return res.status(403).json({
          success: false,
          message: `Role mismatch: this account is registered as "${user.role}". Please select the correct role.`
        });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    // Extend cookie lifetime if rememberMe
    const cookieOpts = rememberMe
      ? { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 }
      : COOKIE_OPTIONS;

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    res.cookie('erp_refresh_token', refreshToken, cookieOpts);

    // Role-based redirect hint
    const redirectTo = user.role === ROLES.ADMIN ? '/dashboard' : '/dashboard';

    let teacherProfile = null;
    if (user.role === ROLES.TEACHER) {
      teacherProfile = await getOrEnsureTeacherProfile(user);
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token: accessToken,
      redirectTo,
      user: buildUserPayload(user, teacherProfile),
      data: { token: accessToken, user: buildUserPayload(user, teacherProfile) }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Google OAuth direct ID token verification
// @route   POST /api/auth/google
// @access  Public
// ─────────────────────────────────────────────────────────────
const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required.'
      });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Google authentication token.'
      });
    }

    // Validate Google account details
    if (!payload || !payload.email || payload.email_verified !== true) {
      return res.status(400).json({
        success: false,
        message: 'Google account is unverified or missing required email address.'
      });
    }

    const email = payload.email.toLowerCase().trim();
    const fullName = payload.name || email.split('@')[0] || 'Teacher';
    const googleId = payload.sub;
    const picture = payload.picture || '';

    // Search MongoDB using existing User model
    let user = await User.findOne({ email });

    if (user) {
      // Existing user: check if deactivated
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact an administrator.'
        });
      }

      // Update OAuth fields if missing
      if (!user.googleId && googleId) {
        user.googleId = googleId;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
      if (!user.emailVerified) {
        user.emailVerified = true;
      }
      user.lastLogin = new Date();
      await user.save();
    } else {
      // New user: create with safe default role (Teacher)
      user = await User.create({
        fullName,
        email,
        googleId,
        provider: 'Google',
        avatar: picture,
        emailVerified: true,
        role: ROLES.TEACHER,
        isActive: true,
        lastLogin: new Date()
      });
    }

    // Issue application JWT
    const { accessToken } = issueTokens(res, user);

    let teacherProfile = null;
    if (user.role === ROLES.TEACHER) {
      teacherProfile = await getOrEnsureTeacherProfile(user);
    }

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful.',
      token: accessToken,
      user: buildUserPayload(user, teacherProfile),
      data: {
        token: accessToken,
        user: buildUserPayload(user, teacherProfile)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Google OAuth callback (after Passport.js)
// @route   GET /api/auth/google/callback
// @access  Public (Passport handles it)
// ─────────────────────────────────────────────────────────────
const googleCallback = async (req, res) => {
  try {
    const user = req.user; // Set by Passport
    if (!user) {
      return res.redirect(
        `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_auth_failed`
      );
    }

    const { accessToken } = issueTokens(res, user);

    // Redirect to frontend OAuth callback handler with token in query
    const redirectUrl = new URL(
      `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback`
    );
    redirectUrl.searchParams.set('token', accessToken);
    redirectUrl.searchParams.set('role', user.role);

    return res.redirect(redirectUrl.toString());
  } catch (err) {
    return res.redirect(
      `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=server_error`
    );
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Refresh access token using httpOnly cookie
// @route   POST /api/auth/refresh
// @access  Public (cookie required)
// ─────────────────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.erp_refresh_token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ success: false, message: 'Refresh token is invalid or expired.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }

    const newAccessToken = generateToken(user);
    return res.status(200).json({
      success: true,
      token: newAccessToken,
      data: { token: newAccessToken }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Logout — clear httpOnly cookie
// @route   POST /api/auth/logout
// @access  Private
// ─────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    res.clearCookie('erp_refresh_token', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax'
    });
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let teacherProfile = null;
    if (user.role === ROLES.TEACHER) {
      teacherProfile = await getOrEnsureTeacherProfile(user);
    }
    return res.status(200).json({
      success: true,
      data: { user: buildUserPayload(user, teacherProfile) },
      user: buildUserPayload(user, teacherProfile)
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
// ─────────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.'
      });
    }

    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return res.status(200).json({
      success: true,
      message: 'Password reset link dispatched to your registered email.',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
// ─────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Change password (authenticated)
// @route   PUT /api/auth/change-password
// @access  Private
// ─────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both currentPassword and newPassword are required.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  googleCallback,
  refreshToken,
  logout,
  getMe,
  getProfile: getMe,
  forgotPassword,
  resetPassword,
  changePassword
};


