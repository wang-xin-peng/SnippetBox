# IPC 通信修复文档

## 问题描述

在新建片段保存时出现以下错误：

```
Error occurred in handler for 'snippet:list': Error: No handler registered for 'snippet:list'
Error occurred in handler for 'snippet:create': Error: No handler registered for 'snippet:create'
```

## 根本原因

主进程（main process）中没有注册 IPC 处理器来响应渲染进程（renderer process）的请求。虽然 preload.ts 文件暴露了 API，但主进程中缺少对应的处理器实现。

## 修复内容

### 1. 创建 IPC 处理器文件

创建了以下文件来处理 IPC 通信：

- `src/main/ipc/snippetHandlers.ts` - 片段相关的 IPC 处理器
- `src/main/ipc/categoryHandlers.ts` - 分类相关的 IPC 处理器
- `src/main/ipc/tagHandlers.ts` - 标签相关的 IPC 处理器
- `src/main/ipc/index.ts` - 统一注册入口

### 2. 注册的 IPC 处理器

#### 片段处理器（snippet）
- `snippet:create` - 创建片段
- `snippet:list` - 获取片段列表
- `snippet:get` - 获取单个片段
- `snippet:update` - 更新片段
- `snippet:delete` - 删除片段
- `snippet:search` - 搜索片段

#### 分类处理器（category）
- `category:create` - 创建分类
- `category:list` - 获取分类列表
- `category:get` - 获取单个分类
- `category:update` - 更新分类
- `category:delete` - 删除分类

#### 标签处理器（tag）
- `tag:create` - 创建标签
- `tag:list` - 获取标签列表
- `tag:get` - 获取单个标签
- `tag:findByName` - 按名称查找标签
- `tag:delete` - 删除标签
- `tag:merge` - 合并标签

### 3. 更新主进程入口

在 `src/main/index.ts` 中：
- 导入 IPC 处理器注册函数
- 在应用启动时初始化数据库
- 注册所有 IPC 处理器

```typescript
app.whenReady().then(async () => {
  // 初始化数据库
  const dbManager = getDatabaseManager();
  await dbManager.connect();
  
  // 注册所有 IPC 处理器
  registerAllHandlers();
  
  // 创建窗口
  createWindow();
});
```

### 4. 更新类型定义

在 `src/shared/types/index.ts` 中添加了：
- `Category` 接口
- `CreateCategoryDTO` 接口
- `UpdateCategoryDTO` 接口
- `Tag` 接口
- `CreateTagDTO` 接口

### 5. 更新 Preload 文件

在 `src/main/preload.ts` 中：
- 添加了 `category` API 暴露
- 添加了 `tag` API 暴露
- 修正了 ID 类型（从 `number` 改为 `string`）

### 6. 创建全局类型声明

创建了 `src/renderer/global.d.ts` 文件，为 `window.electronAPI` 提供完整的 TypeScript 类型定义。

## 技术细节

### IPC 通信流程

1. **渲染进程** → 通过 `window.electronAPI` 调用方法
2. **Preload 脚本** → 使用 `ipcRenderer.invoke()` 发送请求到主进程
3. **主进程** → `ipcMain.handle()` 接收请求并调用服务层
4. **服务层** → 执行业务逻辑并返回结果
5. **主进程** → 将结果返回给渲染进程

### 数据库初始化

- 使用单例模式管理数据库连接
- 在应用启动时异步连接数据库
- 确保 IPC 处理器注册前数据库已就绪

### 错误处理

所有 IPC 处理器都包含 try-catch 错误处理：
- 捕获服务层抛出的错误
- 记录错误日志到控制台
- 将错误重新抛出给渲染进程

## 测试建议

1. 启动应用：`npm run dev`
2. 测试创建片段功能
3. 测试片段列表加载
4. 测试搜索功能
5. 测试分类和标签管理

## 相关文件

- `src/main/index.ts` - 主进程入口
- `src/main/ipc/*.ts` - IPC 处理器
- `src/main/preload.ts` - Preload 脚本
- `src/shared/types/index.ts` - 共享类型定义
- `src/renderer/global.d.ts` - 全局类型声明

## 修复日期

2026年4月7日


## 常见问题

### 问题：better-sqlite3 模块版本不匹配

**错误信息**：
```
The module 'better_sqlite3.node' was compiled against a different Node.js version using NODE_MODULE_VERSION 127. 
This version of Node.js requires NODE_MODULE_VERSION 119.
```

**原因**：
`better-sqlite3` 是一个原生 Node.js 模块，需要针对 Electron 的特定 Node.js 版本编译。当你使用 `npm install` 安装时，它会针对系统的 Node.js 版本编译，而不是 Electron 的版本。

**解决方案**：

1. **手动重建**（临时解决）：
   ```bash
   npm rebuild better-sqlite3 --build-from-source
   ```

2. **自动重建**（永久解决）：
   
   已在 `package.json` 中添加了 `postinstall` 脚本：
   ```json
   "scripts": {
     "postinstall": "electron-rebuild -f -w better-sqlite3"
   }
   ```
   
   这样每次运行 `npm install` 后都会自动重建 `better-sqlite3`。

3. **安装依赖**：
   ```bash
   npm install --save-dev @electron/rebuild
   ```

**验证修复**：
重新启动应用：
```bash
npm run dev
```

应该不再出现模块版本错误，数据库可以正常连接。
