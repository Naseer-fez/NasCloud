import React, { useMemo } from 'react';
import {
  Archive,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  MoreVertical,
} from 'lucide-react';
import { formatBytes, isFolder, itemPath } from '../../utils/files';
import styles from './FileList.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  let val = dateStr;
  if (typeof val === 'string' && !Number.isNaN(Number(val))) {
    val = Number(val);
  }
  if (typeof val === 'number') {
    if (val < 10000000000) {
      val = val * 1000;
    }
  }
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function FileIcon({ item, size = 18 }) {
  if (isFolder(item)) return <Folder size={size} aria-hidden="true" />;

  const ext = (item.name || '').split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
    return <FileImage size={size} aria-hidden="true" />;
  }
  if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) {
    return <FileAudio size={size} aria-hidden="true" />;
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    return <FileVideo size={size} aria-hidden="true" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive size={size} aria-hidden="true" />;
  }
  if (['txt', 'md', 'pdf', 'doc', 'docx'].includes(ext)) {
    return <FileText size={size} aria-hidden="true" />;
  }
  return <File size={size} aria-hidden="true" />;
}

export default function FileList({
  files = [],
  viewMode = 'list',
  currentPath = '',
  onContextMenu,
  onNavigate,
  onFileClick,
  selectedId,
  selectedIds = [],
  onItemClick,
  onItemDoubleClick,
}) {
  const isSelected = (item) => {
    const id = item.id || item.path || item.name;
    if (Array.isArray(selectedIds)) return selectedIds.includes(id);
    if (selectedIds instanceof Set) return selectedIds.has(id);
    return selectedId === id;
  };

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const aFolder = isFolder(a);
      const bFolder = isFolder(b);
      if (aFolder && !bFolder) return -1;
      if (!aFolder && bFolder) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [files]);

  const handleSingleClick = (event, item) => {
    event.stopPropagation();
    if (onItemClick) {
      onItemClick(event, item);
    } else if (isFolder(item)) {
      onNavigate(itemPath(item, currentPath));
    } else {
      onFileClick(item);
    }
  };

  const handleDoubleClick = (event, item) => {
    event.stopPropagation();
    if (onItemDoubleClick) {
      onItemDoubleClick(event, item);
    } else if (isFolder(item)) {
      onNavigate(itemPath(item, currentPath));
    } else {
      onFileClick(item);
    }
  };

  const handleContextClick = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, item);
  };

  const handleOverflowClick = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    onContextMenu({ clientX: rect.left, clientY: rect.bottom + 6 }, item);
  };

  if (viewMode === 'grid') {
    return (
      <div className={styles.gridContainer}>
        {sortedFiles.map((item) => {
          const id = item.id || item.path || item.name;
          const selected = isSelected(item);
          const folder = isFolder(item);

          return (
            <div
              key={id}
              className={`${styles.gridCard} ${selected ? styles.selected : ''}`}
              onClick={(event) => handleSingleClick(event, item)}
              onDoubleClick={(event) => handleDoubleClick(event, item)}
              onContextMenu={(event) => handleContextClick(event, item)}
            >
              <button
                type="button"
                className={styles.gridOverflow}
                onClick={(event) => handleOverflowClick(event, item)}
                title="More actions"
              >
                <MoreVertical size={16} aria-hidden="true" />
              </button>
              <div className={styles.gridIcon}><FileIcon item={item} size={34} /></div>
              <div className={styles.gridName} title={item.name}>{item.name}</div>
              <div className={styles.gridMeta}>{folder ? 'Folder' : formatBytes(item.size)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      <div className={styles.headerRow}>
        <div className={styles.colName}>Name</div>
        <div className={styles.colSize}>Size</div>
        <div className={styles.colModified}>Modified</div>
        <div className={styles.colAction} />
      </div>
      <div className={styles.listBody}>
        {sortedFiles.map((item) => {
          const id = item.id || item.path || item.name;
          const folder = isFolder(item);
          const selected = isSelected(item);

          return (
            <div
              key={id}
              className={`${styles.row} ${selected ? styles.selected : ''}`}
              onClick={(event) => handleSingleClick(event, item)}
              onDoubleClick={(event) => handleDoubleClick(event, item)}
              onContextMenu={(event) => handleContextClick(event, item)}
            >
              <div className={styles.colName}>
                <span className={styles.rowIcon}><FileIcon item={item} /></span>
                <span className={styles.rowName} title={item.name}>{item.name}</span>
              </div>
              <div className={styles.colSize}>{folder ? '-' : formatBytes(item.size)}</div>
              <div className={styles.colModified}>{formatDate(item.modified || item.date)}</div>
              <div className={styles.colAction}>
                <button
                  type="button"
                  className={styles.overflowBtn}
                  onClick={(event) => handleOverflowClick(event, item)}
                  title="More actions"
                >
                  <MoreVertical size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
