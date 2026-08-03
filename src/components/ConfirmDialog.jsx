import React from 'react';
import Modal from './Modal.jsx';

/**
 * Protects against accidental deletion / destructive actions, as required
 * by the spec's Security section. Every delete and the backup-restore flow
 * route through this component rather than acting immediately on click.
 */
export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}
