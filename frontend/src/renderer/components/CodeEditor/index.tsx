import React, { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  theme?: string;
  height?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  language,
  onChange,
  readOnly = false,
  theme,
  height = '400px',
}) => {
  const editorRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2a2a2a',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
      },
    });

    monaco.editor.setTheme('custom-dark');

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const event = new CustomEvent('editor:save');
      window.dispatchEvent(event);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      editor.trigger('keyboard', 'editor.action.clipboardCopyAction', {});
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.trigger('keyboard', 'actions.find', {});
    });
  };

  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  const copyToClipboard = () => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const selectedText = editorRef.current.getModel().getValueInRange(selection);
      navigator.clipboard.writeText(selectedText || value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="code-editor">
      <div className="code-editor-toolbar">
        <span className="language-badge">{language}</span>
        <button onClick={copyToClipboard} className={`copy-button ${copied ? 'copied' : ''}`} title="Copy to clipboard">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="custom-dark"
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          folding: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          insertSpaces: true,
        }}
      />
    </div>
  );
};
