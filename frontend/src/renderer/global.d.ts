import { Snippet, CreateSnippetDTO, UpdateSnippetDTO, SnippetFilter, Category, Tag } from '../shared/types';

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
  }
}

export {};
