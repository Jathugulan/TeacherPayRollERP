import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Settings as SettingsIcon,
  Shield,
  DollarSign,
  CalendarCheck,
  Server,
  Database,
  Lock,
} from 'lucide-react';

const Settings = () => {
  const { role } = useAuth();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-white)' }}>
          Institutional & ERP Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Configured business rules, calculation parameters and system health
        </p>
      </div>

      {/* Salary & Attendance Engine Configuration */}
      <div className="erp-card" style={{ marginBottom: '24px', padding: '24px' }}>
        <h3 className="erp-card-title" style={{ marginBottom: '16px' }}>
          <DollarSign size={18} color="var(--primary-500)" />
          <span>Faculty Salary & Attendance Computation Rules</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Standard Daily Earning</div>
            <div style={{ fontWeight: 700, color: 'var(--color-present)', fontSize: '1.1rem', marginTop: '2px' }}>
              Rs. 500 / Day
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Base earning per verified present day</div>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Absence Deduction Rate</div>
            <div style={{ fontWeight: 700, color: 'var(--color-absent)', fontSize: '1.1rem', marginTop: '2px' }}>
              Rs. 100 / Absent Day
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Deducted for each unexcused absence</div>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Free Allowed Leaves</div>
            <div style={{ fontWeight: 700, color: 'var(--color-leave)', fontSize: '1.1rem', marginTop: '2px' }}>
              5 Days / Month
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Zero deduction for approved leaves ≤ 5</div>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Excess Leave Penalty</div>
            <div style={{ fontWeight: 700, color: 'var(--color-leave)', fontSize: '1.1rem', marginTop: '2px' }}>
              Rs. 100 / Excess Day
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Applied to leaves exceeding 5 days limit</div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="erp-card" style={{ padding: '24px' }}>
        <h3 className="erp-card-title" style={{ marginBottom: '16px' }}>
          <Server size={18} color="var(--color-info)" />
          <span>System Environment & Infrastructure</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Frontend URL:</span>
            <strong style={{ color: 'var(--text-white)' }}>http://localhost:5173</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Backend REST API:</span>
            <strong style={{ color: 'var(--text-white)' }}>http://localhost:5000/api</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Authentication Protocol:</span>
            <strong style={{ color: 'var(--color-present)' }}>Bearer JWT + Google OAuth ID Token</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Role-Based Access Control:</span>
            <strong style={{ color: 'var(--primary-500)' }}>Admin, Teacher (2 roles)</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
