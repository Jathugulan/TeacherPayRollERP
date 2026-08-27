import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import { CardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  DollarSign,
  Calendar,
  Calculator,
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  User,
  Building,
  Briefcase,
  TrendingDown,
  TrendingUp,
  FileCheck,
} from 'lucide-react';

const SalaryDetails = () => {
  const { teacherId: teacherIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role, teacherProfile } = useAuth();
  const { success, error } = useToast();

  const queryMonth = Number(searchParams.get('month')) || new Date().getMonth() + 1;
  const queryYear = Number(searchParams.get('year')) || new Date().getFullYear();

  const [month, setMonth] = useState(queryMonth);
  const [year, setYear] = useState(queryYear);
  const [salaryData, setSalaryData] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Resolve the correct teacherId based on role
  // For teachers: always use their own profile ID (not the URL param, which might mismatch)
  const resolveTeacherId = async () => {
    if (role === 'teacher') {
      // Use teacherProfile from auth context first, then fetch if needed
      if (teacherProfile?.id || teacherProfile?._id) {
        return teacherProfile.id || teacherProfile._id;
      }
      const profileRes = await api.get('/teachers/me/profile').catch(() => null);
      return profileRes?.data?.data?._id || profileRes?.data?._id || teacherIdParam;
    }
    return teacherIdParam;
  };

  // Fetch backend-calculated salary preview
  const fetchSalaryCalculation = useCallback(async () => {
    setLoading(true);
    try {
      const resolvedTeacherId = await resolveTeacherId();

      if (role === 'teacher') {
        // Teachers fetch their own profile only
        const profileRes = await api.get('/teachers/me/profile').catch(() => null);
        setTeacher(profileRes?.data?.data || profileRes?.data || null);
      } else {
        // Admins can fetch any teacher
        const teacherRes = await api.get(`/teachers/${resolvedTeacherId}`).catch(() => null);
        setTeacher(teacherRes?.data?.teacher || teacherRes?.data?.data || teacherRes?.data || null);
      }

      // Fetch salary calculation — teachers are now authorized for their own
      const calcRes = await api.get(`/salary/calculate/${resolvedTeacherId}?month=${month}&year=${year}`);
      setSalaryData(calcRes?.data || calcRes?.data?.data || null);
    } catch (err) {
      console.error('Error calculating salary:', err);
      error(err.message || 'Failed to calculate salary breakdown.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherIdParam, month, year, role, teacherProfile]);

  useEffect(() => {
    fetchSalaryCalculation();
  }, [fetchSalaryCalculation]);

  // Generate / Save payroll slip
  const handleCommitSalary = async () => {
    setGenerating(true);
    try {
      const response = await api.post('/salary/generate', {
        teacherId,
        month,
        year,
      });
      success(response?.message || 'Payroll record generated and saved successfully!');
      fetchSalaryCalculation();
    } catch (err) {
      error(err.message || 'Failed to commit payroll record.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintSlip = () => {
    const teacherName = teacher?.fullName || salaryData?.fullName || 'Faculty Member';
    const employeeId  = teacher?.employeeId || salaryData?.employeeId || 'EMP001';
    const department  = teacher?.department || salaryData?.department || '—';
    const designation = teacher?.designation || salaryData?.designation || 'Teacher';
    const monthName   = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
    const today       = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Recompute values so they are always fresh
    const _dailySalary       = salaryData?.dailySalary ?? teacher?.salaryPerDay ?? 500;
    const _presentDays       = salaryData?.presentDays ?? 0;
    const _absentDays        = salaryData?.absentDays ?? 0;
    const _leaveDays         = salaryData?.leaveDays ?? 0;
    const _extraLeaveDays    = salaryData?.extraLeaveDays ?? Math.max(0, _leaveDays - 5);
    const _grossSalary       = salaryData?.grossSalary ?? _presentDays * _dailySalary;
    const _absenceDeduction  = salaryData?.absenceDeduction ?? _absentDays * 100;
    const _leaveDeduction    = salaryData?.leaveDeduction ?? _extraLeaveDays * 100;
    const _totalDeductions   = salaryData?.totalDeduction ?? salaryData?.totalDeductions ?? _absenceDeduction + _leaveDeduction;
    const _netSalary         = salaryData?.netSalary ?? Math.max(0, _grossSalary - _totalDeductions);

    const fmt = (n) => Number(n || 0).toLocaleString();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payslip — ${teacherName} — ${monthName} ${year}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #ffffff;
      color: #111827;
      padding: 40px;
      font-size: 13px;
      line-height: 1.5;
    }
    /* ── Header strip ── */
    .slip-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid #6366f1;
      margin-bottom: 24px;
    }
    .org-name   { font-size: 20px; font-weight: 800; color: #1e1b4b; }
    .org-sub    { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .slip-title { font-size: 14px; font-weight: 700; color: #6366f1; text-align: right; }
    .slip-meta  { font-size: 11px; color: #6b7280; margin-top: 3px; text-align: right; }
    /* ── Employee info grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .info-label { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 600; letter-spacing: 0.05em; }
    .info-value { font-size: 13px; font-weight: 700; color: #111827; margin-top: 3px; }
    /* ── Earnings / Deductions table ── */
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #f3f4f6; }
    th { padding: 9px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; text-align: left; }
    th:last-child, td:last-child { text-align: right; }
    th:nth-child(2), td:nth-child(2), th:nth-child(3), td:nth-child(3) { text-align: center; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    tr:last-child td { border-bottom: none; }
    .earn  { color: #059669; font-weight: 700; }
    .deduct{ color: #dc2626; font-weight: 700; }
    .dim   { font-size: 11px; color: #9ca3af; margin-top: 2px; }
    /* ── Totals box ── */
    .totals-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 32px;
    }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .totals-row.net {
      border-top: 2px solid #6366f1;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 17px;
      font-weight: 800;
    }
    .totals-row.net .amount { color: #059669; }
    /* ── Signatures ── */
    .sigs { display: flex; justify-content: space-between; padding-top: 24px; border-top: 1px dashed #d1d5db; }
    .sig-block { font-size: 11px; color: #6b7280; }
    .sig-name  { font-weight: 700; color: #374151; }
    .sig-line  { margin-top: 28px; border-top: 1px solid #9ca3af; width: 160px; padding-top: 4px; text-align: center; }
    /* ── Footer ── */
    .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #d1d5db; border-top: 1px solid #f3f4f6; padding-top: 12px; }
    @media print {
      body { padding: 20px; }
      @page { margin: 15mm; size: A4 portrait; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="slip-header">
    <div>
      <div class="org-name">🎓 EduERP — Teacher Payroll System</div>
      <div class="org-sub">Faculty Salary Disbursement Statement</div>
    </div>
    <div>
      <div class="slip-title">SALARY SLIP</div>
      <div class="slip-meta">Period: <strong>${monthName} ${year}</strong></div>
      <div class="slip-meta">Generated: ${today}</div>
    </div>
  </div>

  <!-- Employee Info -->
  <div class="info-grid">
    <div>
      <div class="info-label">Teacher Name</div>
      <div class="info-value">${teacherName}</div>
    </div>
    <div>
      <div class="info-label">Employee ID</div>
      <div class="info-value" style="color:#6366f1;font-family:monospace">${employeeId}</div>
    </div>
    <div>
      <div class="info-label">Department</div>
      <div class="info-value">${department}</div>
    </div>
    <div>
      <div class="info-label">Designation</div>
      <div class="info-value">${designation}</div>
    </div>
    <div>
      <div class="info-label">Daily Rate</div>
      <div class="info-value" style="color:#059669">Rs. ${fmt(_dailySalary)} / Day</div>
    </div>
    <div>
      <div class="info-label">Working Days</div>
      <div class="info-value">${_presentDays} Present</div>
    </div>
    <div>
      <div class="info-label">Absent Days</div>
      <div class="info-value" style="color:#dc2626">${_absentDays} Days</div>
    </div>
    <div>
      <div class="info-label">Leave Days</div>
      <div class="info-value" style="color:#d97706">${_leaveDays} Days</div>
    </div>
  </div>

  <!-- Breakdown Table -->
  <div class="section-title">Earnings &amp; Deductions Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Units / Days</th>
        <th>Rate (LKR)</th>
        <th>Amount (LKR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>Present Days Earned</strong>
          <div class="dim">Regular teaching service attended</div>
        </td>
        <td style="text-align:center"><span class="earn">${_presentDays} Days</span></td>
        <td style="text-align:center">Rs. ${fmt(_dailySalary)}</td>
        <td><span class="earn">Rs. ${fmt(_grossSalary)}</span></td>
      </tr>
      <tr>
        <td>
          <strong style="color:#dc2626">Absence Penalty Deduction</strong>
          <div class="dim">Uninformed absence @ Rs. 100/day</div>
        </td>
        <td style="text-align:center"><span class="deduct">${_absentDays} Days</span></td>
        <td style="text-align:center">Rs. 100</td>
        <td><span class="deduct">-Rs. ${fmt(_absenceDeduction)}</span></td>
      </tr>
      <tr>
        <td>
          <strong style="color:#d97706">Excess Leave Deduction</strong>
          <div class="dim">${_leaveDays} leaves taken (5 free quota, ${_extraLeaveDays} excess) @ Rs. 100/day</div>
        </td>
        <td style="text-align:center"><span style="color:#d97706;font-weight:700">${_extraLeaveDays} Extra Days</span></td>
        <td style="text-align:center">Rs. 100</td>
        <td><span class="deduct">-Rs. ${fmt(_leaveDeduction)}</span></td>
      </tr>
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-box">
    <div class="totals-row">
      <span>Gross Base Salary:</span>
      <strong>Rs. ${fmt(_grossSalary)}</strong>
    </div>
    <div class="totals-row">
      <span style="color:#dc2626">Total Deductions:</span>
      <strong style="color:#dc2626">-Rs. ${fmt(_totalDeductions)}</strong>
    </div>
    <div class="totals-row net">
      <span>Net Salary Disbursed:</span>
      <span class="amount">Rs. ${fmt(_netSalary)}</span>
    </div>
  </div>

  <!-- Signatures -->
  <div class="sigs">
    <div class="sig-block">
      <div>Prepared By: <span class="sig-name">Accounts Department</span></div>
      <div class="sig-line">Signature &amp; Stamp</div>
    </div>
    <div class="sig-block" style="text-align:right">
      <div>Authorized By: <span class="sig-name">Director of Human Resources</span></div>
      <div class="sig-line" style="margin-left:auto">Signature &amp; Stamp</div>
    </div>
  </div>

  <div class="footer">
    This is a computer-generated payslip. No signature is required if generated by the EduERP system. | EduERP v2.0
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(() => window.close(), 800);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!salaryData && !teacher) {
    return (
      <EmptyState
        title="Calculation not available"
        description="Could not load salary calculations for this faculty member."
        actionLabel="Back to Salaries"
        onAction={() => navigate('/salary')}
      />
    );
  }

  const dailySalary = salaryData?.dailySalary ?? teacher?.salaryPerDay ?? 500;
  const presentDays = salaryData?.presentDays ?? 0;
  const grossSalary = salaryData?.grossSalary ?? presentDays * dailySalary;
  const absentDays = salaryData?.absentDays ?? 0;
  const absenceDeduction = salaryData?.absenceDeduction ?? absentDays * 100;
  const leaveDays = salaryData?.leaveDays ?? 0;
  const extraLeaveDays = salaryData?.extraLeaveDays ?? Math.max(0, leaveDays - 5);
  const leaveDeduction = salaryData?.leaveDeduction ?? extraLeaveDays * 100;
  const totalDeductions = salaryData?.totalDeduction ?? salaryData?.totalDeductions ?? absenceDeduction + leaveDeduction;
  const netSalary = salaryData?.netSalary ?? Math.max(0, grossSalary - totalDeductions);

  return (
    <div>
      {/* Top Header & Actions */}
      <div className="page-header-flex">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to List</span>
        </button>

        <div className="actions-row">
          {/* Month / Year Selectors */}
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

          <button className="btn btn-secondary btn-sm" onClick={handlePrintSlip}>
            <Printer size={15} />
            <span>Print Slip</span>
          </button>

          {(role === 'admin' || role === 'accountant') && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCommitSalary}
              disabled={generating}
            >
              <CheckCircle2 size={15} />
              <span>{generating ? 'Saving...' : 'Generate & Save'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Payslip Card View */}
      <div
        className="erp-card"
        style={{
          maxWidth: '850px',
          margin: '0 auto',
          padding: '32px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Slip Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid var(--border-subtle)',
            paddingBottom: '20px',
            marginBottom: '24px',
          }}
        >
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-white)', fontFamily: 'var(--font-display)' }}>
              EduERP Faculty Payroll Statement
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Period: <strong>{new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <Badge status="GENERATED" />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              Generated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Faculty Profile Summary Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            padding: '16px',
            background: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teacher Name</div>
            <div style={{ fontWeight: 700, color: 'var(--text-white)', fontSize: '1rem' }}>
              {teacher?.fullName || salaryData?.fullName || 'Faculty Member'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employee ID</div>
            <div style={{ fontWeight: 700, color: 'var(--primary-500)', fontFamily: 'monospace' }}>
              {teacher?.employeeId || salaryData?.employeeId || 'EMP001'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</div>
            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {teacher?.department || 'ICT'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Rate</div>
            <div style={{ fontWeight: 700, color: 'var(--color-present)' }}>
              Rs. {dailySalary} / Day
            </div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-white)' }}>
            Earnings & Deductions Summary
          </h3>

          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Category Description</th>
                  <th style={{ textAlign: 'center' }}>Units / Days</th>
                  <th style={{ textAlign: 'right' }}>Rate Applied</th>
                  <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Base Earnings */}
                <tr>
                  <td>
                    <strong>Present Days Earned</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Regular teaching service attended</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-present)' }}>{presentDays} Days</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>Rs. {dailySalary}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-present)' }}>
                    Rs. {grossSalary.toLocaleString()}
                  </td>
                </tr>

                {/* 2. Absence Deduction */}
                <tr>
                  <td>
                    <strong style={{ color: 'var(--color-absent)' }}>Absence Penalty Deduction</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Standard uninformed absence @ Rs. 100/day</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-absent)' }}>{absentDays} Days</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>Rs. 100</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-absent)' }}>
                    -Rs. {absenceDeduction.toLocaleString()}
                  </td>
                </tr>

                {/* 3. Leave Deduction */}
                <tr>
                  <td>
                    <strong style={{ color: 'var(--color-leave)' }}>Excess Leave Deduction</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Total {leaveDays} leave(s) taken (5 free allowed quota, {extraLeaveDays} excess)
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-leave)' }}>{extraLeaveDays} Extra Days</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>Rs. 100</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-leave)' }}>
                    -Rs. {leaveDeduction.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Totals Card */}
        <div
          style={{
            padding: '20px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-strong)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Gross Base Salary:</span>
            <strong style={{ color: 'var(--text-white)' }}>Rs. {grossSalary.toLocaleString()}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
            <span style={{ color: 'var(--color-absent)' }}>Total Attendance Deductions:</span>
            <strong style={{ color: 'var(--color-absent)' }}>-Rs. {totalDeductions.toLocaleString()}</strong>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1.25rem',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--text-white)' }}>Net Salary Disbursed:</span>
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--color-present)',
                fontFamily: 'var(--font-display)',
              }}
            >
              Rs. {netSalary.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Authorization Signatures */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '36px',
            paddingTop: '20px',
            borderTop: '1px dashed var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
          }}
        >
          <div>
            <div>Prepared By: <strong>Accountant Department</strong></div>
            <div style={{ marginTop: '20px' }}>______________________</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Authorized By: <strong>Director of Human Resources</strong></div>
            <div style={{ marginTop: '20px' }}>______________________</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryDetails;
