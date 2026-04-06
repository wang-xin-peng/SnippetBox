import React, { useState, useCallback } from 'react';
import './TagInput.css';

interface Tag {
  id: string;
  name: string;
}

interface TagInputProps {
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({
  tags = [],
  onTagsChange,
  placeholder = '添加标签...',
  maxTags = 5,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = useCallback((tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName) return;
    if (tags.length >= maxTags) return;
    if (tags.some(tag => tag.name.toLowerCase() === trimmedName.toLowerCase())) return;

    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: trimmedName
    };

    onTagsChange([...tags, newTag]);
    setInputValue('');
    setShowSuggestions(false);
  }, [tags, maxTags, onTagsChange]);

  const removeTag = useCallback((tagId: string) => {
    onTagsChange(tags.filter(tag => tag.id !== tagId));
  }, [tags, onTagsChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.length > 0) {
      // 这里可以从服务器获取标签建议
      // 暂时使用本地过滤模拟
      const filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [tags]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1].id);
    }
  }, [inputValue, addTag, removeTag, tags]);

  const handleSuggestionClick = useCallback((suggestion: Tag) => {
    addTag(suggestion.name);
  }, [addTag]);

  if (disabled) {
    return (
      <div className="tag-input disabled">
        <div className="tags-container">
          {tags.map(tag => (
            <span key={tag.id} className="tag">
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tag-input">
      <div className="tags-container">
        {tags.map(tag => (
          <span key={tag.id} className="tag">
            {tag.name}
            <button
              type="button"
              className="tag-remove"
              onClick={() => removeTag(tag.id)}
              aria-label={`Remove tag ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={tags.length >= maxTags ? '达到标签上限' : placeholder}
          disabled={tags.length >= maxTags}
          className="tag-input-field"
        />
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.map(suggestion => (
            <div
              key={suggestion.id}
              className="tag-suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
