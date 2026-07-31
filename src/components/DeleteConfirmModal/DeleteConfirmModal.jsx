import React, { useState } from 'react';
import styles from './DeleteConfirmModal.module.css';

export default function DeleteConfirmModal({ isOpen, onClose, item, items = [], isPermanent = false, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const itemList = items.length > 0 ? items : item ? [item] : [];
  if (!isOpen || itemList.length === 0) return null;

  const count = itemList.length;
  const displayName = count === 1 ? `"${itemList[0].name}"` : `${count} items`;

  const handleConfirmClick = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Delete action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className={`${styles.modal} ${isPermanent ? styles.permanent : ''}`}>
        <div className={styles.icon}>{isPermanent ? '⚠️' : '🗑️'}</div>
        <h3>{isPermanent ? 'Permanent Delete' : 'Move to Trash'}</h3>
        <p className={styles.msg}>
          {isPermanent ? (
            <>
              Are you sure you want to permanently delete <span className={styles.name}>{displayName}</span>?
            </>
          ) : (
            <>
              Move <span className={styles.name}>{displayName}</span> to trash?
            </>
          )}
        </p>

        {isPermanent && (
          <div className={styles.warningAlert}>
            This action cannot be undone and will erase {count === 1 ? 'this item' : 'these items'} permanently from the servers.
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={`${styles.btnConfirm} ${isPermanent ? styles.btnDanger : ''}`}
            onClick={handleConfirmClick}
            disabled={loading}
          >
            {loading ? 'Processing...' : isPermanent ? 'Delete Forever' : 'Move to Trash'}
          </button>
        </div>
      </div>
    </div>
  );
}
