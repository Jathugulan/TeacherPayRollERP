import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import {
  CalendarCheck,
  CalendarX,
  Clock,
  Percent,
  Search,
  Filter,
  Calendar,
  RotateCcw,
} from 'lucide-react';

import { extractArray } from '../../utils/helpers';

const AttendanceHistory = () => {
  const { error } = useToast();

  const [records, setRecords] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTeacher, setSelectedTeacher] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load teachers for dropdown
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await api.get('/teachers');
        setTeachers(extractArray(res, 'teachers'));
      } catch (err) {
        console.error('Error fetching teachers for filter:', err);
      }
    };
    fetchTeachers();
  }, []);

  // Fetch Attendance Records
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      let queryUrl = `/attendance?month=${month}&year=${year}`;
      if (selectedTeacher !== 'ALL') queryUrl += `&teacherId=${selectedTeacher}`;
      if (selectedStatus !== 'ALL') queryUrl += `&status=${selectedStatus}`;
      if (startDate) queryUrl += `&startDate=${startDate}`;
      if (endDate) queryUrl += `&endDate=${endDate}`;

      const res = await api.get(queryUrl);
      setRecords(extractArray(res, 'records', 'attendance'));
    } catch (err) {
      console.error('Failed to fetch attendance history:', err);
      error(err.message || 'Failed to fetch attendance records.');
    } finally {
      setLoading(false);
    }
  }, [month, year, selectedTeacher, selectedStatus, startDate, endDate, error]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Aggregate Stats
  const totalPresent = records.filter((r) => r.status === 'PRESENT').length;
  const totalAbsent = records.filter((r) => r.status === 'ABSENT').length;
  const totalLeave = records.filter((r) => r.status === 'LEAVE').length;
  const totalRecords = records.length;
  const attendanceRate = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : 0;

  // Pagination
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const paginatedRecords = records.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-white)' }}>
          Attendance Records & History
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Historical logs, attendance statistics and faculty tracking
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <StatCard
          title="Total Present Entries"
          value={totalPresent}
          subtitle="In selected period"
          icon={CalendarCheck}
          accentColor="var(--color-present)"
          accentBg="var(--color-present-bg)"
        />
        <StatCard
          title="Total Absent Entries"
          value={totalAbsent}
          subtitle="Unexcused / informed"
          icon={CalendarX}
          accentColor="var(--color-absent)"
          accentBg="var(--color-absent-bg)"
        />
        <StatCard
          title="Total Approved Leaves"
          value={totalLeave}
          subtitle="Leave entries"
          icon={Clock}
          accentColor="var(--color-leave)"
          accentBg="var(--color-leave-bg)"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          subtitle={`Across ${totalRecords} log entries`}
          icon={Percent}
          accentColor="var(--primary-500)"
          accentBg="var(--primary-50)"
        />
      </div>

      {/* Filters Card */}
      <div
        className="erp-card"
        style={{
          marginBottom: '20px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Teacher Filter */}
        <div style={{ flex: '1 1 180px' }}>
          <select
            className="form-select"
            value={selectedTeacher}
            onChange={(e) => {
              setSelectedTeacher(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Faculty Members</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.fullName} ({t.employeeId})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '0 1 140px' }}>
          <select
            className="form-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LEAVE">Leave</option>
          </select>
        </div>

        {/* Month Selector */}
        <div style={{ flex: '0 1 140px' }}>
          <select
            className="form-select"
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

        {/* Year Selector */}
        <div style={{ flex: '0 1 110px' }}>
          <select
            className="form-select"
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

        {/* Reset button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setSelectedTeacher('ALL');
            setSelectedStatus('ALL');
            setMonth(new Date().getMonth() + 1);
            setYear(new Date().getFullYear());
            setStartDate('');
            setEndDate('');
            setCurrentPage(1);
          }}
        >
          <RotateCcw size={14} />
          <span>Clear</span>
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : records.length === 0 ? (
        <EmptyState
          title="No attendance records found"
          description="Try selecting another month, year, or filter criteria."
        />
      ) : (
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Teacher</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((rec) => {
                const teacherObj = rec.teacherId || {};
                return (
                  <tr key={rec._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="var(--primary-500)" />
                        <span style={{ fontWeight: 600 }}>
                          {new Date(rec.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar avatar-sm">{teacherObj.fullName?.charAt(0) || 'T'}</div>
                        <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                          {teacherObj.fullName || 'Unknown'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontFamily: 'monospace', color: 'var(--primary-500)', fontWeight: 600 }}>
                        {teacherObj.employeeId || '—'}
                      </span>
                    </td>

                    <td>{teacherObj.department || '—'}</td>

                    <td>
                      <Badge status={rec.status} size="sm" />
                    </td>

                    <td style={{ color: 'var(--text-muted)' }}>{rec.remarks || 'Regular schedule'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={records.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;
