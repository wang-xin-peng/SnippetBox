import { useState } from 'react';
import type { WizardStepProps } from '@shared/types/wizard';
import { DownloadDialog } from '../ModelDownload';
import './ModelDownloadPage.css';

export function ModelDownloadPage({
  onNext,
  onPrev,
  onSkip,
  choices,
  updateChoices,
}: WizardStepProps) {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  const handleSearchModeChange = (mode: 'local' | 'lightweight') => {
    updateChoices({
      searchMode: mode,
      downloadModel: mode === 'local',
    });
  };

  const handleDownloadNow = () => {
    setShowDownloadDialog(true);
  };

  const handleDownloadComplete = () => {
    // 下载完成后可以自动进入下一步
    console.log('模型下载完成');
  };

  return (
    <div className="model-download-page">
      <div className="page-header">
        <h2>选择搜索模式</h2>
        <p className="page-description">根据您的需求选择合适的搜索方式</p>
      </div>

      <div className="search-modes">
        <div
          className={`mode-card ${choices.searchMode === 'lightweight' ? 'selected' : ''}`}
          onClick={() => handleSearchModeChange('lightweight')}
        >
          <div className="mode-icon">⚡</div>
          <h3>轻量级搜索</h3>
          <p className="mode-description">基于关键词的快速搜索，无需额外下载</p>
          <ul className="mode-features">
            <li>✓ 即时启动</li>
            <li>✓ 占用空间小</li>
            <li>✓ 关键词匹配</li>
            <li>✓ 标签过滤</li>
          </ul>
          <div className="mode-badge recommended">推荐</div>
        </div>

        <div
          className={`mode-card ${choices.searchMode === 'local' ? 'selected' : ''}`}
          onClick={() => handleSearchModeChange('local')}
        >
          <div className="mode-icon">🚀</div>
          <h3>本地模型搜索</h3>
          <p className="mode-description">使用本地AI模型进行智能语义搜索</p>
          <ul className="mode-features">
            <li>✓ 语义理解</li>
            <li>✓ 智能推荐</li>
            <li>✓ 离线可用</li>
            <li>✓ 需要下载模型（~90MB）</li>
          </ul>
          <div className="mode-badge advanced">高级</div>
        </div>
      </div>

      {choices.searchMode === 'local' && (
        <div className="download-notice">
          <div className="notice-icon">ℹ️</div>
          <div className="notice-content">
            <strong>提示：</strong>
            本地模型大小约为 90MB。您可以现在下载，也可以稍后在设置中下载。
          </div>
          <button className="btn-download" onClick={handleDownloadNow}>
            立即下载模型
          </button>
        </div>
      )}

      <div className="page-actions">
        <button className="btn-secondary" onClick={onPrev}>
          上一步
        </button>
        <div className="actions-right">
          <button className="btn-text" onClick={onSkip}>
            跳过
          </button>
          <button className="btn-primary" onClick={onNext}>
            下一步
          </button>
        </div>
      </div>

      <DownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onComplete={handleDownloadComplete}
      />
    </div>
  );
}
