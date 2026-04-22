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
        
        // 登录成功后的处理（异步，不阻塞UI）
        setTimeout(async () => {
          try {
            // 1. 检查是否有本地未同步的片段
            const localSnippets = await window.electron.ipcRenderer.invoke('snippet:list');
            const unsyncedSnippets = localSnippets.filter((s: any) => !s.cloud_id && !s.deleted_at);
            
            if (unsyncedSnippets.length > 0) {
              // 提示用户是否迁移本地片段
              const shouldMigrate = confirm(
                `检测到 ${unsyncedSnippets.length} 个本地片段尚未同步到云端。\n\n` +
                `是否将这些片段迁移到您的账户？\n\n` +
                `• 点击"确定"：将本地片段同步到云端（推荐）\n` +
                `• 点击"取消"：保留本地片段，不影响使用`
              );
              
              if (shouldMigrate) {
                console.log('[Auth] Migrating local snippets to cloud...');
                // 执行推送，将本地片段上传到云端
                const pushResult = await window.electron.ipcRenderer.invoke('sync:push');
                if (pushResult.success && pushResult.data.pushed > 0) {
                  console.log(`[Auth] Successfully migrated ${pushResult.data.pushed} snippets`);
                  alert(`✓ 成功迁移 ${pushResult.data.pushed} 个片段到云端！`);
                } else if (pushResult.success) {
                  console.log('[Auth] No snippets to migrate');
                } else {
                  console.error('[Auth] Migration failed:', pushResult.error);
                  alert('⚠ 片段迁移失败: ' + pushResult.error);
                }
              }
            }
            
            // 2. 拉取云端片段（合并到本地）
            console.log('[Auth] Pulling cloud snippets...');
            const pullResult = await window.electron.ipcRenderer.invoke('sync:pull');
            if (pullResult.success) {
              console.log(`[Auth] Successfully pulled ${pullResult.data.pulled} snippets from cloud`);
            }
            
            // 3. 触发片段列表刷新
            console.log('[Auth] Triggering snippets refresh...');
            window.dispatchEvent(new Event('snippets-refresh'));
          } catch (error) {
            console.error('[Auth] Login post-processing failed:', error);
          }
        }, 300);
        
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
          // 注册成功后自动登录（会触发登录后的迁移逻辑）
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
    
    // 退出登录后刷新片段列表（显示本地片段）
    setTimeout(() => {
      console.log('[Auth] Triggering snippets refresh after logout...');
      window.dispatchEvent(new Event('snippets-refresh'));
    }, 100);
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
