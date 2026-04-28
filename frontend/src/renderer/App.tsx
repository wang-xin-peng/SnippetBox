import { useState, useEffect } from 'react';
import { Router } from './router';
import { WelcomeWizard } from './components/WelcomeWizard';
import { SyncDialog } from './components/SyncDialog/SyncDialog';
import { settingsApi } from './api/settings';
import { AuthProvider, useAuth } from './store/authStore';
import { SyncProvider } from './store/syncStore';
import { ThemeProvider } from './store/themeStore';
import type { WizardChoices } from '@shared/types/wizard';

function restoreGlobalInteraction() {
  document.body.style.overflow = 'unset';
  document.body.style.pointerEvents = 'auto';
}

function AppContent() {
  const [showWizard, setShowWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncDialogCount, setSyncDialogCount] = useState<number | null>(null);
  const [wizardChecked, setWizardChecked] = useState(false); // 标记是否已检查过向导
  const { isLoggedIn, user, loading: authLoading } = useAuth();

  useEffect(() => {
    // 监听同步对话框事件
    const handleShowSyncDialog = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      setSyncDialogCount(customEvent.detail.count);
    };

    window.addEventListener('show-sync-dialog', handleShowSyncDialog);

    return () => {
      window.removeEventListener('show-sync-dialog', handleShowSyncDialog);
    };
  }, []);

  const handleSyncConfirm = async () => {
    setSyncDialogCount(null);
    try {
      console.log('[App] Merging local snippets to cloud...');
      // 先清除 skip_sync 标记，确保之前取消过的片段也能同步
      await window.electron.ipcRenderer.invoke('sync:clearSkipSync');
      const pushResult = await window.electron.ipcRenderer.invoke('sync:push');
      if (pushResult.success && pushResult.data.pushed > 0) {
        console.log(`[App] Successfully merged ${pushResult.data.pushed} snippets`);
      }

      const pullResult = await window.electron.ipcRenderer.invoke('sync:pull');
      if (pullResult.success) {
        console.log(`[App] Successfully pulled ${pullResult.data?.pulled ?? 0} snippets from cloud`);
      }
      window.dispatchEvent(new Event('snippets-refresh'));
    } catch (error) {
      console.error('[App] Sync failed:', error);
    }
  };

  const handleSyncCancel = async () => {
    setSyncDialogCount(null);
    try {
      console.log('[App] User chose not to merge, marking local snippets as skip_sync...');
      await window.electron.ipcRenderer.invoke('sync:markLocalSnippetsSkipSync');
      // 拉取云端片段
      const pullResult = await window.electron.ipcRenderer.invoke('sync:pull');
      if (pullResult.success) {
        console.log(`[App] Successfully pulled ${pullResult.data?.pulled ?? 0} snippets from cloud`);
        window.dispatchEvent(new Event('snippets-refresh'));
      }
    } catch (error) {
      console.error('[App] Sync cancel failed:', error);
    }
  };

  useEffect(() => {
    // 添加全局快捷键 Ctrl+Shift+F 来修复输入框问题
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        console.log('[App] Emergency fix triggered by Ctrl+Shift+F');
        
        // 强制清理所有可能阻挡输入的元素
        document.body.style.overflow = 'unset';
        document.body.style.pointerEvents = 'auto';
        
        // 移除所有 overlay
        const overlays = document.querySelectorAll(
          '.download-dialog-overlay, .modal-overlay, .confirm-overlay, .nsm-overlay, .saving-overlay'
        );
        console.log('[App] Found overlays:', overlays.length);
        overlays.forEach((overlay, index) => {
          console.log(`[App] Removing overlay ${index}:`, overlay.className);
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        });
        
        // 检查是否还有高 z-index 的元素
        const allElements = document.querySelectorAll('*');
        let fixedCount = 0;
        allElements.forEach(el => {
          const style = window.getComputedStyle(el);
          const zIndex = parseInt(style.zIndex);
          if (zIndex > 100 && style.position === 'fixed') {
            console.log('[App] Found high z-index fixed element:', el.className, 'z-index:', zIndex);
            fixedCount++;
          }
        });
        
        console.log(`[App] Emergency fix completed. Removed ${overlays.length} overlays, found ${fixedCount} high z-index elements`);
        alert(`已清理 ${overlays.length} 个覆盖层，发现 ${fixedCount} 个高层级固定元素`);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);

    const removeEmbeddingState = window.electron.ipcRenderer.on(
      'embedding:generateVectorsState',
      (_event: any, payload: { active: boolean }) => {
        if (!payload.active) {
          restoreGlobalInteraction();
        }
      }
    );

    const removeEmbeddingComplete = window.electron.ipcRenderer.on(
      'embedding:generateVectorsComplete',
      () => {
        restoreGlobalInteraction();
      }
    );
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      removeEmbeddingState();
      removeEmbeddingComplete();
    };
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    // 只在首次检查，避免登录时重复触发
    if (!wizardChecked) {
      checkWizardVisibility();
      setWizardChecked(true);
    }
  }, [authLoading, wizardChecked]);

  useEffect(() => {
    if (!showWizard) {
      restoreGlobalInteraction();
    }

    return () => {
      restoreGlobalInteraction();
    };
  }, [showWizard]);

  const checkWizardVisibility = async () => {
    try {
      const settings = await settingsApi.getSettings();
      const onboardedUserIds: string[] = Array.isArray(settings.onboardedUserIds)
        ? settings.onboardedUserIds
        : [];

      if (!isLoggedIn) {
        const shouldShow = !(settings.localUsageOnboardingCompleted === true);
        setShowWizard(shouldShow);
        return;
      }

      if (!user?.id) {
        setShowWizard(false);
        return;
      }

      if (onboardedUserIds.includes(user.id)) {
        setShowWizard(false);
        return;
      }

      const snippets = await window.electron.ipcRenderer.invoke('snippet:list');
      const cloudSnippetCount = snippets.filter(
        (snippet: any) => snippet.cloudId || snippet.isSynced || snippet.storageScope === 'cloud'
      ).length;

      setShowWizard(cloudSnippetCount === 0);
    } catch (error) {
      console.error('Failed to check wizard visibility:', error);
      setShowWizard(false);
    } finally {
      setIsLoading(false);
    }
  };

  const markWizardSeen = async () => {
    const settings = await settingsApi.getSettings();

    if (isLoggedIn && user?.id) {
      const currentIds: string[] = Array.isArray(settings.onboardedUserIds) ? settings.onboardedUserIds : [];
      if (!currentIds.includes(user.id)) {
        await settingsApi.updateSettings({
          onboardedUserIds: [...currentIds, user.id],
        });
      }
    } else {
      await settingsApi.updateSettings({
        localUsageOnboardingCompleted: true,
      });
    }

    await settingsApi.markFirstLaunchComplete();
  };

  const handleWizardComplete = async (choices: WizardChoices) => {
    try {
      await settingsApi.saveWizardChoices(choices);
      await markWizardSeen();
      setShowWizard(false);
    } catch (error) {
      console.error('Failed to complete wizard:', error);
    }
  };

  const handleWizardSkip = async () => {
    try {
      await markWizardSeen();
      setShowWizard(false);
    } catch (error) {
      console.error('Failed to skip wizard:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      {showWizard && (
        <WelcomeWizard onComplete={handleWizardComplete} onSkip={handleWizardSkip} />
      )}
      {syncDialogCount !== null && (
        <SyncDialog 
          count={syncDialogCount} 
          onConfirm={handleSyncConfirm} 
          onCancel={handleSyncCancel} 
        />
      )}
      <Router />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SyncProvider>
          <AppContent />
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
