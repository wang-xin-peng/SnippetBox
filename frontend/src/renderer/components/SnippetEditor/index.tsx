import React, { useState, useEffect } from 'react';
import { Snippet, CreateSnippetDTO, UpdateSnippetDTO } from '../../../shared/types';
import { CodeEditor } from '../CodeEditor';
import './SnippetEditor.css';

interface SnippetEditorProps {
  snippet?: Snippet;
  onSave: () => void;
  onCancel: () => void;
}

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#',
  'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  'HTML', 'CSS', 'SQL', 'Shell', 'Dart', 'R', 'YAML', 'JSON',
];

export const SnippetEditor: React.FC<SnippetEditorProps> = ({ snippet, onSave, onCancel }) => {
  const [title, setTitle] = useState(snippet?.title || '');
  const [code, setCode] = useState(snippet?.code || '');
  const [language, setLanguage] = useState(snippet?.language || 'JavaScript');
  const [category, setCategory] = useState(snippet?.category || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(snippet?.tags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (window as any).electronAPI?.category?.list().then((cats: any[]) => setCategories(cats)).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!title.trim()) { setTitleError('标题不能为空'); return; }
    setTitleError('');
    setIsSaving(true);
    try {
      const api = (window as any).electronAPI;
      const data = { title: title.trim(), code, language, category: category || undefined, tags };
      if (snippet) {
        await api.snippet.update(snippet.id, data as UpdateSnippetDTO);
      } else {
        await api.snippet.create(data as CreateSnippetDTO);
      }
      onSave();
    } catch (e) {
      console.error('Save failed:', e);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  return (
    <div className="snippet-editor">
      {/* Top bar */}
      <div className="editor-topbar">
        <span className="editor-topbar-title">
          {snippet ? '编辑片段' : '新建片段'}
        </span>
        <div className="editor-topbar-actions">
          <button className="editor-btn" onClick={onCancel}>取消</button>
          <button className="editor-btn primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '💾 保存'}
          </button>
        </div>
      </div>

      <div className="editor-body">
        {/* Left: form */}
        <div className="editor-form-panel">
          <div className="form-field">
            <label className="form-label">标题 *</label>
            <input
              className={`form-input ${titleError ? 'error' : ''}`}
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleError(''); }}
              placeholder="输入片段标题"
            />
            {titleError && <span className="form-error">{titleError}</span>}
          </div>

          <div className="form-field">
            <label className="form-label">语言</label>
            <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">分类</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">选择分类</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">标签</label>
            <div className="tag-input-row">
              <input
                className="form-input"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="输入标签后回车"
              />
              <button className="btn-add-tag" type="button" onClick={addTag}>添加</button>
            </div>
            {tags.length > 0 && (
              <div className="tags-list">
                {tags.map((tag, i) => (
                  <span key={i} className="tag-chip">
                    {tag}
                    <button className="tag-chip-remove" onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: code editor */}
        <div className="editor-code-panel">
          <div className="editor-code-toolbar">
            <label>语言：</label>
            <select
              className="editor-lang-select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <CodeEditor
            value={code}
            language={language.toLowerCase()}
            onChange={setCode}
            height="calc(100vh - 104px)"
            theme="vs-dark"
          />
        </div>
      </div>

      {isSaving && (
        <div className="saving-overlay">
          <div className="saving-spinner">保存中...</div>
        </div>
      )}
    </div>
  );
};
