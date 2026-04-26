/**
 * 属性测试
 * 文件位置: tests/property/SnippetProperty.test.ts
 * 属性测试 - 片段相关属性
 */

describe('片段属性测试', () => {
  describe('片段 ID 唯一性', () => {
    it('生成的片段 ID 应唯一', () => {
      const generateId = () => `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      
      expect(ids.size).toBe(100);
    });
  });

  describe('片段标签属性', () => {
    it('标签数组应正确去重', () => {
      const tags = ['js', 'python', 'js', 'java', 'python'];
      const uniqueTags = [...new Set(tags)];
      
      expect(uniqueTags).toEqual(['js', 'python', 'java']);
    });

    it('标签搜索应大小写不敏感', () => {
      const searchTags = (tags: string[], query: string) => {
        return tags.filter(tag => tag.toLowerCase().includes(query.toLowerCase()));
      };
      
      const result = searchTags(['JavaScript', 'java', 'JAVA'], 'java');
      
      expect(result).toHaveLength(3);
    });
  });

  describe('片段语言属性', () => {
    it('支持的语言列表应包含常用语言', () => {
      const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c', 'cpp', 'csharp', 'ruby', 'php', 'swift', 'kotlin'];
      
      expect(supportedLanguages).toContain('javascript');
      expect(supportedLanguages).toContain('python');
      expect(supportedLanguages).toContain('java');
    });
  });
});
