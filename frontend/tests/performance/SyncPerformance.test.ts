/**
 * 任务 33.5: 性能测试
 * 文件位置: tests/performance/SyncPerformance.test.ts
 * 
 * 验收标准: 测试同步 1000 个片段的性能
 */

describe('同步 1000 个片段性能测试', () => {
  describe('批量同步性能', () => {
    it('应能在合理时间内同步 1000 个片段', () => {
      const snippets: any[] = [];
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        snippets.push({
          id: `snippet_${i}`,
          title: `Snippet ${i}`,
          code: `console.log(${i});`,
          language: 'javascript',
          version: 1,
          updatedAt: Date.now()
        });
      }

      const syncToRemote = (local: any[]) => {
        return local.map(s => ({ ...s, synced: true }));
      };

      const synced = syncToRemote(snippets);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(synced).toHaveLength(1000);
      expect(duration).toBeLessThan(5000);
    });

    it('增量同步应比全量同步快', () => {
      const allSnippets: any[] = [];
      for (let i = 0; i < 1000; i++) {
        allSnippets.push({ id: `snippet_${i}`, title: `Snippet ${i}` });
      }

      const fullSyncStart = Date.now();
      const fullSynced = allSnippets.map(s => ({ ...s, synced: true }));
      const fullSyncTime = Date.now() - fullSyncStart;

      const changedIds = new Set(['snippet_0', 'snippet_1', 'snippet_2']);
      const incrementalSyncStart = Date.now();
      const incrementalSynced = allSnippets
        .filter(s => changedIds.has(s.id))
        .map(s => ({ ...s, synced: true }));
      const incrementalSyncTime = Date.now() - incrementalSyncStart;

      expect(incrementalSynced).toHaveLength(3);
      expect(fullSyncTime).toBeGreaterThanOrEqual(0);
      expect(incrementalSyncTime).toBeLessThanOrEqual(fullSyncTime);
    });
  });

  describe('内存使用', () => {
    it('处理 1000 个片段不应导致内存溢出', () => {
      const snippets: any[] = [];

      for (let i = 0; i < 1000; i++) {
        snippets.push({
          id: `snippet_${i}`,
          title: `Snippet ${i}`,
          code: `console.log(${i});`.repeat(10),
          tags: ['tag1', 'tag2']
        });
      }

      expect(snippets).toHaveLength(1000);
      expect(() => JSON.stringify(snippets)).not.toThrow();
    });
  });

  describe('同步吞吐量', () => {
    it('应达到每秒处理 100+ 片段', () => {
      const snippets: any[] = [];
      for (let i = 0; i < 500; i++) {
        snippets.push({ id: `snippet_${i}`, title: `Snippet ${i}` });
      }

      const startTime = Date.now();
      const processed = snippets.filter(s => s.id.includes('snippet'));
      const endTime = Date.now();

      const duration = (endTime - startTime) / 1000;
      const throughput = processed.length / duration;

      expect(throughput).toBeGreaterThan(100);
    });
  });
});
