/**
 * 短链接服务单元测试
 * 文件位置: tests/unit/ShareService.test.ts
 */

import { ShareService } from '../../src/main/services/ShareService';

// 模拟 fetch
(global as any).fetch = jest.fn();

// 模拟 AuthService
jest.mock('../../src/main/services/AuthService', () => {
  return {
    getAuthService: jest.fn().mockReturnValue({
      getAccessToken: jest.fn().mockReturnValue('test_token')
    })
  };
});

describe('ShareService', () => {
  let shareService: ShareService;

  beforeEach(() => {
    shareService = new ShareService();
    jest.clearAllMocks();
  });

  describe('createShare', () => {
    it('创建分享方法存在', () => {
      expect(shareService.createShare).toBeDefined();
      expect(typeof shareService.createShare).toBe('function');
    });
  });

  describe('listShares', () => {
    it('获取分享列表方法存在', () => {
      expect(shareService.listShares).toBeDefined();
      expect(typeof shareService.listShares).toBe('function');
    });
  });

  describe('deleteShare', () => {
    it('删除分享方法存在', () => {
      expect(shareService.deleteShare).toBeDefined();
      expect(typeof shareService.deleteShare).toBe('function');
    });
  });

  describe('getShare', () => {
    it('获取分享详情方法存在', () => {
      expect(shareService.getShare).toBeDefined();
      expect(typeof shareService.getShare).toBe('function');
    });
  });

  describe('getShareStats', () => {
    it('获取分享统计方法存在', () => {
      expect(shareService.getShareStats).toBeDefined();
      expect(typeof shareService.getShareStats).toBe('function');
    });
  });
});
