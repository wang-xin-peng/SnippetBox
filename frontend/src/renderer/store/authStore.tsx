import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: User | null };

const initialState: AuthState = {
  isLoggedIn: false,
  user: null,
  loading: true,
  error: null,
};

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOGIN_SUCCESS':
      return { ...state, isLoggedIn: true, user: action.payload, error: null, loading: false };
    case 'LOGOUT':
      return { ...state, isLoggedIn: false, user: null, error: null, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_USER':
      return { ...state, user: action.payload, isLoggedIn: !!action.payload, loading: false };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 启动时检查登录状态
  const checkAuth = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { isLoggedIn } = await window.electron.ipcRenderer.invoke('auth:isLoggedIn');
      if (isLoggedIn) {
        const res = await window.electron.ipcRenderer.invoke('auth:getCurrentUser');
        if (res.success && res.user) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: res.user });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    } catch {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string, rememberMe = true): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const res = await window.electron.ipcRenderer.invoke('auth:login', email, password, rememberMe);
      if (res.success && res.data) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: res.data.user });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: res.error ?? '登录失败' });
        return false;
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      return false;
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, username: string): Promise<boolean> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      try {
        const res = await window.electron.ipcRenderer.invoke('auth:register', email, password, username);
        if (res.success) {
          // 注册成功后自动登录
          return login(email, password);
        } else {
          dispatch({ type: 'SET_ERROR', payload: res.error ?? '注册失败' });
          return false;
        }
      } catch (err: any) {
        dispatch({ type: 'SET_ERROR', payload: err.message });
        return false;
      }
    },
    [login]
  );

  const logout = useCallback(async () => {
    await window.electron.ipcRenderer.invoke('auth:logout');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, checkAuth, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
