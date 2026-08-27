import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { TableSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  CalendarCheck,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Save,
  CheckCheck,
  Filter,
} from 'lucide-react';

import { extractArray } from '../../utils/helpers';

const DailyAttendance = () => {
  const { role } = useAuth();
  const { success, error, info } = useToast();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Load teachers and today's existing attendance for the selected date
  const loadDailyAttendance = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get all active teachers
      const teachersRes = await api.get('/teachers');
      const teacherList = extractArray(teachersRes, 'teachers');
      const activeTeachers = teacherList.filter((t) => t.status === 'ACTIVE');
      setTeachers(activeTeachers);

      // 2. Fetch existing attendance for this specific date
      const attendanceRes = await api.get(`/attendance?date=${date}`).catch(() => null);
      const existingRecords = extractArray(attendanceRes, 'records', 'attendance');

      // Build initial map
      const initialMap = {};
      const initialRemarks = {};

      activeTeachers.forEach((t) => {
        const found = existingRecords.find((rec) => rec.teacherId?._id === t._id || rec.teacherId === t._id);
        if (found) {
          initialMap[t._id] = found.status;
          initialRemarks[t._id] = found.remarks || '';
        } else {
          initialMap[t._id] = 'PRESENT'; // default to PRESENT
          initialRemarks[t._id] = 'Regular schedule';
        }
      });

      setAttendanceMap(initialMap);
      setRemarksMap(initialRemarks);
    } catch (err) {
      console.error('Error loading daily attendance:', err);
      error(err.message || 'Failed to load faculty attendance list.');
    } finally {
      setLoading(false);
    }
  }, [date, error]);

  useEffect(() => {
    loadDailyAttendance();
  }, [loadDailyAttendance]);

  // Handle single teacher status change
  const handleStatusChange = (teacherId, status) => {
    setAttendanceMap((prev) => ({ ...prev, [teacherId]: status }));
  };

  const handleRemarksChange = (teacherId, remarks) => {
    setRemarksMap((prev) => ({ ...prev, [teacherId]: remarks }));
  };

  // Bulk Quick Actions
  const handleSelectAllPresent = () => {
    const updated = {};
    teachers.forEach((t) => {
      updated[t._id] = 'PRESENT';
    });
    setAttendanceMap(updated);
    info('Marked all faculty members as PRESENT.');
  };

  const handleReset = () => {
    loadDailyAttendance();
    info('Reset attendance to original records.');
  };

  // Save Bulk Attendance
  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const records = Object.keys(attendanceMap).map((teacherId) => ({
        teacherId,
        status: attendanceMap[teacherId],
        remarks: remarksMap[teacherId] || 'Daily record',
      }));

      const payload = {
        date,
        records,
      };

      const response = await api.post('/attendance/bulk', payload);
      success(response?.message || `Saved attendance for ${records.length} faculty members!`);
      setConfirmOpen(false);
      loadDailyAttendance();
    } catch (err) {
      console.error('Save attendance error:', err);
      error(err.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered teachers list
  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || t.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const presentCount = Object.values(attendanceMap).filter((s) => s === 'PRESENT').length;
  const absentCount = Object.values(attendanceMap).filter((s) => s === 'ABSENT').length;
  const leaveCount = Object.values(attendanceMap).filter((s) => s === 'LEAVE').length;

  return (
    <div>
      {/* Header */}
      <div className="page-header-flex">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-white)' }}>
            Daily Attendance Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Quick mark, review and record daily faculty presence
          </p>
        </div>

        {/* Date Selector & Save Action */}
        <div className="actions-row">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '10px', color: 'var(--primary-500)' }} />
            <input
              type="date"
              className="form-input"
              style={{ paddingLeft: '34px', width: '165px', height: '38px', fontWeight: 600 }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSelectAllPresent}
            title="Mark all as Present"
          >
            <CheckCheck size={16} />
            <span>Select All Present</span>
          </button>

          <button className="btn btn-secondary btn-sm" onClick={handleReset} title="Reset changes">
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setConfirmOpen(true)}
            disabled={saving || teachers.length === 0}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      {/* Summary Mini Banner */}
      <div
        className="erp-card filter-bar-responsive"
        style={{
          marginBottom: '20px',
          padding: '14px 20px',
          background: 'var(--bg-card-subtle)',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Selected Date:{' '}
            <strong style={{ color: 'var(--text-white)' }}>
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </strong>
          </span>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--color-present)', fontWeight: 600 }}>
              ● {presentCount} Present
            </span>
            <span style={{ fontSize: '0.825rem', color: 'var(--color-absent)', fontWeight: 600 }}>
              ● {absentCount} Absent
            </span>
            <span style={{ fontSize: '0.825rem', color: 'var(--color-leave)', fontWeight: 600 }}>
              ● {leaveCount} On Leave
            </span>
          </div>
        </div>

        {/* Quick Search inside Table */}
        <div className="actions-row">
          <div style={{ position: 'relative', flex: '1 1 auto' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', height: '34px', fontSize: '0.825rem', minWidth: '150px' }}
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem', width: 'auto', minWidth: '120px' }}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="ALL">All Depts</option>
            <option value="ICT">ICT</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="English Literature">English</option>
          </select>
        </div>
      </div>

      {/* Daily Attendance Grid / Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filteredTeachers.length === 0 ? (
        <EmptyState
          title="No faculty members found"
          description="There are no active teachers matching the selected department or search term."
        />
      ) : (
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Emp ID</th>
                <th>Teacher</th>
                <th>Department</th>
                <th style={{ textAlign: 'center', width: '320px' }}>Attendance Status</th>
                <th>Remarks / Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => {
                const currentStatus = attendanceMap[teacher._id] || 'PRESENT';

                return (
                  <tr key={teacher._id}>
                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'var(--primary-500)',
                        }}
                      >
                        {teacher.employeeId}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar avatar-sm">{teacher.fullName?.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                            {teacher.fullName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {teacher.designation || 'Teacher'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 500 }}>{teacher.department}</span>
                    </td>

                    {/* Radio Button Group for Fast Toggling */}
                    <td style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          background: 'var(--bg-input)',
                          padding: '3px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          gap: '4px',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            padding: '4px 12px',
                            background:
                              currentStatus === 'PRESENT'
                                ? 'var(--color-present)'
                                : 'transparent',
                            color: currentStatus === 'PRESENT' ? '#fff' : 'var(--text-muted)',
                            border: 'none',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                          }}
                          onClick={() => handleStatusChange(teacher._id, 'PRESENT')}
                        >
                          <CheckCircle2 size={13} />
                          <span>Present</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            padding: '4px 12px',
                            background:
                              currentStatus === 'ABSENT'
                                ? 'var(--color-absent)'
                                : 'transparent',
                            color: currentStatus === 'ABSENT' ? '#fff' : 'var(--text-muted)',
                            border: 'none',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                          }}
                          onClick={() => handleStatusChange(teacher._id, 'ABSENT')}
                        >
                          <XCircle size={13} />
                          <span>Absent</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            padding: '4px 12px',
                            background:
                              currentStatus === 'LEAVE'
                                ? 'var(--color-leave)'
                                : 'transparent',
                            color: currentStatus === 'LEAVE' ? '#fff' : 'var(--text-muted)',
                            border: 'none',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                          }}
                          onClick={() => handleStatusChange(teacher._id, 'LEAVE')}
                        >
                          <Clock size={13} />
                          <span>Leave</span>
                        </button>
                      </div>
                    </td>

                    {/* Remarks Input */}
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '34px', fontSize: '0.825rem' }}
                        placeholder="Optional remarks..."
                        value={remarksMap[teacher._id] || ''}
                        onChange={(e) => handleRemarksChange(teacher._id, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSaveAttendance}
        title="Confirm Daily Attendance"
        message={`Are you sure you want to save attendance for ${
          Object.keys(attendanceMap).length
        } faculty member(s) on ${date}?`}
        type="success"
        confirmText="Save All Attendance"
        loading={saving}
      />
    </div>
  );
};

export default DailyAttendance;
