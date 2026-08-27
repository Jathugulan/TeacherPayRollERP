import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newToast = { id, title, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message, title = 'Success') => {
    addToast({ title, message, type: 'success' });
  }, [addToast]);

  const error = useCallback((message, title = 'Error') => {
    addToast({ title, message: message || 'Something went wrong', type: 'error' });
  }, [addToast]);

  const warning = useCallback((message, title = 'Warning') => {
    addToast({ title, message, type: 'warning' });
  }, [addToast]);

  const info = useCallback((message, title = 'Notice') => {
    addToast({ title, message, type: 'info' });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-item"
            style={{
              borderColor:
                toast.type === 'success' ? 'var(--color-present-border)' :
                toast.type === 'error' ? 'var(--color-absent-border)' :
                toast.type === 'warning' ? 'var(--color-leave-border)' :
                'var(--color-info-border)',
            }}
          >
            {toast.type === 'success' && <CheckCircle2 size={20} color="var(--color-present)" />}
            {toast.type === 'error' && <AlertCircle size={20} color="var(--color-absent)" />}
            {toast.type === 'warning' && <AlertTriangle size={20} color="var(--color-leave)" />}
            {toast.type === 'info' && <Info size={20} color="var(--color-info)" />}

            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{toast.title}</div>}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{toast.message}</div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
