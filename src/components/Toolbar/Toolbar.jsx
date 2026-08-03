import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ChevronDown,
  FileUp,
  FolderPlus,
  FolderUp,
  Grid2X2,
  List,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SearchDropdown from '../SearchDropdown/SearchDropdown';
import styles from './Toolbar.module.css';

export default function Toolbar({
  currentPath = '',
  viewMode = 'list',
  onViewModeChange,
  onUploadFiles,
  onUploadFolder,
  onNewFolder,
  onRefresh,
  isRefreshing = false,
  searchValue = '',
  onSearchChange,
  summary,
}) {
  const { userid, logout } = useAuth();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const isMobile = outletContext?.isMobile;
  const handleToggleSidebar = outletContext?.handleToggleSidebar;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const uploadDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target)) {
        setUploadOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [{ name: 'Home', path: '' }];

    const list = [{ name: 'Home', path: '' }];
    let path = '';
    currentPath.split('/').forEach((part) => {
      path = path ? `${path}/${part}` : part;
      list.push({ name: part, path });
    });
    return list;
  }, [currentPath]);

  const handleBreadcrumbClick = (path) => {
    navigate(path ? `/folder/${encodeURIComponent(path)}` : '/');
  };

  const triggerFilesUpload = () => {
    fileInputRef.current?.click();
    setUploadOpen(false);
  };

  const triggerFolderUpload = () => {
    folderInputRef.current?.click();
    setUploadOpen(false);
  };

  return (
    <header className={styles.toolbar}>
      <div className={styles.pathGroup}>
        {isMobile && (
          <button className={styles.menuBtn} onClick={handleToggleSidebar} title="Open sidebar">
            <Menu size={20} />
          </button>
        )}
        <div className={styles.pathDetails}>
        <nav className={styles.breadcrumbs} aria-label="Folder breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path || 'home'}>
              {index > 0 && <span className={styles.separator}>/</span>}
              <button
                type="button"
                className={`${styles.crumb} ${index === breadcrumbs.length - 1 ? styles.crumbActive : ''}`}
                onClick={() => handleBreadcrumbClick(crumb.path)}
                title={crumb.name}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </nav>
        <span className={styles.pathMeta}>
          {summary ? `${summary.total} items` : 'Drive'}
        </span>
        </div>
      </div>

      <div className={styles.searchWrapper}>
        <div className={styles.searchBar}>
          <Search size={16} aria-hidden="true" />
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search all files"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
          />
        </div>
        <SearchDropdown
          searchQuery={searchValue}
          isVisible={searchFocused}
          onClose={() => setSearchFocused(false)}
          onNavigate={(targetPath) => navigate(targetPath ? `/folder/${targetPath}` : '/')}
        />
      </div>

      <div className={styles.actions}>
        <button
          className={styles.btnSecondary}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh drive"
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} aria-hidden="true" />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        <button className={styles.btnSecondary} onClick={onNewFolder} title="Create folder">
          <FolderPlus size={16} aria-hidden="true" />
          <span>New Folder</span>
        </button>

        <div className={styles.dropdownWrapper} ref={uploadDropdownRef}>
          <button className={styles.btnPrimary} onClick={() => setUploadOpen((prev) => !prev)}>
            <UploadCloud size={16} aria-hidden="true" />
            <span>Upload</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {uploadOpen && (
            <div className={styles.menuDropdown}>
              <button className={styles.dropdownItem} onClick={triggerFilesUpload}>
                <FileUp size={16} aria-hidden="true" />
                <span>Upload Files</span>
              </button>
              <button className={styles.dropdownItem} onClick={triggerFolderUpload}>
                <FolderUp size={16} aria-hidden="true" />
                <span>Upload Folder</span>
              </button>
            </div>
          )}
        </div>

        <div className={styles.viewSegment} aria-label="View mode">
          <button
            className={viewMode === 'list' ? styles.segmentActive : ''}
            onClick={() => onViewModeChange('list')}
            title="List view"
          >
            <List size={16} aria-hidden="true" />
          </button>
          <button
            className={viewMode === 'grid' ? styles.segmentActive : ''}
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
          >
            <Grid2X2 size={16} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.dropdownWrapper} ref={profileDropdownRef}>
          <button
            className={styles.avatar}
            onClick={() => setProfileOpen((prev) => !prev)}
            title="Account"
          >
            {userid === null || userid === undefined ? 'U' : String(userid)[0]?.toUpperCase()}
          </button>
          {profileOpen && (
            <div className={`${styles.menuDropdown} ${styles.rightDropdown}`}>
              <button className={styles.dropdownItem} onClick={() => { setProfileOpen(false); navigate('/settings'); }}>
                <Settings size={16} aria-hidden="true" />
                <span>Account Settings</span>
              </button>
              <button className={`${styles.dropdownItem} ${styles.dangerItem}`} onClick={() => { setProfileOpen(false); logout(); }}>
                <LogOut size={16} aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className={styles.hiddenInput}
        onChange={(event) => {
          if (event.target.files?.length && onUploadFiles) onUploadFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        className={styles.hiddenInput}
        onChange={(event) => {
          if (event.target.files?.length && onUploadFolder) onUploadFolder(event.target.files);
          event.target.value = '';
        }}
      />
    </header>
  );
}
