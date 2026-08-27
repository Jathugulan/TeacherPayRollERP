import React from 'react';

const Badge = ({ status, type, label, size = 'md' }) => {
  const normStatus = (status || '').toUpperCase();
  let badgeClass = 'badge-info';
  let displayLabel = label || status;

  switch (normStatus) {
    case 'PRESENT':
    case 'ACTIVE':
    case 'APPROVED':
    case 'PAID':
      badgeClass = 'badge-present';
      break;
    case 'ABSENT':
    case 'INACTIVE':
    case 'REJECTED':
      badgeClass = 'badge-absent';
      break;
    case 'LEAVE':
    case 'PENDING':
    case 'UNMARKED':
      badgeClass = 'badge-leave';
      break;
    case 'GENERATED':
      badgeClass = 'badge-generated';
      break;
    default:
      badgeClass = 'badge-info';
  }

  const sizeStyle = size === 'sm' ? { fontSize: '0.7rem', padding: '2px 8px' } : {};

  return (
    <span className={`badge ${badgeClass}`} style={sizeStyle}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block',
        }}
      />
      {displayLabel}
    </span>
  );
};

export default Badge;
