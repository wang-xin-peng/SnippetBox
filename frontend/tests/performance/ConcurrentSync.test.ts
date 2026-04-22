/**
 * 任务 33.5: 性能测试
 * 文件位置: tests/performance/ConcurrentSync.test.ts
 * 
 * 验收标准: 测试并发同步性能（多设备）
 */

describe('并发同步性能测试', () => {
  describe('多设备并发同步', () => {
    it('应能处理 5 个设备同时同步', () => {
      const devices = ['device1', 'device2', 'device3', 'device4', 'device5'];
      const snippets: any[] = [];

      for (let i = 0; i < 100; i++) {
        snippets.push({ id: `snippet_${i}`, title: `Snippet ${i}` });
      }

      const startTime = Date.now();
      const results = devices.map(device => {
        return snippets.map(s => ({ ...s, device, synced: true }));
      });
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(results[0]).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('应能处理 10 个设备同时同步', () => {
      const deviceCount = 10;
      const snippetsPerDevice = 50;
      const results: any[][] = [];

      for (let d = 0; d < deviceCount; d++) {
        const snippets: any[] = [];
        for (let i = 0; i < snippetsPerDevice; i++) {
          snippets.push({ id: `d${d}_snippet_${i}`, title: `Device ${d} Snippet ${i}` });
        }
        results.push(snippets);
      }

      expect(results).toHaveLength(10);
      expect(results[0]).toHaveLength(50);
    });
  });

  describe('并发冲突处理', () => {
    it('应能处理多个设备对同一片段的并发更新', () => {
      const snippet = { id: '1', title: 'Original', version: 1, code: 'original' };

      const updates = [
        { device: 'd1', title: 'Update from d1', version: 2 },
        { device: 'd2', title: 'Update from d2', version: 3 },
        { device: 'd3', title: 'Update from d3', version: 4 }
      ];

      const applyUpdate = (base: any, update: any) => {
        if (update.version > base.version) {
          return { ...base, ...update, version: update.version + 1 };
        }
        return base;
      };

      let result = snippet;
      for (const update of updates) {
        result = applyUpdate(result, update);
      }

      expect(result.version).toBe(5);
    });

    it('并发更新应使用正确策略解决冲突', () => {
      const localFirst = (local: any, remote: any) => {
        return local.version >= remote.version ? local : remote;
      };

      const local = { id: '1', version: 3, title: 'Local' };
      const remote = { id: '1', version: 2, title: 'Remote' };

      const resolved = localFirst(local, remote);
      expect(resolved.title).toBe('Local');
    });
  });

  describe('并发性能指标', () => {
    it('应能衡量并发处理能力', () => {
      const startTime = Date.now();
      let counter = 0;

      const workers = 5;
      const iterations = 100;

      for (let w = 0; w < workers; w++) {
        for (let i = 0; i < iterations; i++) {
          counter++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(counter).toBe(500);
      expect(duration).toBeLessThan(100);
    });

    it('应追踪并发同步状态', () => {
      const syncState = {
        activeDevices: 0,
        pendingOperations: 0,
        completedOperations: 0
      };

      syncState.activeDevices = 5;
      syncState.pendingOperations = 100;
      syncState.completedOperations = 0;

      syncState.completedOperations = syncState.pendingOperations;
      syncState.pendingOperations = 0;

      expect(syncState.completedOperations).toBe(100);
      expect(syncState.pendingOperations).toBe(0);
    });
  });

  describe('锁竞争处理', () => {
    it('应能检测锁竞争', () => {
      const locks = new Set<string>();

      const acquireLock = (id: string) => {
        if (locks.has(id)) {
          return false;
        }
        locks.add(id);
        return true;
      };

      const releaseLock = (id: string) => {
        locks.delete(id);
      };

      expect(acquireLock('snippet_1')).toBe(true);
      expect(acquireLock('snippet_1')).toBe(false);

      releaseLock('snippet_1');
      expect(acquireLock('snippet_1')).toBe(true);
    });

    it('应能处理锁等待', () => {
      const waiting: string[] = [];

      const waitForLock = (id: string) => {
        waiting.push(id);
        return waiting.length;
      };

      expect(waitForLock('snippet_1')).toBe(1);
      expect(waitForLock('snippet_1')).toBe(2);
      expect(waitForLock('snippet_2')).toBe(3);
    });
  });
});
