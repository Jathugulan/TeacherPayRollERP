import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderTop: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Showing <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{startItem}</span> to{' '}
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{endItem}</span> of{' '}
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{totalItems}</span> entries
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        <span style={{ fontSize: '0.85rem', padding: '0 8px', color: 'var(--text-muted)' }}>
          Page <strong style={{ color: 'var(--text-white)' }}>{currentPage}</strong> of{' '}
          <strong style={{ color: 'var(--text-white)' }}>{totalPages}</strong>
        </span>

        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
