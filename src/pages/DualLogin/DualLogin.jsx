import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL, ALLOW_USERS_KEY, AUTH_TOKEN_KEY, MAIN_USERNAME_KEY, MAIN_PASSWORD_KEY, MAIN_API_KEY_STORAGE, MAIN_ACCESS_CODE_KEY, SINGLE_USER_ID } from '../../config';
import { saveBackendUrl } from '../../api/backendUrl';
import { logFez } from '../../utils/testLogger';
import styles from './DualLogin.module.css';

export default function DualLogin() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState('access');

  // Access Drive state
  const [accessCode, setAccessCode] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');

  // Admin Registration state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Admin Login state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Handle Access Drive submit
  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setAccessError('Please enter your access code.');
      return;
    }

    setAccessLoading(true);
    setAccessError('');

    try {
      // 1. Authenticate via Main Server
      const queryParams = new URLSearchParams({ code: accessCode.trim() });
      if (accessPassword) {
        queryParams.append('userpassword', accessPassword);
      }

      const loginRes = await fetch(`${API_BASE_URL}/login/url/?${queryParams.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!loginRes.ok) {
        const errData = await loginRes.json().catch(() => ({}));
        throw new Error(errData.return || 'Authentication failed. Invalid code or password.');
      }
      const loginData = await loginRes.json();
      const token = loginData.return;

      // 2. Get backend URL
      const urlRes = await fetch(`${API_BASE_URL}/url/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'code': accessCode.trim(),
          'auth': token
        }
      });

      if (!urlRes.ok) {
        const errData = await urlRes.json().catch(() => ({}));
        throw new Error(errData.return || 'Failed to retrieve server URL.');
      }
      const urlData = await urlRes.json();
      const backendUrl = saveBackendUrl(urlData.url);
      const allowUsers = urlData.allowusers !== undefined ? urlData.allowusers : true;

      // 3. Store backend URL and allowusers flag
      localStorage.setItem(MAIN_ACCESS_CODE_KEY, accessCode.trim());
      localStorage.setItem(ALLOW_USERS_KEY, String(!!allowUsers));
      logFez('Main server resolved backend URL', { backendUrl, allowUsers });

      if (allowUsers) {
        // Multi-user mode: redirect to client registration
        // Store token temporarily for the client-register page
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        navigate('/client-register');
      } else {
        // Single-user mode: log in directly
        login(token, SINGLE_USER_ID);
        addToast('Welcome to your drive!', 'success');
        navigate('/');
      }
    } catch (err) {
      logFez('Access drive failed', err.message);
      setAccessError(err.message || 'Access verification failed.');
    } finally {
      setAccessLoading(false);
    }
  };

  // Handle Admin Registration submit
  const handleRegSubmit = async (e) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      setRegError('All fields are required for registration.');
      return;
    }

    setRegLoading(true);
    setRegError('');

    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.return || 'Registration failed.');
      }

      const data = await response.json();

      // Store session info & credentials from structured JSON response
      localStorage.setItem(MAIN_USERNAME_KEY, regUsername);
      localStorage.setItem(MAIN_PASSWORD_KEY, regPassword);
      localStorage.setItem(MAIN_API_KEY_STORAGE, data.api_key || '');
      localStorage.setItem(MAIN_ACCESS_CODE_KEY, data.code || '');

      addToast('Registration successful! Redirecting to dashboard...', 'success');
      navigate('/dashboard');
    } catch (err) {
      logFez('Admin registration failed', err.message);
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  // Handle Admin Login submit
  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) {
      setAdminError('Please enter username and password.');
      return;
    }

    setAdminLoading(true);
    setAdminError('');

    try {
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.return || 'Login failed.');
      }

      const data = await response.json();

      // Store session info & credentials from structured JSON response
      localStorage.setItem(MAIN_USERNAME_KEY, adminUsername);
      localStorage.setItem(MAIN_PASSWORD_KEY, adminPassword);
      localStorage.setItem(MAIN_API_KEY_STORAGE, data.api_key || '');
      localStorage.setItem(MAIN_ACCESS_CODE_KEY, data.code || '');

      addToast('Admin login successful! Redirecting to dashboard...', 'success');
      navigate('/dashboard');
    } catch (err) {
      logFez('Admin login failed', err.message);
      setAdminError(err.message || 'Login failed.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Link to="/home" className={styles.homeLink}>← Back to Home</Link>
      
      {/* Top Toggle Switch */}
      <div className={styles.switchBox}>
        <label className={styles.switch}>
          <input
            type="checkbox"
            className={styles.toggle}
            checked={mode === 'admin' || mode === 'register'}
            onChange={(e) => setMode(e.target.checked ? 'admin' : 'access')}
          />
          <span className={styles.slider}></span>
          <span className={styles.cardSide}></span>
        </label>
      </div>

      <div className={styles.singleWrapper}>
        <div className={`${styles.flipCardInner} ${mode === 'admin' || mode === 'register' ? styles.flipped : ''}`}>
          
          {/* FRONT SIDE (User / Access Drive) */}
          <div className={styles.flipCardFront}>
            <div className={styles.formContent}>
              <div className={styles.brandHeader}>
                <img src="/nascloud.svg" alt="NasCloud Logo" className={styles.logoImg} />
                <h1>Access Drive</h1>
              </div>

              <div className={styles.formWrapper}>
                <h2 className={styles.paneTitle}>Secure Drive Access</h2>
                <p className={styles.paneSubtitle}>Enter the access code provided by the server owner</p>

                <form onSubmit={handleAccessSubmit}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Access Code</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Enter your server access code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      disabled={accessLoading}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Password (Optional)</label>
                    <input
                      type="password"
                      className={styles.input}
                      placeholder="••••••••"
                      value={accessPassword}
                      onChange={(e) => setAccessPassword(e.target.value)}
                      disabled={accessLoading}
                    />
                  </div>

                  {accessError && <p className={styles.errorMessage}>{accessError}</p>}

                  <button type="submit" className={styles.primaryBtn} disabled={accessLoading}>
                    {accessLoading ? 'Connecting...' : 'Access Drive'}
                  </button>

                  <div className={styles.toggleText}>
                    <button type="button" onClick={() => navigate('/forgot-code')} className={styles.inlineBtn}>
                      Forgot your code?
                    </button>
                  </div>
                </form>
              </div>

              <div className={styles.switchModeBox}>
                <button type="button" onClick={() => setMode('admin')} className={styles.glowBtn}>
                  Admin Login
                </button>
              </div>
            </div>
          </div>

          {/* BACK SIDE (Admin Login or Admin Register) */}
          <div className={styles.flipCardBack}>
            {mode === 'register' ? (
              <div className={styles.formContent}>
                <div className={styles.brandHeader}>
                  <img src="/nascloud.svg" alt="NasCloud Logo" className={styles.logoImg} />
                  <h1>Admin Registration</h1>
                </div>

                <div className={styles.formWrapper}>
                  <h2 className={styles.paneTitle}>Create Owner Account</h2>
                  <p className={styles.paneSubtitle}>Sign up to the Central Server to generate API Keys</p>

                  <form onSubmit={handleRegSubmit}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Username</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Admin username"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        disabled={regLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Email Address</label>
                      <input
                        type="email"
                        className={styles.input}
                        placeholder="name@domain.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        disabled={regLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Password</label>
                      <input
                        type="password"
                        className={styles.input}
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={regLoading}
                      />
                    </div>

                    {regError && <p className={styles.errorMessage}>{regError}</p>}

                    <button type="submit" className={styles.primaryBtn} disabled={regLoading}>
                      {regLoading ? 'Registering...' : 'Create Account'}
                    </button>

                    <div className={styles.toggleText}>
                      <span>Already have an account? <button type="button" onClick={() => setMode('admin')} className={styles.inlineBtn}>Sign In</button></span>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className={styles.formContent}>
                <div className={styles.brandHeader}>
                  <img src="/nascloud.svg" alt="NasCloud Logo" className={styles.logoImg} />
                  <h1>Admin Login</h1>
                </div>

                <div className={styles.formWrapper}>
                  <h2 className={styles.paneTitle}>Server Administrator</h2>
                  <p className={styles.paneSubtitle}>Sign in to your Central Server Dashboard</p>

                  <form onSubmit={handleAdminLoginSubmit}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Username</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Admin username"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        disabled={adminLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Password</label>
                      <input
                        type="password"
                        className={styles.input}
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        disabled={adminLoading}
                      />
                    </div>

                    {adminError && <p className={styles.errorMessage}>{adminError}</p>}

                    <button type="submit" className={styles.primaryBtn} disabled={adminLoading}>
                      {adminLoading ? 'Logging in...' : 'Login to Dashboard'}
                    </button>

                    <div className={styles.toggleText}>
                      <span>New to PersonalDrive? <button type="button" onClick={() => setMode('register')} className={styles.inlineBtn}>Register</button></span>
                    </div>
                  </form>
                </div>

                <div className={styles.switchModeBox}>
                  <button type="button" onClick={() => setMode('access')} className={styles.secondaryBtn}>
                    Are you a User?
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
