import React from 'react';
import Input from '../Input';

interface SnippetFilterProps {
  searchQuery: string;
  selectedLanguage: string;
  selectedCategory: string;
  onSearchChange: (query: string) => void;
  onLanguageChange: (language: string) => void;
  onCategoryChange: (category: string) => void;
}

const COMMON_LANGUAGES = [
  'All',
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'Go',
  'Rust',
  'HTML',
  'CSS',
  'SQL',
  'Shell',
];

export const SnippetFilter: React.FC<SnippetFilterProps> = ({
  searchQuery,
  selectedLanguage,
  selectedCategory,
  onSearchChange,
  onLanguageChange,
  onCategoryChange,
}) => {
  return (
    <div className="snippet-filter">
      <div className="filter-search">
        <Input
          type="text"
          placeholder="Search snippets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="filter-controls">
        <select
          className="filter-select"
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          {COMMON_LANGUAGES.map((lang) => (
            <option key={lang} value={lang === 'All' ? '' : lang}>
              {lang}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="cat_1">Uncategorized</option>
          <option value="cat_2">Algorithm</option>
          <option value="cat_3">UI Components</option>
          <option value="cat_4">Utils</option>
        </select>
      </div>
    </div>
  );
};
