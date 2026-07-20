import { AUTH_TOKEN_KEY, AUTH_USER_ID_KEY, MAIN_ACCESS_CODE_KEY } from '../config';
import { BACKEND_SERVER_ERROR_MESSAGE, buildBackendUrl, saveBackendUrl, isMainServerUrl } from './backendUrl';
import { API_BASE_URL } from '../config';
import { centralResolve } from './centralServer';
import { logFez } from '../utils/testLogger';

function shouldSendNgrokHeader(url) {
  try {
    return new URL(url).hostname.includes('ngrok');
  } catch {
    return false;
  }
}

function shouldSendAuthHeader() {
  return localStorage.getItem(AUTH_USER_ID_KEY) !== null;
}

function isBackendConnectionError(error) {
  if (!error) return false;
  if (error.name === 'AbortError' || error.message === 'Aborted') return false;
  const msg = String(error.message || error || '').toLowerCase();
  return (
    msg === BACKEND_SERVER_ERROR_MESSAGE.toLowerCase() ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('resolve the backend link') ||
    msg.includes('backend url missing')
  );
}

/**
 * Central API client for NasCloud.
 * Handles auth token inclusion, 401 redirects, blob formatting, and GET with bodies.
 */
export async function apiCall(path, options = {}) {
  const {
    method = 'GET',
    body = null,
    isPublic = false,
    isFormData = false,
    isBlob = false,
    extraHeaders = {},
    queryParams = '',
    signal = null,
  } = options;

  const executeRequest = async () => {
    const url = buildBackendUrl(path, queryParams);
    if (!isPublic && isMainServerUrl(url)) {
      logFez('Blocked attempt to send client request to main server', { path, url });
      throw new Error(BACKEND_SERVER_ERROR_MESSAGE);
    }
    logFez('PersonalDrive API request', { method, path, url, isPublic, isBlob });

    const headers = { ...extraHeaders };

    if (shouldSendNgrokHeader(url)) {
      headers['ngrok-skip-browser-warning'] = '69420';
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && shouldSendAuthHeader()) headers['auth'] = token;

    if (body && !isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = { method, headers };
    if (body) fetchOptions.body = isFormData ? body : JSON.stringify(body);
    if (signal) fetchOptions.signal = signal;

    if (method.toUpperCase() === 'GET' && body) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        if (isBlob) xhr.responseType = 'blob';
        Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

        if (signal) {
          if (signal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          signal.addEventListener('abort', () => {
            xhr.abort();
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }

        xhr.onload = async () => {
          if (!isPublic && xhr.status === 401) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_ID_KEY);
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            logFez('PersonalDrive API unauthorized response', { path, status: xhr.status });
            reject(new Error('Session expired. Please log in again.'));
            return;
          }

          if (xhr.status === 0 || xhr.status === 502 || xhr.status === 503 || xhr.status === 504) {
            logFez('PersonalDrive API XHR gateway/network error status', { path, status: xhr.status });
            reject(new Error(BACKEND_SERVER_ERROR_MESSAGE));
            return;
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            if (isBlob) {
              const responseHeaders = { get: (name) => xhr.getResponseHeader(name) };
              resolve({ blob: xhr.response, headers: responseHeaders, status: xhr.status });
            } else {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                resolve({});
              }
            }
          } else {
            let errorMsg = `Request failed (${xhr.status})`;
            try {
              const errorText = isBlob ? await xhr.response.text().catch(() => '') : xhr.responseText;
              const resp = JSON.parse(errorText);
              errorMsg = resp.return || resp.message || errorMsg;
            } catch {}
            logFez('PersonalDrive API error response', { path, status: xhr.status, errorMsg });
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => {
          logFez('PersonalDrive API network error', { path, url });
          reject(new Error(BACKEND_SERVER_ERROR_MESSAGE));
        };

        xhr.send(JSON.stringify(body));
      });
    }

    let response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (error) {
      if (error.name === 'AbortError' || (signal && signal.aborted)) {
        throw error;
      }
      logFez('PersonalDrive API fetch failed', { path, url, error: error.message });
      throw new Error(BACKEND_SERVER_ERROR_MESSAGE);
    }

    if (response.status === 0 || response.status === 502 || response.status === 503 || response.status === 504) {
      logFez('PersonalDrive API gateway/network error status', { path, status: response.status });
      throw new Error(BACKEND_SERVER_ERROR_MESSAGE);
    }

    if (!isPublic && response.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_ID_KEY);
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      logFez('PersonalDrive API unauthorized response', { path, status: response.status });
      throw new Error('Session expired. Please log in again.');
    }

    if (isBlob) {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.return || errorData.message || `Download failed (${response.status})`;
        logFez('PersonalDrive API download error', { path, status: response.status, errorMsg });
        throw new Error(errorMsg);
      }
      return {
        blob: await response.blob(),
        headers: response.headers,
        status: response.status,
      };
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.return || data.message || `Request failed (${response.status})`;
      logFez('PersonalDrive API error response', { path, status: response.status, errorMsg });
      throw new Error(errorMsg);
    }

    logFez('PersonalDrive API success', { path, status: response.status });
    return data;
  };

  try {
    return await executeRequest();
  } catch (error) {
    const shouldRetry = !isPublic && isBackendConnectionError(error);
    if (!shouldRetry) throw error;

    const accessCode = localStorage.getItem(MAIN_ACCESS_CODE_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!accessCode || !token) throw error;

    try {
      const resolved = await centralResolve(API_BASE_URL, accessCode, token);
      if (resolved?.server_url) {
        saveBackendUrl(resolved.server_url);
        logFez('Re-resolved backend URL after network failure', resolved.server_url);
        return await executeRequest();
      }
    } catch (retryError) {
      logFez('Backend URL retry failed', retryError.message);
    }

    throw error;
  }
}
