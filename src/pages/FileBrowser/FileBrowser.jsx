import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, FolderOpen, UploadCloud } from 'lucide-react';
import { createFolder, deleteFile, downloadFile, getStructure } from '../../api/endpoints';
import { DRIVE_REFRESH_EVENT, SIDEBAR_REFRESH_EVENT } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ContextMenu from '../../components/ContextMenu/ContextMenu';
import DeleteConfirmModal from '../../components/DeleteConfirmModal/DeleteConfirmModal';
import FileList from '../../components/FileList/FileList';
import MoveModal from '../../components/MoveModal/MoveModal';
import NewFolderModal from '../../components/NewFolderModal/NewFolderModal';
import RenameModal from '../../components/RenameModal/RenameModal';
import ShareModal from '../../components/ShareModal/ShareModal';
import BulkActionBar from '../../components/BulkActionBar/BulkActionBar';
import Skeleton from '../../components/common/Skeleton';
import Toolbar from '../../components/Toolbar/Toolbar';
import { getChildrenAtPath, isFolder, itemPath, normalizePath } from '../../utils/files';
import styles from './FileBrowser.module.css';

async function traverseEntry(entry, parentPath = '') {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => {
        const fullRelPath = parentPath ? `${parentPath}/${file.name}` : file.name;
        Object.defineProperty(file, 'webkitRelativePath', {
          value: fullRelPath,
          writable: true,
          configurable: true,
        });
        resolve([file]);
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readEntries = () => {
        dirReader.readEntries(async (entries) => {
          if (!entries.length) {
            resolve([]);
          } else {
            const currentRelPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
            const promises = entries.map((child) => traverseEntry(child, currentRelPath));
            const childFiles = await Promise.all(promises);
            resolve(childFiles.flat());
          }
        });
      };
      readEntries();
    } else {
      resolve([]);
    }
  });
}

export default function FileBrowser() {
  const { folderId } = useParams();
  const { userid } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [searchValue, setSearchValue] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
  const [renameItem, setRenameItem] = useState(null);
  const [moveItems, setMoveItems] = useState([]);
  const [shareItem, setShareItem] = useState(null);
  const [deleteItems, setDeleteItems] = useState([]);
  const [deleteIsPermanent, setDeleteIsPermanent] = useState(false);
  const [newFolderDirectory, setNewFolderDirectory] = useState(null);

  const currentFolderPath = useMemo(
    () => normalizePath(folderId ? decodeURIComponent(folderId) : ''),
    [folderId],
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFolderData = useCallback(async (force = false) => {
    if (userid === null || userid === undefined) return;

    if (force) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getStructure(userid, undefined, force);
      let items = [];

      if (currentFolderPath) {
        items = getChildrenAtPath(data, currentFolderPath);
      } else if (Array.isArray(data)) {
        items = data;
      } else if (data?.children) {
        items = data.children;
      } else if (data?.contents) {
        items = data.contents;
      } else if (data?.name) {
        items = [data];
      }

      setFiles(items);
      if (force) {
        addToast('Drive refreshed successfully.', 'success');
        window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_EVENT));
      }
    } catch (err) {
      setError(err.message || 'Failed to load folder contents.');
      if (force) {
        addToast(err.message || 'Failed to refresh.', 'error');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userid, currentFolderPath, addToast]);

  useEffect(() => {
    fetchFolderData();
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, [fetchFolderData]);

  useEffect(() => {
    const refreshHandler = () => fetchFolderData();
    window.addEventListener(DRIVE_REFRESH_EVENT, refreshHandler);
    return () => window.removeEventListener(DRIVE_REFRESH_EVENT, refreshHandler);
  }, [fetchFolderData]);

  useEffect(() => {
    const folderHandler = (event) => {
      setNewFolderDirectory(normalizePath(event.detail?.directory || currentFolderPath));
    };

    window.addEventListener('nascloud-newfolder', folderHandler);
    return () => window.removeEventListener('nascloud-newfolder', folderHandler);
  }, [currentFolderPath]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setLastSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredFiles = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return files;
    return files.filter((item) => (item.name || '').toLowerCase().includes(query));
  }, [files, searchValue]);

  const getItemId = useCallback((item) => item.id || item.path || item.name, []);

  const selectedItems = useMemo(() => {
    return files.filter((item) => selectedIds.has(getItemId(item)));
  }, [files, selectedIds, getItemId]);

  const folderSummary = useMemo(() => {
    const folderCount = files.filter((item) => isFolder(item)).length;
    return {
      folders: folderCount,
      files: files.length - folderCount,
      shown: filteredFiles.length,
      total: files.length,
    };
  }, [files, filteredFiles]);

  const handleNavigate = useCallback((path) => {
    const normalized = normalizePath(path);
    navigate(normalized ? `/folder/${encodeURIComponent(normalized)}` : '/');
  }, [navigate]);

  const handleItemClick = useCallback((event, item) => {
    const id = getItemId(item);
    if (event.ctrlKey || event.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setLastSelectedId(id);
    } else if (event.shiftKey && lastSelectedId) {
      const lastIndex = filteredFiles.findIndex((f) => getItemId(f) === lastSelectedId);
      const currentIndex = filteredFiles.findIndex((f) => getItemId(f) === id);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = filteredFiles.slice(start, end + 1).map(getItemId);
        setSelectedIds((prev) => new Set([...prev, ...rangeIds]));
      }
    } else {
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
    }
  }, [filteredFiles, getItemId, lastSelectedId]);

  const handleItemDoubleClick = useCallback((event, item) => {
    if (isFolder(item)) {
      handleNavigate(itemPath(item, currentFolderPath));
    } else {
      handleSingleItemDownload(item);
    }
  }, [currentFolderPath, handleNavigate]);

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
    if (event.dataTransfer.items?.length > 0) setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    dragCounter.current = 0;

    const items = event.dataTransfer.items;
    if (!items || items.length === 0) return;

    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
      if (entry) entries.push(entry);
    }

    if (entries.length > 0) {
      addToast('Scanning files and folders...', 'info');
      const filesPromises = entries.map((entry) => traverseEntry(entry));
      const fileArrays = await Promise.all(filesPromises);
      const allFiles = fileArrays.flat();
      if (allFiles.length > 0) {
        addToast(`Preparing ${allFiles.length} upload(s)...`, 'info');
        window.dispatchEvent(new CustomEvent('nascloud-upload-trigger', {
          detail: { files: allFiles, directory: currentFolderPath },
        }));
      }
    } else if (event.dataTransfer.files?.length) {
      const droppedFiles = Array.from(event.dataTransfer.files);
      addToast(`Preparing ${droppedFiles.length} upload(s)...`, 'info');
      window.dispatchEvent(new CustomEvent('nascloud-upload-trigger', {
        detail: { files: droppedFiles, directory: currentFolderPath },
      }));
    }
  };

  const handleContextMenuTrigger = (event, item) => {
    const id = getItemId(item);
    if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
    }

    const path = itemPath(item, currentFolderPath);
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      item: { ...item, path },
    });
  };

  const handleSingleItemDownload = useCallback(async (item) => {
    const filePath = itemPath(item, currentFolderPath);
    const itemType = isFolder(item) ? 'folder' : 'file';
    addToast(`Preparing download for ${itemType} "${item.name}"...`, 'info');

    try {
      const result = await downloadFile(userid, filePath);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = isFolder(item) ? `${item.name}.zip` : item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast(`Downloaded "${item.name}".`, 'success');
    } catch (err) {
      addToast(err.message || 'Download failed.', 'error');
    }
  }, [userid, currentFolderPath, addToast]);

  const handleBulkDownload = useCallback(async () => {
    if (selectedItems.length === 0 || isBulkDownloading) return;
    setIsBulkDownloading(true);
    addToast(`Preparing ${selectedItems.length} download(s)...`, 'info');

    let successCount = 0;
    let failCount = 0;

    for (const item of selectedItems) {
      const filePath = itemPath(item, currentFolderPath);
      try {
        const result = await downloadFile(userid, filePath);
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = isFolder(item) ? `${item.name}.zip` : item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    setIsBulkDownloading(false);
    if (failCount === 0) {
      addToast(`Successfully downloaded ${successCount} item(s).`, 'success');
    } else {
      addToast(`Downloaded ${successCount} item(s), ${failCount} failed.`, 'warning');
    }
  }, [selectedItems, isBulkDownloading, userid, currentFolderPath, addToast]);

  const handleContextAction = useCallback((actionId, item) => {
    switch (actionId) {
      case 'open':
        handleNavigate(itemPath(item, currentFolderPath));
        break;
      case 'download':
        handleSingleItemDownload(item);
        break;
      case 'rename':
        setRenameItem(item);
        break;
      case 'move':
        setMoveItems([item]);
        break;
      case 'share':
        setShareItem(item);
        break;
      case 'trash':
        setDeleteItems([item]);
        setDeleteIsPermanent(false);
        break;
      default:
        break;
    }
  }, [currentFolderPath, handleSingleItemDownload, handleNavigate]);

  const handleNewFolder = () => {
    setNewFolderDirectory(currentFolderPath);
  };

  const handleCreateFolder = async (name) => {
    const folderPath = normalizePath(`${newFolderDirectory || ''}/${name.trim()}`);
    await createFolder(userid, folderPath);
    addToast(`Folder "${name.trim()}" created.`, 'success');
    fetchFolderData();
    window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_EVENT));
  };

  const handleUploadFiles = (selectedFiles) => {
    window.dispatchEvent(new CustomEvent('nascloud-upload-trigger', {
      detail: { files: Array.from(selectedFiles), directory: currentFolderPath },
    }));
  };

  const handleUploadFolder = (selectedFiles) => {
    window.dispatchEvent(new CustomEvent('nascloud-upload-trigger', {
      detail: { files: Array.from(selectedFiles), directory: currentFolderPath, isFolderUpload: true },
    }));
  };

  const handleDeleteConfirm = async () => {
    if (deleteItems.length === 0) return;

    let successCount = 0;
    for (const item of deleteItems) {
      const deletePath = itemPath(item, currentFolderPath);
      try {
        await deleteFile(userid, deletePath, deleteIsPermanent ? 0 : 1);
        successCount++;
      } catch (err) {
        addToast(`Failed to delete "${item.name}": ${err.message}`, 'error');
      }
    }

    if (successCount > 0) {
      addToast(
        deleteIsPermanent
          ? `Permanently deleted ${successCount} item(s).`
          : `Moved ${successCount} item(s) to Trash.`,
        'success'
      );
      setSelectedIds(new Set());
      fetchFolderData();
      window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_EVENT));
    }
    setDeleteItems([]);
  };

  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedIds(new Set());
      setLastSelectedId(null);
    }
  };

  return (
    <div
      className={styles.viewport}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBackgroundClick}
    >
      <Toolbar
        currentPath={currentFolderPath}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onUploadFiles={handleUploadFiles}
        onUploadFolder={handleUploadFolder}
        onNewFolder={handleNewFolder}
        onRefresh={() => fetchFolderData(true)}
        isRefreshing={isRefreshing}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        summary={folderSummary}
      />

      <div className={styles.content} onClick={handleBackgroundClick}>
        <div className={styles.folderHeader}>
          <div className={styles.folderTitleBlock}>
            <p className={styles.eyebrow}>{currentFolderPath || 'Home'}</p>
            <h2>{currentFolderPath ? currentFolderPath.split('/').pop() : 'My Drive'}</h2>
          </div>
          <div className={styles.metaStrip}>
            <span>{folderSummary.folders} folders</span>
            <span>{folderSummary.files} files</span>
            {searchValue.trim() && <span>{folderSummary.shown} shown</span>}
            {selectedIds.size > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>({selectedIds.size} selected)</span>}
          </div>
        </div>

        {loading ? (
          <Skeleton type={viewMode === 'grid' ? 'card' : 'row'} count={6} />
        ) : error ? (
          <div className={styles.errorState}>
            <AlertTriangle size={36} aria-hidden="true" />
            <h3>Error Loading View</h3>
            <p>{error}</p>
            <button className={styles.btnRetry} onClick={fetchFolderData}>Retry</button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className={styles.emptyState}>
            <FolderOpen className={styles.emptyIcon} size={44} aria-hidden="true" />
            <h3>This folder is empty</h3>
            <p>Drag files or folders here or use the Upload button to get started.</p>
          </div>
        ) : (
          <FileList
            files={filteredFiles}
            viewMode={viewMode}
            currentPath={currentFolderPath}
            onContextMenu={handleContextMenuTrigger}
            onNavigate={handleNavigate}
            onFileClick={handleSingleItemDownload}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
            selectedIds={Array.from(selectedIds)}
          />
        )}
      </div>

      {dragActive && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragCard}>
            <UploadCloud className={styles.dragIcon} size={52} aria-hidden="true" />
            <h3>Drop files or folders here</h3>
            <p>Instantly upload them to the current folder while preserving directory structure</p>
          </div>
        </div>
      )}

      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        item={contextMenu.item}
        onAction={handleContextAction}
        onClose={() => setContextMenu({ visible: false, x: 0, y: 0, item: null })}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDownload={handleBulkDownload}
        onMove={() => setMoveItems(selectedItems)}
        onRename={() => setRenameItem(selectedItems[0] || null)}
        onShare={() => setShareItem(selectedItems[0] || null)}
        onDelete={() => {
          setDeleteItems(selectedItems);
          setDeleteIsPermanent(false);
        }}
        onClear={() => {
          setSelectedIds(new Set());
          setLastSelectedId(null);
        }}
      />

      <RenameModal
        isOpen={!!renameItem}
        onClose={() => setRenameItem(null)}
        item={renameItem}
        onSuccess={() => {
          fetchFolderData();
          window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_EVENT));
        }}
      />

      <NewFolderModal
        isOpen={newFolderDirectory !== null}
        directory={newFolderDirectory || ''}
        onClose={() => setNewFolderDirectory(null)}
        onCreate={handleCreateFolder}
      />

      <MoveModal
        isOpen={moveItems.length > 0}
        onClose={() => setMoveItems([])}
        items={moveItems}
        onSuccess={() => {
          setSelectedIds(new Set());
          fetchFolderData();
          window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_EVENT));
        }}
      />

      <ShareModal
        isOpen={!!shareItem}
        onClose={() => setShareItem(null)}
        item={shareItem}
      />

      <DeleteConfirmModal
        isOpen={deleteItems.length > 0}
        onClose={() => setDeleteItems([])}
        items={deleteItems}
        isPermanent={deleteIsPermanent}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
