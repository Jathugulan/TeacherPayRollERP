import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ThemeToggle from '../../components/common/ThemeToggle';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  BadgeCheck,
  UserPlus,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    schoolName: '',
    employeeId: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      error('Please enter your full name.');
      return;
    }
    if (!formData.email.trim()) {
      error('Please enter your institutional email.');
      return;
    }
    if (!formData.password) {
      error('Please enter a secure password.');
      return;
    }
    if (formData.password.length < 6) {
      error('Password must be at least 6 characters in length.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      error('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      // Backend automatically assigns role: "Teacher"
      const res = await register(formData);
      success('Teacher account created successfully! Welcome to the portal.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      error(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const googleToken = credentialResponse?.credential;
    if (!googleToken) {
      error('No credential received from Google.');
      return;
    }

    setLoading(true);
    try {
      const response = await loginWithGoogle(googleToken);
      const userObj = response.user || response.data?.user;
      const userName = userObj?.fullName || userObj?.name || 'Teacher';
      success(`Welcome to the portal, ${userName}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      error(err.message || 'Google authentication failed. Please check your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    error('Google sign-in was cancelled or encountered an error.');
  };

  return (
    <div className="register-wrapper">
      {/* Top Header bar with Theme Toggle */}
      <div className="register-top-bar">
        <div className="brand-pill">
          <div className="brand-logo-small">
            <Sparkles size={18} />
          </div>
          <span className="brand-name-small">Teacher ERP Portal</span>
        </div>
        <ThemeToggle showLabel={true} size="md" />
      </div>

      <motion.div
        className="register-card"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="register-header">
          <div className="role-tag-badge">
            <GraduationCap size={16} />
            <span>Faculty & Teacher Registration</span>
          </div>

          <h1 className="register-title">Create Teacher Account</h1>
          <p className="register-subtitle">
            Join your institutional attendance and salary management system. Role is automatically assigned as <strong>Teacher</strong>.
          </p>
        </div>

        {/* Form with 2-column grid */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-grid-2col">
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                <span>Full Name <span className="required">*</span></span>
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  className="form-input"
                  placeholder="e.g. Dr. Samantha Perera"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                <span>Institutional Email <span className="required">*</span></span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="samantha@school.edu"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                <span>Phone Number</span>
              </label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="+94 77 123 4567"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Employee ID */}
            <div className="form-group">
              <label className="form-label" htmlFor="employeeId">
                <span>Employee / Staff ID</span>
              </label>
              <div className="input-with-icon">
                <BadgeCheck size={18} className="input-icon" />
                <input
                  id="employeeId"
                  type="text"
                  name="employeeId"
                  className="form-input"
                  placeholder="e.g. TCH-2026-042"
                  value={formData.employeeId}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* School Name (Full Width) */}
          <div className="form-group">
            <label className="form-label" htmlFor="schoolName">
              <span>School / Institution Name</span>
            </label>
            <div className="input-with-icon">
              <Building2 size={18} className="input-icon" />
              <input
                id="schoolName"
                type="text"
                name="schoolName"
                className="form-input"
                placeholder="e.g. Royal College Academy"
                value={formData.schoolName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-grid-2col">
            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                <span>Password <span className="required">*</span></span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                <span>Confirm Password <span className="required">*</span></span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle-btn"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Teacher Role Notice Pill */}
          <div className="role-guarantee-box">
            <ShieldCheck size={18} className="guarantee-icon" />
            <div className="guarantee-text">
              <strong>Account Type:</strong> You will be registered as a <strong>Teacher</strong>. Admin accounts are managed directly by system administrators.
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            className="btn btn-primary btn-submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <UserPlus size={18} />
            <span>{loading ? 'Creating Teacher Account...' : 'Create Teacher Account'}</span>
          </motion.button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span className="divider-line" />
          <span className="divider-text">OR ONE-CLICK SIGN UP</span>
          <span className="divider-line" />
        </div>

        {/* Google One-Click Button */}
        <div style={{ position: 'relative', width: '100%' }}>
          <motion.button
            type="button"
            className="btn-google"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google (Auto Teacher Setup)</span>
          </motion.button>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.001,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              width="400"
            />
          </div>
        </div>

        {/* Footer Link to Sign In */}
        <div className="auth-footer-link">
          <span>Already have an account?</span>{' '}
          <Link to="/login" className="highlight-link">
            Sign in to ERP
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
