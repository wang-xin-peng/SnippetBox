import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WelcomeWizard } from '../../src/renderer/components/WelcomeWizard/WelcomeWizard';
import type { WizardChoices } from '../../src/shared/types/wizard';

describe('WelcomeWizard', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render welcome page initially', () => {
    render(<WelcomeWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

    expect(screen.getByText('欢迎使用 SnippetBox')).toBeInTheDocument();
    expect(screen.getByText('轻量级代码片段管理工具')).toBeInTheDocument();
  });

  it('should show all wizard steps', () => {
    render(<WelcomeWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

    expect(screen.getByText('欢迎使用')).toBeInTheDocument();
    expect(screen.getByText('选择功能')).toBeInTheDocument();
    expect(screen.getByText('完成')).toBeInTheDocument();
  });

  it('should navigate to next step when clicking "开始使用"', () => {
    render(<WelcomeWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

    const nextButton = screen.getByText('开始使用');
    fireEvent.click(nextButton);

    expect(screen.getByText('选择搜索模式')).toBeInTheDocument();
  });

  it('should call onSkip when clicking "跳过向导"', () => {
    render(<WelcomeWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

    const skipButton = screen.getByText('跳过向导');
    fireEvent.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('should navigate back to previous step', () => {
    render(<WelcomeWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

    // Go to step 2
    fireEvent.click(screen.getByText('开始使用'));
    expect(screen.getByText('选择搜索模式')).toBeInTheDocument();

    // Go back to step 1
    fireEvent.click(screen.getByText('上一步'));
    expect(screen.getByText('欢迎使用 SnippetBox')).toBeInTheDocument();
  });

  it('should allow selecting lightweight search mode', () => {
    render(<WelcomeWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

    // Navigate to model download page
    fireEvent.click(screen.getByText('开始使用'));

    // Lightweight mode should be selected by default
    const lightweightCard = screen.getByText('轻量级搜索').closest('.mode-card');
    expect(lightweightCard).toHaveClass('selected');
  });

  it('should allow selecting local model search mode', () => {
    render(<WelcomeWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

    // Navigate to model download page
    fireEvent.click(screen.getByText('开始使用'));

    // Click on local model card
    const localModelCard = screen.getByText('本地模型搜索').closest('.mode-card');
    fireEvent.click(localModelCard!);

    expect(localModelCard).toHaveClass('selected');
    expect(screen.getByText(/本地模型大小约为 90MB/)).toBeInTheDocument();
  });

  it('should complete wizard with correct choices', async () => {
    render(<WelcomeWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

    // Step 1: Welcome
    fireEvent.click(screen.getByText('开始使用'));

    // Step 2: Select local model
    const localModelCard = screen.getByText('本地模型搜索').closest('.mode-card');
    fireEvent.click(localModelCard!);
    fireEvent.click(screen.getByText('下一步'));

    // Step 3: Complete
    expect(screen.getByText('设置完成！')).toBeInTheDocument();
    expect(screen.getByText('本地模型搜索')).toBeInTheDocument();

    // Finish wizard
    fireEvent.click(screen.getByText('开始使用'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        downloadModel: true,
        searchMode: 'local',
      });
    });
  });

  it('should show progress indicator correctly', () => {
    render(<WelcomeWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

    // Step 1 should be active
    const step1 = screen.getByText('欢迎使用').closest('.wizard-step');
    expect(step1).toHaveClass('active');

    // Navigate to step 2
    fireEvent.click(screen.getByText('开始使用'));

    // Step 1 should be completed, step 2 should be active
    const step1Updated = screen.getByText('欢迎使用').closest('.wizard-step');
    const step2Updated = screen.getByText('选择功能').closest('.wizard-step');
    expect(step1Updated).toHaveClass('completed');
    expect(step2Updated).toHaveClass('active');
  });
});
