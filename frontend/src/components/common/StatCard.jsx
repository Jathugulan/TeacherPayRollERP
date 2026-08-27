import React from 'react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = 'var(--primary-500)',
  accentBg = 'rgba(59, 130, 246, 0.12)',
  trend,
  onClick,
}) => {
  return (
    <div
      className="kpi-card"
      style={{
        '--kpi-accent': accentColor,
        '--kpi-accent-bg': accentBg,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div className="kpi-top">
        <span className="kpi-title">{title}</span>
        {Icon && (
          <div className="kpi-icon-wrap">
            <Icon size={22} />
          </div>
        )}
      </div>

      <div>
        <div className="kpi-value">{value ?? '—'}</div>
        {subtitle && (
          <div className="kpi-subtitle">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
