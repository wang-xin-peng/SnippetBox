// 向导相关类型定义
export interface WizardChoices {
  downloadModel: boolean; // 是否下载本地模型
  searchMode: 'local' | 'lightweight'; // 搜索模式
}

export interface WizardStep {
  id: number;
  title: string;
  component: React.ComponentType<WizardStepProps>;
}

export interface WizardStepProps {
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  choices: WizardChoices;
  updateChoices: (choices: Partial<WizardChoices>) => void;
}
