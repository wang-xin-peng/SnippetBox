import React, { useState } from 'react';
import { CreateSnippetDTO, UpdateSnippetDTO } from '../../../shared/types';

interface SnippetFormProps {
  initialData?: {
    title: string;
    code: string;
    language: string;
    category: string;
    tags: string[];
  };
  onSubmit: (data: CreateSnippetDTO | UpdateSnippetDTO) => void;
  onCancel: () => void;
}

const LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'PHP',
  'Ruby',
  'Swift',
  'Kotlin',
  'HTML',
  'CSS',
  'SQL',
  'Shell',
  'Dart',
  'R',
  'Scala',
  'Haskell',
  'Perl',
  'Lua',
  'YAML',
  'JSON',
  'XML',
];

export const SnippetForm: React.FC<SnippetFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [language, setLanguage] = useState(initialData?.language || 'JavaScript');
  const [category, setCategory] = useState(initialData?.category || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!language) {
      newErrors.language = 'Language is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit({
      title: title.trim(),
      language,
      category: category || undefined,
      tags: tags.length > 0 ? tags : undefined,
    } as any);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <form className="snippet-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          className={`form-input ${errors.title ? 'error' : ''}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter snippet title"
        />
        {errors.title && <span className="error-message">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="language">Language *</label>
        <select
          id="language"
          className={`form-select ${errors.language ? 'error' : ''}`}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        {errors.language && <span className="error-message">{errors.language}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          className="form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Select category</option>
          <option value="cat_1">Uncategorized</option>
          <option value="cat_2">Algorithm</option>
          <option value="cat_3">UI Components</option>
          <option value="cat_4">Utils</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="tags">Tags</label>
        <div className="tag-input-container">
          <input
            id="tags"
            type="text"
            className="form-input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="Add tags (press Enter)"
          />
          <button type="button" onClick={handleAddTag} className="add-tag-btn">
            Add
          </button>
        </div>
        <div className="tags-display">
          {tags.map((tag, index) => (
            <span key={index} className="tag-item">
              {tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} className="remove-tag-btn">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-cancel">
          Cancel
        </button>
        <button type="submit" className="btn-submit">
          Save
        </button>
      </div>
    </form>
  );
};
