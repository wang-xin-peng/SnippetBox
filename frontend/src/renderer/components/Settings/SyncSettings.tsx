import React from 'react';
import { Card, Form, Switch, InputNumber, Select, message } from 'antd';

interface SyncSettingsProps {
  settings: {
    autoSync: boolean;
    syncInterval: number;
    conflictStrategy: 'local' | 'cloud' | 'latest' | 'manual';
  };
  onUpdate: (settings: Partial<{ sync: { autoSync: boolean; syncInterval: number; conflictStrategy: 'local' | 'cloud' | 'latest' | 'manual' } }>) => Promise<void>;
}

export const SyncSettings: React.FC<SyncSettingsProps> = ({ settings, onUpdate }) => {
  const handleChange = async (key: string, value: any) => {
    try {
      await onUpdate({
        sync: {
          ...settings,
          [key]: value
        }
      });
      message.success('同步设置已更新');
    } catch (error) {
      message.error('更新失败');
    }
  };

  return (
    <Card title="同步设置" size="small">
      <Form layout="vertical">
        <Form.Item label="自动同步">
          <Switch
            checked={settings.autoSync}
            onChange={(checked) => handleChange('autoSync', checked)}
          />
          <p style={{ color: '#888', marginTop: 8 }}>
            开启后，系统将自动同步您的代码片段
          </p>
        </Form.Item>

        <Form.Item label="同步间隔">
          <InputNumber
            min={1}
            max={1440}
            value={settings.syncInterval}
            onChange={(value) => handleChange('syncInterval', value)}
            disabled={!settings.autoSync}
            style={{ width: 120 }}
          />
          <span style={{ marginLeft: 8 }}>分钟</span>
        </Form.Item>

        <Form.Item label="冲突解决策略">
          <Select
            value={settings.conflictStrategy}
            onChange={(value) => handleChange('conflictStrategy', value)}
            style={{ width: 200 }}
          >
            <Select.Option value="local">保留本地</Select.Option>
            <Select.Option value="cloud">使用云端</Select.Option>
            <Select.Option value="latest">保留最新</Select.Option>
            <Select.Option value="manual">手动选择</Select.Option>
          </Select>
          <p style={{ color: '#888', marginTop: 8 }}>
            当本地和云端数据发生冲突时的处理方式
          </p>
        </Form.Item>
      </Form>
    </Card>
  );
};