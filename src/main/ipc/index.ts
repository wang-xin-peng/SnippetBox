import { registerSnippetHandlers } from './snippetHandlers';
import { registerCategoryHandlers } from './categoryHandlers';
import { registerTagHandlers } from './tagHandlers';

/**
 * 注册所有 IPC 处理器
 */
export function registerAllHandlers() {
  registerSnippetHandlers();
  registerCategoryHandlers();
  registerTagHandlers();
}
