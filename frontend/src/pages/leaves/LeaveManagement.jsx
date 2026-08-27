import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import {
  CalendarDays,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  User,
  Search,
  Check,
  X,
  FileText,
} from 'lucide-react';

import { extractArray } from '../../utils/helpers';

const LeaveManagement = () => {
  const { role, user, teacherProfile } = useAuth();
  const { success, error, info } = useToast();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Apply Leave Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherQuota, setTeacherQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  const [applyForm, setApplyForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Approve/Reject Modal
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState('approve'); // 'approve' or 'reject'
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Fetch Leaves based on Role
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      if (role === 'teacher') {
        const res = await api.get('/leaves/me');
        setLeaves(extractArray(res, 'leaves'));
      } else {
        const res = await api.get('/leaves');
        setLeaves(extractArray(res, 'leaves'));
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
      error(err.message || 'Failed to fetch leave applications.');
    } finally {
      setLoading(false);
    }
  }, [role, error]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Load teachers for application if admin/hr
  useEffect(() => {
    if (role !== 'teacher') {
      api.get('/teachers').then((res) => {
        const list = extractArray(res, 'teachers');
        setTeachers(list);
        if (list.length > 0) {
          setSelectedTeacherId(list[0]._id);
        }
      }).catch(() => {});
    } else {
      api.get('/teachers/me/profile').then((res) => {
        const tid = res?.data?.teacher?._id || teacherProfile?.id;
        if (tid) setSelectedTeacherId(tid);
      }).catch(() => {});
    }
  }, [role, teacherProfile]);

  // Load teacher quota when selected teacher changes
  useEffect(() => {
    if (!selectedTeacherId) return;
    setQuotaLoading(true);
    api.get(`/leaves/summary/${selectedTeacherId}`)
      .then((res) => {
        setTeacherQuota(res?.data || null);
      })
      .catch((err) => {
        console.error('Error fetching quota:', err);
      })
      .finally(() => {
        setQuotaLoading(false);
      });
  }, [selectedTeacherId]);

  // Calculate live days and potential deduction in the Apply modal
  const calculateLeaveDays = () => {
    if (!applyForm.startDate || !applyForm.endDate) return 0;
    const start = new Date(applyForm.startDate);
    const end = new Date(applyForm.endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculatedDays = calculateLeaveDays();
  const currentUsed = teacherQuota?.usedLeaveDays ?? 0;
  const currentRemaining = teacherQuota?.remainingLeaveDays ?? 5;

  const totalAfterRequest = currentUsed + calculatedDays;
  const extraDaysAfterRequest = Math.max(0, totalAfterRequest - 5);
  const potentialDeduction = extraDaysAfterRequest * 100;

  // Open Apply Modal
  const handleOpenApplyModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setApplyForm({
      startDate: todayStr,
      endDate: todayStr,
      reason: '',
    });
    setIsApplyModalOpen(true);
  };

  // Submit Leave Application
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!applyForm.startDate || !applyForm.endDate) {
      error('Please select both start and end dates.');
      return;
    }
    if (calculatedDays <= 0) {
      error('End date must be on or after start date.');
      return;
    }

    setSubmittingLeave(true);
    try {
      const payload = {
        teacherId: selectedTeacherId,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        reason: applyForm.reason || 'Personal leave',
      };

      await api.post('/leaves', payload);
      success('Leave application submitted successfully!');
      setIsApplyModalOpen(false);
      fetchLeaves();
    } catch (err) {
      error(err.message || 'Failed to submit leave request.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Handle Approve / Reject Actions
  const handleOpenActionModal = (leave, type) => {
    setSelectedLeave(leave);
    setActionType(type);
    setAdminRemarks(type === 'approve' ? 'Approved by Administration' : 'Rejected due to operational requirements');
    setActionModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedLeave) return;
    setActionLoading(true);
    try {
      const endpoint =
        actionType === 'approve'
          ? `/leaves/${selectedLeave._id}/approve`
          : `/leaves/${selectedLeave._id}/reject`;

      await api.patch(endpoint, { adminRemarks });
      success(`Leave request ${actionType === 'approve' ? 'Approved' : 'Rejected'} successfully!`);
      setActionModalOpen(false);
      fetchLeaves();
    } catch (err) {
      error(err.message || `Failed to ${actionType} leave.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter leaves by active tab & search
  const filteredLeaves = leaves.filter((leave) => {
    const matchStatus = activeTab === 'ALL' || leave.status === activeTab;
    const teacherName = leave.teacherId?.fullName || '';
    const empId = leave.teacherId?.employeeId || '';
    const reason = leave.reason || '';
    const matchSearch =
      teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reason.toLowerCase().includes(searchTerm.toLowerCase());

    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const paginatedLeaves = filteredLeaves.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const canApprove = role === 'admin';


  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-white)' }}>
            Leave Management & Quota
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Faculty leave requests, quota tracking and salary deduction rules
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenApplyModal}>
          <PlusCircle size={16} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leave Rule Policy Banner */}
      <div
        className="erp-alert erp-alert-info"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={22} color="var(--color-info)" style={{ flexShrink: 0 }} />
          <div>
            <strong>Institutional Leave Rule:</strong> Every faculty member receives <strong>5 free allowed leave days</strong> per month. Excess leaves beyond 5 days incur a deduction of <strong>Rs. 100 per additional day</strong>.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', fontSize: '0.775rem' }}>
          <span style={{ padding: '3px 8px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '4px', color: '#a5f3fc' }}>
            ≤ 5 Days → Rs. 0
          </span>
          <span style={{ padding: '3px 8px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '4px', color: '#a5f3fc' }}>
            6 Days → Rs. 100
          </span>
          <span style={{ padding: '3px 8px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '4px', color: '#a5f3fc' }}>
            7 Days → Rs. 200
          </span>
        </div>
      </div>

      {/* Filter and Tabs Header */}
      <div
        className="erp-card"
        style={{
          marginBottom: '20px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Requests' },
            { key: 'PENDING', label: 'Pending Review' },
            { key: 'APPROVED', label: 'Approved' },
            { key: 'REJECTED', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '240px' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem' }}
            placeholder="Search leaves..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Leaves Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : paginatedLeaves.length === 0 ? (
        <EmptyState
          title="No leave applications found"
          description="There are no leave requests matching the selected status or query."
          actionLabel="Apply for Leave"
          onAction={handleOpenApplyModal}
        />
      ) : (
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Leave Duration</th>
                <th>Days Count</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Applied On</th>
                {canApprove && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedLeaves.map((leave) => {
                const teacherObj = leave.teacherId || {};
                const isPending = leave.status === 'PENDING';

                return (
                  <tr key={leave._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar avatar-sm">{teacherObj.fullName?.charAt(0) || 'T'}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                            {teacherObj.fullName || user?.name || 'Faculty Member'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary-500)', fontFamily: 'monospace' }}>
                            {teacherObj.employeeId || 'ME'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="var(--primary-500)" />
                        <span style={{ fontWeight: 600 }}>
                          {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          padding: '3px 8px',
                          background: 'var(--bg-input)',
                          borderRadius: '4px',
                          color: leave.totalDays > 5 ? 'var(--color-leave)' : 'var(--text-main)',
                        }}
                      >
                        {leave.totalDays} Day(s)
                      </span>
                    </td>

                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {leave.reason || 'Personal requirements'}
                    </td>

                    <td>
                      <Badge status={leave.status} size="sm" />
                    </td>

                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(leave.createdAt || leave.startDate).toLocaleDateString()}
                    </td>

                    {canApprove && (
                      <td style={{ textAlign: 'right' }}>
                        {isPending ? (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-success btn-sm btn-icon"
                              onClick={() => handleOpenActionModal(leave, 'approve')}
                              title="Approve Leave"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm btn-icon"
                              onClick={() => handleOpenActionModal(leave, 'reject')}
                              title="Reject Leave"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Processed</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredLeaves.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Apply Leave Modal with Real-time Deduction & Quota Preview */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Submit Leave Application"
        maxWidth="560px"
      >
        <form onSubmit={handleSubmitLeave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Teacher Selector (if Admin/HR) */}
            {role !== 'teacher' && teachers.length > 0 && (
              <div className="form-group">
                <label className="form-label">
                  <span>Select Faculty Member <span className="required">*</span></span>
                </label>
                <select
                  className="form-select"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  required
                >
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName} ({t.employeeId} - {t.department})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>Start Date <span className="required">*</span></span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={applyForm.startDate}
                  onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>End Date <span className="required">*</span></span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={applyForm.endDate}
                  onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            <div
              style={{
                padding: '14px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>
                Live Quota & Salary Impact Calculator
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Requested Leave:</span>
                <strong style={{ color: 'var(--text-white)' }}>{calculatedDays} Day(s)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Free Leave Balance:</span>
                <strong style={{ color: 'var(--color-present)' }}>{currentRemaining} of 5 Remaining</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Excess Leave Days:</span>
                <strong style={{ color: extraDaysAfterRequest > 0 ? 'var(--color-leave)' : 'var(--text-white)' }}>
                  {extraDaysAfterRequest} Day(s)
                </strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.9rem',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>Estimated Salary Deduction:</span>
                <strong
                  style={{
                    color: potentialDeduction > 0 ? 'var(--color-absent)' : 'var(--color-present)',
                  }}
                >
                  Rs. {potentialDeduction}
                </strong>
              </div>
            </div>

            {/* Reason */}
            <div className="form-group">
              <label className="form-label">
                <span>Reason for Application</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="State the reason for taking leave (e.g. Medical recovery, family commitment, conference)..."
                value={applyForm.reason}
                onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsApplyModalOpen(false)}
              disabled={submittingLeave}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submittingLeave}>
              {submittingLeave ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Approve / Reject Modal */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={`${actionType === 'approve' ? 'Approve' : 'Reject'} Leave Application`}
        maxWidth="480px"
      >
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
            You are about to <strong>{actionType}</strong> the leave application for{' '}
            <strong style={{ color: 'var(--primary-500)' }}>
              {selectedLeave?.teacherId?.fullName}
            </strong>{' '}
            ({selectedLeave?.totalDays} days).
          </p>

          <div className="form-group">
            <label className="form-label">
              <span>Administrative Remarks</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              placeholder="e.g. Approved by Dean"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => setActionModalOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </button>
          <button
            className={`btn ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
            onClick={handleConfirmAction}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveManagement;
