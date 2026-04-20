import React, { useState, useEffect, useCallback } from 'react';
import { Snippet } from '../../../shared/types';
import { SnippetCard } from './SnippetCard';
import { SnippetFilter } from './SnippetFilter';
import './SnippetList.css';

interface SnippetListProps {
  onSnippetClick: (snippet: Snippet) => void;
  onSnippetDeleted?: () => void;
}

export const SnippetList: React.FC<SnippetListProps> = ({ onSnippetClick, onSnippetDeleted }) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created'>('updated');
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');

  const loadSnippets = async () => {
    try {
      setLoading(true);
      const api = (window as any).electronAPI;
      const data = await api.snippet.list();
      setSnippets(data);
    } catch (error) {
      console.error('Failed to load snippets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSearchMode = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('settings:getWizardChoices');
      if (result.success && result.data?.searchMode) {
        setSearchMode(result.data.searchMode === 'local' ? 'semantic' : 'keyword');
      }
    } catch (error) {
      console.error('Failed to load search mode:', error);
    }
  };

  useEffect(() => {
    loadSnippets();
    loadSearchMode();
  }, []);

  useEffect(() => {
    const filterSnippets = async () => {
      let filtered = [...snippets];

      // 搜索过滤
      if (searchQuery) {
        if (searchMode === 'semantic') {
          // 使用语义搜索
          try {
            console.log('[SnippetList] Performing semantic search:', searchQuery);
            const results = await window.electron.ipcRenderer.invoke('search:semantic', searchQuery);
            console.log('[SnippetList] Semantic search results:', results);
            
            if (results && results.length > 0) {
              // 将搜索结果转换为片段列表
              const snippetIds = new Set(results.map((r: any) => r.snippet.id));
              filtered = filtered.filter(s => snippetIds.has(s.id));
              
              // 按相似度排序
              const scoreMap = new Map(results.map((r: any) => [r.snippet.id, r.similarity]));
              filtered.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));
              
              console.log('[SnippetList] Filtered to', filtered.length, 'snippets by semantic search');
            } else {
              console.log('[SnippetList] No semantic search results, showing empty list');
              filtered = [];
            }
          } catch (error) {
            console.error('[SnippetList] Semantic search failed, falling back to keyword search:', error);
            // 降级到关键词搜索
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (s) =>
                s.title.toLowerCase().includes(query) ||
                s.code.toLowerCase().includes(query) ||
                s.tags.some((tag) => tag.toLowerCase().includes(query))
            );
          }
        } else {
          // 使用关键词搜索
          console.log('[SnippetList] Performing keyword search:', searchQuery);
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.code.toLowerCase().includes(query) ||
              s.tags.some((tag) => tag.toLowerCase().includes(query))
          );
          console.log('[SnippetList] Filtered to', filtered.length, 'snippets by keyword search');
        }
      }

      // 语言过滤
      if (selectedLanguage) {
        filtered = filtered.filter((s) => s.language === selectedLanguage);
      }

      // 分类过滤
      if (selectedCategory) {
        filtered = filtered.filter((s) => s.category === selectedCategory);
      }

      // 排序（仅在非语义搜索时排序，语义搜索已按相似度排序）
      if (!searchQuery || searchMode !== 'semantic') {
        filtered.sort((a, b) => {
          const dateA = sortBy === 'updated' ? a.updatedAt : a.createdAt;
          const dateB = sortBy === 'updated' ? b.updatedAt : b.createdAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
      }

      setFilteredSnippets(filtered);
    };

    // 使用 setTimeout 防抖，避免频繁执行
    const timeoutId = setTimeout(() => {
      filterSnippets();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [snippets, searchQuery, selectedLanguage, selectedCategory, sortBy, searchMode]);

  const handleDelete = async (id: string) => {
    try {
      const api = (window as any).electronAPI;
      await api.snippet.delete(id);
      setSnippets(snippets.filter((s) => s.id !== id));
      onSnippetDeleted?.();
    } catch (error) {
      console.error('Failed to delete snippet:', error);
    }
  };

  if (loading) {
    return <div className="snippet-list-loading">Loading snippets...</div>;
  }

  return (
    <div className="snippet-list">
      <SnippetFilter
        searchQuery={searchQuery}
        selectedLanguage={selectedLanguage}
        selectedCategory={selectedCategory}
        onSearchChange={setSearchQuery}
        onLanguageChange={setSelectedLanguage}
        onCategoryChange={setSelectedCategory}
      />

      <div className="snippet-list-header">
        <h2>Snippets ({filteredSnippets.length})</h2>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'updated' | 'created')}
        >
          <option value="updated">Last Updated</option>
          <option value="created">Date Created</option>
        </select>
      </div>

      <div className="snippet-list-grid">
        {filteredSnippets.length === 0 ? (
          <div className="no-snippets">No snippets found</div>
        ) : (
          filteredSnippets.map((snippet) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              onClick={() => onSnippetClick(snippet)}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};
