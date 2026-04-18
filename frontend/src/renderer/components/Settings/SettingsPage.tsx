import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DownloadDialog } from '../ModelDownload';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const [modelPath, setModelPath] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'local' | 'lightweight'>('lightweight');
  const [isGeneratingVectors, setIsGeneratingVectors] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
      const result = await window.electron.ipcRenderer.invoke('settings:getWizardChoices');
      if (result.success && result.data?.searchMode) {
        setSearchMode(result.data.searchMode);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const handleDownloadModel = () => {
    console.log('[Settings] Opening download dialog');
    setShowDownloadDialog(true);
  };

  const handleDownloadComplete = async () => {
    console.log('[Settings] Download complete, closing dialog');
    // 关闭下载对话框
    setShowDownloadDialog(false);
    
    await loadSettings();
    
    // 下载完成后，自动切换到本地模型搜索
    try {
      const result = await window.electron.ipcRenderer.invoke('settings:saveWizardChoices', {
        downloadModel: true,
        searchMode: 'local'
      });
      
      if (result.success) {
        setSearchMode('local');
        
        // 监听向量生成完成事件（异步，不阻塞 UI）
        const removeListener = window.electron.ipcRenderer.on(
          'embedding:generateVectorsComplete',
          (_event: any, res: { success: boolean; error?: string }) => {
            removeListener();
            if (res.success) {
              console.log('[Settings] Vector generation completed successfully');
              setNotification({ 
                message: '模型下载完成！已为所有代码片段生成向量，现在可以使用语义搜索了。', 
                type: 'success' 
              });
              // 5秒后自动关闭通知
              setTimeout(() => setNotification(null), 5000);
            } else {
              console.error('[Settings] Vector generation failed:', res.error);
              setNotification({ 
                message: '模型下载完成，但向量生成失败。请在设置中手动重新生成向量。', 
                type: 'error' 
              });
              setTimeout(() => setNotification(null), 5000);
            }
          }
        );

        // 触发异步向量生成（立即返回，不阻塞）
        console.log('[Settings] Starting vector generation after model download...');
        window.electron.ipcRenderer.invoke('embedding:generateVectors').catch((err: any) => {
          removeListener();
          console.error('[Settings] Failed to start vector generation:', err);
        });
      }
    } catch (error) {
      console.error('保存设置失败:', error);
    }
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
        
        // 删除模型后，自动切换到轻量级搜索
        const saveResult = await window.electron.ipcRenderer.invoke('settings:saveWizardChoices', {
          downloadModel: false,
          searchMode: 'lightweight'
        });
        
        if (saveResult.success) {
          setSearchMode('lightweight');
        }
        
        alert('模型已删除');
      } else {
        alert(`删除失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`删除失败: ${error.message}`);
    }
  };

  const handleSearchModeChange = async (mode: 'local' | 'lightweight') => {
    setSearchMode(mode);
    
    // 保存到 SettingsManager
    try {
      const result = await window.electron.ipcRenderer.invoke('settings:saveWizardChoices', {
        downloadModel: isModelDownloaded,
        searchMode: mode
      });
      
      if (!result.success) {
        console.error('保存设置失败:', result.error);
        alert('保存设置失败，请重试');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存设置失败，请重试');
    }
  };

  const handleGenerateVectors = async () => {
    if (!isModelDownloaded) {
      alert('请先下载模型');
      return;
    }

    if (!confirm('确定要重新生成所有代码片段的向量吗？这可能需要一些时间。\n\n注意：生成过程将在后台进行，完成后会弹出提示。')) {
      return;
    }

    setIsGeneratingVectors(true);
    try {
      console.log('[Settings] Starting manual vector generation...');

      // 监听完成事件
      const removeListener = window.electron.ipcRenderer.on(
        'embedding:generateVectorsComplete',
        (_event: any, res: { success: boolean; error?: string }) => {
          removeListener();
          setIsGeneratingVectors(false);
          if (res.success) {
            console.log('[Settings] Vector generation completed successfully');
            setNotification({ message: '向量生成完成！', type: 'success' });
            setTimeout(() => setNotification(null), 5000);
          } else {
            console.error('[Settings] Vector generation failed:', res.error);
            setNotification({ message: `向量生成失败: ${res.error}`, type: 'error' });
            setTimeout(() => setNotification(null), 5000);
          }
        }
      );

      // 触发异步向量生成（立即返回）
      const result = await window.electron.ipcRenderer.invoke('embedding:generateVectors');
      if (!result.success && !result.async) {
        removeListener();
        setIsGeneratingVectors(false);
        setNotification({ message: `向量生成失败: ${result.error}`, type: 'error' });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error: any) {
      console.error('[Settings] Vector generation failed:', error);
      setIsGeneratingVectors(false);
      setNotification({ message: `向量生成失败: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="settings-page">
      {/* 通知提示 */}
      {notification && (
        <div 
          className={`settings-notification ${notification.type}`}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px 24px',
            borderRadius: '8px',
            backgroundColor: notification.type === 'success' ? '#d4edda' : '#f8d7da',
            color: notification.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${notification.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {notification.message}
        </div>
      )}
      
      <div className="settings-container">
        <div className="settings-header">
          <button className="btn-back" onClick={() => navigate('/')} title="返回首页">
            ← 返回
          </button>
          <h1 className="settings-title">设置</h1>
        </div>

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

          {isModelDownloaded && (
            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">向量生成</label>
                <p className="setting-description">
                  为所有代码片段重新生成向量，用于语义搜索
                </p>
              </div>
              <div className="setting-control">
                <button 
                  className="btn-secondary"
                  onClick={handleGenerateVectors}
                  disabled={isGeneratingVectors}
                >
                  {isGeneratingVectors ? '生成中...' : '重新生成向量'}
                </button>
              </div>
            </div>
          )}
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
        onClose={() => {
          console.log('[Settings] Closing download dialog via onClose');
          setShowDownloadDialog(false);
        }}
        onComplete={handleDownloadComplete}
      />
    </div>
  );
};
