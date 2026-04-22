/**
 * 任务 33.1: 认证服务单元测试
 * 文件位置: tests/unit/AuthService.test.ts
 */

// 模拟 Electron 模块
jest.mock('electron', () => ({
  safeStorage: {
    encryptString: jest.fn().mockReturnValue(Buffer.from('encrypted')),
    decryptString: jest.fn().mockReturnValue('decrypted'),
    isEncryptionAvailable: jest.fn().mockReturnValue(true)
  },
  app: {
    getPath: jest.fn().mockReturnValue('/tmp')
  }
}));

// 模拟 fs 和 path
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(null),
  writeFileSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('/tmp/auth_tokens')
}));

// 模拟 axios
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    post: jest.fn().mockResolvedValue({ data: {} }),
    get: jest.fn().mockResolvedValue({ data: {} })
  })
}));

import { AuthService } from '../../src/main/services/AuthService';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });

  describe('register', () => {
    it('注册方法存在且可调用', () => {
      expect(authService.register).toBeDefined();
      expect(typeof authService.register).toBe('function');
    });
  });

  describe('login', () => {
    it('登录方法存在且可调用', () => {
      expect(authService.login).toBeDefined();
      expect(typeof authService.login).toBe('function');
    });
  });

  describe('logout', () => {
    it('登出方法存在且可调用', () => {
      expect(authService.logout).toBeDefined();
      expect(typeof authService.logout).toBe('function');
    });
  });

  describe('refreshToken', () => {
    it('刷新令牌方法存在且可调用', () => {
      expect(authService.refreshToken).toBeDefined();
      expect(typeof authService.refreshToken).toBe('function');
    });
  });

  describe('令牌管理', () => {
    it('获取访问令牌方法存在', () => {
      expect(authService.getAccessToken).toBeDefined();
      expect(typeof authService.getAccessToken).toBe('function');
    });

    it('检查是否已登录方法存在', () => {
      expect(authService.isLoggedIn).toBeDefined();
      expect(typeof authService.isLoggedIn).toBe('function');
    });
  });

  describe('getCurrentUser', () => {
    it('获取当前用户方法存在', () => {
      expect(authService.getCurrentUser).toBeDefined();
      expect(typeof authService.getCurrentUser).toBe('function');
    });
  });
});
