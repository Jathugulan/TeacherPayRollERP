import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import {
  User,
  CalendarCheck,
  CalendarX,
  FileCheck,
  DollarSign,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Briefcase,
  Clock,
  ChevronRight,
  Calculator,
} from 'lucide-react';

import { extractArray } from '../../utils/helpers';

const TeacherDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { error } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveSummary, setLeaveSummary] = useState(null);
  const [leavesList, setLeavesList] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);

  useEffect(() => {
    const fetchAllTeacherData = async () => {
      setLoading(true);
      try {
        // Teacher basic info
        const teacherRes = await api.get(`/teachers/${id}`);
        const teacherData = teacherRes?.data?.teacher || teacherRes?.data;
        setTeacher(teacherData);

        // Fetch sub-resources in parallel
        const [statsRes, attRes, leaveSumRes, leavesRes, salaryRes] = await Promise.all([
          api.get(`/teachers/${id}/statistics`).catch(() => null),
          api.get(`/attendance/teacher/${id}`).catch(() => null),
          api.get(`/leaves/summary/${id}`).catch(() => null),
          api.get(`/leaves/teacher/${id}`).catch(() => null),
          api.get(`/salary/teacher/${id}`).catch(() => null),
        ]);

        setStatistics(statsRes?.data || null);
        setAttendanceRecords(extractArray(attRes, 'attendance', 'records'));
        setLeaveSummary(leaveSumRes?.data || null);
        setLeavesList(extractArray(leavesRes, 'leaves'));
        setSalaryHistory(extractArray(salaryRes, 'salaries'));
      } catch (err) {
        console.error('Error fetching teacher details:', err);
        error(err.message || 'Failed to fetch teacher profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllTeacherData();
  }, [id, error]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <CardSkeleton />
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (!teacher) {
    return (
      <EmptyState
        title="Teacher not found"
        description="The teacher profile you are looking for does not exist or has been removed."
        actionLabel="Back to Teachers"
        onAction={() => navigate('/teachers')}
      />
    );
  }

  const presentDays = statistics?.presentDays ?? 0;
  const absentDays = statistics?.absentDays ?? 0;
  const leaveDays = statistics?.leaveDays ?? 0;
  const attendancePercentage = statistics?.attendancePercentage ?? 0;
  const currentMonthSalary = statistics?.currentMonthSalary ?? 0;
  const totalDeductions = statistics?.totalDeductions ?? 0;

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <ArrowLeft size={16} />
        <span>Back to List</span>
      </button>

      {/* Profile Header Banner */}
      <div
        className="erp-card"
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-subtle) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div className="avatar avatar-lg">
            {teacher.fullName?.charAt(0) || 'T'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-white)' }}>
                {teacher.fullName}
              </h1>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: 'var(--primary-500)',
                  background: 'var(--bg-input)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {teacher.employeeId}
              </span>
              <Badge status={teacher.status || 'ACTIVE'} size="sm" />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={15} color="var(--primary-500)" />
                {teacher.department}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={15} color="var(--text-dim)" />
                {teacher.designation || 'Teacher'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={15} color="var(--color-present)" />
                Rs. {teacher.salaryPerDay || 500} / Day
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        {(role === 'admin' || role === 'accountant') && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/salary/${teacher._id}`)}
          >
            <Calculator size={15} />
            <span>Calculate Payroll</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="erp-tabs">
        <button
          className={`erp-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <User size={16} />
          <span>Overview & Stats</span>
        </button>
        <button
          className={`erp-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <CalendarCheck size={16} />
          <span>Attendance Records ({attendanceRecords.length})</span>
        </button>
        <button
          className={`erp-tab-btn ${activeTab === 'leave' ? 'active' : ''}`}
          onClick={() => setActiveTab('leave')}
        >
          <FileCheck size={16} />
          <span>Leaves & Quota ({leavesList.length})</span>
        </button>
        <button
          className={`erp-tab-btn ${activeTab === 'salary' ? 'active' : ''}`}
          onClick={() => setActiveTab('salary')}
        >
          <DollarSign size={16} />
          <span>Salary History ({salaryHistory.length})</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div>
          {/* Monthly KPI Row */}
          <div className="kpi-grid" style={{ marginBottom: '24px' }}>
            <StatCard
              title="Present Days"
              value={presentDays}
              subtitle={`${attendancePercentage}% Rate`}
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
              title="Approved Leaves"
              value={leaveDays}
              subtitle="This month"
              icon={FileCheck}
              accentColor="var(--color-leave)"
              accentBg="var(--color-leave-bg)"
            />
            <StatCard
              title="Current Month Net"
              value={`Rs. ${currentMonthSalary.toLocaleString()}`}
              subtitle={`Deductions: Rs. ${totalDeductions.toLocaleString()}`}
              icon={DollarSign}
              accentColor="var(--color-info)"
              accentBg="var(--color-info-bg)"
            />
          </div>

          {/* Details Card */}
          <div className="dashboard-grid-2col">
            <div className="erp-card">
              <h3 className="erp-card-title" style={{ marginBottom: '14px' }}>
                <User size={18} color="var(--primary-500)" />
                <span>Contact & Personal Info</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 500 }}>{teacher.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 500 }}>{teacher.phone || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Address:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 500 }}>{teacher.address || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 500 }}>
                    {teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="erp-card">
              <h3 className="erp-card-title" style={{ marginBottom: '14px' }}>
                <Briefcase size={18} color="var(--primary-500)" />
                <span>Faculty Employment Details</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{teacher.department}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Designation:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 500 }}>{teacher.designation || 'Teacher'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Joining Date:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 500 }}>
                    {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Daily Rate:</span>
                  <span style={{ color: 'var(--color-present)', fontWeight: 700 }}>Rs. {teacher.salaryPerDay || 500}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <div>
          {attendanceRecords.length === 0 ? (
            <EmptyState
              title="No attendance records"
              description="No attendance entries recorded for this faculty member yet."
            />
          ) : (
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((att) => (
                    <tr key={att._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={15} color="var(--primary-500)" />
                          <span style={{ fontWeight: 600 }}>
                            {new Date(att.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge status={att.status} size="sm" />
                      </td>
                      <td>{att.remarks || 'Regular schedule'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {att.markedBy?.name || 'HR Department'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Leave */}
      {activeTab === 'leave' && (
        <div>
          {/* Leave Quota Banner */}
          <div
            className="erp-card"
            style={{
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Allowed Free Leaves</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-white)' }}>
                {leaveSummary?.allowedLeaveDays ?? 5} Days
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Used Leaves</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-leave)' }}>
                {leaveSummary?.usedLeaveDays ?? 0} Days
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining Free Leaves</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-present)' }}>
                {leaveSummary?.remainingLeaveDays ?? 5} Days
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Excess Leave Deduction</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-absent)' }}>
                Rs. {leaveSummary?.extraLeaveDeduction ?? 0}
              </div>
            </div>
          </div>

          {leavesList.length === 0 ? (
            <EmptyState
              title="No leave requests"
              description="This teacher has not submitted any leave applications."
            />
          ) : (
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Duration / Dates</th>
                    <th>Total Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Approved At</th>
                  </tr>
                </thead>
                <tbody>
                  {leavesList.map((leave) => (
                    <tr key={leave._id}>
                      <td>
                        <strong>
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{leave.totalDays} Day(s)</span>
                      </td>
                      <td>{leave.reason || 'Personal'}</td>
                      <td>
                        <Badge status={leave.status} size="sm" />
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {leave.approvedAt ? new Date(leave.approvedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Salary */}
      {activeTab === 'salary' && (
        <div>
          {salaryHistory.length === 0 ? (
            <EmptyState
              title="No salary records generated"
              description="No monthly payroll runs generated for this faculty member yet."
              actionLabel="Calculate Monthly Salary"
              onAction={() => navigate(`/salary/${teacher._id}`)}
            />
          ) : (
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Month / Year</th>
                    <th>Present Days</th>
                    <th>Gross Salary</th>
                    <th>Absence Deduction</th>
                    <th>Leave Deduction</th>
                    <th>Total Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryHistory.map((sal) => (
                    <tr key={sal._id}>
                      <td>
                        <strong>
                          {new Date(0, sal.month - 1).toLocaleString('default', { month: 'long' })} {sal.year}
                        </strong>
                      </td>
                      <td>{sal.presentDays} Days</td>
                      <td>Rs. {sal.grossSalary?.toLocaleString()}</td>
                      <td style={{ color: 'var(--color-absent)' }}>-Rs. {sal.absenceDeduction ?? 0}</td>
                      <td style={{ color: 'var(--color-leave)' }}>-Rs. {sal.leaveDeduction ?? 0}</td>
                      <td style={{ color: 'var(--color-absent)', fontWeight: 600 }}>
                        -Rs. {sal.totalDeductions ?? sal.totalDeduction ?? 0}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--color-present)', fontSize: '0.95rem' }}>
                          Rs. {sal.netSalary?.toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <Badge status={sal.status || 'GENERATED'} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherDetails;
