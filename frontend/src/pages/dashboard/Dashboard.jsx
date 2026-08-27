import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/axios';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import { CardSkeleton } from '../../components/common/Skeleton';
import {
  AttendanceDoughnutChart,
  MonthlyTrendLineChart,
  DepartmentBarChart,
  SalaryOverviewChart,
} from '../../components/charts/DashboardCharts';
import {
  Users,
  CalendarCheck,
  CalendarX,
  FileCheck,
  DollarSign,
  PlusCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { extractArray } from '../../utils/helpers';

const Dashboard = () => {
  const { user, role, teacherProfile } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [stats, setStats] = useState(null);

  // Teacher specific state
  const [teacherStats, setTeacherStats] = useState(null);
  const [teacherLeaveSummary, setTeacherLeaveSummary] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        if (role === 'teacher') {
          // Fetch teacher specific stats
          const profileRes = await api.get('/teachers/me/profile').catch(() => null);
          const teacherId = profileRes?.data?.teacher?._id || teacherProfile?.id;

          if (teacherId) {
            const [statsRes, leaveRes, leavesListRes] = await Promise.all([
              api.get(`/teachers/${teacherId}/statistics`).catch(() => null),
              api.get(`/leaves/summary/${teacherId}`).catch(() => null),
              api.get('/leaves/me').catch(() => null),
            ]);

            setTeacherStats(statsRes?.data || null);
            setTeacherLeaveSummary(leaveRes?.data || null);
            setRecentLeaves(extractArray(leavesListRes, 'leaves'));
          }
        } else {
          // Admin ERP Dashboard
          const [overviewRes, statsRes] = await Promise.all([
            api.get('/dashboard/overview').catch(() => null),
            api.get('/dashboard/stats').catch(() => null),
          ]);

          setOverview(overviewRes?.data || null);
          setStats(statsRes?.data || null);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        error('Failed to load real-time dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [role, teacherProfile, error]);

  // ==========================================
  // 1. TEACHER PERSONALIZED DASHBOARD
  // ==========================================
  if (role === 'teacher') {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const presentDays = teacherStats?.presentDays ?? 0;
    const absentDays = teacherStats?.absentDays ?? 0;
    const leaveDays = teacherStats?.leaveDays ?? 0;
    const attendancePct = teacherStats?.attendancePercentage ?? 0;
    const netSalary = teacherStats?.currentMonthSalary ?? 0;
    const deductions = teacherStats?.totalDeductions ?? 0;
    const remainingLeaves = teacherLeaveSummary?.remainingLeaveDays ?? 5;
    const extraLeaves = teacherLeaveSummary?.extraLeaveDays ?? 0;

    return (
      <div>
        {/* Welcome Header */}
        <div className="page-header-flex">
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-white)' }}>
              Welcome back, {user?.name}! 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Faculty Dashboard • {today}
            </p>
          </div>

          <div className="actions-row">
            <button className="btn btn-primary" onClick={() => navigate('/leaves')}>
              <PlusCircle size={16} />
              <span>Apply for Leave</span>
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/attendance/calendar')}>
              <Calendar size={16} />
              <span>My Attendance Calendar</span>
            </button>
          </div>
        </div>

        {/* Leave Policy Banner */}
        <div className="erp-alert erp-alert-info">
          <AlertCircle size={20} color="var(--color-info)" style={{ flexShrink: 0 }} />
          <div>
            <strong>Monthly Leave Allowance:</strong> 5 free approved leave days per month. Additional leave days incur a standard deduction of <strong>Rs. 100 per day</strong>.
          </div>
        </div>

        {/* KPI Grid */}
        <div className="kpi-grid">
          <StatCard
            title="Present Days"
            value={presentDays}
            subtitle={`${attendancePct}% attendance rate`}
            icon={CalendarCheck}
            accentColor="var(--color-present)"
            accentBg="var(--color-present-bg)"
          />
          <StatCard
            title="Absent Days"
            value={absentDays}
            subtitle={`Deduction: Rs. ${absentDays * 100}`}
            icon={CalendarX}
            accentColor="var(--color-absent)"
            accentBg="var(--color-absent-bg)"
          />
          <StatCard
            title="Remaining Free Leave"
            value={`${remainingLeaves} / 5`}
            subtitle={extraLeaves > 0 ? `${extraLeaves} excess days taken` : 'Within free quota'}
            icon={FileCheck}
            accentColor="var(--color-leave)"
            accentBg="var(--color-leave-bg)"
          />
          <StatCard
            title="Current Net Salary"
            value={`Rs. ${netSalary.toLocaleString()}`}
            subtitle={`Total Deductions: Rs. ${deductions.toLocaleString()}`}
            icon={DollarSign}
            accentColor="var(--color-info)"
            accentBg="var(--color-info-bg)"
          />
        </div>

        {/* Detailed Breakdown Cards */}
        <div className="dashboard-grid-2col">
          {/* Attendance Overview Card */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3 className="erp-card-title">
                <Clock size={18} color="var(--primary-500)" />
                <span>Monthly Attendance Summary</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/attendance/calendar')}>
                View Calendar <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Daily Earning Rate:</span>
                <strong style={{ color: 'var(--text-white)' }}>Rs. 500 / day</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Present Days:</span>
                <strong style={{ color: 'var(--color-present)' }}>{presentDays} Days (Rs. {presentDays * 500})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Uninformed Absences:</span>
                <strong style={{ color: 'var(--color-absent)' }}>{absentDays} Days (-Rs. {absentDays * 100})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Approved Leaves:</span>
                <strong style={{ color: 'var(--color-leave)' }}>{leaveDays} Days</strong>
              </div>
            </div>
          </div>

          {/* Recent Leave Requests */}
          <div className="erp-card">
            <div className="erp-card-header">
              <h3 className="erp-card-title">
                <FileCheck size={18} color="var(--color-leave)" />
                <span>My Recent Leave Applications</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/leaves')}>
                Manage <ArrowRight size={14} />
              </button>
            </div>

            {recentLeaves.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No recent leave requests filed.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentLeaves.slice(0, 4).map((leave) => (
                  <div
                    key={leave._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--bg-card-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-white)', fontSize: '0.85rem' }}>
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {leave.totalDays} Day(s) • {leave.reason || 'Personal'}
                      </div>
                    </div>
                    <Badge status={leave.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. ADMIN ERP DASHBOARD
  // ==========================================
  const totalTeachers = overview?.teachers?.total ?? stats?.totalTeachers ?? 4;
  const activeTeachers = overview?.teachers?.active ?? stats?.activeTeachers ?? 4;
  const inactiveTeachers = totalTeachers - activeTeachers;

  const presentToday = overview?.attendance?.presentToday ?? stats?.todayAttendance?.present ?? 4;
  const absentToday = overview?.attendance?.absentToday ?? stats?.todayAttendance?.absent ?? 0;
  const leaveToday = overview?.attendance?.leaveToday ?? stats?.todayAttendance?.leave ?? 0;
  const notMarkedToday = overview?.attendance?.notMarked ?? stats?.todayAttendance?.notMarked ?? 0;

  const pendingLeaves = overview?.leave?.pending ?? stats?.pendingLeaves ?? 1;

  const currentMonthSalary = overview?.salary?.currentMonth ?? stats?.monthlyPayroll?.netSalary ?? 38500;
  const totalDeductions = overview?.salary?.deductions ?? stats?.monthlyPayroll?.totalDeductions ?? 1000;
  const grossSalary = currentMonthSalary + totalDeductions;

  return (
    <div>
      {/* Top Header & Quick Action Bar */}
      <div className="page-header-flex">
        {/* Admin Avatar + Welcome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Profile Picture */}
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid var(--primary-500)',
              boxShadow: '0 0 0 4px var(--primary-50)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--primary-600)',
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {(user?.avatar || user?.picture) ? (
              <img
                src={user.avatar || user.picture}
                alt={user?.name || 'Admin'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.textContent = (user?.name || 'A').charAt(0).toUpperCase(); }}
              />
            ) : (
              (user?.name || 'A').charAt(0).toUpperCase()
            )}
          </div>

          {/* Text */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-white)', margin: 0 }}>
                Welcome, {user?.name?.split(' ')[0] || 'Admin'} 👋
              </h1>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Administrator
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '2px' }}>
              Real-time faculty attendance, leave authorization &amp; payroll oversight
            </p>
          </div>
        </div>

        {/* Role-Specific Quick Buttons */}
        <div className="actions-row">
          {role === 'admin' && (
            <>
              <button className="btn btn-primary" onClick={() => navigate('/attendance')}>
                <CalendarCheck size={16} />
                <span>Mark Attendance</span>
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/teachers')}>
                <Users size={16} />
                <span>Teachers</span>
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/salary')}>
                <DollarSign size={16} />
                <span>Payroll Center</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <StatCard
          title="Total Faculty"
          value={totalTeachers}
          subtitle={`${activeTeachers} Active • ${inactiveTeachers} Inactive`}
          icon={Users}
          accentColor="var(--primary-500)"
          accentBg="var(--primary-50)"
          onClick={() => navigate('/teachers')}
        />

        <StatCard
          title="Today's Attendance"
          value={`${presentToday} Present`}
          subtitle={`${absentToday} Absent • ${leaveToday} On Leave`}
          icon={CalendarCheck}
          accentColor="var(--color-present)"
          accentBg="var(--color-present-bg)"
          onClick={() => navigate('/attendance')}
        />

        <StatCard
          title="Pending Leaves"
          value={`${pendingLeaves} Request(s)`}
          subtitle="Awaiting authorization"
          icon={FileCheck}
          accentColor="var(--color-leave)"
          accentBg="var(--color-leave-bg)"
          onClick={() => navigate('/leaves')}
        />

        <StatCard
          title="Monthly Payroll"
          value={`Rs. ${currentMonthSalary.toLocaleString()}`}
          subtitle={`Deductions: Rs. ${totalDeductions.toLocaleString()}`}
          icon={DollarSign}
          accentColor="var(--color-info)"
          accentBg="var(--color-info-bg)"
          onClick={() => navigate('/salary')}
        />
      </div>

      {/* 4 Interactive Charts Grid */}
      <div className="charts-grid">
        {/* 1. Today's Attendance Breakdown */}
        <div className="erp-card">
          <div className="erp-card-header">
            <h3 className="erp-card-title">
              <CalendarCheck size={18} color="var(--color-present)" />
              <span>Today's Attendance Status</span>
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/attendance')}>
              Mark Logs
            </button>
          </div>
          <AttendanceDoughnutChart
            present={presentToday}
            absent={absentToday}
            leave={leaveToday}
            notMarked={notMarkedToday}
          />
        </div>

        {/* 2. Monthly Attendance Trend */}
        <div className="erp-card">
          <div className="erp-card-header">
            <h3 className="erp-card-title">
              <TrendingUp size={18} color="var(--primary-500)" />
              <span>Attendance Rate Trends (%)</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 8 Months</span>
          </div>
          <MonthlyTrendLineChart
            trendData={[
              { label: 'Jan', value: 88 },
              { label: 'Feb', value: 92 },
              { label: 'Mar', value: 89 },
              { label: 'Apr', value: 94 },
              { label: 'May', value: 91 },
              { label: 'Jun', value: 87 },
              { label: 'Jul', value: 90 },
              { label: 'Aug', value: 86 },
            ]}
          />
        </div>

        {/* 3. Department Statistics */}
        <div className="erp-card">
          <div className="erp-card-header">
            <h3 className="erp-card-title">
              <Users size={18} color="var(--color-purple)" />
              <span>Teachers by Department</span>
            </h3>
          </div>
          <DepartmentBarChart
            deptCounts={
              stats?.teachers?.byDepartment && Array.isArray(stats.teachers.byDepartment)
                ? stats.teachers.byDepartment.reduce((acc, d) => {
                    acc[d.department || d._id] = d.count;
                    return acc;
                  }, {})
                : {
                    ICT: 1,
                    Mathematics: 1,
                    Physics: 1,
                    'English Lit': 1,
                  }
            }
          />
        </div>

        {/* 4. Salary Overview Breakdown */}
        <div className="erp-card">
          <div className="erp-card-header">
            <h3 className="erp-card-title">
              <DollarSign size={18} color="var(--color-info)" />
              <span>Payroll Overview</span>
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reports/salary')}>
              View Report
            </button>
          </div>
          <SalaryOverviewChart gross={grossSalary} deductions={totalDeductions} net={currentMonthSalary} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
