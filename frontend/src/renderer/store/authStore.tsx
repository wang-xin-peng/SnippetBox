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
        // 优先用缓存，立即恢复登录状态，不阻塞启动
        const cached = await window.electron.ipcRenderer.invoke('auth:getCachedUser');
        if (cached.success && cached.user) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: cached.user });
          // 后台异步刷新用户信息，不阻塞 UI
          window.electron.ipcRenderer.invoke('auth:getCurrentUser').then((res: any) => {
            if (res.success && res.user) {
              dispatch({ type: 'SET_USER', payload: res.user });
            }
          }).catch(() => {});
        } else {
          // 没有缓存，尝试网络获取
          const res = await window.electron.ipcRenderer.invoke('auth:getCurrentUser');
          if (res.success && res.user) {
            dispatch({ type: 'LOGIN_SUCCESS', payload: res.user });
          } else {
            dispatch({ type: 'LOGOUT' });
          }
        }
      } else {
        // token 不在内存，尝试 refresh（有超时限制，失败就当未登录）
        const refreshRes = await window.electron.ipcRenderer.invoke('auth:refresh');
        if (refreshRes.success) {
          const cached = await window.electron.ipcRenderer.invoke('auth:getCachedUser');
          if (cached.success && cached.user) {
            dispatch({ type: 'LOGIN_SUCCESS', payload: cached.user });
          } else {
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          dispatch({ type: 'LOGOUT' });
        }
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
        (async () => {
          try {
            // 先触发界面刷新，让用户能立即使用
            window.dispatchEvent(new Event('snippets-refresh'));
            window.dispatchEvent(new Event('categories-refresh'));
            
            // 延迟 2 秒后再处理同步逻辑，确保 UI 完全可用
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 先同步分类/标签元数据
            await window.electron.ipcRenderer.invoke('sync:syncMetadata');
            window.dispatchEvent(new Event('categories-refresh'));
            
            // 1. 检查是否有本地片段
            const localSnippets = await window.electron.ipcRenderer.invoke('snippet:list');
            const localOnlySnippets = localSnippets.filter(
              (s: any) => (s.storageScope ?? 'local') === 'local' && !s.cloudId
            );
            
            if (localOnlySnippets.length > 0) {
              // 触发自定义对话框事件
              window.dispatchEvent(new CustomEvent('show-sync-dialog', { 
                detail: { count: localOnlySnippets.length } 
              }));
            } else {
              // 没有本地片段，清理可能残留的云端片段后拉取
              console.log('[Auth] Clearing stale cloud snippets before pull...');
              await window.electron.ipcRenderer.invoke('snippet:clearAll');
              console.log('[Auth] Pulling cloud snippets...');
              const pullResult = await window.electron.ipcRenderer.invoke('sync:pull');
              if (pullResult.success) {
                console.log(`[Auth] Successfully pulled ${pullResult.data?.pulled ?? 0} snippets from cloud`);
                // 对账：从片段的 category_name 重建缺失的分类
                await window.electron.ipcRenderer.invoke('sync:reconcileCategories');
                window.dispatchEvent(new Event('snippets-refresh'));
                window.dispatchEvent(new Event('categories-refresh'));
                // 异步为缺失向量的片段补全向量（不删已有，等模型就绪后执行）
                window.electron.ipcRenderer.invoke('embedding:generateMissingVectors').catch(() => {});
              }
            }
          } catch (error) {
            console.error('[Auth] Login post-processing failed:', error);
          }
        })();
        
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
    // 先触发刷新事件，让 UI 立即清空片段列表
    window.dispatchEvent(new Event('snippets-refresh'));

    // 等待进行中的元数据同步完成，避免登出后 token 失效导致同步失败
    window.electron.ipcRenderer.invoke('sync:waitForPendingSync').catch(() => {});

    await window.electron.ipcRenderer.invoke('auth:logout');
    // 注销时清除所有片段（包括本地片段），避免重新登录时数据恢复
    await window.electron.ipcRenderer.invoke('snippet:clearAll');
    dispatch({ type: 'LOGOUT' });
    
    // 刷新确保显示空白状态
    setTimeout(() => {
      console.log('[Auth] Triggering snippets refresh after logout...');
      window.dispatchEvent(new Event('snippets-refresh'));
      window.dispatchEvent(new Event('categories-refresh'));
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