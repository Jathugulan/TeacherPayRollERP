import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ArrowUpDown,
} from 'lucide-react';

import { extractArray } from '../../utils/helpers';

const DEPARTMENTS = [
  'ICT',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English Literature',
  'Commerce',
  'Arts',
];

const TeachersList = () => {
  const { role } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('employeeId');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    joiningDate: new Date().toISOString().split('T')[0],
    department: 'ICT',
    designation: 'Teacher',
    salaryPerDay: 500,
    status: 'ACTIVE',
  });

  // Deactivate confirmation
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [targetTeacher, setTargetTeacher] = useState(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/teachers');
      setTeachers(extractArray(response, 'teachers'));
    } catch (err) {
      console.error('Failed to load teachers:', err);
      error(err.message || 'Failed to fetch teachers.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTeacher(null);
    setFormData({
      employeeId: `EMP00${teachers.length + 1}`,
      fullName: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '1990-01-01',
      joiningDate: new Date().toISOString().split('T')[0],
      department: 'ICT',
      designation: 'Teacher',
      salaryPerDay: 500,
      status: 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      employeeId: teacher.employeeId || '',
      fullName: teacher.fullName || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      address: teacher.address || '',
      dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toISOString().split('T')[0] : '',
      joiningDate: teacher.joiningDate ? new Date(teacher.joiningDate).toISOString().split('T')[0] : '',
      department: teacher.department || 'ICT',
      designation: teacher.designation || 'Teacher',
      salaryPerDay: teacher.salaryPerDay || 500,
      status: teacher.status || 'ACTIVE',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.employeeId.trim()) errors.employeeId = 'Employee ID is required';
    if (!formData.fullName.trim()) errors.fullName = 'Full Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Valid email is required';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.salaryPerDay || Number(formData.salaryPerDay) <= 0) {
      errors.salaryPerDay = 'Salary per day must be a positive number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingTeacher) {
        // Update Teacher
        await api.put(`/teachers/${editingTeacher._id}`, formData);
        success(`Teacher ${formData.fullName} updated successfully!`);
      } else {
        // Create Teacher
        await api.post('/teachers', formData);
        success(`Teacher ${formData.fullName} registered successfully!`);
      }
      setIsModalOpen(false);
      fetchTeachers();
    } catch (err) {
      error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status / deactivation
  const handleToggleStatus = (teacher) => {
    setTargetTeacher(teacher);
    setStatusConfirmOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!targetTeacher) return;
    const newStatus = targetTeacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/teachers/${targetTeacher._id}`, { status: newStatus });
      success(`Teacher status updated to ${newStatus}`);
      setStatusConfirmOpen(false);
      fetchTeachers();
    } catch (err) {
      error(err.message || 'Failed to update teacher status.');
    }
  };

  // Filter & Search Logic
  const filteredTeachers = teachers.filter((t) => {
    const matchQuery =
      t.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = selectedDept === 'ALL' || t.department === selectedDept;
    const matchStatus = selectedStatus === 'ALL' || t.status === selectedStatus;

    return matchQuery && matchDept && matchStatus;
  });

  // Sort
  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginated records
  const totalPages = Math.ceil(sortedTeachers.length / itemsPerPage);
  const paginatedTeachers = sortedTeachers.slice(
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
            Faculty & Teacher Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage teaching staff, profiles, departments and compensation
          </p>
        </div>

        {canManage && (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <UserPlus size={16} />
            <span>Add New Teacher</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        className="erp-card filter-bar-responsive"
        style={{
          marginBottom: '20px',
          padding: '16px',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', width: '100%' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px', height: '40px' }}
            placeholder="Search by name, ID, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Department Filter */}
        <div style={{ flex: '1 1 140px' }}>
          <select
            className="form-select"
            style={{ height: '40px' }}
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '1 1 130px' }}>
          <select
            className="form-select"
            style={{ height: '40px' }}
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : paginatedTeachers.length === 0 ? (
        <EmptyState
          title="No teachers found"
          description="Try adjusting your search filters or add a new faculty member."
          actionLabel={canManage ? 'Add Teacher' : undefined}
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('employeeId');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Emp ID</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortBy('fullName');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Teacher Name</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th>Department</th>
                <th>Designation</th>
                <th>Daily Rate</th>
                <th>Joining Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTeachers.map((teacher) => (
                <tr key={teacher._id}>
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: 'var(--primary-500)',
                        background: 'var(--bg-input)',
                        padding: '3px 7px',
                        borderRadius: '4px',
                      }}
                    >
                      {teacher.employeeId}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar avatar-sm">
                        {teacher.fullName?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                          {teacher.fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {teacher.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span style={{ fontWeight: 500 }}>{teacher.department}</span>
                  </td>

                  <td>{teacher.designation || 'Teacher'}</td>

                  <td>
                    <strong style={{ color: 'var(--color-present)' }}>
                      Rs. {teacher.salaryPerDay || 500}
                    </strong>
                  </td>

                  <td>
                    {teacher.joiningDate
                      ? new Date(teacher.joiningDate).toLocaleDateString()
                      : '—'}
                  </td>

                  <td>
                    <Badge status={teacher.status || 'ACTIVE'} size="sm" />
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-icon btn-sm"
                        onClick={() => navigate(`/teachers/${teacher._id}`)}
                        title="View Profile & Stats"
                      >
                        <Eye size={15} />
                      </button>

                      {canManage && (
                        <>
                          <button
                            className="btn btn-secondary btn-icon btn-sm"
                            onClick={() => handleOpenEdit(teacher)}
                            title="Edit Details"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            className={`btn btn-icon btn-sm ${
                              teacher.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'
                            }`}
                            onClick={() => handleToggleStatus(teacher)}
                            title={teacher.status === 'ACTIVE' ? 'Deactivate Teacher' : 'Activate Teacher'}
                          >
                            {teacher.status === 'ACTIVE' ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedTeachers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Add / Edit Teacher Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeacher ? `Edit Faculty: ${editingTeacher.fullName}` : 'Register New Faculty Member'}
        maxWidth="680px"
      >
        <form onSubmit={handleSubmitForm}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>Employee ID <span className="required">*</span></span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="EMP001"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  disabled={!!editingTeacher}
                />
                {formErrors.employeeId && <span className="form-error">{formErrors.employeeId}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Full Name <span className="required">*</span></span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Prof. John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
                {formErrors.fullName && <span className="form-error">{formErrors.fullName}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>Institutional Email <span className="required">*</span></span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="john.doe@erp.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                {formErrors.email && <span className="form-error">{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Phone Number <span className="required">*</span></span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="0771234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                {formErrors.phone && <span className="form-error">{formErrors.phone}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>Department</span>
                </label>
                <select
                  className="form-select"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Designation</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Senior Lecturer / Teacher"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>Daily Rate (LKR) <span className="required">*</span></span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="500"
                  value={formData.salaryPerDay}
                  onChange={(e) => setFormData({ ...formData, salaryPerDay: Number(e.target.value) })}
                />
                {formErrors.salaryPerDay && <span className="form-error">{formErrors.salaryPerDay}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Joining Date</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Residential Address</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="City, District"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingTeacher ? 'Update Teacher' : 'Register Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={confirmToggleStatus}
        title="Toggle Teacher Status"
        message={`Are you sure you want to ${
          targetTeacher?.status === 'ACTIVE' ? 'deactivate' : 'activate'
        } ${targetTeacher?.fullName} (${targetTeacher?.employeeId})?`}
        type={targetTeacher?.status === 'ACTIVE' ? 'danger' : 'success'}
        confirmText={targetTeacher?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
};

export default TeachersList;
