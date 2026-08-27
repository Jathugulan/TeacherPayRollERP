import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  CalendarDays,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  UserCheck,
  Clock,
  Wallet,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';

const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation Items filtered by role (ADMIN or TEACHER only)
  const getNavLinks = () => {
    switch (role) {
      case 'admin':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Teachers', path: '/teachers', icon: Users },
          { label: 'Mark Attendance', path: '/attendance', icon: CalendarCheck2 },
          { label: 'Leave Management', path: '/leaves', icon: CalendarDays },
          { label: 'Salary & Payroll', path: '/salary', icon: DollarSign },
          {
            label: 'Reports',
            icon: BarChart3,
            children: [
              { label: 'Attendance Reports', path: '/reports/attendance' },
              { label: 'Salary Reports', path: '/reports/salary' },
            ],
          },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];
      case 'teacher':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'My Profile', path: '/profile', icon: UserCheck },
          { label: 'My Attendance', path: '/attendance/calendar', icon: Clock },
          { label: 'My Leaves', path: '/leaves', icon: CalendarDays },
          { label: 'My Salary', path: '/salary', icon: Wallet },
        ];
      default:
        return [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }];
    }
  };

  const navLinks = getNavLinks();

  const handleLinkClick = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar-aside ${mobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: 'var(--navbar-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0 10px' : '0 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            onClick={() => {
              navigate('/dashboard');
              setMobileOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--primary-600), #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>

            {!collapsed && (
              <div style={{ whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--text-white)' }}>
                  EduERP <span style={{ color: 'var(--primary-500)', fontSize: '0.85rem' }}>PRO</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Faculty & Payroll
                </div>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn btn-secondary btn-icon btn-sm desktop-collapse-btn"
            style={{
              width: '28px',
              height: '28px',
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation List */}
        <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              letterSpacing: '0.08em',
              padding: '4px 12px 8px',
              display: collapsed ? 'none' : 'block',
            }}
          >
            Navigation
          </div>

          {navLinks.map((item, idx) => {
            const Icon = item.icon;

            if (item.children) {
              return (
                <div key={idx} style={{ marginTop: '4px', marginBottom: '4px' }}>
                  {!collapsed && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-dim)',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </div>
                  )}
                  {item.children.map((sub, sIdx) => (
                    <NavLink
                      key={sIdx}
                      to={sub.path}
                      onClick={handleLinkClick}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: collapsed ? '10px 0' : '9px 12px 9px 36px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--text-white)' : 'var(--text-muted)',
                        backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--primary-500)' : '3px solid transparent',
                        transition: 'all 0.15s ease',
                      })}
                    >
                      <span>{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              );
            }

            return (
              <NavLink
                key={idx}
                to={item.path}
                onClick={handleLinkClick}
                title={collapsed ? item.label : undefined}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: collapsed ? '12px 0' : '10px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--text-white)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primary-500)' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                })}
              >
                <Icon size={19} color={undefined} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* User Card at bottom of Sidebar */}
        <div
          style={{
            padding: '14px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: collapsed ? 'center' : 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div className="avatar avatar-sm">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  user?.name?.charAt(0) || 'U'
                )}
              </div>
              {!collapsed && (
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-white)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {user?.name || 'User'}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--primary-500)', textTransform: 'capitalize', fontWeight: 500 }}>
                    {role || 'Staff'}
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={logout}
                className="btn btn-secondary btn-icon btn-sm"
                title="Logout"
                style={{ flexShrink: 0 }}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
