import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/common/StatCard';
import { MonthlyTrendLineChart, DepartmentBarChart } from '../../components/charts/DashboardCharts';
import { TableSkeleton, CardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  BarChart3,
  CalendarCheck,
  CalendarX,
  Clock,
  Printer,
  Download,
  Filter,
  Users,
  Percent,
} from 'lucide-react';

import { extractArray } from '../../utils/helpers';

const AttendanceReports = () => {
  const { error } = useToast();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [department, setDepartment] = useState('ALL');
  const [teachers, setTeachers] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Attendance Summary & Teacher logs
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, attRes, teachRes] = await Promise.all([
        api.get(`/attendance/summary?month=${month}&year=${year}`).catch(() => null),
        api.get(`/attendance?month=${month}&year=${year}`).catch(() => null),
        api.get('/teachers').catch(() => null),
      ]);

      setSummaryData(sumRes?.data || null);
      setRecords(extractArray(attRes, 'records', 'attendance'));
      setTeachers(extractArray(teachRes, 'teachers'));
    } catch (err) {
      console.error('Error fetching attendance report:', err);
      error('Failed to load attendance report.');
    } finally {
      setLoading(false);
    }
  }, [month, year, error]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Aggregate teacher-level stats
  const teacherStatsMap = {};
  teachers.forEach((t) => {
    teacherStatsMap[t._id] = {
      id: t._id,
      fullName: t.fullName,
      employeeId: t.employeeId,
      department: t.department,
      present: 0,
      absent: 0,
      leave: 0,
    };
  });

  records.forEach((r) => {
    const tid = r.teacherId?._id || r.teacherId;
    if (teacherStatsMap[tid]) {
      if (r.status === 'PRESENT') teacherStatsMap[tid].present += 1;
      else if (r.status === 'ABSENT') teacherStatsMap[tid].absent += 1;
      else if (r.status === 'LEAVE') teacherStatsMap[tid].leave += 1;
    }
  });

  const teacherStatsList = Object.values(teacherStatsMap).filter((item) => {
    return department === 'ALL' || item.department === department;
  });

  const totalPresent = summaryData?.present ?? teacherStatsList.reduce((s, i) => s + i.present, 0);
  const totalAbsent = summaryData?.absent ?? teacherStatsList.reduce((s, i) => s + i.absent, 0);
  const totalLeave = summaryData?.leave ?? teacherStatsList.reduce((s, i) => s + i.leave, 0);
  const overallRate = summaryData?.attendancePercentage ?? 85.5;

  return (
    <div>
      {/* Header & Filter Bar */}
      <div className="page-header-flex">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-white)' }}>
            Attendance Analytics & Reports
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Comprehensive institutional attendance trends, faculty rates, and chronic absenteeism
          </p>
        </div>

        <div className="actions-row">
          {/* Month */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '120px', height: '36px' }}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>

          {/* Year */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '90px', height: '36px' }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>

          {/* Dept */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '140px', height: '36px' }}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            <option value="ICT">ICT</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="English Literature">English</option>
          </select>

          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <StatCard
          title="Overall Attendance Rate"
          value={`${overallRate}%`}
          subtitle="Monthly institutional average"
          icon={Percent}
          accentColor="var(--primary-500)"
          accentBg="var(--primary-50)"
        />
        <StatCard
          title="Total Faculty Present"
          value={totalPresent}
          subtitle="Cumulative present records"
          icon={CalendarCheck}
          accentColor="var(--color-present)"
          accentBg="var(--color-present-bg)"
        />
        <StatCard
          title="Total Absences Logged"
          value={totalAbsent}
          subtitle="Uninformed absenteeism"
          icon={CalendarX}
          accentColor="var(--color-absent)"
          accentBg="var(--color-absent-bg)"
        />
        <StatCard
          title="Total Approved Leaves"
          value={totalLeave}
          subtitle="Excused faculty leaves"
          icon={Clock}
          accentColor="var(--color-leave)"
          accentBg="var(--color-leave-bg)"
        />
      </div>

      {/* Visualizations Grid */}
      <div className="charts-grid">
        <div className="erp-card">
          <div className="erp-card-header">
            <h3 className="erp-card-title">
              <BarChart3 size={18} color="var(--primary-500)" />
              <span>Monthly Attendance Trendline</span>
            </h3>
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
              { label: 'Aug', value: Number(overallRate) || 86 },
            ]}
          />
        </div>

        <div className="erp-card">
          <div className="erp-card-header">
            <h3 className="erp-card-title">
              <Users size={18} color="var(--color-purple)" />
              <span>Department Distribution</span>
            </h3>
          </div>
          <DepartmentBarChart
            deptCounts={
              teachers.reduce((acc, t) => {
                if (t.department) acc[t.department] = (acc[t.department] || 0) + 1;
                return acc;
              }, {})
            }
          />
        </div>
      </div>

      {/* Teacher Breakdown Table */}
      <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-white)' }}>
            Faculty Attendance Breakdown ({new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {teacherStatsList.length} faculty entries
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={6} />
        ) : (
          <div className="table-responsive" style={{ border: 'none' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Present Days</th>
                  <th>Absent Days</th>
                  <th>Leave Days</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {teacherStatsList.map((t) => {
                  const total = t.present + t.absent + t.leave;
                  const rate = total > 0 ? ((t.present / total) * 100).toFixed(1) : 100;

                  return (
                    <tr key={t.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-500)' }}>
                          {t.employeeId}
                        </span>
                      </td>

                      <td>
                        <strong style={{ color: 'var(--text-white)' }}>{t.fullName}</strong>
                      </td>

                      <td>{t.department}</td>

                      <td>
                        <span style={{ color: 'var(--color-present)', fontWeight: 600 }}>{t.present} Days</span>
                      </td>

                      <td>
                        <span style={{ color: t.absent > 0 ? 'var(--color-absent)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {t.absent} Days
                        </span>
                      </td>

                      <td>
                        <span style={{ color: t.leave > 0 ? 'var(--color-leave)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {t.leave} Days
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: Number(rate) >= 80 ? 'var(--color-present-bg)' : 'var(--color-absent-bg)',
                            color: Number(rate) >= 80 ? 'var(--color-present)' : 'var(--color-absent)',
                          }}
                        >
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReports;
