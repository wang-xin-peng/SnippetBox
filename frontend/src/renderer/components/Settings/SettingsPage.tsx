import React, { useState, useEffect } from 'react';
import { DownloadDialog } from '../ModelDownload';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const [modelPath, setModelPath] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'local' | 'lightweight'>('lightweight');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // 检查模型是否已下载
      const downloaded = await window.electron.model.isDownloaded();
      setIsModelDownloaded(downloaded);

      if (downloaded) {
        const path = await window.electron.model.getPath();
        setModelPath(path);
      }

      // 加载搜索模式设置
      // TODO: 从 SettingsManager 加载
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const handleDownloadModel = () => {
    setShowDownloadDialog(true);
  };

  const handleDownloadComplete = () => {
    loadSettings();
  };

  const handleDeleteModel = async () => {
    if (!confirm('确定要删除已下载的模型吗？删除后需要重新下载才能使用本地搜索功能。')) {
      return;
    }

    try {
      const result = await window.electron.model.deleteModel();
      if (result.success) {
        setIsModelDownloaded(false);
        setModelPath('');
        alert('模型已删除');
      } else {
        alert(`删除失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`删除失败: ${error.message}`);
    }
  };

  const handleSearchModeChange = (mode: 'local' | 'lightweight') => {
    setSearchMode(mode);
    // TODO: 保存到 SettingsManager
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1 className="settings-title">设置</h1>

        {/* 搜索设置 */}
        <section className="settings-section">
          <h2 className="section-title">搜索设置</h2>
          
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">搜索模式</label>
              <p className="setting-description">
                选择代码片段的搜索方式
              </p>
            </div>
            <div className="setting-control">
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="searchMode"
                    value="lightweight"
                    checked={searchMode === 'lightweight'}
                    onChange={() => handleSearchModeChange('lightweight')}
                  />
                  <div className="radio-content">
                    <span className="radio-title">轻量级搜索</span>
                    <span className="radio-desc">基于关键词的快速搜索</span>
                  </div>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="searchMode"
                    value="local"
                    checked={searchMode === 'local'}
                    onChange={() => handleSearchModeChange('local')}
                  />
                  <div className="radio-content">
                    <span className="radio-title">本地模型搜索</span>
                    <span className="radio-desc">使用 AI 模型进行语义搜索</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* 模型管理 */}
        <section className="settings-section">
          <h2 className="section-title">模型管理</h2>
          
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">本地搜索模型</label>
              <p className="setting-description">
                下载并管理用于语义搜索的 AI 模型（约 90MB）
              </p>
            </div>
            <div className="setting-control">
              {isModelDownloaded ? (
                <div className="model-status">
                  <div className="status-info">
                    <span className="status-badge success">✓ 已下载</span>
                    <span className="model-path">{modelPath}</span>
                  </div>
                  <button 
                    className="btn-danger"
                    onClick={handleDeleteModel}
                  >
                    删除模型
                  </button>
                </div>
              ) : (
                <div className="model-status">
                  <div className="status-info">
                    <span className="status-badge warning">未下载</span>
                    <span className="status-text">需要下载模型才能使用本地搜索</span>
                  </div>
                  <button 
                    className="btn-primary"
                    onClick={handleDownloadModel}
                  >
                    下载模型
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 关于 */}
        <section className="settings-section">
          <h2 className="section-title">关于</h2>
          
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">SnippetBox</label>
              <p className="setting-description">
                版本 0.1.0
              </p>
            </div>
          </div>
        </section>
      </div>

      <DownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onComplete={handleDownloadComplete}
      />
    </div>
  );
};
