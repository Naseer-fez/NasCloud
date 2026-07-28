import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AUTH_TOKEN_KEY, ALLOW_USERS_KEY, MAIN_TOKEN_KEY } from '../../config';
import { BACKEND_SERVER_ERROR_MESSAGE, getBackendUrl, hasBackendUrl } from '../../api/backendUrl';
import { logFez } from '../../utils/testLogger';
import styles from './ClientRegister.module.css';

export default function ClientRegister() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const allowUsers = localStorage.getItem(ALLOW_USERS_KEY);
    if (!hasBackendUrl() || allowUsers !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const backendUrl = getBackendUrl();
      const body = { username, password };
      if (email.trim()) body.email = email;

      let response;
      try {
        response = await fetch(`${backendUrl}/createaccount/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' },
          body: JSON.stringify(body),
        });
      } catch (error) {
        logFez('Client registration backend request failed', { backendUrl, error: error.message });
        throw new Error(BACKEND_SERVER_ERROR_MESSAGE);
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.return || 'Registration failed.');
      }

      // After successful client registration, log into the client backend
      let loginRes;
      try {
        loginRes = await fetch(`${backendUrl}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' },
          body: JSON.stringify({ username, password }),
        });
      } catch (error) {
        logFez('Client login backend request failed', { backendUrl, error: error.message });
        throw new Error(BACKEND_SERVER_ERROR_MESSAGE);
      }

      if (!loginRes.ok) {
        throw new Error('Account created but login failed. Please try logging in manually.');
      }

      const loginData = await loginRes.json();
      login(loginData.return, loginData.userid ?? 1);
      addToast('Account created successfully!', 'success');
      logFez('Client registration completed', { backendUrl, userid: loginData.userid ?? 1 });
      navigate('/');
    } catch (err) {
      logFez('Client registration failed', err.message);
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Use default user — the token from the main server login is already stored
    const token = localStorage.getItem(MAIN_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      login(token, 1);
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.brandHeader}>
          <span className={styles.logo}>👤</span>
          <h1>Create Your Account</h1>
          <p className={styles.subtitle}>Register to access this PersonalDrive server</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email (Optional)</label>
            <input
              type="email"
              className={styles.input}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}

          <button type="submit" className={styles.primaryBtn} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account & Enter'}
          </button>
        </form>

        <div className={styles.skipSection}>
          <button type="button" onClick={handleSkip} className={styles.skipBtn}>
            Skip — Continue as default user
          </button>
        </div>
      </div>
    </div>
  );
}
