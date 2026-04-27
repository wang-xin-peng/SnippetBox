import { Snippet, CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter, Category, Tag, BatchResult } from '../shared/types';
import { MirrorInfo, DownloadProgress } from '../shared/types/model';
import { User, LoginResult, AuthCapabilities } from '../main/services/AuthService';
import { SyncResult, PushResult, PullResult, SyncStatus, Conflict, ConflictResolution, QueueStatus, ConflictHistoryEntry } from '../shared/types/sync';

declare global {
  interface Window {
    electronAPI: {
      snippet: {
        create: (data: CreateSnippetDTO) => Promise<Snippet>;
        list: (filter?: SnippetFilter) => Promise<Snippet[]>;
        get: (id: string) => Promise<Snippet>;
        update: (id: string, data: UpdateSnippetDTO) => Promise<Snippet>;
        delete: (id: string) => Promise<void>;
        search: (query: string) => Promise<Snippet[]>;
      };
      category: {
        create: (name: string, color?: string, icon?: string) => Promise<Category>;
        list: () => Promise<Category[]>;
        get: (id: string) => Promise<Category>;
        update: (id: string, name?: string, color?: string, icon?: string) => Promise<Category>;
        delete: (id: string) => Promise<void>;
      };
      tag: {
        create: (name: string) => Promise<Tag>;
        list: () => Promise<Tag[]>;
        get: (id: string) => Promise<Tag>;
        findByName: (name: string) => Promise<Tag | undefined>;
        delete: (id: string) => Promise<void>;
        merge: (sourceId: string, targetId: string) => Promise<void>;
      };
    };
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, listener: (...args: any[]) => void) => () => void;
      };
      model: {
        getMirrors: () => Promise<MirrorInfo[]>;
        startDownload: (mirrorUrl?: string) => Promise<{ success: boolean; error?: string }>;
        pauseDownload: () => Promise<{ success: boolean; error?: string }>;
        resumeDownload: () => Promise<{ success: boolean; error?: string }>;
        cancelDownload: () => Promise<{ success: boolean; error?: string }>;
        getProgress: () => Promise<DownloadProgress>;
        verifyModel: (filePath: string) => Promise<boolean>;
        deleteModel: () => Promise<{ success: boolean; error?: string }>;
        isDownloaded: () => Promise<boolean>;
        getPath: () => Promise<string>;
        onProgress: (callback: (progress: DownloadProgress) => void) => () => void;
      };
      search: {
        keyword: (query: string) => Promise<any[]>;
        semantic: (query: string) => Promise<any[]>;
        capability: () => Promise<{ hasKeywordSearch: boolean; hasSemanticSearch: boolean; hasHybridSearch: boolean }>;
      };
      batch: {
        delete: (snippetIds: string[]) => Promise<BatchResult>;
        updateTags: (snippetIds: string[], tags: string[]) => Promise<BatchResult>;
        updateCategory: (snippetIds: string[], categoryId: string) => Promise<BatchResult>;
        export: (snippetIds: string[], format: string) => Promise<BatchResult>;
      };
      auth: {
        register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
        login: (email: string, password: string) => Promise<{ success: boolean; data?: LoginResult; error?: string }>;
        logout: () => Promise<{ success: boolean; error?: string }>;
        refresh: () => Promise<{ success: boolean; accessToken?: string; error?: string }>;
        getCurrentUser: () => Promise<{ success: boolean; user?: User | null; error?: string }>;
        isLoggedIn: () => Promise<{ isLoggedIn: boolean }>;
        getCapabilities: () => Promise<{ success: boolean; data?: AuthCapabilities; error?: string }>;
      };
      sync: {
        push: () => Promise<{ success: boolean; data?: PushResult; error?: string }>;
        pull: () => Promise<{ success: boolean; data?: PullResult; error?: string }>;
        sync: () => Promise<{ success: boolean; data?: SyncResult; error?: string }>;
        getStatus: () => Promise<SyncStatus>;
        enableAutoSync: (intervalMinutes: number) => Promise<{ success: boolean }>;
        disableAutoSync: () => Promise<{ success: boolean }>;
        resolveConflict: (conflict: Conflict, resolution: ConflictResolution) => Promise<{ success: boolean; error?: string }>;
        autoResolve: (conflicts: Conflict[], strategy: 'local' | 'cloud' | 'latest') => Promise<{ success: boolean; error?: string }>;
        getConflictHistory: () => Promise<ConflictHistoryEntry[]>;
        getQueueStatus: () => Promise<QueueStatus>;
        clearFailedQueue: () => Promise<{ success: boolean }>;
        getStorageUsage: () => Promise<{ success: boolean; data?: any; error?: string }>;
        onStatusChanged: (callback: (status: SyncStatus) => void) => () => void;
      };
    };
  }
}

export {};
