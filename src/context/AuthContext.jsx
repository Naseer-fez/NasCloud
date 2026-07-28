import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AUTH_TOKEN_KEY, AUTH_USER_ID_KEY, MAIN_ACCESS_CODE_KEY, MAIN_TOKEN_KEY } from '../config';
import { API_BASE_URL } from '../config';
import { centralResolve } from '../api/centralServer';
import { saveBackendUrl } from '../api/backendUrl';
import { logFez } from '../utils/testLogger';

const AuthContext = createContext(null);

const initialState = {
  token: null,
  userid: null,
  isAuthenticated: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        token: action.payload.token,
        userid: action.payload.userid,
        isAuthenticated: true,
      };
    case 'LOGOUT':
      return { ...initialState };
    case 'UPDATE_AUTH':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState, () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userid = localStorage.getItem(AUTH_USER_ID_KEY);
    if (token && userid) {
      return {
        token,
        userid: parseInt(userid, 10),
        isAuthenticated: true,
      };
    }
    return initialState;
  });

  useEffect(() => {
    if (state.isAuthenticated) {
      localStorage.setItem(AUTH_TOKEN_KEY, state.token);
      localStorage.setItem(AUTH_USER_ID_KEY, String(state.userid));
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_ID_KEY);
    }
  }, [state.isAuthenticated, state.token, state.userid]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logFez('Auth provider received unauthorized event');
      dispatch({ type: 'LOGOUT' });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshBackendUrl = async () => {
      if (!state.isAuthenticated) return;

      const accessCode = localStorage.getItem(MAIN_ACCESS_CODE_KEY);
      if (!accessCode) return;

      try {
        const mainToken = localStorage.getItem(MAIN_TOKEN_KEY) || state.token || '';
        const result = await centralResolve(API_BASE_URL, accessCode, mainToken);
        if (cancelled || !result?.server_url) return;
        const savedUrl = saveBackendUrl(result.server_url);
        logFez('Refreshed backend URL on app startup', { savedUrl });
      } catch (error) {
        if (!cancelled) {
          logFez('Failed to refresh backend URL on startup', error.message);
        }
      }
    };

    refreshBackendUrl();

    return () => {
      cancelled = true;
    };
  }, [state.isAuthenticated, state.token]);

  const login = (token, userid) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_ID_KEY, String(userid));
    dispatch({ type: 'LOGIN', payload: { token, userid } });
  };

  const logout = () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    dispatch({ type: 'LOGOUT' });
  };

  const updateAuth = (payload) => {
    dispatch({ type: 'UPDATE_AUTH', payload });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
