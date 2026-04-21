import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Snippet } from '../../../shared/types';
import { SnippetCard } from './SnippetCard';
import { SnippetFilter } from './SnippetFilter';
import { BatchSelection } from './BatchSelection';
import { BatchOperations } from './BatchOperations';
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

  // 批量选择状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number | null>(null);

  const loadSnippets = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.snippet.list();
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

      if (searchQuery) {
        if (searchMode === 'semantic') {
          try {
            const results = await window.electron.ipcRenderer.invoke('search:semantic', searchQuery);
            if (results && results.length > 0) {
              const snippetIds = new Set(results.map((r: any) => r.snippet.id));
              filtered = filtered.filter((s) => snippetIds.has(s.id));
              const scoreMap = new Map<string, number>(results.map((r: any) => [r.snippet.id, r.similarity as number]));
              filtered.sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));
            } else {
              filtered = [];
            }
          } catch {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (s) =>
                s.title.toLowerCase().includes(query) ||
                s.code.toLowerCase().includes(query) ||
                s.tags.some((tag) => tag.toLowerCase().includes(query))
            );
          }
        } else {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.code.toLowerCase().includes(query) ||
              s.tags.some((tag) => tag.toLowerCase().includes(query))
          );
        }
      }

      if (selectedLanguage) filtered = filtered.filter((s) => s.language === selectedLanguage);
      if (selectedCategory) filtered = filtered.filter((s) => s.category === selectedCategory);

      if (!searchQuery || searchMode !== 'semantic') {
        filtered.sort((a, b) => {
          const dateA = sortBy === 'updated' ? a.updatedAt : a.createdAt;
          const dateB = sortBy === 'updated' ? b.updatedAt : b.createdAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
      }

      setFilteredSnippets(filtered);
    };

    const timeoutId = setTimeout(filterSnippets, 300);
    return () => clearTimeout(timeoutId);
  }, [snippets, searchQuery, selectedLanguage, selectedCategory, sortBy, searchMode]);

  const handleDelete = async (id: string) => {
    try {
      await window.electronAPI.snippet.delete(id);
      setSnippets((prev) => prev.filter((s) => s.id !== id));
      onSnippetDeleted?.();
    } catch (error) {
      console.error('Failed to delete snippet:', error);
    }
  };

  // Shift 连续选择
  const handleToggleSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      const currentIndex = filteredSnippets.findIndex((s) => s.id === id);

      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (event.shiftKey && lastSelectedIndexRef.current !== null) {
          // Shift 连续选择
          const start = Math.min(lastSelectedIndexRef.current, currentIndex);
          const end = Math.max(lastSelectedIndexRef.current, currentIndex);
          for (let i = start; i <= end; i++) {
            next.add(filteredSnippets[i].id);
          }
        } else {
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }

        return next;
      });

      lastSelectedIndexRef.current = currentIndex;
    },
    [filteredSnippets]
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSnippets.map((s) => s.id)));
  }, [filteredSnippets]);

  const handleClearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleBatchMode = () => {
    setBatchMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
        lastSelectedIndexRef.current = null;
      }
      return !prev;
    });
  };

  // 批量操作完成后刷新列表
  const handleBatchOperationComplete = useCallback(
    (deletedIds?: string[]) => {
      if (deletedIds && deletedIds.length > 0) {
        setSnippets((prev) => prev.filter((s) => !deletedIds.includes(s.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deletedIds.forEach((id) => next.delete(id));
          return next;
        });
        onSnippetDeleted?.();
      } else {
        loadSnippets();
      }
    },
    [onSnippetDeleted]
  );

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
        <div className="snippet-list-header-actions">
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updated' | 'created')}
          >
            <option value="updated">Last Updated</option>
            <option value="created">Date Created</option>
          </select>
          <button
            className={`batch-mode-btn${batchMode ? ' active' : ''}`}
            onClick={toggleBatchMode}
          >
            {batchMode ? '退出批量' : '批量选择'}
          </button>
        </div>
      </div>

      {batchMode && (
        <>
          <BatchSelection
            totalCount={filteredSnippets.length}
            selectedIds={selectedIds}
            allIds={filteredSnippets.map((s) => s.id)}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
          />
          {selectedIds.size > 0 && (
            <BatchOperations
              selectedIds={selectedIds}
              onOperationComplete={handleBatchOperationComplete}
            />
          )}
        </>
      )}

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
              selectable={batchMode}
              selected={selectedIds.has(snippet.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};
