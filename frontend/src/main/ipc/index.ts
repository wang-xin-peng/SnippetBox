import { registerSnippetHandlers } from './snippetHandlers';
import { registerCategoryHandlers } from './categoryHandlers';
import { registerTagHandlers } from './tagHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import { registerModelHandlers } from './modelHandlers';
import { registerEmbeddingHandlers } from './embeddingHandlers';

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
}
