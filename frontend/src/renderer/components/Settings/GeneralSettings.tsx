import React from 'react';
import { Card, Form, Select, message } from 'antd';

interface GeneralSettingsProps {
  settings: {
    theme: 'light' | 'dark' | 'auto';
    language: 'zh-CN' | 'en-US';
  };
  onUpdate: (settings: Partial<{ theme: 'light' | 'dark' | 'auto'; language: 'zh-CN' | 'en-US' }>) => Promise<void>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate }) => {
  const [form] = Form.useForm();

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    try {
      await onUpdate({ theme });
      message.success('主题设置已更新');
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleLanguageChange = async (language: 'zh-CN' | 'en-US') => {
    try {
      await onUpdate({ language });
      message.success('语言设置已更新');
    } catch (error) {
      message.error('更新失败');
    }
  };

  return (
    <Card title="通用设置" size="small">
      <Form layout="vertical">
        <Form.Item label="主题">
          <Select
            value={settings.theme}
            onChange={handleThemeChange}
            style={{ width: 200 }}
          >
            <Select.Option value="light">浅色</Select.Option>
            <Select.Option value="dark">深色</Select.Option>
            <Select.Option value="auto">跟随系统</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="语言">
          <Select
            value={settings.language}
            onChange={handleLanguageChange}
            style={{ width: 200 }}
          >
            <Select.Option value="zh-CN">简体中文</Select.Option>
            <Select.Option value="en-US">English</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );
};