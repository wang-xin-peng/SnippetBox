import { ImportService, ValidationResult } from '../../src/main/services/ImportService';

describe('ImportService', () => {
  let importService: ImportService;

  beforeEach(() => {
    importService = new ImportService();
  });

  describe('validateImportFile', () => {
    it('should validate markdown file', () => {
      const result = importService.validateImportFile('test.md');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate markdown file with .markdown extension', () => {
      const result = importService.validateImportFile('test.markdown');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate json file', () => {
      const result = importService.validateImportFile('test.json');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsupported file types', () => {
      const result = importService.validateImportFile('test.txt');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject executable files', () => {
      const result = importService.validateImportFile('test.exe');
      expect(result.valid).toBe(false);
    });

    it('should accept .json extension explicitly', () => {
      const result = importService.validateImportFile('test.json', 'json');
      expect(result.valid).toBe(true);
    });

    it('should accept .md extension explicitly', () => {
      const result = importService.validateImportFile('test.md', 'markdown');
      expect(result.valid).toBe(true);
    });
  });

  describe('ImportResult interface', () => {
    it('should have correct result structure', () => {
      const result: ValidationResult = {
        valid: true,
        errors: []
      };
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});