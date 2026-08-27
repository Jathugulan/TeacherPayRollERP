import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Search, X, User, ArrowRight, Loader2 } from 'lucide-react';
import Badge from './Badge';

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        setResults(response?.data?.teachers || []);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectTeacher = (id) => {
    onClose();
    navigate(`/teachers/${id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '650px', maxHeight: '550px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={20} color="var(--primary-500)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search teachers by name, employee ID, email, department..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-white)',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
          {loading && <Loader2 size={18} className="animate-spin" color="var(--text-muted)" />}
          <button onClick={onClose} className="btn btn-icon btn-secondary btn-sm">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
          {query.trim().length < 2 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
              Type at least 2 characters to search teachers and staff...
            </div>
          ) : loading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Searching faculty database...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No teachers matching "<span style={{ color: 'var(--text-white)' }}>{query}</span>"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em', padding: '0 8px' }}>
                Faculty Matches ({results.length})
              </div>
              {results.map((teacher) => (
                <div
                  key={teacher._id}
                  onClick={() => handleSelectTeacher(teacher._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-500)';
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'var(--bg-card-subtle)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="avatar avatar-sm">
                      {teacher.fullName?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-white)', fontSize: '0.9rem' }}>
                        {teacher.fullName}{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-500)', fontWeight: 500 }}>
                          ({teacher.employeeId})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {teacher.department} • {teacher.designation || 'Teacher'} • {teacher.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge status={teacher.status || 'ACTIVE'} size="sm" />
                    <ArrowRight size={16} color="var(--text-dim)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
