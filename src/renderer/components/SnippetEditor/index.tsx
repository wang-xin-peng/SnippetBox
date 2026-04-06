import React, { useState, useEffect } from 'react';
import { Snippet, CreateSnippetDTO, UpdateSnippetDTO } from '../../../shared/types';
import { CodeEditor } from '../CodeEditor';
import { SnippetForm } from './SnippetForm';
import './SnippetEditor.css';

interface SnippetEditorProps {
  snippet?: Snippet;
  onSave: () => void;
  onCancel: () => void;
}

export const SnippetEditor: React.FC<SnippetEditorProps> = ({ snippet, onSave, onCancel }) => {
  const [code, setCode] = useState(snippet?.code || '');
  const [language, setLanguage] = useState(snippet?.language || 'JavaScript');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 监听编辑器保存事件
    const handleSave = () => {
      handleFormSubmit({
        title: snippet?.title || 'Untitled',
        code,
        language,
        category: snippet?.category,
        tags: snippet?.tags,
      });
    };

    window.addEventListener('editor:save', handleSave);
    return () => window.removeEventListener('editor:save', handleSave);
  }, [code, language, snippet]);

  const handleFormSubmit = async (formData: any) => {
    setIsSaving(true);

    try {
      const api = (window as any).electronAPI;
      const data = {
        ...formData,
        code,
      };

      if (snippet) {
        // 更新现有片段
        await api.snippet.update(snippet.id, data);
      } else {
        // 创建新片段
        await api.snippet.create(data);
      }

      onSave();
    } catch (error) {
      console.error('Failed to save snippet:', error);
      alert('Failed to save snippet. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  return (
    <div className="snippet-editor">
      <div className="snippet-editor-header">
        <h2>{snippet ? 'Edit Snippet' : 'New Snippet'}</h2>
      </div>

      <div className="snippet-editor-content">
        <div className="snippet-editor-sidebar">
          <SnippetForm
            initialData={
              snippet
                ? {
                    title: snippet.title,
                    code: snippet.code,
                    language: snippet.language,
                    category: snippet.category,
                    tags: snippet.tags,
                  }
                : undefined
            }
            onSubmit={handleFormSubmit}
            onCancel={onCancel}
          />
        </div>

        <div className="snippet-editor-main">
          <div className="language-selector">
            <label htmlFor="editor-language">Code Language:</label>
            <select
              id="editor-language"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="language-select"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="sql">SQL</option>
              <option value="shell">Shell</option>
            </select>
          </div>

          <CodeEditor
            value={code}
            language={language.toLowerCase()}
            onChange={setCode}
            height="calc(100vh - 250px)"
          />
        </div>
      </div>

      {isSaving && (
        <div className="saving-overlay">
          <div className="saving-spinner">Saving...</div>
        </div>
      )}
    </div>
  );
};
