import React from 'react';
import { Card, Form, InputNumber, Switch, Select, message } from 'antd';

interface EditorSettingsProps {
  settings: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    wordWrap: boolean;
  };
  onUpdate: (settings: Partial<{ editor: { fontSize: number; fontFamily: string; tabSize: number; wordWrap: boolean } }>) => Promise<void>;
}

const FONT_FAMILIES = [
  'Consolas, Monaco, monospace',
  'Source Code Pro, monospace',
  'Fira Code, monospace',
  'JetBrains Mono, monospace',
  'Menlo, Monaco, monospace'
];

export const EditorSettings: React.FC<EditorSettingsProps> = ({ settings, onUpdate }) => {
  const handleChange = async (key: string, value: any) => {
    try {
      await onUpdate({
        editor: {
          ...settings,
          [key]: value
        }
      });
      message.success('编辑器设置已更新');
    } catch (error) {
      message.error('更新失败');
    }
  };

  return (
    <Card title="编辑器设置" size="small">
      <Form layout="vertical">
        <Form.Item label="字体大小">
          <InputNumber
            min={10}
            max={24}
            value={settings.fontSize}
            onChange={(value) => handleChange('fontSize', value)}
            style={{ width: 100 }}
          />
          <span style={{ marginLeft: 8 }}>px</span>
        </Form.Item>

        <Form.Item label="字体">
          <Select
            value={settings.fontFamily}
            onChange={(value) => handleChange('fontFamily', value)}
            style={{ width: 250 }}
          >
            {FONT_FAMILIES.map((font) => (
              <Select.Option key={font} value={font}>
                {font.split(',')[0]}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Tab 大小">
          <InputNumber
            min={1}
            max={8}
            value={settings.tabSize}
            onChange={(value) => handleChange('tabSize', value)}
            style={{ width: 100 }}
          />
        </Form.Item>

        <Form.Item label="自动换行">
          <Switch
            checked={settings.wordWrap}
            onChange={(checked) => handleChange('wordWrap', checked)}
          />
        </Form.Item>
      </Form>
    </Card>
  );
};