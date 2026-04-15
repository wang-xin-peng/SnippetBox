import { LocalEmbeddingService } from '../../src/main/services/LocalEmbeddingService';

// Mock electron
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/user/data'),
  },
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

// Mock onnxruntime-node
jest.mock('onnxruntime-node', () => ({
  InferenceSession: {
    create: jest.fn(),
  },
  Tensor: jest.fn((type, data, dims) => ({ type, data, dims })),
}));

// Mock @xenova/transformers
jest.mock('@xenova/transformers', () => ({
  AutoTokenizer: {
    from_pretrained: jest.fn(),
  },
}));

describe('LocalEmbeddingService', () => {
  let service: LocalEmbeddingService;
  let mockSession: any;
  let mockTokenizer: any;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 创建 mock session
    mockSession = {
      run: jest.fn(),
    };

    // 创建 mock tokenizer
    mockTokenizer = jest.fn((texts, options) => ({
      input_ids: {
        data: new Array(texts.length * 10).fill(1),
        dims: [texts.length, 10],
      },
      attention_mask: {
        data: new Array(texts.length * 10).fill(1),
        dims: [texts.length, 10],
      },
    }));

    // 设置 mock 返回值
    const ort = require('onnxruntime-node');
    ort.InferenceSession.create.mockResolvedValue(mockSession);

    const transformers = require('@xenova/transformers');
    transformers.AutoTokenizer.from_pretrained.mockResolvedValue(mockTokenizer);

    service = new LocalEmbeddingService();
  });

  describe('initialize', () => {
    it('should initialize model successfully', async () => {
      await service.initialize();
      
      expect(service.isModelLoaded()).toBe(true);
      expect(require('onnxruntime-node').InferenceSession.create).toHaveBeenCalledTimes(1);
      expect(require('@xenova/transformers').AutoTokenizer.from_pretrained).toHaveBeenCalledTimes(1);
    });

    it('should not initialize twice', async () => {
      await service.initialize();
      await service.initialize();
      
      expect(require('onnxruntime-node').InferenceSession.create).toHaveBeenCalledTimes(1);
    });

    it('should throw error if model file not found', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValueOnce(false);
      
      const newService = new LocalEmbeddingService();
      await expect(newService.initialize()).rejects.toThrow('Model file not found');
    });

    it('should handle concurrent initialization', async () => {
      const promises = [
        service.initialize(),
        service.initialize(),
        service.initialize(),
      ];
      
      await Promise.all(promises);
      
      expect(require('onnxruntime-node').InferenceSession.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('isModelLoaded', () => {
    it('should return false before initialization', () => {
      expect(service.isModelLoaded()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await service.initialize();
      expect(service.isModelLoaded()).toBe(true);
    });

    it('should return false after unload', async () => {
      await service.initialize();
      await service.unload();
      expect(service.isModelLoaded()).toBe(false);
    });
  });

  describe('embed', () => {
    beforeEach(async () => {
      // Mock session.run 返回值
      mockSession.run.mockResolvedValue({
        last_hidden_state: {
          data: new Float32Array(384).fill(0.1),
          dims: [1, 10, 384],
        },
      });
    });

    it('should generate embedding for single text', async () => {
      const embedding = await service.embed('test text');
      
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
      expect(typeof embedding[0]).toBe('number');
    });

    it('should auto-initialize if not loaded', async () => {
      expect(service.isModelLoaded()).toBe(false);
      
      await service.embed('test');
      
      expect(service.isModelLoaded()).toBe(true);
    });

    it('should complete within 200ms', async () => {
      await service.initialize();
      
      const startTime = Date.now();
      await service.embed('test text');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(200);
    });
  });

  describe('batchEmbed', () => {
    beforeEach(async () => {
      // Mock session.run 返回值
      mockSession.run.mockImplementation(async (feeds: any) => {
        const batchSize = feeds.input_ids.dims[0];
        return {
          last_hidden_state: {
            data: new Float32Array(batchSize * 10 * 384).fill(0.1),
            dims: [batchSize, 10, 384],
          },
        };
      });
    });

    it('should generate embeddings for multiple texts', async () => {
      const texts = ['text 1', 'text 2', 'text 3'];
      const embeddings = await service.batchEmbed(texts);
      
      expect(embeddings.length).toBe(3);
      expect(embeddings[0].length).toBe(384);
      expect(embeddings[1].length).toBe(384);
      expect(embeddings[2].length).toBe(384);
    });

    it('should return empty array for empty input', async () => {
      const embeddings = await service.batchEmbed([]);
      expect(embeddings).toEqual([]);
    });

    it('should normalize embeddings', async () => {
      const embeddings = await service.batchEmbed(['test']);
      
      // 检查 L2 范数是否接近 1
      const norm = Math.sqrt(embeddings[0].reduce((sum, val) => sum + val * val, 0));
      expect(norm).toBeCloseTo(1, 5);
    });

    it('should handle batch processing efficiently', async () => {
      await service.initialize();
      
      const texts = Array(10).fill('test text');
      const startTime = Date.now();
      await service.batchEmbed(texts);
      const duration = Date.now() - startTime;
      
      // 批量处理应该比单独处理快
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('unload', () => {
    it('should unload model successfully', async () => {
      await service.initialize();
      expect(service.isModelLoaded()).toBe(true);
      
      await service.unload();
      
      expect(service.isModelLoaded()).toBe(false);
    });

    it('should allow re-initialization after unload', async () => {
      await service.initialize();
      await service.unload();
      await service.initialize();
      
      expect(service.isModelLoaded()).toBe(true);
    });

    it('should not throw error if already unloaded', async () => {
      await expect(service.unload()).resolves.not.toThrow();
    });
  });

  describe('getModelInfo', () => {
    it('should return model information', () => {
      const info = service.getModelInfo();
      
      expect(info.name).toBe('all-MiniLM-L6-v2');
      expect(info.path).toContain('all-MiniLM-L6-v2');
      expect(typeof info.loaded).toBe('boolean');
    });

    it('should reflect loaded state', async () => {
      expect(service.getModelInfo().loaded).toBe(false);
      
      await service.initialize();
      expect(service.getModelInfo().loaded).toBe(true);
      
      await service.unload();
      expect(service.getModelInfo().loaded).toBe(false);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const { getLocalEmbeddingService } = require('../../src/main/services/LocalEmbeddingService');
      
      const instance1 = getLocalEmbeddingService();
      const instance2 = getLocalEmbeddingService();
      
      expect(instance1).toBe(instance2);
    });
  });
});
