import { ipcMain } from 'electron';
import { getAuthService } from '../services/AuthService';

/** 将后端错误（可能是 Pydantic detail 数组或字符串）统一转为字符串 */
function extractError(err: any): string {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message ?? '未知错误';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join('；');
  }
  if (typeof detail === 'object') return detail.msg ?? JSON.stringify(detail);
  return String(detail);
}

export function registerAuthHandlers() {
  const auth = getAuthService();

  ipcMain.handle('auth:register', async (_e, email: string, password: string, username: string) => {
    try {
      await auth.register(email, password, username);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:login', async (_e, email: string, password: string, rememberMe = true) => {
    try {
      const result = await auth.login(email, password, rememberMe);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    try {
      await auth.logout();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:refresh', async () => {
    try {
      const token = await auth.refreshToken();
      return { success: true, accessToken: token };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:getCurrentUser', async () => {
    try {
      const user = await auth.getCurrentUser();
      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // 不发网络请求，直接返回缓存的用户信息（用于启动时快速恢复登录状态）
  ipcMain.handle('auth:getCachedUser', () => {
    const user = auth.getCachedUser();
    return { success: !!user, user };
  });

  ipcMain.handle('auth:isLoggedIn', () => {
    return { isLoggedIn: auth.isLoggedIn() };
  });

  ipcMain.handle('auth:getCapabilities', async () => {
    try {
      return { success: true, data: await auth.getCapabilities() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:sendCode', async (_e, email: string) => {
    try {
      return await auth.sendCode(email);
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:loginWithCode', async (_e, email: string, code: string) => {
    try {
      const result = await auth.loginWithCode(email, code);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:sendRegisterCode', async (_e, email: string) => {
    try {
      const result = await auth.sendRegisterCode(email);
      console.log('[AuthHandlers] sendRegisterCode result:', JSON.stringify(result));
      return result;
    } catch (err: any) {
      console.error('[AuthHandlers] sendRegisterCode error:', err);
      return { success: false, error: extractError(err) || '发送验证码失败' };
    }
  });

  ipcMain.handle('auth:verifyRegisterCode', async (_e, email: string, code: string, password: string, username: string) => {
    try {
      const result = await auth.verifyRegisterCode(email, code, password, username);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:sendResetCode', async (_e, email: string) => {
    try {
      return await auth.sendResetCode(email);
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:resetPassword', async (_e, email: string, code: string, newPassword: string) => {
    try {
      return await auth.resetPassword(email, code, newPassword);
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:updateUsername', async (_e, newUsername: string) => {
    try {
      return await auth.updateUsername(newUsername);
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:changePassword', async (_e, currentPassword: string, newPassword: string) => {
    try {
      return await auth.changePassword(currentPassword, newPassword);
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:deleteAccount', async () => {
    try {
      return await auth.deleteAccount();
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:deleteAccountSendCode', async (_event, email: string) => {
    console.log('[AuthHandlers] deleteAccountSendCode called, email:', email);
    try {
      const res = await auth.sendDeleteAccountCode(email);
      console.log('[AuthHandlers] sendDeleteAccountCode result:', JSON.stringify(res));
      if (!res.success) {
        return { success: false, error: res.error };
      }
      return { success: true };
    } catch (err: any) {
      console.error('[AuthHandlers] deleteAccountSendCode error:', err.message);
      return { success: false, error: extractError(err) };
    }
  });

  ipcMain.handle('auth:deleteAccountVerify', async (_event, email: string, code: string) => {
    try {
      const res = await auth.verifyDeleteAccountCode(email, code);
      if (!res.success) {
        return { success: false, error: res.error };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: extractError(err) };
    }
  });

  console.log('[AuthHandlers] Registered');
}
