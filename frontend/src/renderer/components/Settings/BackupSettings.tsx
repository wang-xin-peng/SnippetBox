import React from 'react';
import { Card, Form, Switch, InputNumber, message } from 'antd';

interface BackupSettingsProps {
  settings: {
    autoBackup: boolean;
    backupInterval: number;
    keepBackups: number;
  };
  onUpdate: (settings: Partial<{ backup: { autoBackup: boolean; backupInterval: number; keepBackups: number } }>) => Promise<void>;
}

export const BackupSettings: React.FC<BackupSettingsProps> = ({ settings, onUpdate }) => {
  const handleChange = async (key: string, value: any) => {
    try {
      await onUpdate({
        backup: {
          ...settings,
          [key]: value
        }
      });
      message.success('备份设置已更新');
    } catch (error) {
      message.error('更新失败');
    }
  };

  return (
    <Card title="备份设置" size="small">
      <Form layout="vertical">
        <Form.Item label="自动备份">
          <Switch
            checked={settings.autoBackup}
            onChange={(checked) => handleChange('autoBackup', checked)}
          />
          <p style={{ color: '#888', marginTop: 8 }}>
            开启后，系统将自动创建备份
          </p>
        </Form.Item>

        <Form.Item label="备份间隔">
          <InputNumber
            min={1}
            max={30}
            value={settings.backupInterval}
            onChange={(value) => handleChange('backupInterval', value)}
            disabled={!settings.autoBackup}
            style={{ width: 120 }}
          />
          <span style={{ marginLeft: 8 }}>天</span>
        </Form.Item>

        <Form.Item label="保留备份数">
          <InputNumber
            min={1}
            max={30}
            value={settings.keepBackups}
            onChange={(value) => handleChange('keepBackups', value)}
            disabled={!settings.autoBackup}
            style={{ width: 120 }}
          />
          <p style={{ color: '#888', marginTop: 8 }}>
            超过此数量的旧备份将被自动删除
          </p>
        </Form.Item>
      </Form>
    </Card>
  );
};