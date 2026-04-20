import { Snippet, CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter, Category, Tag } from '../shared/types';
import { MirrorInfo, DownloadProgress } from '../shared/types/model';

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
    };
  }
}

export {};
