import React from 'react';
import { Snippet } from '../../../shared/types';
import { ShareButton } from '../Share/ShareButton';

interface SnippetCardProps {
  snippet: Snippet;
  onClick: () => void;
  onDelete: (id: string) => void;
  // 批量选择相关
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string, event: React.MouseEvent) => void;
}

export const SnippetCard: React.FC<SnippetCardProps> = ({
  snippet,
  onClick,
  onDelete,
  selectable = false,
  selected = false,
  onToggleSelect,
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this snippet?')) {
      onDelete(snippet.id);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectable && onToggleSelect) {
      onToggleSelect(snippet.id, e);
    } else {
      onClick();
    }
  };

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(snippet.id, e);
  };

  return (
    <div
      className={`snippet-card${selected ? ' snippet-card-selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="snippet-card-header">
        {selectable && (
          <span className="snippet-checkbox" onClick={handleCheckboxChange}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => {}}
              aria-label={`选择 ${snippet.title}`}
            />
          </span>
        )}
        <h3 className="snippet-title">{snippet.title}</h3>
        {!selectable && (
          <button className="delete-btn" onClick={handleDelete}>
            ×
          </button>
        )}
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
        {!selectable && <ShareButton snippet={snippet} iconOnly />}
      </div>
    </div>
  );
};
