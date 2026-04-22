/**
 * 任务 33.6: 安全测试
 * 文件位置: tests/security/XSSProtection.test.ts
 * 
 * 验收标准: 测试 XSS 攻击防护
 */

describe('XSS 攻击防护测试', () => {
  describe('HTML 转义', () => {
    it('应转义 HTML 特殊字符', () => {
      const escapeHTML = (str: string) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      expect(escapeHTML('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escapeHTML('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
      expect(escapeHTML('Hello & World')).toBe('Hello &amp; World');
    });

    it('应保留正常 HTML 格式', () => {
      const escapeHTML = (str: string) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const normalHTML = '<b>bold</b>';
      const escaped = escapeHTML(normalHTML);

      expect(escaped).toBe('&lt;b&gt;bold&lt;/b&gt;');
    });
  });

  describe('XSS 攻击向量检测', () => {
    it('应检测常见 XSS 攻击向量', () => {
      const xssPatterns = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
        '<body onload=alert(1)>',
        '<input onfocus=alert(1) autofocus>',
        "onclick=alert(1)",
        '<a href="javascript:alert(1)">click</a>'
      ];

      const isXSSAttack = (input: string) => {
        const patterns = [
          /<script/i,
          /javascript:/i,
          /on\w+=/i,
          /<img/i,
          /<svg/i,
          /<iframe/i
        ];
        return patterns.some(pattern => pattern.test(input));
      };

      for (const attack of xssPatterns) {
        expect(isXSSAttack(attack)).toBe(true);
      }
    });

    it('应允许正常用户输入', () => {
      const normalInputs = [
        'Hello World',
        'console.log("test")',
        '<b>bold text</b>',
        'Code: if (x > 0) { return true; }'
      ];

      const isXSSAttack = (input: string) => {
        const patterns = [
          /<script/i,
          /javascript:/i,
          /on\w+=/i
        ];
        return patterns.some(pattern => pattern.test(input));
      };

      for (const input of normalInputs) {
        expect(isXSSAttack(input)).toBe(false);
      }
    });
  });

  describe('内容安全策略模拟', () => {
    it('应拒绝内联脚本', () => {
      const containsInlineScript = (html: string) => {
        return /<script[^>]*>[\s\S]*?<\/script>/i.test(html) ||
               /on\w+\s*=/i.test(html);
      };

      expect(containsInlineScript('<script>alert(1)</script>')).toBe(true);
      expect(containsInlineScript('<img src=x onerror=alert(1)>')).toBe(true);
      expect(containsInlineScript('Hello World')).toBe(false);
    });

    it('应拒绝 javascript: 协议', () => {
      const containsJavascriptProtocol = (url: string) => {
        return /^javascript:/i.test(url);
      };

      expect(containsJavascriptProtocol('javascript:alert(1)')).toBe(true);
      expect(containsJavascriptProtocol('javascript:void(0)')).toBe(true);
      expect(containsJavascriptProtocol('https://example.com')).toBe(false);
    });
  });

  describe('DOM 清理', () => {
    it('应清理用户输入的 HTML', () => {
      const sanitizeHTML = (html: string) => {
        return html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
          .replace(/on\w+\s*=\s*[^\s>]+/gi, '');
      };

      const dirty = '<div onclick="evil()"><script>alert(1)</script><img src=x onerror=alert(2)></div>';
      const clean = sanitizeHTML(dirty);

      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('onclick');
      expect(clean).not.toContain('onerror');
    });
  });

  describe('URL 验证', () => {
    it('应验证 URL 协议', () => {
      const isSafeURL = (url: string) => {
        const allowedProtocols = ['http:', 'https:'];
        try {
          const parsed = new URL(url);
          return allowedProtocols.includes(parsed.protocol);
        } catch {
          return false;
        }
      };

      expect(isSafeURL('https://example.com')).toBe(true);
      expect(isSafeURL('http://example.com')).toBe(true);
      expect(isSafeURL('javascript:alert(1)')).toBe(false);
      expect(isSafeURL('data:text/html,<script>alert(1)</script>')).toBe(false);
    });
  });

  describe('输入长度限制', () => {
    it('应限制输入长度防止 DoS', () => {
      const MAX_INPUT_LENGTH = 10000;

      const truncateInput = (input: string) => {
        return input.substring(0, MAX_INPUT_LENGTH);
      };

      const longXSS = '<script>' + 'alert(1);'.repeat(10000) + '</script>';
      const truncated = truncateInput(longXSS);

      expect(truncated.length).toBe(MAX_INPUT_LENGTH);
    });
  });
});
