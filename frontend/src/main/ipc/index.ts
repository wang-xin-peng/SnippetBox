import { registerSnippetHandlers } from './snippetHandlers';
import { registerCategoryHandlers } from './categoryHandlers';
import { registerTagHandlers } from './tagHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import { registerModelHandlers } from './modelHandlers';
import { registerEmbeddingHandlers } from './embeddingHandlers';
import { registerSearchHandlers } from './searchHandlers';
import { registerExportHandlers } from './exportHandlers';
import { registerImportHandlers } from './importHandlers';
import { registerBatchHandlers } from './batchHandlers';

/**
 * 注册所有 IPC 处理器
 */
export function registerAllHandlers() {
  registerSnippetHandlers();
  registerCategoryHandlers();
  registerTagHandlers();
  registerSettingsHandlers();
  registerModelHandlers();
  registerEmbeddingHandlers();
  registerSearchHandlers();
  registerExportHandlers();
  registerImportHandlers();
  registerBatchHandlers();
}
