import Database from 'better-sqlite3';
import { TagManager } from '../../src/main/services/TagManager';
import { createTestDatabase, cleanupTestDatabase } from '../setup';

describe('TagManager', () => {
  let db: Database.Database;
  let tagManager: TagManager;

  beforeEach(() => {
    db = createTestDatabase();
    tagManager = new TagManager(db);
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  describe('createTag', () => {
    test('should create a new tag', async () => {
      const tag = await tagManager.createTag({ name: 'Test Tag' });

      expect(tag).toHaveProperty('id');
      expect(tag.name).toBe('Test Tag');
      expect(tag.usageCount).toBe(0);
    });

    test('should throw error if tag name is empty', async () => {
      await expect(tagManager.createTag({ name: '' })).rejects.toThrow(
        'Tag name cannot be empty'
      );
    });

    test('should throw error if tag already exists', async () => {
      await tagManager.createTag({ name: 'Test Tag' });

      await expect(tagManager.createTag({ name: 'Test Tag' })).rejects.toThrow(
        'Tag with name "Test Tag" already exists'
      );
    });

    test('should be case-insensitive', async () => {
      await tagManager.createTag({ name: 'Test Tag' });

      await expect(tagManager.createTag({ name: 'test tag' })).rejects.toThrow(
        'Tag with name "test tag" already exists'
      );
    });
  });

  describe('getTags', () => {
    test('should return all tags', async () => {
      await tagManager.createTag({ name: 'Tag 1' });
      await tagManager.createTag({ name: 'Tag 2' });

      const tags = await tagManager.getTags();

      expect(tags.length).toBeGreaterThanOrEqual(2);
      const tag1 = tags.find((t) => t.name === 'Tag 1');
      const tag2 = tags.find((t) => t.name === 'Tag 2');
      expect(tag1).toBeDefined();
      expect(tag2).toBeDefined();
    });
  });

  describe('getTagById', () => {
    test('should return tag by id', async () => {
      const created = await tagManager.createTag({ name: 'Test Tag' });

      const tag = await tagManager.getTagById(created.id);

      expect(tag).toEqual({
        id: created.id,
        name: 'Test Tag',
        usageCount: 0,
        createdAt: expect.any(Date),
      });
    });

    test('should return undefined if tag not found', async () => {
      const tag = await tagManager.getTagById('999');

      expect(tag).toBeUndefined();
    });
  });

  describe('getTagByName', () => {
    test('should return tag by name', async () => {
      await tagManager.createTag({ name: 'Test Tag' });

      const tag = await tagManager.getTagByName('Test Tag');

      expect(tag).toBeDefined();
      expect(tag?.name).toBe('Test Tag');
    });

    test('should be case-insensitive', async () => {
      await tagManager.createTag({ name: 'Test Tag' });

      const tag = await tagManager.getTagByName('test tag');

      expect(tag).toBeDefined();
      expect(tag?.name).toBe('Test Tag');
    });

    test('should return undefined if tag not found', async () => {
      const tag = await tagManager.getTagByName('Nonexistent');

      expect(tag).toBeUndefined();
    });
  });

  describe('deleteTag', () => {
    test('should delete tag', async () => {
      const created = await tagManager.createTag({ name: 'Test Tag' });

      await tagManager.deleteTag(created.id);

      const tag = await tagManager.getTagById(created.id);
      expect(tag).toBeUndefined();
    });

    test('should throw error if tag not found', async () => {
      await expect(tagManager.deleteTag('999')).rejects.toThrow(
        'Tag with id "999" not found'
      );
    });
  });

  describe('renameTag', () => {
    test('should rename tag', async () => {
      const created = await tagManager.createTag({ name: 'Old Name' });

      const renamed = await tagManager.renameTag(created.id, 'New Name');

      expect(renamed.name).toBe('New Name');
      expect(renamed.id).toBe(created.id);
    });

    test('should throw error if tag not found', async () => {
      await expect(tagManager.renameTag('999', 'New Name')).rejects.toThrow(
        'Tag with id "999" not found'
      );
    });

    test('should throw error if new name already exists', async () => {
      const tag1 = await tagManager.createTag({ name: 'Tag 1' });
      await tagManager.createTag({ name: 'Tag 2' });

      await expect(tagManager.renameTag(tag1.id, 'Tag 2')).rejects.toThrow(
        'Tag "Tag 2" already exists'
      );
    });
  });

  describe('getOrCreateTag', () => {
    test('should return existing tag', async () => {
      const created = await tagManager.createTag({ name: 'Test Tag' });

      const tag = await tagManager.getOrCreateTag('Test Tag');

      expect(tag.id).toBe(created.id);
      expect(tag.name).toBe('Test Tag');
    });

    test('should create new tag if not exists', async () => {
      const tag = await tagManager.getOrCreateTag('New Tag');

      expect(tag).toBeDefined();
      expect(tag.name).toBe('New Tag');
    });
  });
});
