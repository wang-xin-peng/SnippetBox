import { contextBridge, ipcRenderer } from 'electron';
import { Snippet, CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter, Category, Tag } from '../shared/types';
import { MirrorInfo, DownloadProgress } from '../shared/types/model';
import { ConflictResolution, Conflict } from '../shared/types/sync';
import { AuthCapabilities } from './services/AuthService';

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
    on: (channel: string, listener: (...args: any[]) => void) => {
      const wrapped = (_event: any, ...args: any[]) => listener(_event, ...args);
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    },
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
  search: {
    keyword: (query: string) => ipcRenderer.invoke('search:keyword', query),
    semantic: (query: string) => ipcRenderer.invoke('search:semantic', query),
    capability: () => ipcRenderer.invoke('search:capability'),
  },
  batch: {
    delete: (snippetIds: string[]) => ipcRenderer.invoke('batch:delete', snippetIds),
    updateTags: (snippetIds: string[], tags: string[]) =>
      ipcRenderer.invoke('batch:update-tags', snippetIds, tags),
    updateCategory: (snippetIds: string[], categoryId: string) =>
      ipcRenderer.invoke('batch:update-category', snippetIds, categoryId),
    export: (snippetIds: string[], format: string) =>
      ipcRenderer.invoke('batch:export', snippetIds, format),
  },
  auth: {
    register: (email: string, password: string, username: string) =>
      ipcRenderer.invoke('auth:register', email, password, username),
    login: (email: string, password: string) =>
      ipcRenderer.invoke('auth:login', email, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    refresh: () => ipcRenderer.invoke('auth:refresh'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    isLoggedIn: () => ipcRenderer.invoke('auth:isLoggedIn'),
    getCapabilities: (): Promise<{ success: boolean; data?: AuthCapabilities; error?: string }> =>
      ipcRenderer.invoke('auth:getCapabilities'),
  },
  sync: {
    push: () => ipcRenderer.invoke('sync:push'),
    pull: () => ipcRenderer.invoke('sync:pull'),
    sync: () => ipcRenderer.invoke('sync:sync'),
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    enableAutoSync: (intervalMinutes: number) =>
      ipcRenderer.invoke('sync:enableAutoSync', intervalMinutes),
    disableAutoSync: () => ipcRenderer.invoke('sync:disableAutoSync'),
    resolveConflict: (conflict: Conflict, resolution: ConflictResolution) =>
      ipcRenderer.invoke('sync:resolveConflict', conflict, resolution),
    autoResolve: (conflicts: Conflict[], strategy: 'local' | 'cloud' | 'latest') =>
      ipcRenderer.invoke('sync:autoResolve', conflicts, strategy),
    getConflictHistory: () => ipcRenderer.invoke('sync:getConflictHistory'),
    getQueueStatus: () => ipcRenderer.invoke('sync:getQueueStatus'),
    clearFailedQueue: () => ipcRenderer.invoke('sync:clearFailedQueue'),
    onStatusChanged: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status);
      ipcRenderer.on('sync:statusChanged', listener);
      return () => ipcRenderer.removeListener('sync:statusChanged', listener);
    },
  },
});

