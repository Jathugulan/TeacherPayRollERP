import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ThemeToggle from '../../components/common/ThemeToggle';
import {
  Sparkles,
  Mail,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  Shield,
  CalendarCheck,
  Calculator,
  ArrowDown,
} from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Teacher'); // Only 2 roles: Admin and Teacher
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password.');
      return;
    }

    if (!role) {
      error('Please select your role (Admin or Teacher).');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password, role, rememberMe);
      const userRole = response.user?.role || role;
      success(`Welcome back, ${response.user?.fullName || response.user?.name || userRole}!`);

      // Role-based redirect
      navigate(from === '/login' || from === '/' ? '/dashboard' : from, { replace: true });
    } catch (err) {
      error(err.message || 'Login failed. Please check your credentials and selected role.');
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
      success(`Welcome back, ${userName}!`);

      navigate(from === '/login' || from === '/' ? '/dashboard' : from, { replace: true });
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
    <div className="login-split-container">
      {/* ─── LEFT PANEL: Enterprise Branding & Highlights ──────────────── */}
      <motion.div
        className="login-left-panel"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="brand-header">
          <div className="brand-logo">
            <Sparkles size={28} />
          </div>
          <div>
            <h2 className="brand-title">Teacher ERP</h2>
            <p className="brand-subtitle">Attendance & Salary Management</p>
          </div>
        </div>

        <div className="brand-hero">
          <motion.h1
            className="hero-headline"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Teachers Attendance & Automated Payroll System
          </motion.h1>
          <motion.p
            className="hero-description"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Streamlined daily attendance marking, automated salary calculations, dynamic leave quotas, and comprehensive monthly reports for educational institutions.
          </motion.p>
        </div>

        {/* Feature Pills */}
        <div className="features-list">
          <div className="feature-item">
            <div className="feature-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <CalendarCheck size={18} />
            </div>
            <div>
              <div className="feature-title">Verified Daily Attendance</div>
              <div className="feature-desc">Admin-locked marking with real-time audit trail</div>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Calculator size={18} />
            </div>
            <div>
              <div className="feature-title">Rule-Engine Salary Calculations</div>
              <div className="feature-desc">Automated leave deductions (5-day quota) & pay-slips</div>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <Shield size={18} />
            </div>
            <div>
              <div className="feature-title">Enterprise Security & RBAC</div>
              <div className="feature-desc">Strict 2-role boundary, JWT refresh cookies & Google OAuth</div>
            </div>
          </div>
        </div>

        {/* Live Metrics preview */}
        <div className="metrics-strip">
          <div className="metric-box">
            <div className="metric-num">99.8%</div>
            <div className="metric-lbl">Uptime SLA</div>
          </div>
          <div className="metric-box">
            <div className="metric-num">Rs. 500</div>
            <div className="metric-lbl">Default Daily Pay</div>
          </div>
          <div className="metric-box">
            <div className="metric-num">5 Days</div>
            <div className="metric-lbl">Free Leave Quota</div>
          </div>
        </div>

        {/* Mobile Quick Scroll Link */}
        <a
          href="#auth-form-card"
          className="mobile-scroll-indicator"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('auth-form-card')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <span>Continue to Sign In</span>
          <ArrowDown size={15} />
        </a>
      </motion.div>

      {/* ─── RIGHT PANEL: Authentication Form Card ────────────────────── */}
      <div className="login-right-panel" id="auth-form-card">
        <div className="top-actions-bar">
          <div className="app-mode-tag">
            <span className="live-dot" /> Enterprise v2.0
          </div>
          <ThemeToggle showLabel={true} size="md" />
        </div>

        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="login-card-header">
            <h1 className="login-title">Sign In to ERP</h1>
            <p className="login-subtitle">
              Select your role and enter your credentials to access the portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Role Selection Dropdown - Only 2 roles: Admin and Teacher */}
            <div className="form-group">
              <label className="form-label" htmlFor="role-select">
                <span>Account Role <span className="required">*</span></span>
                <span className="role-hint">Validated on login</span>
              </label>
              <div className="select-wrapper">
                <select
                  id="role-select"
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                >
                  <option value="Teacher">Teacher</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">
                <span>Email Address <span className="required">*</span></span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="email-input"
                  type="email"
                  className="form-input"
                  placeholder="name@erp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="password-input">
                  <span>Password <span className="required">*</span></span>
                </label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            {/* Remember Me */}
            <div className="form-row-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="form-checkbox"
                />
                <span>Remember this device for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="btn btn-primary btn-submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <LogIn size={18} />
              <span>{loading ? 'Authenticating...' : `Sign In as ${role}`}</span>
            </motion.button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span className="divider-line" />
            <span className="divider-text">OR CONTINUE WITH</span>
            <span className="divider-line" />
          </div>

          {/* Google OAuth Button */}
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
              <span>Continue with Google (Teacher)</span>
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

          {/* Registration Redirect */}
          <div className="auth-footer-link">
            <span>Are you a faculty member without an account?</span>{' '}
            <Link to="/register" className="highlight-link">
              Register Teacher Account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
