import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/common/StatCard';
import { SalaryOverviewChart, DepartmentBarChart } from '../../components/charts/DashboardCharts';
import { TableSkeleton } from '../../components/common/Skeleton';
import {
  DollarSign,
  Calculator,
  CheckCircle,
  TrendingDown,
  Printer,
  Download,
  Users,
} from 'lucide-react';

import { extractArray } from '../../utils/helpers';

const SalaryReports = () => {
  const { error } = useToast();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [department, setDepartment] = useState('ALL');
  const [summary, setSummary] = useState(null);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSalaryReport = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, salRes] = await Promise.all([
        api.get(`/salary/summary?month=${month}&year=${year}`).catch(() => null),
        api.get(`/salary?month=${month}&year=${year}`).catch(() => null),
      ]);

      setSummary(sumRes?.data || null);
      setSalaries(extractArray(salRes, 'salaries'));
    } catch (err) {
      console.error('Error fetching salary report:', err);
      error('Failed to fetch salary analytics report.');
    } finally {
      setLoading(false);
    }
  }, [month, year, error]);

  useEffect(() => {
    fetchSalaryReport();
  }, [fetchSalaryReport]);

  const filteredSalaries = salaries.filter((sal) => {
    const dept = sal.teacherId?.department || '';
    return department === 'ALL' || dept === department;
  });

  const totalGross = summary?.grossSalary ?? filteredSalaries.reduce((s, i) => s + (i.grossSalary || 0), 0);
  const totalDeductions = summary?.totalDeductions ?? filteredSalaries.reduce((s, i) => s + (i.totalDeductions || i.totalDeduction || 0), 0);
  const totalNet = summary?.netSalary ?? filteredSalaries.reduce((s, i) => s + (i.netSalary || 0), 0);
  const avgSalary = summary?.averageSalary ?? (filteredSalaries.length > 0 ? (totalNet / filteredSalaries.length).toFixed(0) : 0);

  return (
    <div>
      {/* Header & Filter Bar */}
      <div className="page-header-flex">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-white)' }}>
            Institutional Salary & Payroll Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Faculty compensation audits, gross expenditure, deductions, and financial summaries
          </p>
        </div>

        <div className="actions-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
          title="Total Gross Payroll"
          value={`Rs. ${totalGross.toLocaleString()}`}
          subtitle="Before deductions"
          icon={DollarSign}
          accentColor="var(--primary-500)"
          accentBg="var(--primary-50)"
        />
        <StatCard
          title="Total Deductions"
          value={`Rs. ${totalDeductions.toLocaleString()}`}
          subtitle="Absence & excess leave"
          icon={Calculator}
          accentColor="var(--color-absent)"
          accentBg="var(--color-absent-bg)"
        />
        <StatCard
          title="Net Disbursed"
          value={`Rs. ${totalNet.toLocaleString()}`}
          subtitle="Final faculty payout"
          icon={CheckCircle}
          accentColor="var(--color-present)"
          accentBg="var(--color-present-bg)"
        />
        <StatCard
          title="Average Monthly Pay"
          value={`Rs. ${Number(avgSalary).toLocaleString()}`}
          subtitle="Per faculty member"
          icon={Users}
          accentColor="var(--color-info)"
          accentBg="var(--color-info-bg)"
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="erp-card">
          <div className="erp-card-header">
            <h3 className="erp-card-title">
              <DollarSign size={18} color="var(--color-info)" />
              <span>Gross vs Deductions vs Net Ratio</span>
            </h3>
          </div>
          <SalaryOverviewChart gross={totalGross} deductions={totalDeductions} net={totalNet} />
        </div>

        <div className="erp-card">
          <div className="erp-card-header">
            <h3 className="erp-card-title">
              <Users size={18} color="var(--color-purple)" />
              <span>Department Faculty Overview</span>
            </h3>
          </div>
          <DepartmentBarChart
            deptCounts={
              salaries.reduce((acc, s) => {
                const dept = s.teacherId?.department || 'General';
                acc[dept] = (acc[dept] || 0) + 1;
                return acc;
              }, {})
            }
          />
        </div>
      </div>

      {/* Teacher Salary Breakdown Table */}
      <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-white)' }}>
            Payroll Schedule Statement ({new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total {filteredSalaries.length} records processed
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={7} />
        ) : (
          <div className="table-responsive" style={{ border: 'none' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Faculty Member</th>
                  <th>Department</th>
                  <th>Present Days</th>
                  <th>Gross Salary</th>
                  <th>Total Deductions</th>
                  <th>Net Payout</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalaries.map((sal) => {
                  const teacherObj = sal.teacherId || {};
                  return (
                    <tr key={sal._id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-500)' }}>
                          {teacherObj.employeeId || '—'}
                        </span>
                      </td>

                      <td>
                        <strong style={{ color: 'var(--text-white)' }}>
                          {teacherObj.fullName || 'Faculty'}
                        </strong>
                      </td>

                      <td>{teacherObj.department || '—'}</td>

                      <td>{sal.presentDays} Days</td>

                      <td>Rs. {sal.grossSalary?.toLocaleString()}</td>

                      <td style={{ color: 'var(--color-absent)' }}>
                        -Rs. {(sal.totalDeductions ?? sal.totalDeduction ?? 0).toLocaleString()}
                      </td>

                      <td>
                        <strong style={{ color: 'var(--color-present)', fontSize: '0.95rem' }}>
                          Rs. {sal.netSalary?.toLocaleString()}
                        </strong>
                      </td>

                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-present-bg)', color: 'var(--color-present)', fontSize: '0.75rem', fontWeight: 600 }}>
                          {sal.status || 'GENERATED'}
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

export default SalaryReports;
