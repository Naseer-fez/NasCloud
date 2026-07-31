import React from 'react';
import { Download, Edit3, Link, MoveRight, Trash2, X } from 'lucide-react';
import styles from './BulkActionBar.module.css';

export default function BulkActionBar({
  selectedCount = 0,
  onDownload,
  onMove,
  onRename,
  onShare,
  onDelete,
  onClear,
}) {
  if (selectedCount <= 0) return null;

  return (
    <div className={styles.bar} role="toolbar" aria-label="Bulk actions">
      <div className={styles.countInfo}>
        <span className={styles.countBadge}>{selectedCount}</span>
        <span>{selectedCount === 1 ? 'item selected' : 'items selected'}</span>
      </div>

      <div className={styles.actionGroup}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onDownload}
          title="Download selected items"
        >
          <Download size={16} aria-hidden="true" />
          <span>Download</span>
        </button>

        <button
          type="button"
          className={styles.actionBtn}
          onClick={onMove}
          title="Move selected items"
        >
          <MoveRight size={16} aria-hidden="true" />
          <span>Move</span>
        </button>

        <button
          type="button"
          className={styles.actionBtn}
          onClick={onRename}
          disabled={selectedCount !== 1}
          title={selectedCount === 1 ? 'Rename item' : 'Rename (only 1 item)'}
        >
          <Edit3 size={16} aria-hidden="true" />
          <span>Rename</span>
        </button>

        <button
          type="button"
          className={styles.actionBtn}
          onClick={onShare}
          disabled={selectedCount !== 1}
          title={selectedCount === 1 ? 'Share link' : 'Share (only 1 item)'}
        >
          <Link size={16} aria-hidden="true" />
          <span>Share</span>
        </button>

        <button
          type="button"
          className={`${styles.actionBtn} ${styles.dangerBtn}`}
          onClick={onDelete}
          title="Delete selected items"
        >
          <Trash2 size={16} aria-hidden="true" />
          <span>Delete</span>
        </button>
      </div>

      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClear}
        title="Clear selection"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
