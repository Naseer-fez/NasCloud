import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import UploadPanel from '../components/UploadPanel/UploadPanel';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 768);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className={styles.layout}>
      {isMobile && !sidebarCollapsed && (
        <div className={styles.overlay} onClick={closeSidebar}></div>
      )}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
        isMobile={isMobile}
        onClose={closeSidebar}
      />
      <main className={styles.main}>
        <div className={styles.content}>
          <div key={location.pathname} className={styles.contentAnimated}>
            <Outlet context={{ handleToggleSidebar, isMobile }} />
          </div>
        </div>
      </main>
      <UploadPanel />
    </div>
  );
}
