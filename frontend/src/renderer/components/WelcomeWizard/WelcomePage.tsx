import type { WizardStepProps } from '@shared/types/wizard';
import './WelcomePage.css';

export function WelcomePage({ onNext, onSkip }: WizardStepProps) {
  return (
    <div className="welcome-page">
      <div className="welcome-header">
        <div className="welcome-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <rect width="80" height="80" rx="16" fill="var(--primary-color)" opacity="0.1" />
            <path
              d="M25 35L35 45L55 25"
              stroke="var(--primary-color)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="20"
              y="50"
              width="40"
              height="6"
              rx="2"
              fill="var(--primary-color)"
              opacity="0.6"
            />
          </svg>
        </div>
        <h1>欢迎使用 SnippetBox</h1>
        <p className="welcome-subtitle">轻量级代码片段管理工具</p>
      </div>

      <div className="welcome-features">
        <div className="feature-item">
          <div className="feature-icon">📝</div>
          <h3>快速保存</h3>
          <p>轻松保存和管理您的代码片段</p>
        </div>

        <div className="feature-item">
          <div className="feature-icon">🔍</div>
          <h3>智能搜索</h3>
          <p>支持全文搜索和标签过滤</p>
        </div>

        <div className="feature-item">
          <div className="feature-icon">🏷️</div>
          <h3>分类管理</h3>
          <p>使用分类和标签组织代码</p>
        </div>

        <div className="feature-item">
          <div className="feature-icon">💡</div>
          <h3>语法高亮</h3>
          <p>支持多种编程语言高亮显示</p>
        </div>
      </div>

      <div className="welcome-actions">
        <button className="btn-secondary" onClick={onSkip}>
          跳过向导
        </button>
        <button className="btn-primary" onClick={onNext}>
          开始使用
        </button>
      </div>
    </div>
  );
}
