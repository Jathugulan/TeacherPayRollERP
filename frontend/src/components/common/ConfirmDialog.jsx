import React from 'react';
import Modal from './Modal';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle size={24} color="var(--color-absent)" />;
      case 'success':
        return <CheckCircle2 size={24} color="var(--color-present)" />;
      default:
        return <Info size={24} color="var(--color-info)" />;
    }
  };

  const getConfirmBtnClass = () => {
    switch (type) {
      case 'danger':
        return 'btn-danger';
      case 'success':
        return 'btn-success';
      default:
        return 'btn-primary';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="480px">
      <div className="modal-body" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ padding: '8px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
          {getIcon()}
        </div>
        <div>
          <p style={{ color: 'var(--text-main)', fontSize: '0.925rem', lineHeight: '1.5' }}>
            {message}
          </p>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </button>
        <button
          className={`btn ${getConfirmBtnClass()}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
