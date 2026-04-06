import React from 'react';

interface SearchHistoryProps {
  history: string[];
  onItemClick: (item: string) => void;
  onRemoveItem: (item: string) => void;
  onClear: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onItemClick,
  onRemoveItem,
  onClear
}) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="search-history">
      <div className="search-history-header">
        <span className="history-title">搜索历史</span>
        <button className="history-clear" onClick={onClear}>
          清空
        </button>
      </div>
      
      <div className="search-history-list">
        {history.map((item, index) => (
          <div key={`${item}-${index}`} className="history-item">
            <span className="history-icon">🕐</span>
            <span 
              className="history-text"
              onClick={() => onItemClick(item)}
            >
              {item}
            </span>
            <button
              className="history-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveItem(item);
              }}
              title="删除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;
