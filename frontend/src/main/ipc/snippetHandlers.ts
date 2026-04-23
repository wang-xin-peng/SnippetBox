import { ipcMain } from 'electron';
import { getDatabaseManager } from '../database';
import { SnippetManager } from '../services/SnippetManager';
import { VectorStore } from '../services/VectorStore';
import { getAuthService } from '../services/AuthService';
import { CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter } from '../../shared/types';

let snippetManager: SnippetManager | null = null;
let vectorStore: VectorStore | null = null;

function getVectorStore(): VectorStore {
  if (!vectorStore) vectorStore = new VectorStore();
  return vectorStore;
}

// 异步生成向量，不阻塞主流程
function generateVectorAsync(id: string, title: string, code: string, description?: string) {
  setImmediate(async () => {
    try {
      // 组合标题、描述和代码，提高语义搜索的准确性
      const content = [
        title,
        description || '',
        code
      ].filter(Boolean).join('\n');
      
      await getVectorStore().addVector(id, content);
      console.log(`[SnippetHandlers] Vector generated for snippet: ${id}`);
    } catch (e) {
      // 模型未加载时静默失败，不影响片段保存
      console.warn(`[SnippetHandlers] Vector generation skipped for ${id}:`, (e as any).message);
    }
  });
}

/**
 * 注册片段相关的 IPC 处理器
 */
export function registerSnippetHandlers() {
  console.log('[SnippetHandlers] Registering snippet IPC handlers...');
  
  try {
    const dbManager = getDatabaseManager();
    const db = dbManager.getDb();
    snippetManager = new SnippetManager(db);
    console.log('[SnippetHandlers] SnippetManager initialized successfully');
  } catch (error) {
    console.error('[SnippetHandlers] Failed to initialize SnippetManager:', error);
    return;
  }

  // 创建片段
  ipcMain.handle('snippet:create', async (_event, data: CreateSnippetDTO) => {
    try {
      console.log('[SnippetHandlers] Creating snippet:', data.title);
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      const authService = getAuthService();
      const storageScope = authService.isLoggedIn() ? 'cloud' : 'local';
      const snippet = await snippetManager.createSnippet(data, storageScope);
      console.log('[SnippetHandlers] Snippet created successfully:', snippet.id, 'storageScope:', storageScope);
      // 异步生成向量，不阻塞返回
      generateVectorAsync(snippet.id, snippet.title, snippet.code, snippet.description);
      return snippet;
    } catch (error) {
      console.error('[SnippetHandlers] Failed to create snippet:', error);
      throw error;
    }
  });

  // 获取片段列表
  ipcMain.handle('snippet:list', async (_event, filter?: SnippetFilter) => {
    try {
      console.log('[SnippetHandlers] Listing snippets with filter:', filter);
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      const snippets = await snippetManager.listSnippets(filter);
      console.log('[SnippetHandlers] Found', snippets.length, 'snippets');
      return snippets;
    } catch (error) {
      console.error('[SnippetHandlers] Failed to list snippets:', error);
      throw error;
    }
  });

  // 获取单个片段
  ipcMain.handle('snippet:get', async (_event, id: string) => {
    try {
      console.log('[SnippetHandlers] Getting snippet:', id);
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      const snippet = await snippetManager.getSnippet(id);
      if (!snippet) {
        throw new Error(`Snippet not found: ${id}`);
      }
      return snippet;
    } catch (error) {
      console.error('[SnippetHandlers] Failed to get snippet:', error);
      throw error;
    }
  });

  // 更新片段
  ipcMain.handle('snippet:update', async (_event, id: string, data: UpdateSnippetDTO) => {
    try {
      console.log('[SnippetHandlers] Updating snippet:', id);
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      const snippet = await snippetManager.updateSnippet(id, data);
      console.log('[SnippetHandlers] Snippet updated successfully');
      // 更新向量（先删旧的再生成新的）
      setImmediate(async () => {
        try {
          await getVectorStore().deleteVector(id);
          // 组合标题、描述和代码
          const content = [
            snippet.title,
            snippet.description || '',
            snippet.code
          ].filter(Boolean).join('\n');
          await getVectorStore().addVector(id, content);
        } catch (e) {
          console.warn(`[SnippetHandlers] Vector update skipped for ${id}:`, (e as any).message);
        }
      });
      return snippet;
    } catch (error) {
      console.error('[SnippetHandlers] Failed to update snippet:', error);
      throw error;
    }
  });

  // 删除片段（移到回收站）
  ipcMain.handle('snippet:delete', async (_event, id: string) => {
    try {
      console.log('[SnippetHandlers] Moving snippet to trash:', id);
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      await snippetManager.deleteSnippet(id);
      console.log('[SnippetHandlers] Snippet moved to trash successfully');
      return true;
    } catch (error) {
      console.error('[SnippetHandlers] Failed to delete snippet:', error);
      throw error;
    }
  });

  // 列出回收站片段
  ipcMain.handle('trash:list', async () => {
    try {
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      return await snippetManager.listTrash();
    } catch (error) {
      console.error('[SnippetHandlers] Failed to list trash:', error);
      throw error;
    }
  });

  // 恢复回收站片段
  ipcMain.handle('trash:restore', async (_event, id: string) => {
    try {
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      return await snippetManager.restoreSnippet(id);
    } catch (error) {
      console.error('[SnippetHandlers] Failed to restore snippet:', error);
      throw error;
    }
  });

  // 永久删除片段
  ipcMain.handle('trash:permanentDelete', async (_event, id: string) => {
    try {
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      await snippetManager.permanentDelete(id);
      return true;
    } catch (error) {
      console.error('[SnippetHandlers] Failed to permanently delete snippet:', error);
      throw error;
    }
  });

  // 清空回收站
  ipcMain.handle('trash:empty', async () => {
    try {
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      await snippetManager.emptyTrash();
      return true;
    } catch (error) {
      console.error('[SnippetHandlers] Failed to empty trash:', error);
      throw error;
    }
  });

  // 搜索片段
  ipcMain.handle('snippet:search', async (_event, query: string) => {
    try {
      console.log('[SnippetHandlers] Searching snippets:', query);
      if (!snippetManager) throw new Error('SnippetManager not initialized');
      const snippets = await snippetManager.searchSnippets(query);
      console.log('[SnippetHandlers] Found', snippets.length, 'matching snippets');
      return snippets;
    } catch (error) {
      console.error('[SnippetHandlers] Failed to search snippets:', error);
      throw error;
    }
  });

  console.log('[SnippetHandlers] All snippet handlers registered successfully');
}
