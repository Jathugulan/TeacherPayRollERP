const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');

/**
 * Google OAuth 2.0 Strategy
 * Handles both Sign In and Sign Up via Google for Teachers.
 * Admin accounts are never created via Google OAuth.
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase().trim();
        const fullName = profile.displayName || email?.split('@')[0] || 'Teacher';
        const avatar = profile.photos?.[0]?.value || '';
        const googleId = profile.id;
        const emailVerified = profile.emails?.[0]?.verified || false;

        if (!email) {
          return done(new Error('Google account did not provide an email address.'), null);
        }

        // Find existing user by googleId or email
        let user = await User.findOne({
          $or: [{ googleId }, { email }]
        });

        if (!user) {
          // Auto-create as Teacher (Google OAuth only creates Teachers)
          user = await User.create({
            fullName,
            email,
            googleId,
            avatar,
            provider: 'Google',
            role: ROLES.TEACHER,
            emailVerified,
            lastLogin: new Date()
          });
        } else {
          if (!user.isActive) {
            return done(new Error('Your account has been deactivated. Contact an administrator.'), null);
          }
          // Update OAuth fields
          if (!user.googleId) user.googleId = googleId;
          if (!user.avatar && avatar) user.avatar = avatar;
          user.provider = user.provider === 'Local' && user.googleId ? 'Google' : user.provider;
          user.lastLogin = new Date();
          if (emailVerified && !user.emailVerified) user.emailVerified = true;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Minimal serialization (stateless JWT — only used to pass user through OAuth redirect)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
