import { contextBridge, ipcRenderer } from 'electron';
import { Snippet, CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter, Category, Tag } from '../shared/types';

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

