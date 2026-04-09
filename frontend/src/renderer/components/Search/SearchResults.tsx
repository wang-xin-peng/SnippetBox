import React, { useMemo } from 'react';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  language: string;
  category?: string;
  tags?: string[];
  relevance: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onItemClick: (result: SearchResult) => void;
  maxResults?: number;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  onItemClick,
  maxResults = 10
}) => {
  const highlightText = (text: string, searchQuery: string): React.ReactNode => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === searchQuery.toLowerCase()) {
        return (
          <mark key={index} className="highlight">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const displayResults = useMemo(() => {
    return results.slice(0, maxResults);
  }, [results, maxResults]);

  const getLanguageIcon = (language: string): string => {
    const icons: Record<string, string> = {
      javascript: '🟨',
      typescript: '🔷',
      python: '🐍',
      java: '☕',
      csharp: '💜',
      cpp: '⚡',
      go: '🐹',
      rust: '🦀',
      php: '🐘',
      ruby: '💎',
      swift: '🍎',
      kotlin: '🎯',
      html: '🌐',
      css: '🎨',
      sql: '🗃️',
      json: '📋',
      markdown: '📝',
      shell: '💻',
      default: '📄'
    };
    return icons[language.toLowerCase()] || icons.default;
  };

  if (displayResults.length === 0) {
    return null;
  }

  return (
    <div className="search-results">
      <div className="search-results-header">
        <span className="results-count">
          找到 {results.length} 个结果
          {results.length > maxResults && `（显示前 ${maxResults} 个）`}
        </span>
      </div>
      
      <div className="search-results-list">
        {displayResults.map((result) => (
          <div
            key={result.id}
            className="search-result-item"
            onClick={() => onItemClick(result)}
          >
            <div className="result-header">
              <span className="result-language-icon">
                {getLanguageIcon(result.language)}
              </span>
              <h4 className="result-title">
                {highlightText(result.title, query)}
              </h4>
              {result.category && (
                <span className="result-category">{result.category}</span>
              )}
            </div>
            
            <p className="result-content">
              {highlightText(truncateText(result.content), query)}
            </p>
            
            <div className="result-footer">
              <span className="result-language">{result.language}</span>
              {result.tags && result.tags.length > 0 && (
                <div className="result-tags">
                  {result.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="result-tag">
                      {tag}
                    </span>
                  ))}
                  {result.tags.length > 3 && (
                    <span className="result-tag-more">
                      +{result.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
              <span className="result-relevance">
                相关度: {Math.round(result.relevance * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
