import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import {
  DollarSign,
  Calculator,
  PlayCircle,
  Calendar,
  Eye,
  Filter,
  Users,
  Search,
  RotateCcw,
  CheckCircle,
  Download,
} from 'lucide-react';

import { extractArray } from '../../utils/helpers';

const SalaryManagement = () => {
  const { role, user, teacherProfile } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  const [salaries, setSalaries] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);

  // Filters
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedTeacher, setSelectedTeacher] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Generate All Modal
  const [confirmGenerateAllOpen, setConfirmGenerateAllOpen] = useState(false);

  // 1. Load Teachers for filter
  useEffect(() => {
    if (role !== 'teacher') {
      api.get('/teachers').then((res) => {
        setTeachers(extractArray(res, 'teachers'));
      }).catch(() => {});
    }
  }, [role]);

  // 2. Fetch Salaries based on role
  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    try {
      if (role === 'teacher') {
        const res = await api.get('/salary/me');
        setSalaries(extractArray(res, 'salaries'));
      } else {
        let queryUrl = `/salary?month=${month}&year=${year}`;
        if (selectedTeacher !== 'ALL') queryUrl += `&teacherId=${selectedTeacher}`;
        const res = await api.get(queryUrl);
        setSalaries(extractArray(res, 'salaries'));
      }
    } catch (err) {
      console.error('Failed to load salary records:', err);
      error(err.message || 'Failed to fetch payroll records.');
    } finally {
      setLoading(false);
    }
  }, [role, month, year, selectedTeacher, error]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  // Generate All Salaries
  const handleGenerateAllSalaries = async () => {
    setGeneratingAll(true);
    try {
      const response = await api.post('/salary/generate-all', { month, year });
      success(response?.message || `Processed payroll run for ${response?.data?.successfulCount || 0} teachers!`);
      setConfirmGenerateAllOpen(false);
      fetchSalaries();
    } catch (err) {
      error(err.message || 'Failed to generate payroll for all teachers.');
    } finally {
      setGeneratingAll(false);
    }
  };

  // Filter logic
  const filteredSalaries = salaries.filter((sal) => {
    const teacherObj = sal.teacherId || {};
    const name = teacherObj.fullName || '';
    const empId = teacherObj.employeeId || '';
    const dept = teacherObj.department || '';

    const matchSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = selectedDept === 'ALL' || dept === selectedDept;

    return matchSearch && matchDept;
  });

  // Calculate totals
  const totalGross = filteredSalaries.reduce((sum, s) => sum + (s.grossSalary || 0), 0);
  const totalDeductions = filteredSalaries.reduce((sum, s) => sum + (s.totalDeductions || s.totalDeduction || 0), 0);
  const totalNet = filteredSalaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);

  // Pagination
  const totalPages = Math.ceil(filteredSalaries.length / itemsPerPage);
  const paginatedSalaries = filteredSalaries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const canManage = role === 'admin';


  return (
    <div>
      {/* Header */}
      <div className="page-header-flex">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-white)' }}>
            {role === 'teacher' ? 'My Salary & Payroll Slips' : 'Salary & Payroll Management'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Faculty compensation calculations, attendance deductions and monthly disbursements
          </p>
        </div>

        {canManage && (
          <div className="actions-row">
            <button
              className="btn btn-primary"
              onClick={() => setConfirmGenerateAllOpen(true)}
              disabled={generatingAll}
            >
              <PlayCircle size={16} />
              <span>Generate All Payroll ({month}/{year})</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <StatCard
          title="Total Gross Payroll"
          value={`Rs. ${totalGross.toLocaleString()}`}
          subtitle={`Across ${filteredSalaries.length} records`}
          icon={DollarSign}
          accentColor="var(--primary-500)"
          accentBg="var(--primary-50)"
        />
        <StatCard
          title="Total Deductions"
          value={`Rs. ${totalDeductions.toLocaleString()}`}
          subtitle="Absence & excess leave deductions"
          icon={Calculator}
          accentColor="var(--color-absent)"
          accentBg="var(--color-absent-bg)"
        />
        <StatCard
          title="Net Salary Disbursed"
          value={`Rs. ${totalNet.toLocaleString()}`}
          subtitle="Net faculty payout"
          icon={CheckCircle}
          accentColor="var(--color-present)"
          accentBg="var(--color-present-bg)"
        />
      </div>

      {/* Filters Bar (for Admin/Accountant) */}
      {role !== 'teacher' && (
        <div
          className="erp-card filter-bar-responsive"
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', height: '38px', fontSize: '0.85rem' }}
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Month */}
          <div style={{ flex: '0 1 150px' }}>
            <select
              className="form-select"
              style={{ height: '38px' }}
              value={month}
              onChange={(e) => {
                setMonth(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div style={{ flex: '0 1 110px' }}>
            <select
              className="form-select"
              style={{ height: '38px' }}
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {/* Department */}
          <div style={{ flex: '0 1 160px' }}>
            <select
              className="form-select"
              style={{ height: '38px' }}
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Departments</option>
              <option value="ICT">ICT</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="English Literature">English</option>
            </select>
          </div>
        </div>
      )}

      {/* Salary Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : paginatedSalaries.length === 0 ? (
        <EmptyState
          title="No salary records found"
          description={`No payroll calculations generated for ${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}.`}
          actionLabel={canManage ? `Generate Payroll for ${month}/${year}` : undefined}
          onAction={() => setConfirmGenerateAllOpen(true)}
        />
      ) : (
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Month / Year</th>
                <th>Days (P / A / L)</th>
                <th>Gross Salary</th>
                <th>Absence Ded.</th>
                <th>Leave Ded.</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSalaries.map((sal) => {
                const teacherObj = sal.teacherId || {};
                const teacherId = teacherObj._id || teacherObj.id || sal.teacherId;

                return (
                  <tr key={sal._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar avatar-sm">{teacherObj.fullName?.charAt(0) || 'T'}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                            {teacherObj.fullName || user?.name || 'Faculty Member'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary-500)', fontFamily: 'monospace' }}>
                            {teacherObj.employeeId || 'ME'} • {teacherObj.department || ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong>
                        {new Date(0, sal.month - 1).toLocaleString('default', { month: 'short' })} {sal.year}
                      </strong>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--color-present)', fontWeight: 600 }}>{sal.presentDays}P</span>
                        <span>/</span>
                        <span style={{ color: 'var(--color-absent)', fontWeight: 600 }}>{sal.absentDays || 0}A</span>
                        <span>/</span>
                        <span style={{ color: 'var(--color-leave)', fontWeight: 600 }}>{sal.leaveDays || 0}L</span>
                      </div>
                    </td>

                    <td>
                      <strong>Rs. {sal.grossSalary?.toLocaleString()}</strong>
                    </td>

                    <td style={{ color: 'var(--color-absent)' }}>
                      -Rs. {sal.absenceDeduction ?? (sal.absentDays ? sal.absentDays * 100 : 0)}
                    </td>

                    <td style={{ color: 'var(--color-leave)' }}>
                      -Rs. {sal.leaveDeduction ?? 0}
                    </td>

                    <td>
                      <strong style={{ color: 'var(--color-present)', fontSize: '1rem' }}>
                        Rs. {sal.netSalary?.toLocaleString()}
                      </strong>
                    </td>

                    <td>
                      <Badge status={sal.status || 'GENERATED'} size="sm" />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/salary/${teacherId}?month=${sal.month}&year=${sal.year}`)}
                      >
                        <Eye size={14} />
                        <span>Breakdown</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSalaries.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Confirm Generate All Modal */}
      <ConfirmDialog
        isOpen={confirmGenerateAllOpen}
        onClose={() => setConfirmGenerateAllOpen(false)}
        onConfirm={handleGenerateAllSalaries}
        title="Run Complete Monthly Payroll"
        message={`Are you sure you want to calculate and generate monthly payroll for all faculty members for ${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}?`}
        type="success"
        confirmText="Execute Payroll Engine"
        loading={generatingAll}
      />
    </div>
  );
};

export default SalaryManagement;
