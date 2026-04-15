import fc from 'fast-check';
import Database from 'better-sqlite3';
import { CategoryManager } from '../../src/main/services/CategoryManager';
import { TagManager } from '../../src/main/services/TagManager';
import { createTestDatabase, cleanupTestDatabase } from '../setup';

describe('Category and Tag Property-Based Tests', () => {
  let db: Database.Database;
  let categoryManager: CategoryManager;
  let tagManager: TagManager;

  beforeEach(() => {
    db = createTestDatabase();
    categoryManager = new CategoryManager(db);
    tagManager = new TagManager(db);
  });

  afterEach(() => {
    cleanupTestDatabase(db);
  });

  describe('Category Properties', () => {
    test('creating a category with valid data should always succeed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          fc.string().filter((s: string) => /^#[0-9A-Fa-f]{6}$/.test(s)),
          fc.string({ minLength: 1, maxLength: 10 }),
          async (name: string, color: string, icon: string) => {
            const category = await categoryManager.createCategory({
              name: name.trim(),
              color,
              icon,
            });

            expect(category).toBeDefined();
            expect(category.name).toBe(name.trim());
            expect(category.color).toBe(color);
            expect(category.icon).toBe(icon);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('category name should be unique', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
          async (name: string) => {
            const trimmedName = name.trim();
            await categoryManager.createCategory({ name: trimmedName });

            await expect(categoryManager.createCategory({ name: trimmedName })).rejects.toThrow();
          }
        ),
        { numRuns: 10 }
      );
    });

    test('getting a category by id should return the same category', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      const retrieved = await categoryManager.getCategoryById(category.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(category.id);
      expect(retrieved?.name).toBe(category.name);
    });

    test('deleting a category should make it unavailable', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      await categoryManager.deleteCategory(category.id);

      const retrieved = await categoryManager.getCategoryById(category.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Tag Properties', () => {
    test('creating a tag with valid name should always succeed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s: string) => s.trim().length > 0),
          async (name: string) => {
            const tag = await tagManager.createTag({ name: name.trim() });

            expect(tag).toBeDefined();
            expect(tag.name).toBe(name.trim());
            expect(tag.usageCount).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('tag name should be unique (case-insensitive)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s: string) => s.trim().length > 0),
          async (name: string) => {
            const trimmedName = name.trim();
            await tagManager.createTag({ name: trimmedName });

            await expect(tagManager.createTag({ name: trimmedName.toLowerCase() })).rejects.toThrow();
          }
        ),
        { numRuns: 10 }
      );
    });

    test('getting a tag by name should be case-insensitive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s: string) => s.trim().length > 0),
          async (name: string) => {
            const trimmedName = name.trim();
            const created = await tagManager.createTag({ name: trimmedName });

            const retrieved = await tagManager.getTagByName(trimmedName.toLowerCase());

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(created.id);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('deleting a tag should make it unavailable', async () => {
      const tag = await tagManager.createTag({ name: 'test-tag' });

      await tagManager.deleteTag(tag.id);

      const retrieved = await tagManager.getTagById(tag.id);
      expect(retrieved).toBeUndefined();
    });

    test('renaming a tag should preserve its id', async () => {
      const tag = await tagManager.createTag({ name: 'old-name' });

      const renamed = await tagManager.renameTag(tag.id, 'new-name');

      expect(renamed.id).toBe(tag.id);
      expect(renamed.name).toBe('new-name');
    });

    test('merging tags should combine their usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s: string) => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 30 }).filter((s: string) => s.trim().length > 0),
          async (sourceName: string, targetName: string) => {
            const trimmedSource = sourceName.trim();
            const trimmedTarget = targetName.trim();
            
            if (trimmedSource.toLowerCase() === trimmedTarget.toLowerCase()) {
              return; // Skip if names are the same
            }

            // 清理可能存在的标签
            const existingSource = await tagManager.getTagByName(trimmedSource);
            if (existingSource) {
              await tagManager.deleteTag(existingSource.id);
            }
            
            const existingTarget = await tagManager.getTagByName(trimmedTarget);
            if (existingTarget) {
              await tagManager.deleteTag(existingTarget.id);
            }

            const sourceTag = await tagManager.createTag({ name: trimmedSource });
            const targetTag = await tagManager.createTag({ name: trimmedTarget });

            await tagManager.mergeTags(sourceTag.id, targetTag.id);

            const sourceRetrieved = await tagManager.getTagById(sourceTag.id);
            const targetRetrieved = await tagManager.getTagById(targetTag.id);

            expect(sourceRetrieved).toBeUndefined();
            expect(targetRetrieved).toBeDefined();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Category and Tag Interaction Properties', () => {
    test('categories and tags should be independent', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      const tag = await tagManager.createTag({ name: 'test-tag' });

      await categoryManager.deleteCategory(category.id);

      const retrievedTag = await tagManager.getTagById(tag.id);
      expect(retrievedTag).toBeDefined();
    });

    test('deleting a category should not affect tags', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      const tag = await tagManager.createTag({ name: 'test-tag' });

      await categoryManager.deleteCategory(category.id);

      const tags = await tagManager.getTags();
      expect(tags.some((t) => t.id === tag.id)).toBe(true);
    });

    test('deleting a tag should not affect categories', async () => {
      const category = await categoryManager.createCategory({
        name: 'Test Category',
        color: '#ff0000',
        icon: '📁',
      });

      const tag = await tagManager.createTag({ name: 'test-tag' });

      await tagManager.deleteTag(tag.id);

      const categories = await categoryManager.getCategories();
      expect(categories.some((c) => c.id === category.id)).toBe(true);
    });
  });
});
