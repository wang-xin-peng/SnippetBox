import React, { useState, useEffect } from 'react';
import { Card, Button, Switch, Space, Typography, Tag, message } from 'antd';
import { DownloadOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { DownloadDialog } from '../ModelDownload';

const { Text } = Typography;

interface ModelSettingsProps {
  onDownloadComplete?: () => void;
}

export const ModelSettings: React.FC<ModelSettingsProps> = ({ onDownloadComplete }) => {
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const [modelPath, setModelPath] = useState<string>('');
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isGeneratingVectors, setIsGeneratingVectors] = useState(false);
  const [searchMode, setSearchMode] = useState<'local' | 'lightweight'>('lightweight');

  useEffect(() => {
    loadModelStatus();
  }, []);

  const loadModelStatus = async () => {
    try {
      const downloaded = await window.electron.model.isDownloaded();
      setIsModelDownloaded(downloaded);

      if (downloaded) {
        const path = await window.electron.model.getPath();
        setModelPath(path);
      }

      const result = await window.electron.ipcRenderer.invoke('settings:getWizardChoices');
      if (result.success && result.data?.searchMode) {
        setSearchMode(result.data.searchMode);
      }
    } catch (error) {
      console.error('加载模型状态失败:', error);
    }
  };

  const handleDownloadModel = () => {
    setShowDownloadDialog(true);
  };

  const handleDownloadComplete = async () => {
    setShowDownloadDialog(false);
    await loadModelStatus();

    try {
      await window.electron.ipcRenderer.invoke('settings:saveWizardChoices', {
        downloadModel: true,
        searchMode: 'local'
      });
      setSearchMode('local');
      onDownloadComplete?.();
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  const handleDeleteModel = async () => {
    if (!confirm('确定要删除已下载的模型吗？删除后需要重新下载才能使用本地搜索功能。')) {
      return;
    }

    try {
      const result = await window.electron.model.deleteModel();
      if (result.success) {
        setIsModelDownloaded(false);
        setModelPath('');
        message.success('模型已删除');
      } else {
        message.error(`删除失败: ${result.error}`);
      }
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`);
    }
  };

  const handleGenerateVectors = async () => {
    if (!isModelDownloaded) {
      message.warning('请先下载模型');
      return;
    }

    if (!confirm('确定要重新生成所有代码片段的向量吗？这可能需要一些时间。')) {
      return;
    }

    setIsGeneratingVectors(true);
    try {
      const removeListener = window.electron.ipcRenderer.on(
        'embedding:generateVectorsComplete',
        (_event: any, res: { success: boolean; error?: string }) => {
          removeListener();
          setIsGeneratingVectors(false);
          if (res.success) {
            message.success('向量生成完成！');
          } else {
            message.error(`向量生成失败: ${res.error}`);
          }
        }
      );

      await window.electron.ipcRenderer.invoke('embedding:generateVectors');
    } catch (error: any) {
      setIsGeneratingVectors(false);
      message.error(`向量生成失败: ${error.message}`);
    }
  };

  return (
    <Card title="模型管理" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <div style={{ marginBottom: 8 }}>
            <Text strong>本地搜索模型</Text>
            <p style={{ color: '#888', marginTop: 4 }}>
              下载并管理用于语义搜索的 AI 模型（约 118MB，量化版）
            </p>
          </div>

          {isModelDownloaded ? (
            <div>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Tag color="success">✓ 已下载</Tag>
                  <Text type="secondary" style={{ marginLeft: 8 }}>{modelPath}</Text>
                </div>
                <Space>
                  <Button danger icon={<DeleteOutlined />} onClick={handleDeleteModel}>
                    删除模型
                  </Button>
                </Space>
              </Space>
            </div>
          ) : (
            <div>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Tag color="warning">未下载</Tag>
                  <Text type="secondary" style={{ marginLeft: 8 }}>需要下载模型才能使用本地搜索</Text>
                </div>
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadModel}>
                  下载模型
                </Button>
              </Space>
            </div>
          )}
        </div>

        {isModelDownloaded && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <Text strong>向量生成</Text>
              <p style={{ color: '#888', marginTop: 4 }}>
                为所有代码片段重新生成向量，用于语义搜索
              </p>
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleGenerateVectors}
              loading={isGeneratingVectors}
            >
              {isGeneratingVectors ? '生成中...' : '重新生成向量'}
            </Button>
          </div>
        )}
      </Space>

      <DownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onComplete={handleDownloadComplete}
      />
    </Card>
  );
};
