import { useState, useEffect } from 'react';
import { Router } from './router';
import { WelcomeWizard } from './components/WelcomeWizard';
import { settingsApi } from './api/settings';
import type { WizardChoices } from '@shared/types/wizard';

function App() {
  const [showWizard, setShowWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkFirstLaunch();
    
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
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const isFirst = await settingsApi.isFirstLaunch();
      setShowWizard(isFirst);
    } catch (error) {
      console.error('Failed to check first launch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWizardComplete = async (choices: WizardChoices) => {
    try {
      await settingsApi.saveWizardChoices(choices);
      await settingsApi.markFirstLaunchComplete();
      setShowWizard(false);
    } catch (error) {
      console.error('Failed to complete wizard:', error);
    }
  };

  const handleWizardSkip = async () => {
    try {
      await settingsApi.markFirstLaunchComplete();
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
      <Router />
    </>
  );
}

export default App;
