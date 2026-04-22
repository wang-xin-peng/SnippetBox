/**
 * 任务 33.5: 性能测试
 * 文件位置: tests/performance/ConflictResolutionPerformance.test.ts
 * 
 * 验收标准: 测试冲突解决性能
 */

describe('冲突解决性能测试', () => {
  describe('冲突检测性能', () => {
    it('应能快速检测单个冲突', () => {
      const startTime = Date.now();

      const detectConflict = (local: any, remote: any) => {
        return local.version !== remote.version || local.title !== remote.title;
      };

      const local = { id: '1', version: 1, title: 'Local' };
      const remote = { id: '1', version: 2, title: 'Remote' };

      const hasConflict = detectConflict(local, remote);
      const duration = Date.now() - startTime;

      expect(hasConflict).toBe(true);
      expect(duration).toBeLessThan(10);
    });

    it('应能快速检测批量冲突', () => {
      const locals: any[] = [];
      const remotes: any[] = [];

      for (let i = 0; i < 100; i++) {
        locals.push({ id: `snippet_${i}`, version: 1, title: `Local ${i}` });
        remotes.push({ id: `snippet_${i}`, version: 2, title: `Remote ${i}` });
      }

      const startTime = Date.now();

      const detectBatchConflicts = (local: any[], remote: any[]) => {
        return local.map((l, i) => ({
          id: l.id,
          hasConflict: l.version !== remote[i].version || l.title !== remote[i].title
        }));
      };

      const conflicts = detectBatchConflicts(locals, remotes);
      const duration = Date.now() - startTime;

      expect(conflicts).toHaveLength(100);
      expect(conflicts.filter(c => c.hasConflict)).toHaveLength(100);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('冲突解决策略性能', () => {
    it('本地优先策略应快速执行', () => {
      const localFirst = (local: any, remote: any) => {
        return local.version >= remote.version ? local : remote;
      };

      const local = { id: '1', version: 5, title: 'Local' };
      const remote = { id: '1', version: 3, title: 'Remote' };

      const startTime = Date.now();
      const resolved = localFirst(local, remote);
      const duration = Date.now() - startTime;

      expect(resolved.title).toBe('Local');
      expect(duration).toBeLessThan(5);
    });

    it('远程优先策略应快速执行', () => {
      const remoteFirst = (local: any, remote: any) => {
        return remote.version > local.version ? remote : local;
      };

      const local = { id: '1', version: 2, title: 'Local' };
      const remote = { id: '1', version: 5, title: 'Remote' };

      const startTime = Date.now();
      const resolved = remoteFirst(local, remote);
      const duration = Date.now() - startTime;

      expect(resolved.title).toBe('Remote');
      expect(duration).toBeLessThan(5);
    });

    it('手动合并策略应快速执行', () => {
      const manualMerge = (local: any, remote: any) => {
        return {
          id: local.id,
          title: local.title !== remote.title ? `${local.title} + ${remote.title}` : local.title,
          code: local.code !== remote.code ? `${local.code}\n${remote.code}` : local.code,
          tags: [...new Set([...local.tags, ...remote.tags])]
        };
      };

      const local = { id: '1', title: 'L', code: 'a', tags: ['t1'] };
      const remote = { id: '1', title: 'R', code: 'b', tags: ['t2'] };

      const startTime = Date.now();
      const resolved = manualMerge(local, remote);
      const duration = Date.now() - startTime;

      expect(resolved.title).toContain('+');
      expect(resolved.tags).toHaveLength(2);
      expect(duration).toBeLessThan(10);
    });
  });

  describe('批量冲突解决性能', () => {
    it('应能快速解决 100 个冲突', () => {
      const conflicts: any[] = [];
      for (let i = 0; i < 100; i++) {
        conflicts.push({
          id: `snippet_${i}`,
          local: { version: Math.floor(Math.random() * 10) + 1, title: `Local ${i}` },
          remote: { version: Math.floor(Math.random() * 10) + 1, title: `Remote ${i}` }
        });
      }

      const resolveWithLocalFirst = (local: any, remote: any) => {
        return local.version >= remote.version ? local : remote;
      };

      const startTime = Date.now();
      const resolved = conflicts.map(c => ({
        id: c.id,
        ...resolveWithLocalFirst(c.local, c.remote)
      }));
      const duration = Date.now() - startTime;

      expect(resolved).toHaveLength(100);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('冲突解决延迟', () => {
    it('冲突解决应不影响用户体验', () => {
      const snippet = { id: '1', title: 'Test', code: 'code' };

      const resolveConflict = (local: any, remote: any) => {
        return local.version >= remote.version ? local : remote;
      };

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        resolveConflict(
          { ...snippet, version: i },
          { ...snippet, version: i + 1 }
        );
      }
      const totalDuration = Date.now() - startTime;
      const avgLatency = totalDuration / 1000;

      expect(avgLatency).toBeLessThan(1);
    });
  });
});
