import React from 'react';
import { Snippet } from '../../../shared/types';

interface SnippetCardProps {
  snippet: Snippet;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export const SnippetCard: React.FC<SnippetCardProps> = ({ snippet, onClick, onDelete }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this snippet?')) {
      onDelete(snippet.id);
    }
  };

  return (
    <div className="snippet-card" onClick={onClick}>
      <div className="snippet-card-header">
        <h3 className="snippet-title">{snippet.title}</h3>
        <button className="delete-btn" onClick={handleDelete}>
          ×
        </button>
      </div>
      <div className="snippet-meta">
        <span className="language-tag">{snippet.language}</span>
        {snippet.category && <span className="category-tag">{snippet.category}</span>}
      </div>
      <div className="snippet-tags">
        {snippet.tags.map((tag, index) => (
          <span key={index} className="tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="snippet-code-preview">
        <code>{snippet.code.substring(0, 100)}...</code>
      </div>
      <div className="snippet-footer">
        <span className="snippet-date">{new Date(snippet.updatedAt).toLocaleDateString()}</span>
        <span className="snippet-access">Views: {snippet.accessCount}</span>
      </div>
    </div>
  );
};
