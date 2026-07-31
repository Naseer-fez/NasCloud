import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Edit3, FolderOpen, Link, MoveRight, Trash2 } from 'lucide-react';
import { isFolder } from '../../utils/files';
import styles from './ContextMenu.module.css';

export default function ContextMenu({ visible, x, y, item, onAction, onClose }) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const clickHandler = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
    };

    if (visible) document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, [visible, onClose]);

  useLayoutEffect(() => {
    if (!visible) return;

    const menu = menuRef.current;
    const width = menu?.offsetWidth || 190;
    const height = menu?.offsetHeight || 260;
    const margin = 8;
    const nextX = Math.min(Math.max(x, margin), window.innerWidth - width - margin);
    const nextY = Math.min(Math.max(y, margin), window.innerHeight - height - margin);
    setPosition({ x: nextX, y: nextY });
  }, [visible, x, y]);

  if (!visible || !item) return null;

  const handleItemClick = (actionId) => {
    onAction(actionId, item);
    onClose();
  };

  const folder = isFolder(item);

  return createPortal(
    <div ref={menuRef} className={styles.menu} style={{ top: `${position.y}px`, left: `${position.x}px` }}>
      {folder ? (
        <>
          <button type="button" className={styles.item} onClick={() => handleItemClick('open')}>
            <FolderOpen size={16} aria-hidden="true" />
            <span>Open Folder</span>
          </button>
          <button type="button" className={styles.item} onClick={() => handleItemClick('download')}>
            <Download size={16} aria-hidden="true" />
            <span>Download Folder</span>
          </button>
        </>
      ) : (
        <button type="button" className={styles.item} onClick={() => handleItemClick('download')}>
          <Download size={16} aria-hidden="true" />
          <span>Download File</span>
        </button>
      )}
      <button type="button" className={styles.item} onClick={() => handleItemClick('rename')}>
        <Edit3 size={16} aria-hidden="true" />
        <span>Rename</span>
      </button>
      <button type="button" className={styles.item} onClick={() => handleItemClick('move')}>
        <MoveRight size={16} aria-hidden="true" />
        <span>Move to...</span>
      </button>
      <button type="button" className={styles.item} onClick={() => handleItemClick('share')}>
        <Link size={16} aria-hidden="true" />
        <span>Share Link</span>
      </button>
      <div className={styles.divider} />
      <button type="button" className={`${styles.item} ${styles.danger}`} onClick={() => handleItemClick('trash')}>
        <Trash2 size={16} aria-hidden="true" />
        <span>Move to Trash</span>
      </button>
    </div>,
    document.body,
  );
}
