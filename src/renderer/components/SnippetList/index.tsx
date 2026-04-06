import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadSnippets();
  }, []);

  useEffect(() => {
    filterSnippets();
  }, [snippets, searchQuery, selectedLanguage, selectedCategory, sortBy]);

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

  const filterSnippets = () => {
    let filtered = [...snippets];

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query) ||
          s.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // 语言过滤
    if (selectedLanguage) {
      filtered = filtered.filter((s) => s.language === selectedLanguage);
    }

    // 分类过滤
    if (selectedCategory) {
      filtered = filtered.filter((s) => s.category === selectedCategory);
    }

    // 排序
    filtered.sort((a, b) => {
      const dateA = sortBy === 'updated' ? a.updatedAt : a.createdAt;
      const dateB = sortBy === 'updated' ? b.updatedAt : b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    setFilteredSnippets(filtered);
  };

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
