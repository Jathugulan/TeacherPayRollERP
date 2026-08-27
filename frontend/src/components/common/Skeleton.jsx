import React from 'react';

export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm)', style = {} }) => (
  <div
    className="skeleton-box"
    style={{
      width,
      height,
      borderRadius,
      ...style,
    }}
  />
);

export const TableSkeleton = ({ rows = 5, cols = 6 }) => (
  <div className="table-responsive">
    <table className="erp-table">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, idx) => (
            <th key={idx}>
              <SkeletonBox width="80px" height="14px" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <tr key={rIdx}>
            {Array.from({ length: cols }).map((_, cIdx) => (
              <td key={cIdx}>
                <SkeletonBox width={cIdx === 0 ? '140px' : '80px'} height="16px" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const CardSkeleton = () => (
  <div className="erp-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
      <SkeletonBox width="120px" height="20px" />
      <SkeletonBox width="30px" height="20px" />
    </div>
    <SkeletonBox width="100%" height="160px" borderRadius="var(--radius-md)" />
  </div>
);

export default SkeletonBox;
