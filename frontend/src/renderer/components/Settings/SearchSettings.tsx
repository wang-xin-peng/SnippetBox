import React from 'react';
import { Card, Form, Select, InputNumber, message } from 'antd';

interface SearchSettingsProps {
  settings: {
    searchMode: 'local' | 'cloud' | 'auto';
    maxResults: number;
  };
  onUpdate: (settings: Partial<{ search: { searchMode: 'local' | 'cloud' | 'auto'; maxResults: number } }>) => Promise<void>;
}

export const SearchSettings: React.FC<SearchSettingsProps> = ({ settings, onUpdate }) => {
  const handleChange = async (key: string, value: any) => {
    try {
      await onUpdate({
        search: {
          ...settings,
          [key]: value
        }
      });
      message.success('搜索设置已更新');
    } catch (error) {
      message.error('更新失败');
    }
  };

  return (
    <Card title="搜索设置" size="small">
      <Form layout="vertical">
        <Form.Item label="搜索模式">
          <Select
            value={settings.searchMode}
            onChange={(value) => handleChange('searchMode', value)}
            style={{ width: 200 }}
          >
            <Select.Option value="local">本地搜索</Select.Option>
            <Select.Option value="cloud">云端搜索</Select.Option>
            <Select.Option value="auto">自动</Select.Option>
          </Select>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            本地搜索使用本地模型，云端搜索使用远程 API
          </p>
        </Form.Item>

        <Form.Item label="最大结果数">
          <InputNumber
            min={10}
            max={1000}
            value={settings.maxResults}
            onChange={(value) => handleChange('maxResults', value)}
            style={{ width: 120 }}
          />
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            搜索结果的最大数量
          </p>
        </Form.Item>
      </Form>
    </Card>
  );
};