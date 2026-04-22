import type { WizardStep } from '@shared/types/wizard';
import './WizardSteps.css';

interface WizardStepsProps {
  steps: WizardStep[];
  currentStep: number;
}

export function WizardSteps({ steps, currentStep }: WizardStepsProps) {
  return (
    <div className="wizard-steps">
      <div className="steps-container">
        {steps.map((step, index) => (
          <div key={step.id} className="step-wrapper">
            <div
              className={`wizard-step ${index === currentStep ? 'active' : ''} ${
                index < currentStep ? 'completed' : ''
              }`}
            >
              <div className="step-number">
                {index < currentStep ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M16 6L8 14L4 10"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <div className="step-title">{step.title}</div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`step-line ${index < currentStep ? 'completed' : ''}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
