import React, { useState, useEffect } from 'react';
import { CodeEditor } from '../CodeEditor';
import { Snippet, UpdateSnippetDTO } from '../../../shared/types';
import { ShareButton } from '../Share/ShareButton';
import './NewSnippetModal.css'; // 复用同一套样式

interface Props {
  snippet: Snippet;
  onClose: () => void;
  onSaved: () => void;
}

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#',
  'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  'HTML', 'CSS', 'SQL', 'Shell', 'Dart', 'R', 'YAML', 'JSON',
];

export const EditSnippetModal: React.FC<Props> = ({ snippet, onClose, onSaved }) => {
  const [title, setTitle] = useState(snippet.title);
  const [description, setDescription] = useState((snippet as any).description || '');
  const [language, setLanguage] = useState(snippet.language || 'JavaScript');
  const [category, setCategory] = useState(snippet.category || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(snippet.tags || []);
  const [code, setCode] = useState(snippet.code || '');
  const [titleError, setTitleError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (window as any).electronAPI?.category?.list()
      .then((cats: any[]) => setCategories(cats))
      .catch(() => {});
  }, []);

  // 语言变化时自动匹配分类（仅当用户未手动选过分类时）
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    const match = categories.find(c => c.name.toLowerCase() === lang.toLowerCase());
    if (match && !category) setCategory(match.id);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const handleSave = async () => {
    if (!title.trim()) { setTitleError('标题不能为空'); return; }
    setIsSaving(true);
    try {
      const data: UpdateSnippetDTO = {
        title: title.trim(),
        code,
        language,
        category: category || undefined,
        tags,
        description: description.trim() || undefined,
      } as any;
      await (window as any).electronAPI.snippet.update(snippet.id, data);
      onSaved();
    } catch (e) {
      console.error('Save failed:', e);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="nsm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="nsm-dialog">
        {/* Header */}
        <div className="nsm-header">
          <div>
            <div className="nsm-title">编辑代码片段</div>
            <div className="nsm-subtitle">填写代码片段的详细信息，支持多种编程语言</div>
          </div>
          <button className="nsm-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="nsm-body">
          <div className="nsm-field">
            <label className="nsm-label">标题 <span className="nsm-required">*</span></label>
            <input
              className={`nsm-input ${titleError ? 'nsm-input--error' : ''}`}
              placeholder="例如: React useState Hook"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleError(''); }}
              autoFocus
            />
            {titleError && <span className="nsm-error">{titleError}</span>}
          </div>

          <div className="nsm-field">
            <label className="nsm-label">描述</label>
            <textarea
              className="nsm-textarea"
              placeholder="简要描述这个代码片段的用途..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="nsm-row">
            <div className="nsm-field">
              <label className="nsm-label">编程语言</label>
              <select className="nsm-select" value={language} onChange={e => handleLanguageChange(e.target.value)}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="nsm-field">
              <label className="nsm-label">分类</label>
              <select className="nsm-select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">选择分类</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="nsm-field">
            <label className="nsm-label">标签</label>
            <div className="nsm-tag-row">
              <input
                className="nsm-input"
                placeholder="输入标签后按回车添加"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button className="nsm-tag-add" type="button" onClick={addTag}>添加</button>
            </div>
            {tags.length > 0 && (
              <div className="nsm-tags">
                {tags.map((tag, i) => (
                  <span key={i} className="nsm-tag">
                    {tag}
                    <button className="nsm-tag-remove" onClick={() => setTags(tags.filter(t => t !== tag))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="nsm-field">
            <label className="nsm-label">代码 <span className="nsm-required">*</span></label>
            <div className="nsm-code-wrap">
              <CodeEditor
                value={code}
                language={language.toLowerCase()}
                onChange={setCode}
                height="240px"
                theme="vs-dark"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="nsm-footer">
          <ShareButton snippet={snippet} />
          <div style={{ flex: 1 }} />
          <button className="nsm-btn" onClick={onClose}>取消</button>
          <button className="nsm-btn nsm-btn--primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '💾 保存片段'}
          </button>
        </div>
      </div>
    </div>
  );
};
