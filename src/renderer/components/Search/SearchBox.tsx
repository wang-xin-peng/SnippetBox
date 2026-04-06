import React, { useState, useCallback, useRef, useEffect } from 'react';
import SearchResults from './SearchResults';
import SearchHistory from './SearchHistory';
import './Search.css';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  language: string;
  category?: string;
  tags?: string[];
  relevance: number;
}

interface SearchBoxProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onResultClick: (result: SearchResult) => void;
  placeholder?: string;
  debounceMs?: number;
  maxHistoryItems?: number;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  onSearch,
  onResultClick,
  placeholder = '搜索片段...',
  debounceMs = 300,
  maxHistoryItems = 10
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveToHistory = useCallback((searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    const newHistory = [
      trimmedQuery,
      ...history.filter(item => item !== trimmedQuery)
    ].slice(0, maxHistoryItems);

    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  }, [history, maxHistoryItems]);

  const removeFromHistory = useCallback((item: string) => {
    const newHistory = history.filter(h => h !== item);
    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, debounceMs);
  }, [debounceMs, performSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      saveToHistory(query);
      performSearch(query);
      setShowHistory(false);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      setShowHistory(false);
      inputRef.current?.blur();
    }
  }, [query, saveToHistory, performSearch]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (!query && history.length > 0) {
      setShowHistory(true);
    }
  }, [query, history.length]);

  const handleHistoryItemClick = useCallback((item: string) => {
    setQuery(item);
    setShowHistory(false);
    performSearch(item);
    saveToHistory(item);
  }, [performSearch, saveToHistory]);

  const handleResultClick = useCallback((result: SearchResult) => {
    saveToHistory(query);
    onResultClick(result);
    setIsFocused(false);
  }, [query, saveToHistory, onResultClick]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="search-box-container" ref={containerRef}>
      <div className={`search-box ${isFocused ? 'focused' : ''}`}>
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="search-input"
        />
        {isSearching && <span className="search-loading">⏳</span>}
        {query && !isSearching && (
          <button className="search-clear" onClick={handleClear}>
            ✕
          </button>
        )}
      </div>

      {isFocused && showHistory && !query && history.length > 0 && (
        <SearchHistory
          history={history}
          onItemClick={handleHistoryItemClick}
          onRemoveItem={removeFromHistory}
          onClear={clearHistory}
        />
      )}

      {isFocused && results.length > 0 && (
        <SearchResults
          results={results}
          query={query}
          onItemClick={handleResultClick}
        />
      )}

      {isFocused && query && !isSearching && results.length === 0 && (
        <div className="search-no-results">
          <p>未找到匹配 "{query}" 的结果</p>
        </div>
      )}
    </div>
  );
};

export default SearchBox;
