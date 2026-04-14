import { contextBridge, ipcRenderer } from 'electron';
import { Snippet, CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter, Category, Tag } from '../shared/types';
import { MirrorInfo, DownloadProgress } from '../shared/types/model';

// 暴露 Electron API
contextBridge.exposeInMainWorld('electronAPI', {
  snippet: {
    create: (data: CreateSnippetDTO): Promise<Snippet> =>
      ipcRenderer.invoke('snippet:create', data),
    list: (filter?: SnippetFilter): Promise<Snippet[]> =>
      ipcRenderer.invoke('snippet:list', filter),
    get: (id: string): Promise<Snippet> => ipcRenderer.invoke('snippet:get', id),
    update: (id: string, data: UpdateSnippetDTO): Promise<Snippet> =>
      ipcRenderer.invoke('snippet:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('snippet:delete', id),
    search: (query: string): Promise<Snippet[]> => ipcRenderer.invoke('snippet:search', query),
  },
  category: {
    create: (name: string, color?: string, icon?: string): Promise<Category> =>
      ipcRenderer.invoke('category:create', name, color, icon),
    list: (): Promise<Category[]> => ipcRenderer.invoke('category:list'),
    get: (id: string): Promise<Category> => ipcRenderer.invoke('category:get', id),
    update: (id: string, name?: string, color?: string, icon?: string): Promise<Category> =>
      ipcRenderer.invoke('category:update', id, name, color, icon),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('category:delete', id),
  },
  tag: {
    create: (name: string): Promise<Tag> => ipcRenderer.invoke('tag:create', name),
    list: (): Promise<Tag[]> => ipcRenderer.invoke('tag:list'),
    get: (id: string): Promise<Tag> => ipcRenderer.invoke('tag:get', id),
    findByName: (name: string): Promise<Tag | undefined> =>
      ipcRenderer.invoke('tag:findByName', name),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('tag:delete', id),
    merge: (sourceId: string, targetId: string): Promise<void> =>
      ipcRenderer.invoke('tag:merge', sourceId, targetId),
  },
});

// 暴露 IPC Renderer（用于直接调用）
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  },
  model: {
    getMirrors: (): Promise<MirrorInfo[]> => ipcRenderer.invoke('model:getMirrors'),
    startDownload: (mirrorUrl?: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('model:startDownload', mirrorUrl),
    pauseDownload: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('model:pauseDownload'),
    resumeDownload: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('model:resumeDownload'),
    cancelDownload: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('model:cancelDownload'),
    getProgress: (): Promise<DownloadProgress> => ipcRenderer.invoke('model:getProgress'),
    verifyModel: (filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('model:verifyModel', filePath),
    deleteModel: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('model:deleteModel'),
    isDownloaded: (): Promise<boolean> => ipcRenderer.invoke('model:isDownloaded'),
    getPath: (): Promise<string> => ipcRenderer.invoke('model:getPath'),
    onProgress: (callback: (progress: DownloadProgress) => void) => {
      const listener = (_event: any, progress: DownloadProgress) => callback(progress);
      ipcRenderer.on('model:progress', listener);
      return () => ipcRenderer.removeListener('model:progress', listener);
    },
  },
  embedding: {
    initialize: (useWorker?: boolean): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('embedding:initialize', useWorker),
    isLoaded: (useWorker?: boolean): Promise<{ loaded: boolean; error?: string }> =>
      ipcRenderer.invoke('embedding:isLoaded', useWorker),
    embed: (text: string, useWorker?: boolean): Promise<{ success: boolean; embedding?: number[]; error?: string }> =>
      ipcRenderer.invoke('embedding:embed', text, useWorker),
    batchEmbed: (texts: string[], useWorker?: boolean): Promise<{ success: boolean; embeddings?: number[][]; error?: string }> =>
      ipcRenderer.invoke('embedding:batchEmbed', texts, useWorker),
    unload: (useWorker?: boolean): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('embedding:unload', useWorker),
    getInfo: (): Promise<{ success: boolean; info?: any; error?: string }> =>
      ipcRenderer.invoke('embedding:getInfo'),
  },
});

