import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { CardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

import { extractArray } from '../../utils/helpers';

const AttendanceCalendar = () => {
  const { role, user, teacherProfile } = useAuth();
  const { error } = useToast();

  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected date modal details
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  // 1. Load teachers list or default to own teacher ID
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        if (role === 'teacher') {
          const profileRes = await api.get('/teachers/me/profile').catch(() => null);
          const tid = profileRes?.data?.teacher?._id || teacherProfile?.id;
          if (tid) {
            setSelectedTeacherId(tid);
            setTeachers([profileRes?.data?.teacher || { _id: tid, fullName: user?.name, employeeId: 'ME' }]);
          }
        } else {
          const res = await api.get('/teachers');
          const list = extractArray(res, 'teachers');
          setTeachers(list);
          if (list.length > 0) {
            setSelectedTeacherId(list[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching teacher list:', err);
      }
    };
    fetchTeachers();
  }, [role, teacherProfile, user]);

  // 2. Fetch attendance for selected teacher & month
  const fetchTeacherAttendance = useCallback(async () => {
    if (!selectedTeacherId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/attendance/teacher/${selectedTeacherId}?month=${currentMonth}&year=${currentYear}`
      );
      setAttendanceRecords(extractArray(res, 'attendance', 'records'));
    } catch (err) {
      console.error('Error fetching teacher attendance calendar:', err);
      error(err.message || 'Failed to load attendance calendar.');
    } finally {
      setLoading(false);
    }
  }, [selectedTeacherId, currentMonth, currentYear, error]);

  useEffect(() => {
    fetchTeacherAttendance();
  }, [fetchTeacherAttendance]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth, 1));
  };

  // Calendar math
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Create date lookup map
  const recordMap = {};
  attendanceRecords.forEach((rec) => {
    const d = new Date(rec.date);
    const dayNum = d.getUTCDate();
    recordMap[dayNum] = rec;
  });

  const handleDayClick = (dayNum, record) => {
    if (!record) {
      setSelectedRecord({
        dayNum,
        date: new Date(Date.UTC(currentYear, currentMonth - 1, dayNum)),
        status: 'UNMARKED',
        remarks: 'No attendance entry logged for this day.',
      });
    } else {
      setSelectedRecord({
        ...record,
        dayNum,
      });
    }
    setIsDetailsOpen(true);
  };

  // Stats for the month
  const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
  const leaveCount = attendanceRecords.filter((r) => r.status === 'LEAVE').length;

  const currentTeacherObj = teachers.find((t) => t._id === selectedTeacherId);

  return (
    <div>
      {/* Header & Controls */}
      <div className="page-header-flex">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-white)' }}>
            Attendance Calendar
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Interactive monthly faculty attendance calendar with status highlights
          </p>
        </div>

        <div className="actions-row">
          {/* Teacher selector (if admin/hr/accountant) */}
          {role !== 'teacher' && (
            <div style={{ minWidth: '180px', flex: '1 1 auto' }}>
              <select
                className="form-select"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.fullName} ({t.employeeId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month / Year Navigator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
            }}
          >
            <button
              onClick={handlePrevMonth}
              className="btn btn-secondary btn-icon btn-sm"
              aria-label="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontWeight: 600, fontSize: '0.9rem', padding: '0 8px', minWidth: '120px', textAlign: 'center' }}>
              {currentDate.toLocaleString('default', { month: 'long' })} {currentYear}
            </span>

            <button
              onClick={handleNextMonth}
              className="btn btn-secondary btn-icon btn-sm"
              aria-label="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Legend Banner */}
      <div
        className="erp-card filter-bar-responsive"
        style={{
          marginBottom: '20px',
          padding: '14px 20px',
          background: 'var(--bg-card-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="avatar avatar-sm">{currentTeacherObj?.fullName?.charAt(0) || 'T'}</div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>
              {currentTeacherObj?.fullName || 'Faculty'}
            </span>
            <span style={{ color: 'var(--primary-500)', fontSize: '0.8rem', marginLeft: '6px', fontWeight: 600 }}>
              ({currentTeacherObj?.employeeId})
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-present)' }} />
            <span>Present ({presentCount})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-absent)' }} />
            <span>Absent ({absentCount})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-leave)' }} />
            <span>Leave ({leaveCount})</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <CardSkeleton />
      ) : (
        <div className="erp-card" style={{ padding: '20px' }}>
          {/* Day Names Header */}
          <div className="calendar-grid" style={{ marginBottom: '8px' }}>
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="calendar-header-cell">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="calendar-grid">
            {/* Blank leading cells */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`blank-${idx}`} className="calendar-day-cell empty" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const record = recordMap[dayNum];
              const status = record?.status;

              let borderHighlight = 'transparent';
              let bgAccent = 'transparent';

              if (status === 'PRESENT') {
                borderHighlight = 'var(--color-present)';
                bgAccent = 'var(--color-present-bg)';
              } else if (status === 'ABSENT') {
                borderHighlight = 'var(--color-absent)';
                bgAccent = 'var(--color-absent-bg)';
              } else if (status === 'LEAVE') {
                borderHighlight = 'var(--color-leave)';
                bgAccent = 'var(--color-leave-bg)';
              }

              return (
                <div
                  key={`day-${dayNum}`}
                  className="calendar-day-cell"
                  style={{
                    borderColor: status ? borderHighlight : 'var(--border-subtle)',
                    backgroundColor: status ? bgAccent : 'var(--bg-card-subtle)',
                  }}
                  onClick={() => handleDayClick(dayNum, record)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="calendar-day-num" style={{ color: status ? 'var(--text-white)' : 'var(--text-muted)' }}>
                      {dayNum}
                    </span>
                    {status && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor:
                            status === 'PRESENT'
                              ? 'var(--color-present)'
                              : status === 'ABSENT'
                              ? 'var(--color-absent)'
                              : 'var(--color-leave)',
                        }}
                      />
                    )}
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    {status ? (
                      <Badge status={status} size="sm" />
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Off / Log</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Date Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Attendance Record: Day ${selectedRecord?.dayNum}`}
        maxWidth="440px"
      >
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Date:</span>
            <strong style={{ color: 'var(--text-white)' }}>
              {selectedRecord?.date
                ? new Date(selectedRecord.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status:</span>
            <Badge status={selectedRecord?.status || 'UNMARKED'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Recorded Remarks:</span>
            <span style={{ color: 'var(--text-white)', fontSize: '0.875rem' }}>
              {selectedRecord?.remarks || 'Regular daily faculty log.'}
            </span>
          </div>

          {selectedRecord?.markedBy && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Marked By:</span>
              <span style={{ color: 'var(--text-white)', fontWeight: 500 }}>
                {selectedRecord.markedBy?.name || 'Administrator / HR'}
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-sm" onClick={() => setIsDetailsOpen(false)}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AttendanceCalendar;
