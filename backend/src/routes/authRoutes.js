const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
  register,
  login,
  googleLogin,
  googleCallback,
  refreshToken,
  getMe,
  getProfile,
  logout,
  forgotPassword,
  resetPassword,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ─── Local Auth ───────────────────────────────────────────────
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/logout', protect, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getMe);
router.get('/profile', protect, getProfile);

// ─── Token Refresh ────────────────────────────────────────────
router.post('/refresh', refreshToken);

// ─── Google OAuth 2.0 (Passport redirect flow fallback) ───────
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_auth_failed`
  }),
  googleCallback
);

module.exports = router;

