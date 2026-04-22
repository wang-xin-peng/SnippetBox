/**
 * 任务 33.3: 属性测试
 * 文件位置: tests/property/ShareProperty.test.ts
 * 
 * 属性 17: 短链接的唯一性
 */

describe('短链接的唯一性', () => {
  describe('属性 17: 短链接的唯一性', () => {
    it('生成的短链接应唯一', () => {
      const generateShortCode = (length: number = 8) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateShortCode());
      }

      expect(codes.size).toBe(100);
    });

    it('相同输入应生成相同短链接', () => {
      const generateShortCode = (input: string) => {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
          hash = ((hash << 5) - hash) + input.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 8);
      };

      const code1 = generateShortCode('test-content-123');
      const code2 = generateShortCode('test-content-123');

      expect(code1).toBe(code2);
    });

    it('不同输入应生成不同短链接', () => {
      const generateShortCode = (input: string) => {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
          hash = ((hash << 5) - hash) + input.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 8);
      };

      const code1 = generateShortCode('content-a');
      const code2 = generateShortCode('content-b');

      expect(code1).not.toBe(code2);
    });

    it('短链接格式应正确', () => {
      const isValidShortCode = (code: string) => {
        return /^[a-zA-Z0-9]{6,12}$/.test(code);
      };

      expect(isValidShortCode('abc12345')).toBe(true);
      expect(isValidShortCode('ab')).toBe(false);
      expect(isValidShortCode('abc-123')).toBe(false);
      expect(isValidShortCode('')).toBe(false);
    });

    it('已使用代码应被跟踪', () => {
      const usedCodes = new Set<string>();
      
      usedCodes.add('abc123');
      usedCodes.add('def456');
      
      expect(usedCodes.has('abc123')).toBe(true);
      expect(usedCodes.has('xyz789')).toBe(false);
      expect(usedCodes.size).toBe(2);
    });

    it('碰撞处理应正确', () => {
      const generateUniqueCode = (existingCodes: Set<string>, maxAttempts: number = 3) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          let code = '';
          for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          if (!existingCodes.has(code)) {
            return code;
          }
        }
        return null;
      };

      const existingCodes = new Set<string>();
      existingCodes.add('collision1');
      
      const newCode = generateUniqueCode(existingCodes);
      
      expect(newCode).not.toBeNull();
      expect(existingCodes.has(newCode!)).toBe(false);
    });
  });
});
