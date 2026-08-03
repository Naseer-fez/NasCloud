import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  Cloud,
  Folder,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  X,
} from 'lucide-react';
import { getStructure, getUserStats } from '../../api/endpoints';
import { SIDEBAR_REFRESH_EVENT } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { formatBytes, isFolder, itemPath, normalizePath } from '../../utils/files';
import NasCloudLogo from '../common/NasCloudLogo';
import styles from './Sidebar.module.css';

export default function Sidebar({ collapsed, onToggle, isMobile, onClose }) {
  const { userid } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [tree, setTree] = useState(null);
  const [treeLoading, setTreeLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [storage, setStorage] = useState(null);

  const activeFolderPath = useMemo(() => {
    const match = location.pathname.match(/\/folder\/([^/]+)/);
    return normalizePath(match ? decodeURIComponent(match[1]) : '');
  }, [location.pathname]);

  const fetchTree = useCallback(async () => {
    if (userid === null || userid === undefined) return;
    setTreeLoading(true);
    try {
      const data = await getStructure(userid);
      setTree(data);
    } catch (err) {
      console.error('Failed to load folder structure:', err);
    } finally {
      setTreeLoading(false);
    }
  }, [userid]);

  const fetchStorage = useCallback(async () => {
    if (userid === null || userid === undefined) return;
    try {
      const data = await getUserStats(userid);
      setStorage(data?.return || data || null);
    } catch (err) {
      console.error('Failed to load user stats:', err);
    }
  }, [userid]);

  useEffect(() => {
    fetchTree();
    fetchStorage();

    const handleRefresh = () => {
      fetchTree();
      fetchStorage();
    };
    window.addEventListener(SIDEBAR_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(SIDEBAR_REFRESH_EVENT, handleRefresh);
  }, [fetchTree, fetchStorage]);

  const storagePercent = useMemo(() => {
    if (!storage) return 0;
    const used = Number(storage.usedspace) || 0;
    const remaining = Number(storage.remainingspace) || 0;
    const total = used + remaining;
    return total > 0 ? Math.min((used / total) * 100, 100) : 0;
  }, [storage]);

  const rootFolders = useMemo(() => {
    const items = Array.isArray(tree)
      ? tree
      : tree?.children || tree?.contents || (tree?.name ? [tree] : []);
    return items.filter((item) => isFolder(item));
  }, [tree]);

  const toggleFolder = useCallback((path) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const navigateToFolder = useCallback((path) => {
    const normalized = normalizePath(path);
    navigate(normalized ? `/folder/${encodeURIComponent(normalized)}` : '/');
  }, [navigate]);

  const renderTreeItem = (item, depth = 0, parentPath = '') => {
    const path = itemPath(item, parentPath);
    const children = (item.children || item.contents || []).filter((child) => isFolder(child));
    const isExpanded = !!expandedFolders[path];
    const isActive = activeFolderPath === normalizePath(path);

    return (
      <div key={path || item.name}>
        <div
          className={`${styles.treeItem} ${isActive ? styles.active : ''}`}
          style={{ paddingLeft: collapsed ? undefined : `${14 + depth * 14}px` }}
          onClick={() => navigateToFolder(path)}
          title={item.name}
        >
          {children.length > 0 && !collapsed ? (
            <button
              className={`${styles.chevron} ${isExpanded ? styles.open : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                toggleFolder(path);
              }}
              title={isExpanded ? 'Collapse folder' : 'Expand folder'}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          ) : (
            !collapsed && <span className={styles.chevronSpacer} />
          )}
          <Folder className={styles.treeItemIcon} size={17} aria-hidden="true" />
          {!collapsed && <span className={styles.treeItemLabel}>{item.name}</span>}
        </div>
        {isExpanded && children.length > 0 && !collapsed && (
          <div className={styles.treeChildren}>
            {children.map((child) => renderTreeItem(child, depth + 1, path))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <button className={styles.logo} onClick={() => navigate('/')} title="PersonalDrive">
          <NasCloudLogo size={24} className={styles.logoIcon} />
          {!collapsed && <span className={styles.logoText}>PersonalDrive</span>}
        </button>
        <button className={styles.toggleBtn} onClick={isMobile ? onClose : onToggle} title={isMobile ? 'Close sidebar' : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}>
          {isMobile ? <X size={18} /> : (collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />)}
        </button>
      </div>

      <nav className={styles.nav}>
        <div
          className={`${styles.treeItem} ${location.pathname === '/' ? styles.active : ''}`}
          onClick={() => navigate('/')}
          title="Home"
          style={{ paddingLeft: collapsed ? '14px' : '16px' }}
        >
          <Home className={styles.treeItemIcon} size={17} aria-hidden="true" />
          {!collapsed && <span className={styles.treeItemLabel}>Home</span>}
        </div>

        {!collapsed && <div className={styles.sectionTitle}>Folders</div>}
        <div className={styles.treeContainer}>
          {treeLoading ? (
            <div className={styles.treeSkeleton}>
              {[1, 2, 3].map((item) => (
                <div key={item} className={styles.skeletonItem} />
              ))}
            </div>
          ) : rootFolders.length > 0 ? (
            rootFolders.map((item) => renderTreeItem(item))
          ) : (
            <div className={styles.treeEmpty}>
              <Folder size={17} aria-hidden="true" />
              {!collapsed && <span>No folders yet</span>}
            </div>
          )}
        </div>

        <div className={styles.divider} />

        <div
          className={`${styles.treeItem} ${location.pathname === '/trash' ? styles.active : ''}`}
          onClick={() => navigate('/trash')}
          title="Trash"
          style={{ paddingLeft: collapsed ? '14px' : '16px' }}
        >
          <Trash2 className={styles.treeItemIcon} size={17} aria-hidden="true" />
          {!collapsed && <span className={styles.treeItemLabel}>Trash</span>}
        </div>
      </nav>

      {storage && (
        <div className={styles.storageCard}>
          {!collapsed && (
            <div className={styles.storageHeader}>
              <span>Storage</span>
              <span>{Math.round(storagePercent)}%</span>
            </div>
          )}
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${storagePercent}%` }} />
          </div>
          {!collapsed ? (
            <div className={styles.storageText}>
              {formatBytes(storage.usedspace)} of {formatBytes(Number(storage.usedspace) + Number(storage.remainingspace))} used
            </div>
          ) : (
            <div className={styles.collapsedStorageIcon} title={`${formatBytes(storage.usedspace)} used`}>
              <BarChart3 size={18} aria-hidden="true" />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
