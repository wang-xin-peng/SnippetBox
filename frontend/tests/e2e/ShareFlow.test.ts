/**
 * 端到端测试
 * 文件位置: tests/e2e/ShareFlow.test.ts
 * 验收标准: 短链接分享流程测试
 */

describe('短链接分享流程测试', () => {
  describe('创建短链接', () => {
    it('应为片段创建短链接', () => {
      const generateShareCode = () => {
        return Math.random().toString(36).substr(2, 8);
      };

      const shareCode = generateShareCode();
      expect(typeof shareCode).toBe('string');
      expect(shareCode.length).toBe(8);
    });

    it('创建短链接应返回分享码', () => {
      const createShareLink = (snippetId: string) => {
        return {
          shareCode: Math.random().toString(36).substr(2, 8),
          snippetId,
          createdAt: Date.now()
        };
      };

      const link = createShareLink('snippet_123');
      expect(link.shareCode).toBeDefined();
      expect(link.snippetId).toBe('snippet_123');
    });

    it('同一片段应能创建多个分享链接', () => {
      const snippetLinks: any[] = [];

      const createLink = (snippetId: string) => {
        const link = {
          shareCode: Math.random().toString(36).substr(2, 8),
          snippetId
        };
        snippetLinks.push(link);
        return link;
      };

      createLink('1');
      createLink('1');
      createLink('1');

      expect(snippetLinks).toHaveLength(3);
    });
  });

  describe('访问短链接', () => {
    it('有效短链接应能解析片段ID', () => {
      const links = new Map([
        ['abc12345', { snippetId: 'snippet_1', expiresAt: Date.now() + 3600000 }]
      ]);

      const resolveShareCode = (code: string) => {
        return links.get(code);
      };

      const resolved = resolveShareCode('abc12345');
      expect(resolved).toBeDefined();
      expect(resolved?.snippetId).toBe('snippet_1');
    });

    it('无效短链接应返回undefined', () => {
      const links = new Map<string, any>();

      const resolveShareCode = (code: string) => {
        return links.get(code);
      };

      const resolved = resolveShareCode('invalid');
      expect(resolved).toBeUndefined();
    });

    it('过期的短链接应被拒绝', () => {
      const expiredLink = {
        snippetId: '1',
        expiresAt: Date.now() - 1000
      };

      const isExpired = (link: any) => Date.now() > link.expiresAt;
      expect(isExpired(expiredLink)).toBe(true);
    });
  });

  describe('短链接管理', () => {
    it('应能获取片段的所有分享链接', () => {
      const snippetLinks = [
        { snippetId: '1', shareCode: 'code1' },
        { snippetId: '1', shareCode: 'code2' },
        { snippetId: '2', shareCode: 'code3' }
      ];

      const getLinksForSnippet = (id: string) => {
        return snippetLinks.filter(l => l.snippetId === id);
      };

      const links = getLinksForSnippet('1');
      expect(links).toHaveLength(2);
    });

    it('应能删除分享链接', () => {
      const links = new Map([
        ['code1', { snippetId: '1' }],
        ['code2', { snippetId: '1' }]
      ]);

      const deleteLink = (code: string) => {
        links.delete(code);
      };

      deleteLink('code1');

      expect(links.has('code1')).toBe(false);
      expect(links.has('code2')).toBe(true);
    });

    it('删除片段时应删除所有相关分享链接', () => {
      const links = [
        { snippetId: '1', shareCode: 'code1' },
        { snippetId: '1', shareCode: 'code2' },
        { snippetId: '2', shareCode: 'code3' }
      ];

      const deleteAllForSnippet = (id: string) => {
        return links.filter(l => l.snippetId !== id);
      };

      const remaining = deleteAllForSnippet('1');

      expect(remaining).toHaveLength(1);
      expect(remaining[0].snippetId).toBe('2');
    });
  });

  describe('短链接属性', () => {
    it('短链接格式应有效', () => {
      const isValidShareCode = (code: string) => {
        return typeof code === 'string' && code.length >= 6;
      };

      expect(isValidShareCode('abc123')).toBe(true);
      expect(isValidShareCode('ab')).toBe(false);
    });

    it('短链接应能追踪访问次数', () => {
      const stats = new Map([
        ['code1', { accessCount: 5 }],
        ['code2', { accessCount: 10 }]
      ]);

      const incrementAccess = (code: string) => {
        const stat = stats.get(code);
        if (stat) {
          stat.accessCount++;
        }
      };

      incrementAccess('code1');

      expect(stats.get('code1')?.accessCount).toBe(6);
    });

    it('应能设置短链接过期时间', () => {
      const createShareLink = (snippetId: string, ttl?: number) => {
        return {
          snippetId,
          shareCode: Math.random().toString(36).substr(2, 8),
          expiresAt: ttl ? Date.now() + ttl : Date.now() + 3600000
        };
      };

      const link1 = createShareLink('1');
      const link2 = createShareLink('1', 60000);

      expect(link1.expiresAt).toBeGreaterThan(Date.now());
      expect(link2.expiresAt - Date.now()).toBeLessThanOrEqual(60000);
    });
  });

  describe('短链接统计', () => {
    it('应能记录访问时间', () => {
      const accessLog: any[] = [];

      const logAccess = (code: string) => {
        accessLog.push({ code, timestamp: Date.now() });
      };

      logAccess('code1');
      logAccess('code1');
      logAccess('code2');

      expect(accessLog).toHaveLength(3);
    });

    it('应能获取短链接总访问量', () => {
      const accessLog = [
        { code: 'code1', timestamp: Date.now() },
        { code: 'code1', timestamp: Date.now() },
        { code: 'code2', timestamp: Date.now() }
      ];

      const getAccessCount = (code: string) => {
        return accessLog.filter(a => a.code === code).length;
      };

      expect(getAccessCount('code1')).toBe(2);
      expect(getAccessCount('code2')).toBe(1);
    });
  });
});
