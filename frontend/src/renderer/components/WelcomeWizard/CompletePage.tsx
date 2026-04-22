import type { WizardStepProps } from '@shared/types/wizard';
import './CompletePage.css';

export function CompletePage({ onNext, onPrev, choices }: WizardStepProps) {
  return (
    <div className="complete-page">
      <div className="complete-header">
        <div className="complete-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="40" fill="var(--primary-color)" opacity="0.1" />
            <path
              d="M25 40L35 50L55 30"
              stroke="var(--primary-color)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2>设置完成！</h2>
        <p className="complete-subtitle">您已准备好开始使用 SnippetBox</p>
      </div>

      <div className="settings-summary">
        <h3>您的设置</h3>
        <div className="summary-item">
          <span className="summary-label">搜索模式：</span>
          <span className="summary-value">
            {choices.searchMode === 'lightweight' ? '轻量级搜索' : '本地模型搜索'}
          </span>
        </div>
        {choices.downloadModel && (
          <div className="summary-item">
            <span className="summary-label">模型下载：</span>
            <span className="summary-value">将在首次使用时自动下载</span>
          </div>
        )}
      </div>

      <div className="quick-tips">
        <h3>快速提示</h3>
        <div className="tip-item">
          <span className="tip-icon">💡</span>
          <span>使用 Ctrl+N 快速创建新代码片段</span>
        </div>
        <div className="tip-item">
          <span className="tip-icon">🔍</span>
          <span>使用 Ctrl+F 快速搜索代码片段</span>
        </div>
        <div className="tip-item">
          <span className="tip-icon">⚙️</span>
          <span>您可以随时在设置中更改这些选项</span>
        </div>
      </div>

      <div className="complete-actions">
        <button className="btn-secondary" onClick={onPrev}>
          上一步
        </button>
        <button className="btn-primary" onClick={onNext}>
          开始使用
        </button>
      </div>
    </div>
  );
}
