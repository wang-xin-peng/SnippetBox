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
