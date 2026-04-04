import { contextBridge, ipcRenderer } from 'electron';

// 定义回调函数类型
type IpcCallback = (...args: unknown[]) => void;

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 示例：发送消息到主进程
  send: (channel: string, data: unknown) => {
    const validChannels = ['snippet:create', 'snippet:update', 'snippet:delete'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // 示例：接收主进程消息
  on: (channel: string, callback: IpcCallback) => {
    const validChannels = ['snippet:created', 'snippet:updated', 'snippet:deleted'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
});
