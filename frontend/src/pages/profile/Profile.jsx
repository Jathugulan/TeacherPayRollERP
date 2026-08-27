import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import {
  User,
  Mail,
  Shield,
  Briefcase,
  Building,
  Calendar,
  DollarSign,
  Phone,
  MapPin,
  Lock,
  Save,
} from 'lucide-react';

const Profile = () => {
  const { user, role, teacherProfile } = useAuth();
  const { success, error } = useToast();

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role === 'teacher') {
      setLoading(true);
      api.get('/teachers/me/profile')
        .then((res) => {
          setTeacher(res?.data?.teacher || null);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [role]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-white)' }}>
          My User Profile
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Personal credentials, role permissions and institutional profile
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="erp-card" style={{ marginBottom: '24px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div className="avatar avatar-lg">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-white)' }}>
                {user?.name || 'User'}
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--primary-500)',
                  textTransform: 'uppercase',
                }}
              >
                {role || 'Staff'}
              </span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
              {user?.email}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</div>
            <div style={{ fontWeight: 600, color: 'var(--text-white)', marginTop: '2px' }}>{user?.name}</div>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Institutional Email</div>
            <div style={{ fontWeight: 600, color: 'var(--text-white)', marginTop: '2px' }}>{user?.email}</div>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Account Role</div>
            <div style={{ fontWeight: 600, color: 'var(--primary-500)', textTransform: 'capitalize', marginTop: '2px' }}>
              {role}
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Account Status</div>
            <div style={{ fontWeight: 600, color: 'var(--color-present)', marginTop: '2px' }}>
              Active & Verified
            </div>
          </div>
        </div>
      </div>

      {/* Faculty Profile Details if Teacher */}
      {teacher && (
        <div className="erp-card" style={{ marginBottom: '24px', padding: '24px' }}>
          <h3 className="erp-card-title" style={{ marginBottom: '16px' }}>
            <Briefcase size={18} color="var(--primary-500)" />
            <span>Faculty Record Details</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employee ID</span>
              <div style={{ fontWeight: 700, color: 'var(--primary-500)', fontFamily: 'monospace' }}>
                {teacher.employeeId}
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department</span>
              <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{teacher.department}</div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Designation</span>
              <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{teacher.designation || 'Teacher'}</div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Rate</span>
              <div style={{ fontWeight: 700, color: 'var(--color-present)' }}>Rs. {teacher.salaryPerDay || 500} / Day</div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</span>
              <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{teacher.phone || '—'}</div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joining Date</span>
              <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
