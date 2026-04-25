import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DownloadDialog } from '../ModelDownload';
import { useAuth } from '../../store/authStore';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout, checkAuth } = useAuth();
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const [modelPath, setModelPath] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'local' | 'lightweight'>('lightweight');
  const [isGeneratingVectors, setIsGeneratingVectors] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showDeleteVerifyDialog, setShowDeleteVerifyDialog] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const [deleteSending, setDeleteSending] = useState(false);
  const [deleteVerifying, setDeleteVerifying] = useState(false);
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

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

        {/* 账户设置 */}
        <section className="settings-section">
          <h2 className="section-title">账户</h2>
          
          {isLoggedIn && user ? (
            <>
              <div className="setting-item">
                <div className="setting-header">
                  <div className="account-info">
                    <div className="account-avatar">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="account-avatar-img" />
                      ) : (
                        <span className="account-avatar-initials">
                          {user.username.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="account-details">
                      <span className="account-username">{user.username}</span>
                      <span className="account-email">{user.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label className="setting-label">用户名</label>
                  <p className="setting-description">修改您的显示名称</p>
                </div>
                <div className="setting-control">
                  {editingUsername ? (
                    <div className="inline-edit">
                      <input
                        className="setting-input"
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="输入新用户名"
                        minLength={3}
                        maxLength={50}
                      />
                      <button
                        className="btn-primary btn-sm"
                        disabled={savingUsername || newUsername.length < 3}
                        onClick={async () => {
                          setSavingUsername(true);
                          try {
                            const res = await window.electron.ipcRenderer.invoke('auth:updateUsername', newUsername.trim());
                            if (res.success) {
                              await checkAuth();
                              setEditingUsername(false);
                              setNewUsername('');
                              setNotification({ message: '用户名修改成功', type: 'success' });
                            } else {
                              setNotification({ message: res.error || '修改失败', type: 'error' });
                            }
                          } catch (err: any) {
                            setNotification({ message: err.message || '修改失败', type: 'error' });
                          } finally {
                            setSavingUsername(false);
                            setTimeout(() => setNotification(null), 3000);
                          }
                        }}
                      >
                        {savingUsername ? '保存中...' : '保存'}
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => { setEditingUsername(false); setNewUsername(''); }}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => { setEditingUsername(true); setNewUsername(user.username); }}
                    >
                      修改
                    </button>
                  )}
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label className="setting-label">密码</label>
                  <p className="setting-description">修改您的登录密码</p>
                </div>
                <div className="setting-control">
                  {changingPassword ? (
                    <div className="inline-edit-col">
                      <input
                        className="setting-input"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="当前密码"
                      />
                      <input
                        className="setting-input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="新密码（至少8位）"
                      />
                      <input
                        className="setting-input"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="确认新密码"
                      />
                      <div className="inline-edit">
                        <button
                          className="btn-primary btn-sm"
                          disabled={savingPassword || !currentPassword || newPassword.length < 8 || newPassword !== confirmNewPassword}
                          onClick={async () => {
                            setSavingPassword(true);
                            try {
                              const res = await window.electron.ipcRenderer.invoke('auth:changePassword', currentPassword, newPassword);
                              if (res.success) {
                                setChangingPassword(false);
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmNewPassword('');
                                setNotification({ message: '密码修改成功', type: 'success' });
                              } else {
                                setNotification({ message: res.error || '修改失败', type: 'error' });
                              }
                            } catch (err: any) {
                              setNotification({ message: err.message || '修改失败', type: 'error' });
                            } finally {
                              setSavingPassword(false);
                              setTimeout(() => setNotification(null), 3000);
                            }
                          }}
                        >
                          {savingPassword ? '保存中...' : '保存'}
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => { setChangingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => setChangingPassword(true)}
                    >
                      修改密码
                    </button>
                  )}
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label className="setting-label">云同步</label>
                  <p className="setting-description">
                    已登录，片段将自动同步到云端
                  </p>
                </div>
                <div className="setting-control">
                  <span className="status-badge success">✓ 已连接</span>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label className="setting-label">退出登录</label>
                  <p className="setting-description">
                    退出后云端片段将从本地移除，本地片段不受影响
                  </p>
                </div>
                <div className="setting-control">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={async () => {
                      if (confirm('确定要退出登录吗？')) {
                        await logout();
                        setNotification({ message: '已退出登录', type: 'success' });
                        setTimeout(() => setNotification(null), 3000);
                      }
                    }}
                  >
                    退出登录
                  </button>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label className="setting-label">注销账号</label>
                  <p className="setting-description">
                    永久删除您的账号和所有云端数据，此操作不可恢复
                  </p>
                </div>
                <div className="setting-control">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      if (!user?.email) return;
                      setDeleteEmail(user.email);
                      setDeleteCode('');
                      setDeleteCountdown(0);
                      setShowDeleteVerifyDialog(true);
                    }}
                  >
                    注销账号
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="setting-item">
              <div className="setting-header">
                <label className="setting-label">登录账户</label>
                <p className="setting-description">
                  登录后可将片段同步到云端，在多设备间共享
                </p>
              </div>
              <div className="setting-control">
                <span className="status-badge warning">未登录</span>
              </div>
            </div>
          )}
        </section>

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
                    <span className="radio-desc">使用向量模型进行语义搜索</span>
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
                  下载并管理用于语义搜索的 AI 模型（约 118MB，量化版）
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

        {/* 数据管理 */}
        <section className="settings-section">
          <h2 className="section-title">数据管理</h2>
          
          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">导入代码片段</label>
              <p className="setting-description">
                从 JSON 或 Markdown 文件导入代码片段
              </p>
            </div>
            <div className="setting-control">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const result = await window.electron.ipcRenderer.invoke('import:json', {
                        skipDuplicates: true
                      });
                      if (result.imported > 0) {
                        alert(`成功导入 ${result.imported} 个片段${result.skipped > 0 ? `，跳过 ${result.skipped} 个重复` : ''}`);
                      } else if (result.errors && result.errors.length > 0) {
                        alert('导入失败: ' + result.errors[0].error);
                      } else {
                        alert('已取消导入');
                      }
                    } catch (error: any) {
                      alert('导入失败: ' + error.message);
                    }
                  }}
                >
                  从 JSON 导入
                </button>
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const result = await window.electron.ipcRenderer.invoke('import:markdown', {
                        skipDuplicates: true
                      });
                      if (result.imported > 0) {
                        alert(`成功导入 ${result.imported} 个片段${result.skipped > 0 ? `，跳过 ${result.skipped} 个重复` : ''}`);
                      } else if (result.errors && result.errors.length > 0) {
                        alert('导入失败: ' + result.errors[0].error);
                      } else {
                        alert('已取消导入');
                      }
                    } catch (error: any) {
                      alert('导入失败: ' + error.message);
                    }
                  }}
                >
                  从 Markdown 导入
                </button>
              </div>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-header">
              <label className="setting-label">导出代码片段</label>
              <p className="setting-description">
                将所有代码片段导出为 JSON、Markdown 或 PDF 文件
              </p>
            </div>
            <div className="setting-control">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const snippets = await window.electron.ipcRenderer.invoke('snippet:list');
                      const snippetIds = snippets.map((s: any) => s.id);

                      if (snippetIds.length === 0) {
                        alert('没有可导出的片段');
                        return;
                      }

                      const result = await window.electron.ipcRenderer.invoke('export:json', snippetIds);
                      if (result.success) {
                        alert(`成功导出 ${result.count} 个片段到 ${result.filePath}`);
                      } else if (result.error === 'User canceled') {
                        alert('已取消导出');
                      } else {
                        alert('导出失败: ' + result.error);
                      }
                    } catch (error: any) {
                      alert('导出失败: ' + error.message);
                    }
                  }}
                >
                  导出为 JSON
                </button>
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const snippets = await window.electron.ipcRenderer.invoke('snippet:list');
                      const snippetIds = snippets.map((s: any) => s.id);

                      if (snippetIds.length === 0) {
                        alert('没有可导出的片段');
                        return;
                      }

                      const result = await window.electron.ipcRenderer.invoke('export:batch-markdown', snippetIds);
                      if (result.success > 0) {
                        alert(`成功导出 ${result.success} 个片段为 ZIP 压缩包`);
                      } else if (result.errors?.[0]?.error === 'User canceled') {
                        alert('已取消导出');
                      } else if (result.errors?.[0]?.error) {
                        alert('导出失败: ' + result.errors[0].error);
                      } else {
                        alert('已取消导出');
                      }
                    } catch (error: any) {
                      alert('导出失败: ' + error.message);
                    }
                  }}
                >
                  导出为 Markdown (ZIP)
                </button>
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const snippets = await window.electron.ipcRenderer.invoke('snippet:list');
                      const snippetIds = snippets.map((s: any) => s.id);

                      if (snippetIds.length === 0) {
                        alert('没有可导出的片段');
                        return;
                      }

                      const result = await window.electron.ipcRenderer.invoke('export:pdf', snippetIds);
                      if (result.success) {
                        alert(`成功导出 ${snippetIds.length} 个片段到 PDF 文件`);
                      } else if (result.error === 'User canceled') {
                        alert('已取消导出');
                      } else {
                        alert('导出失败: ' + result.error);
                      }
                    } catch (error: any) {
                      alert('导出失败: ' + error.message);
                    }
                  }}
                >
                  导出为 PDF
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showDeleteVerifyDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">注销账号</h3>
            <p className="modal-warning">
              ⚠️ 注销账号将永久删除您的所有云端数据，此操作不可恢复
            </p>

            <div className="form-field">
              <label>验证码将发送至：{deleteEmail}</label>
            </div>

            <div className="form-field">
              <label>邮箱验证码</label>
              <div className="code-input-row">
                <input
                  type="text"
                  value={deleteCode}
                  onChange={e => setDeleteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="请输入6位验证码"
                  maxLength={6}
                  className="code-input"
                />
                <button
                  className="btn-secondary btn-sm"
                  disabled={deleteCountdown > 0 || deleteSending}
                  onClick={async () => {
                    setDeleteSending(true);
                    try {
                      const res = await (window as any).electronAPI?.auth?.deleteAccountSendCode?.(deleteEmail);
                      if (res?.success) {
                        setDeleteCountdown(60);
                        const timer = setInterval(() => {
                          setDeleteCountdown(prev => {
                            if (prev <= 1) { clearInterval(timer); return 0; }
                            return prev - 1;
                          });
                        }, 1000);
                      } else {
                        setNotification({ message: res?.error || '发送失败', type: 'error' });
                        setTimeout(() => setNotification(null), 3000);
                      }
                    } finally {
                      setDeleteSending(false);
                    }
                  }}
                >
                  {deleteCountdown > 0 ? `${deleteCountdown}s` : deleteSending ? '发送中...' : '发送验证码'}
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteVerifyDialog(false)}
              >
                取消
              </button>
              <button
                className="btn-danger"
                disabled={deleteCode.length !== 6 || deleteVerifying}
                onClick={async () => {
                  setDeleteVerifying(true);
                  try {
                    const res = await (window as any).electronAPI?.auth?.deleteAccountVerify?.(deleteEmail, deleteCode);
                    if (res?.success) {
                      setShowDeleteVerifyDialog(false);
                      await logout();
                      setNotification({ message: '账号已注销', type: 'success' });
                      setTimeout(() => setNotification(null), 3000);
                      navigate('/');
                    } else {
                      setNotification({ message: res?.error || '注销失败', type: 'error' });
                      setTimeout(() => setNotification(null), 3000);
                    }
                  } finally {
                    setDeleteVerifying(false);
                  }
                }}
              >
                {deleteVerifying ? '注销中...' : '确认注销'}
              </button>
            </div>
          </div>
        </div>
      )}

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
