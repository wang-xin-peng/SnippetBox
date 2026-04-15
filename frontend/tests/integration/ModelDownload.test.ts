import { ModelDownloader } from '../../src/main/services/ModelDownloader';
import { getSortedMirrors, MODEL_MIRRORS } from '../../src/main/config/mirrors';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-model-download'),
  },
}));

describe('Model Download Integration', () => {
  describe('Mirror Configuration', () => {
    it('should have at least one mirror configured', () => {
      expect(MODEL_MIRRORS.length).toBeGreaterThan(0);
    });

    it('should return mirrors sorted by priority', () => {
      const sorted = getSortedMirrors();
      expect(sorted.length).toBe(MODEL_MIRRORS.length);
      
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i - 1].priority);
      }
    });

    it('should have valid mirror URLs', () => {
      MODEL_MIRRORS.forEach((mirror) => {
        expect(mirror.url).toMatch(/^https?:\/\/.+/);
        expect(mirror.name).toBeTruthy();
        expect(mirror.location).toBeTruthy();
        expect(mirror.priority).toBeGreaterThan(0);
      });
    });
  });

  describe('ModelDownloader Integration', () => {
    let downloader: ModelDownloader;

    beforeEach(() => {
      downloader = new ModelDownloader();
    });

    it('should initialize with correct default state', () => {
      const progress = downloader.getProgress();
      expect(progress.status).toBe('idle');
      expect(progress.downloaded).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should provide model path', () => {
      const modelPath = downloader.getModelPath();
      expect(modelPath).toContain('test-model.bin');
    });

    it('should handle cancel operation', async () => {
      await downloader.cancelDownload();
      const progress = downloader.getProgress();
      expect(progress.status).toBe('idle');
    });
  });
});
