import { contextBridge, ipcRenderer } from 'electron';
import { Snippet, CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter } from '../shared/types';

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
});
