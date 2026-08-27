import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import {
  Menu,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  Settings,
  Shield,
  GraduationCap,
  ChevronDown,
} from 'lucide-react';

const Navbar = ({ onToggleMobile, onOpenSearch }) => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format active page title from location pathname
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/teachers/') && path !== '/teachers') return 'Teacher Profile & Details';
    if (path.startsWith('/salary/') && path !== '/salary') return 'Teacher Payroll Calculation';
    switch (path) {
      case '/dashboard':
        return 'ERP Dashboard';
      case '/teachers':
        return 'Faculty & Teacher Management';
      case '/attendance':
        return 'Daily Attendance Marking';
      case '/attendance/history':
        return 'Attendance Records & History';
      case '/attendance/calendar':
        return 'Attendance Calendar View';
      case '/leaves':
        return 'Leave Management & Quota';
      case '/salary':
        return 'Salary & Payroll Management';
      case '/reports/attendance':
        return 'Attendance Analytics & Reports';
      case '/reports/salary':
        return 'Payroll & Salary Reports';
      case '/profile':
        return 'My Profile';
      case '/settings':
        return 'System & ERP Settings';
      default:
        return 'ERP Portal';
    }
  };

  const getRoleBadge = () => {
    const r = (role || '').toLowerCase();
    if (r === 'admin') {
      return { label: 'Administrator', icon: Shield, color: '#f59e0b' };
    }
    return { label: 'Faculty / Teacher', icon: GraduationCap, color: '#8b5cf6' };
  };

  const roleInfo = getRoleBadge();
  const RoleIcon = roleInfo.icon;

  return (
    <header className="app-navbar">
      {/* Left side: Hamburger + Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <button
          onClick={onToggleMobile}
          className="btn btn-secondary btn-icon btn-sm"
          style={{ display: 'flex', flexShrink: 0 }}
          aria-label="Toggle navigation"
        >
          <Menu size={18} />
        </button>

        <div style={{ minWidth: 0 }}>
          <h2 className="navbar-page-title">
            {getPageTitle()}
          </h2>
        </div>
      </div>

      {/* Center/Right: Global Search bar trigger + Theme Toggle + Notification + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Global Search Button */}
        {role !== 'teacher' && (
          <button
            onClick={onOpenSearch}
            className="btn btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.825rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <Search size={15} color="var(--primary-500)" />
            <span style={{ display: window.innerWidth <= 640 ? 'none' : 'inline' }}>Search</span>
            <kbd
              style={{
                fontSize: '0.65rem',
                padding: '2px 4px',
                borderRadius: '4px',
                background: 'var(--bg-card-subtle)',
                color: 'var(--text-dim)',
                border: '1px solid var(--border-subtle)',
                display: window.innerWidth <= 768 ? 'none' : 'inline-block',
              }}
            >
              Ctrl K
            </kbd>
          </button>
        )}

        {/* Theme Toggle Button */}
        <ThemeToggle size="md" />

        {/* Role Pill */}
        <div
          className="navbar-role-pill"
          style={{
            color: roleInfo.color,
          }}
        >
          <RoleIcon size={14} />
          <span>{roleInfo.label}</span>
        </div>

        {/* Notifications Icon & Popover */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="btn btn-secondary btn-icon"
            style={{ position: 'relative' }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-500)',
                boxShadow: '0 0 6px var(--primary-500)',
              }}
            />
          </button>

          {notificationsOpen && (
            <div className="navbar-dropdown-menu" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-white)' }}>Notifications</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-500)', fontWeight: 500 }}>System Live</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                <div style={{ padding: '8px 10px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Daily Attendance Ready</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Attendance engine is active for today's logs.</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Payroll Engine Synchronized</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Salary calculation formulas applied: Rs. 500/day.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div className="avatar avatar-sm" style={{ position: 'relative' }}>
              {(user?.avatar || user?.picture) ? (
                <img
                  src={user.avatar || user.picture}
                  alt={user?.name || 'User'}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {(user?.name || user?.fullName || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <ChevronDown size={14} color="var(--text-dim)" />
          </button>

          {profileMenuOpen && (
            <div
              className="navbar-dropdown-menu"
              style={{
                width: '220px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ padding: '10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Mini avatar in dropdown */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'var(--primary-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#fff',
                    border: '2px solid var(--primary-500)',
                  }}
                >
                  {(user?.avatar || user?.picture) ? (
                    <img
                      src={user.avatar || user.picture}
                      alt={user?.name || 'User'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    (user?.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'ERP User'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/profile');
                }}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', border: 'none', width: '100%' }}
              >
                <UserIcon size={15} />
                <span>My Profile</span>
              </button>

              {role === 'admin' && (
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', border: 'none', width: '100%' }}
                >
                  <Settings size={15} />
                  <span>Settings</span>
                </button>
              )}

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  logout();
                }}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', border: 'none', color: 'var(--color-absent)', width: '100%' }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
