import React from 'react';
import { FolderOpen } from 'lucide-react';

const EmptyState = ({
  icon: Icon = FolderOpen,
  title = 'No records found',
  description = 'There are no items matching your current criteria.',
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-strong)',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--bg-input)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
          marginBottom: '14px',
        }}
      >
        <Icon size={28} />
      </div>

      <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-white)', marginBottom: '6px' }}>
        {title}
      </h4>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '380px', marginBottom: actionLabel ? '18px' : '0' }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
