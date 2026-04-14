import { ModelDownloader } from '../../src/main/services/ModelDownloader';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Mock dependencies
jest.mock('fs');
jest.mock('axios');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/user/data'),
  },
}));

describe('ModelDownloader', () => {
  let downloader: ModelDownloader;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs methods using jest.spyOn
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('');
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'renameSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'createReadStream').mockReturnValue({} as any);
    jest.spyOn(fs, 'createWriteStream').mockReturnValue({} as any);

    // Mock axios
    (axios.create as jest.Mock).mockReturnValue(axios);
    (axios.CancelToken as any) = {
      source: jest.fn().mockReturnValue({
        token: 'mock-token',
        cancel: jest.fn(),
      }),
    };

    downloader = new ModelDownloader();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with idle status', () => {
      const progress = downloader.getProgress();
      expect(progress.status).toBe('idle');
      expect(progress.downloaded).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should create model directory if not exists', () => {
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('getProgress', () => {
    it('should return current progress', () => {
      const progress = downloader.getProgress();
      expect(progress).toHaveProperty('downloaded');
      expect(progress).toHaveProperty('total');
      expect(progress).toHaveProperty('percentage');
      expect(progress).toHaveProperty('speed');
      expect(progress).toHaveProperty('remainingTime');
      expect(progress).toHaveProperty('status');
    });
  });

  describe('isModelDownloaded', () => {
    it('should return false if model file does not exist', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const result = await downloader.isModelDownloaded();
      expect(result).toBe(false);
    });

    it('should verify model file when it exists', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      
      // Mock crypto hash stream - this will produce a different hash than expected
      const mockHash = {
        update: jest.fn(),
        digest: jest.fn().mockReturnValue('wronghash'),
      };
      
      const mockStream: any = {
        on: jest.fn((event: string, callback: (data?: any) => void) => {
          if (event === 'data') {
            // Simulate data event
            callback(Buffer.from('test'));
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      };
      
      jest.spyOn(fs, 'createReadStream').mockReturnValue(mockStream);

      const result = await downloader.isModelDownloaded();
      // Since the hash won't match, it should return false
      expect(result).toBe(false);
    });
  });

  describe('deleteModel', () => {
    it('should delete model files if they exist', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      
      await downloader.deleteModel();
      
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should reset progress after deletion', async () => {
      await downloader.deleteModel();
      
      const progress = downloader.getProgress();
      expect(progress.status).toBe('idle');
      expect(progress.downloaded).toBe(0);
      expect(progress.percentage).toBe(0);
    });
  });

  describe('getModelPath', () => {
    it('should return the model file path', () => {
      const modelPath = downloader.getModelPath();
      expect(modelPath).toContain('all-MiniLM-L6-v2.onnx');
    });
  });

  describe('cancelDownload', () => {
    it('should set status to cancelled', async () => {
      await downloader.cancelDownload();
      
      const progress = downloader.getProgress();
      expect(progress.status).toBe('cancelled');
    });

    it('should delete temporary file if exists', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      
      await downloader.cancelDownload();
      
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });
});
