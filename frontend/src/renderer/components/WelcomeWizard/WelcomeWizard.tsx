import { useState, useEffect } from 'react';
import { WizardSteps } from './WizardSteps';
import { WelcomePage } from './WelcomePage';
import { ModelDownloadPage } from './ModelDownloadPage';
import { CompletePage } from './CompletePage';
import type { WizardChoices, WizardStep } from '@shared/types/wizard';
import './WelcomeWizard.css';

const steps: WizardStep[] = [
  { id: 1, title: '欢迎使用', component: WelcomePage },
  { id: 2, title: '选择功能', component: ModelDownloadPage },
  { id: 3, title: '完成', component: CompletePage },
];

interface WelcomeWizardProps {
  onComplete: (choices: WizardChoices) => void;
  onSkip: () => void;
}

export function WelcomeWizard({ onComplete, onSkip }: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [choices, setChoices] = useState<WizardChoices>({
    downloadModel: false,
    searchMode: 'lightweight',
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'auto';

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.pointerEvents = 'auto';
    };
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(choices);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const updateChoices = (newChoices: Partial<WizardChoices>) => {
    setChoices({ ...choices, ...newChoices });
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="welcome-wizard">
      <div className="wizard-container">
        <WizardSteps steps={steps} currentStep={currentStep} />
        
        <div className="wizard-content">
          <CurrentStepComponent
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            choices={choices}
            updateChoices={updateChoices}
          />
        </div>
      </div>
    </div>
  );
}
