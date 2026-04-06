// Mock 数据库
const mockDatabase = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  transaction: jest.fn((callback) => callback()),
};

// Mock DatabaseManager
jest.mock('../../src/main/database', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      connect: jest.fn(),
      getDB: jest.fn(() => mockDatabase),
    }),
  },
}));

import { TagManager } from '../../src/main/services/TagManager';

describe('TagManager', () => {
  let tagManager: TagManager;

  beforeEach(() => {
    tagManager = new TagManager();
    jest.clearAllMocks();
  });

  describe('createTag', () => {
    test('should create a new tag', async () => {
      mockDatabase.get.mockResolvedValue(null);
      mockDatabase.run.mockResolvedValue(undefined);

      const tag = await tagManager.createTag({ name: 'test tag' });

      expect(tag).toHaveProperty('id');
      expect(tag.name).toBe('test tag');
      expect(tag.usageCount).toBe(0);
      expect(mockDatabase.run).toHaveBeenCalled();
    });

    test('should throw error if tag name is empty', async () => {
      await expect(tagManager.createTag({ name: '' })).rejects.toThrow('Tag name cannot be empty');
    });

    test('should throw error if tag already exists', async () => {
      mockDatabase.get.mockResolvedValue({ id: '1', name: 'test tag' });

      await expect(tagManager.createTag({ name: 'test tag' })).rejects.toThrow('Tag with name "test tag" already exists');
    });
  });

  describe('getTags', () => {
    test('should return all tags', async () => {
      const mockTags = [
        { id: '1', name: 'tag1', usage_count: 5, created_at: '2024-01-01T00:00:00.000Z' },
        { id: '2', name: 'tag2', usage_count: 3, created_at: '2024-01-02T00:00:00.000Z' },
      ];
      mockDatabase.all.mockResolvedValue(mockTags);

      const tags = await tagManager.getTags();

      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe('tag1');
      expect(tags[0].usageCount).toBe(5);
      expect(mockDatabase.all).toHaveBeenCalledWith('SELECT * FROM tags ORDER BY usage_count DESC, name ASC');
    });
  });

  describe('getTagById', () => {
    test('should return tag by id', async () => {
      const mockTag = { id: '1', name: 'test tag', usage_count: 2, created_at: '2024-01-01T00:00:00.000Z' };
      mockDatabase.get.mockResolvedValue(mockTag);

      const tag = await tagManager.getTagById('1');

      expect(tag).toEqual({
        id: '1',
        name: 'test tag',
        usageCount: 2,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });
    });

    test('should return undefined if tag not found', async () => {
      mockDatabase.get.mockResolvedValue(undefined);

      const tag = await tagManager.getTagById('999');

      expect(tag).toBeUndefined();
    });
  });

  describe('deleteTag', () => {
    test('should delete tag', async () => {
      const mockTag = { id: '1', name: 'test tag', usage_count: 1, created_at: '2024-01-01T00:00:00.000Z' };
      mockDatabase.get.mockResolvedValue(mockTag);
      mockDatabase.run.mockResolvedValue(undefined);

      await tagManager.deleteTag('1');

      expect(mockDatabase.run).toHaveBeenCalledWith('DELETE FROM snippet_tags WHERE tag_id = ?', ['1']);
      expect(mockDatabase.run).toHaveBeenCalledWith('DELETE FROM tags WHERE id = ?', ['1']);
    });

    test('should throw error if tag not found', async () => {
      mockDatabase.get.mockResolvedValue(undefined);

      await expect(tagManager.deleteTag('999')).rejects.toThrow('Tag with id "999" not found');
    });
  });

  describe('getTagSuggestions', () => {
    test('should return tag suggestions', async () => {
      const mockTags = [
        { id: '1', name: 'javascript', usage_count: 10, created_at: '2024-01-01T00:00:00.000Z' },
        { id: '2', name: 'typescript', usage_count: 8, created_at: '2024-01-02T00:00:00.000Z' },
      ];
      mockDatabase.all.mockResolvedValue(mockTags);

      const suggestions = await tagManager.getTagSuggestions('java');

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].name).toBe('javascript');
      expect(mockDatabase.all).toHaveBeenCalledWith(
        'SELECT * FROM tags WHERE name LIKE ? ORDER BY usage_count DESC, name ASC LIMIT ?',
        ['%java%', 10]
      );
    });
  });

  describe('mergeTags', () => {
    test('should merge two tags', async () => {
      const sourceTag = { id: '1', name: 'old tag', usage_count: 5, created_at: '2024-01-01T00:00:00.000Z' };
      const targetTag = { id: '2', name: 'new tag', usage_count: 10, created_at: '2024-01-02T00:00:00.000Z' };
      const mockSnippetTags = [{ snippet_id: 's1' }, { snippet_id: 's2' }];

      mockDatabase.get.mockImplementation((sql, params) => {
        if (params && params[0] === '1') return sourceTag;
        if (params && params[0] === '2') return targetTag;
        return null;
      });
      mockDatabase.all.mockResolvedValue(mockSnippetTags);
      mockDatabase.run.mockResolvedValue(undefined);

      await tagManager.mergeTags('1', '2');

      expect(mockDatabase.run).toHaveBeenCalledWith('DELETE FROM snippet_tags WHERE tag_id = ?', ['1']);
      expect(mockDatabase.run).toHaveBeenCalledWith('DELETE FROM tags WHERE id = ?', ['1']);
    });

    test('should throw error if merging tag with itself', async () => {
      await expect(tagManager.mergeTags('1', '1')).rejects.toThrow('Cannot merge a tag with itself');
    });
  });
});
