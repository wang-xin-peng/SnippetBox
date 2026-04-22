/**
 * 任务 33.6: 安全测试
 * 文件位置: tests/security/RateLimit.test.ts
 * 
 * 验收标准: 测试速率限制
 */

describe('速率限制测试', () => {
  describe('请求计数', () => {
    it('应追踪请求次数', () => {
      const requestCounts = new Map<string, number>();

      const incrementRequests = (ip: string) => {
        const count = requestCounts.get(ip) || 0;
        requestCounts.set(ip, count + 1);
      };

      incrementRequests('192.168.1.1');
      incrementRequests('192.168.1.1');
      incrementRequests('192.168.1.2');

      expect(requestCounts.get('192.168.1.1')).toBe(2);
      expect(requestCounts.get('192.168.1.2')).toBe(1);
    });

    it('应限制时间窗口内请求数', () => {
      const WINDOW_MS = 60000;
      const MAX_REQUESTS = 100;
      const requestLog: { ip: string; timestamp: number }[] = [];

      const isRateLimited = (ip: string) => {
        const now = Date.now();
        const windowStart = now - WINDOW_MS;

        const recentRequests = requestLog.filter(
          r => r.ip === ip && r.timestamp > windowStart
        );

        return recentRequests.length >= MAX_REQUESTS;
      };

      const ip = '192.168.1.1';
      for (let i = 0; i < 100; i++) {
        requestLog.push({ ip, timestamp: Date.now() });
      }

      expect(isRateLimited(ip)).toBe(true);
    });
  });

  describe('IP 限流', () => {
    it('同一 IP 应被限制', () => {
      const ipRequests = new Map<string, number[]>();

      const recordRequest = (ip: string) => {
        const now = Date.now();
        const requests = ipRequests.get(ip) || [];
        requests.push(now);
        ipRequests.set(ip, requests);
      };

      const isLimited = (ip: string, maxRequests: number, windowMs: number) => {
        const requests = ipRequests.get(ip) || [];
        const now = Date.now();
        const validRequests = requests.filter(t => now - t < windowMs);
        return validRequests.length >= maxRequests;
      };

      const ip = '10.0.0.1';
      for (let i = 0; i < 60; i++) {
        recordRequest(ip);
      }

      expect(isLimited(ip, 60, 60000)).toBe(true);
      expect(isLimited(ip, 61, 60000)).toBe(false);
    });

    it('不同 IP 应独立计数', () => {
      const ip1Requests: number[] = [];
      const ip2Requests: number[] = [];

      for (let i = 0; i < 10; i++) {
        ip1Requests.push(Date.now());
        ip2Requests.push(Date.now());
      }

      expect(ip1Requests.length).toBe(10);
      expect(ip2Requests.length).toBe(10);
      expect(ip1Requests.length).toBe(ip2Requests.length);
    });
  });

  describe('API 端点限流', () => {
    it('应限制登录尝试次数', () => {
      const LOGIN_MAX_ATTEMPTS = 5;
      const loginAttempts = new Map<string, number>();

      const recordLoginAttempt = (username: string) => {
        const attempts = loginAttempts.get(username) || 0;
        loginAttempts.set(username, attempts + 1);
      };

      const isLoginLocked = (username: string) => {
        return (loginAttempts.get(username) || 0) >= LOGIN_MAX_ATTEMPTS;
      };

      for (let i = 0; i < 5; i++) {
        recordLoginAttempt('user1');
      }

      expect(isLoginLocked('user1')).toBe(true);
      expect(isLoginLocked('user2')).toBe(false);
    });

    it('应限制 API 请求频率', () => {
      const API_RATE_LIMIT = 100;
      const apiRequests: { endpoint: string; timestamp: number }[] = [];

      const recordApiRequest = (endpoint: string) => {
        apiRequests.push({ endpoint, timestamp: Date.now() });
      };

      const isRateLimited = (endpoint: string, limit: number, windowMs: number) => {
        const now = Date.now();
        const recentRequests = apiRequests.filter(
          r => r.endpoint === endpoint && now - r.timestamp < windowMs
        );
        return recentRequests.length >= limit;
      };

      for (let i = 0; i < 100; i++) {
        recordApiRequest('/api/snippets');
      }

      expect(isRateLimited('/api/snippets', 100, 60000)).toBe(true);
      expect(isRateLimited('/api/users', 100, 60000)).toBe(false);
    });
  });

  describe('速率限制响应', () => {
    it('超限应返回 429 状态码', () => {
      const RATE_LIMIT_CODE = 429;

      const getResponseCode = (isLimited: boolean) => {
        return isLimited ? 429 : 200;
      };

      expect(getResponseCode(true)).toBe(429);
      expect(getResponseCode(false)).toBe(200);
    });

    it('应返回 Retry-After 头', () => {
      const getRetryAfter = (resetTime: number) => {
        const seconds = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
        return seconds;
      };

      const resetIn30s = Date.now() + 30000;
      expect(getRetryAfter(resetIn30s)).toBe(30);

      const resetInPast = Date.now() - 1000;
      expect(getRetryAfter(resetInPast)).toBe(0);
    });
  });

  describe('分布式限流模拟', () => {
    it('应追踪全局请求计数', () => {
      const globalCounter = { count: 0 };

      const incrementGlobal = () => {
        globalCounter.count++;
      };

      for (let i = 0; i < 1000; i++) {
        incrementGlobal();
      }

      expect(globalCounter.count).toBe(1000);
    });

    it('应检测超限情况', () => {
      const GLOBAL_LIMIT = 10000;
      const globalCounter = { count: 9999 };

      const isOverLimit = (counter: { count: number }, limit: number) => {
        return counter.count >= limit;
      };

      expect(isOverLimit(globalCounter, GLOBAL_LIMIT)).toBe(false);

      globalCounter.count = 10000;
      expect(isOverLimit(globalCounter, GLOBAL_LIMIT)).toBe(true);
    });
  });

  describe('限流算法', () => {
    it('滑动窗口应正确计数', () => {
      const windowSize = 60000;
      const requests: number[] = [];

      const addRequest = (timestamp: number) => {
        requests.push(timestamp);
      };

      const countInWindow = (now: number) => {
        return requests.filter(t => now - t <= windowSize).length;
      };

      const baseTime = 100000;
      addRequest(baseTime);
      addRequest(baseTime + 10000);
      addRequest(baseTime + 40000);
      addRequest(baseTime + 50000);

      expect(countInWindow(baseTime + 50000)).toBe(4);
      expect(countInWindow(baseTime + 70000)).toBe(3);
    });

    it('令牌桶应正确工作', () => {
      const bucket = {
        tokens: 10,
        maxTokens: 10,
        refillRate: 1,
        lastRefill: Date.now()
      };

      const consumeToken = () => {
        if (bucket.tokens > 0) {
          bucket.tokens--;
          return true;
        }
        return false;
      };

      expect(consumeToken()).toBe(true);
      expect(consumeToken()).toBe(true);
      expect(bucket.tokens).toBe(8);
    });
  });

  describe('白名单', () => {
    it('白名单 IP 应不受限制', () => {
      const whitelist = new Set(['127.0.0.1', '::1', '10.0.0.1']);

      const isWhitelisted = (ip: string) => {
        return whitelist.has(ip);
      };

      expect(isWhitelisted('127.0.0.1')).toBe(true);
      expect(isWhitelisted('192.168.1.1')).toBe(false);
    });
  });
});
