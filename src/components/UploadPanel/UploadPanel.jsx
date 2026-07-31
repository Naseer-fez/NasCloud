import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, X, AlertTriangle } from 'lucide-react';
import { BACKEND_SERVER_ERROR_MESSAGE, buildBackendUrl, saveBackendUrl, isMainServerUrl } from '../../api/backendUrl';
import { API_BASE_URL, AUTH_TOKEN_KEY, MAIN_ACCESS_CODE_KEY } from '../../config';
import { centralResolve } from '../../api/centralServer';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { refreshStructureAfterMutation } from '../../utils/structureCache';
import { logFez } from '../../utils/testLogger';
import styles from './UploadPanel.module.css';

function shouldSendNgrokHeader(url) {
  try {
    return new URL(url).hostname.includes('ngrok');
  } catch {
    return false;
  }
}

async function tryResolveBackendUrl(token) {
  const accessCode = localStorage.getItem(MAIN_ACCESS_CODE_KEY);
  if (!accessCode || !token) return null;
  try {
    const resolved = await centralResolve(API_BASE_URL, accessCode, token);
    if (resolved?.server_url) {
      return saveBackendUrl(resolved.server_url);
    }
  } catch (error) {
    logFez('Failed to re-resolve backend URL from main server in UploadPanel', error.message);
  }
  return null;
}

export default function UploadPanel() {
  const { userid } = useAuth();
  const { addToast } = useToast();
  const [uploads, setUploads] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const activeXHRs = useRef({});

  const cancelUpload = useCallback((id) => {
    activeXHRs.current[id]?.abort();
    delete activeXHRs.current[id];
    setUploads((prev) => prev.filter((upload) => upload.id !== id));
  }, []);

  const executeUploadTask = useCallback((upload, file, isRetry = false) => {
    const formData = new FormData();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const uploadDirectory = upload.directory || '/';
    let url = '';

    try {
      url = buildBackendUrl(`uploadfile/${userid}`);
      if (isMainServerUrl(url)) {
        throw new Error(BACKEND_SERVER_ERROR_MESSAGE);
      }
      formData.append('directory', uploadDirectory);
      formData.append('filepath', file, file.name);
    } catch (error) {
      if (!isRetry) {
        tryResolveBackendUrl(token).then((newUrl) => {
          if (newUrl) {
            logFez('Re-resolved backend URL before file upload after build error', newUrl);
            executeUploadTask(upload, file, true);
          } else {
            setUploads((prev) => prev.map((item) => (
              item.id === upload.id ? { ...item, status: 'error' } : item
            )));
            addToast(error.message || BACKEND_SERVER_ERROR_MESSAGE, 'error');
          }
        });
        return;
      }
      setUploads((prev) => prev.map((item) => (
        item.id === upload.id ? { ...item, status: 'error' } : item
      )));
      addToast(error.message || BACKEND_SERVER_ERROR_MESSAGE, 'error');
      logFez('Upload request could not resolve backend URL', error.message);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (shouldSendNgrokHeader(url)) xhr.setRequestHeader('ngrok-skip-browser-warning', '69420');
    if (token && String(userid) !== '0') xhr.setRequestHeader('auth', token);

    activeXHRs.current[upload.id] = xhr;
    logFez('Upload request started', { url, filename: upload.name, isRetry });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      setUploads((prev) => prev.map((item) => (
        item.id === upload.id ? { ...item, progress } : item
      )));
    };

    const handleNetworkOrBackendError = async (defaultErrorMsg) => {
      delete activeXHRs.current[upload.id];
      if (!isRetry) {
        const newUrl = await tryResolveBackendUrl(token);
        if (newUrl) {
          logFez('Re-resolved backend URL after file upload network/server error, retrying', newUrl);
          executeUploadTask(upload, file, true);
          return;
        }
      }
      setUploads((prev) => prev.map((item) => (
        item.id === upload.id ? { ...item, status: 'error' } : item
      )));
      addToast(defaultErrorMsg, 'error');
      logFez('Upload request failed permanently', { url, filename: upload.name, errorMsg: defaultErrorMsg });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        delete activeXHRs.current[upload.id];
        setUploads((prev) => prev.map((item) => (
          item.id === upload.id ? { ...item, status: 'success', progress: 100 } : item
        )));
        addToast(`Uploaded "${upload.name}".`, 'success');
        refreshStructureAfterMutation(userid, 'upload');
        return;
      }

      if (xhr.status === 0 || xhr.status === 502 || xhr.status === 503 || xhr.status === 504) {
        handleNetworkOrBackendError(`${BACKEND_SERVER_ERROR_MESSAGE} Upload failed for "${upload.name}".`);
        return;
      }

      delete activeXHRs.current[upload.id];
      let errorMsg = 'Upload failed.';
      try {
        const response = JSON.parse(xhr.responseText);
        errorMsg = response.return || response.message || errorMsg;
      } catch {}
      setUploads((prev) => prev.map((item) => (
        item.id === upload.id ? { ...item, status: 'error' } : item
      )));
      addToast(`Upload failed for "${upload.name}": ${errorMsg}`, 'error');
      logFez('Upload request failed', { url, status: xhr.status, errorMsg });
    };

    xhr.onerror = () => {
      handleNetworkOrBackendError(`${BACKEND_SERVER_ERROR_MESSAGE} Upload failed for "${upload.name}".`);
    };

    xhr.send(formData);
  }, [userid, addToast]);

  const startUpload = useCallback((file, directory) => {
    const uploadName = file.webkitRelativePath || file.name;
    const uploadDir = directory || '/';

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const upload = {
      id,
      name: uploadName,
      directory: uploadDir,
      progress: 0,
      status: 'uploading',
    };

    setUploads((prev) => {
      const isDuplicate = prev.some(
        (u) => u.name === uploadName && u.directory === uploadDir && u.status === 'uploading'
      );
      if (isDuplicate) {
        addToast(`"${uploadName}" is already uploading.`, 'info');
        return prev;
      }

      executeUploadTask(upload, file);
      return [upload, ...prev];
    });
    setIsOpen(true);
  }, [addToast, executeUploadTask]);

  const executeFolderUploadTask = useCallback((upload, fileList, isRetry = false) => {
    const formData = new FormData();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const uploadDirectory = upload.directory || '/';
    const rootName = upload.name;
    let url = '';

    try {
      url = buildBackendUrl(`uploadfolder/${userid}/`);
      if (isMainServerUrl(url)) {
        throw new Error(BACKEND_SERVER_ERROR_MESSAGE);
      }
      formData.append('directory', uploadDirectory);
      fileList.forEach((file) => {
        formData.append('files', file, file.webkitRelativePath || file.name);
      });
    } catch (error) {
      if (!isRetry) {
        tryResolveBackendUrl(token).then((newUrl) => {
          if (newUrl) {
            logFez('Re-resolved backend URL before folder upload after build error', newUrl);
            executeFolderUploadTask(upload, fileList, true);
          } else {
            setUploads((prev) => prev.map((item) => (
              item.id === upload.id ? { ...item, status: 'error' } : item
            )));
            addToast(error.message || BACKEND_SERVER_ERROR_MESSAGE, 'error');
          }
        });
        return;
      }
      setUploads((prev) => prev.map((item) => (
        item.id === upload.id ? { ...item, status: 'error' } : item
      )));
      addToast(error.message || BACKEND_SERVER_ERROR_MESSAGE, 'error');
      logFez('Folder upload request could not resolve backend URL', error.message);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (shouldSendNgrokHeader(url)) xhr.setRequestHeader('ngrok-skip-browser-warning', '69420');
    if (token && String(userid) !== '0') xhr.setRequestHeader('auth', token);

    activeXHRs.current[upload.id] = xhr;
    logFez('Folder upload request started', { url, fileCount: fileList.length, folder: rootName, isRetry });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      setUploads((prev) => prev.map((item) => (
        item.id === upload.id ? { ...item, progress } : item
      )));
    };

    const handleNetworkOrBackendError = async (defaultErrorMsg) => {
      delete activeXHRs.current[upload.id];
      if (!isRetry) {
        const newUrl = await tryResolveBackendUrl(token);
        if (newUrl) {
          logFez('Re-resolved backend URL after folder upload network/server error, retrying', newUrl);
          executeFolderUploadTask(upload, fileList, true);
          return;
        }
      }
      setUploads((prev) => prev.map((item) => (
        item.id === upload.id ? { ...item, status: 'error' } : item
      )));
      addToast(defaultErrorMsg, 'error');
      logFez('Folder upload request failed permanently', { url, folder: rootName, errorMsg: defaultErrorMsg });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        delete activeXHRs.current[upload.id];
        setUploads((prev) => prev.map((item) => (
          item.id === upload.id ? { ...item, status: 'success', progress: 100 } : item
        )));
        addToast(`Uploaded folder "${rootName}".`, 'success');
        refreshStructureAfterMutation(userid, 'upload-folder');
        return;
      }

      if (xhr.status === 0 || xhr.status === 502 || xhr.status === 503 || xhr.status === 504) {
        handleNetworkOrBackendError(`${BACKEND_SERVER_ERROR_MESSAGE} Upload failed for "${rootName}".`);
        return;
      }

      delete activeXHRs.current[upload.id];
      let errorMsg = 'Folder upload failed.';
      try {
        const response = JSON.parse(xhr.responseText);
        errorMsg = response.return || response.message || errorMsg;
      } catch {}
      setUploads((prev) => prev.map((item) => (
        item.id === upload.id ? { ...item, status: 'error' } : item
      )));
      addToast(`Upload failed for "${rootName}": ${errorMsg}`, 'error');
      logFez('Folder upload request failed', { url, status: xhr.status, errorMsg });
    };

    xhr.onerror = () => {
      handleNetworkOrBackendError(`${BACKEND_SERVER_ERROR_MESSAGE} Upload failed for "${rootName}".`);
    };

    xhr.send(formData);
  }, [userid, addToast]);

  const startFolderUpload = useCallback((files, directory) => {
    const fileList = Array.from(files || []);
    if (fileList.length === 0) return;

    const rootName = fileList[0]?.webkitRelativePath?.split('/')?.[0] || 'Folder';
    const uploadDir = directory || '/';

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const upload = {
      id,
      name: rootName,
      directory: uploadDir,
      progress: 0,
      status: 'uploading',
    };

    setUploads((prev) => {
      const isDuplicate = prev.some(
        (u) => u.name === rootName && u.directory === uploadDir && u.status === 'uploading'
      );
      if (isDuplicate) {
        addToast(`Folder "${rootName}" is already uploading.`, 'info');
        return prev;
      }

      executeFolderUploadTask(upload, fileList);
      return [upload, ...prev];
    });
    setIsOpen(true);
  }, [addToast, executeFolderUploadTask]);

  useEffect(() => {
    const handleTrigger = (event) => {
      const { files, directory, isFolderUpload } = event.detail;
      if (isFolderUpload) {
        startFolderUpload(files, directory);
        return;
      }
      files.forEach((file) => startUpload(file, directory));
    };

    window.addEventListener('nascloud-upload-trigger', handleTrigger);
    return () => window.removeEventListener('nascloud-upload-trigger', handleTrigger);
  }, [startFolderUpload, startUpload]);

  useEffect(() => {
    if (uploads.length > 0 && uploads.every((item) => item.status !== 'uploading')) {
      const timer = setTimeout(() => {
        setUploads([]);
        setIsOpen(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [uploads]);

  if (uploads.length === 0) return null;

  const totalUploading = uploads.filter((upload) => upload.status === 'uploading').length;

  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
      <div className={styles.header}>
        <div 
          className={styles.headerToggle} 
          onClick={() => setIsOpen((prev) => !prev)}
          title={isOpen ? 'Collapse panel' : 'Expand panel'}
        >
          <span className={styles.title}>
            {totalUploading > 0 ? `Uploading ${totalUploading} file(s)` : 'Uploads completed'}
          </span>
          {isOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronUp size={16} aria-hidden="true" />}
        </div>
        {totalUploading === 0 && (
          <button
            className={styles.dismissBtn}
            onClick={(e) => {
              e.stopPropagation();
              setUploads([]);
              setIsOpen(false);
            }}
            title="Dismiss"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className={styles.list}>
          {uploads.map((upload) => (
            <div key={upload.id} className={styles.item}>
              <div className={styles.meta}>
                <span className={styles.name} title={upload.name}>{upload.name}</span>
                {upload.status === 'uploading' ? (
                  <button className={styles.cancelBtn} onClick={() => cancelUpload(upload.id)} title="Cancel upload">
                    <X size={14} aria-hidden="true" />
                  </button>
                ) : upload.status === 'success' ? (
                  <Check className={styles.successIcon} size={15} aria-hidden="true" />
                ) : (
                  <AlertTriangle className={styles.errorIcon} size={15} aria-hidden="true" />
                )}
              </div>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${upload.status === 'error' ? styles.errorFill : ''}`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              <div className={styles.info}>
                <span>{upload.progress}%</span>
                <span>{upload.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
