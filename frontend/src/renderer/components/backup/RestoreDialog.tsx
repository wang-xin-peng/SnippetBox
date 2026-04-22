import React, { useState, useEffect } from 'react';
import { Modal, Radio, Button, Space, Typography, Alert, Progress, Result } from 'antd';

const { Text, Paragraph } = Typography;

interface Backup {
  backupId: string;
  filePath: string;
  size: number;
  timestamp: number;
  date: string;
}

interface RestoreDialogProps {
  visible: boolean;
  backup: Backup | null;
  onClose: () => void;
  onRestoreComplete: () => void;
}

type RestoreMode = 'overwrite' | 'merge';

export const RestoreDialog: React.FC<RestoreDialogProps> = ({
  visible,
  backup,
  onClose,
  onRestoreComplete
}) => {
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean;
    restored?: number;
    skipped?: number;
    errors?: string[];
  } | null>(null);

  useEffect(() => {
    if (!visible) {
      setRestoreResult(null);
      setProgress(0);
      setRestoring(false);
    }
  }, [visible]);

  const handleRestore = async () => {
    if (!backup) return;

    setRestoring(true);
    setProgress(10);

    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await window.electron.ipcRenderer.invoke('restore:from-backup', {
        backupPath: backup.filePath,
        mode: restoreMode
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setRestoreResult({
          success: true,
          restored: result.data?.restored || 0,
          skipped: result.data?.skipped || 0
        });
      } else {
        setRestoreResult({
          success: false,
          errors: result.error ? [result.error] : ['恢复失败']
        });
      }
    } catch (error) {
      setRestoreResult({
        success: false,
        errors: ['恢复过程中发生错误']
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    if (restoreResult?.success) {
      onRestoreComplete();
    }
    onClose();
  };

  if (!backup) return null;

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Modal
      title="恢复备份"
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={500}
    >
      {!restoreResult ? (
        <>
          <Alert
            message="恢复前建议"
            description="在恢复备份前，系统会自动创建一个当前数据的备份，以防止数据丢失。"
            type="info"
            style={{ marginBottom: 16 }}
          />

          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              <Text strong>备份信息</Text>
            </Paragraph>
            <ul>
              <li>日期：{backup.date}</li>
              <li>大小：{formatSize(backup.size)}</li>
            </ul>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Paragraph>
              <Text strong>恢复模式</Text>
            </Paragraph>
            <Radio.Group
              value={restoreMode}
              onChange={(e) => setRestoreMode(e.target.value as RestoreMode)}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <Radio value="merge">
                <Space direction="vertical">
                  <Text strong>合并</Text>
                  <Text type="secondary">保留现有数据，只添加备份中没有的片段</Text>
                </Space>
              </Radio>
              <Radio value="overwrite">
                <Space direction="vertical">
                  <Text strong>覆盖</Text>
                  <Text type="secondary">清空现有数据，用备份数据完全替换</Text>
                </Space>
              </Radio>
            </Radio.Group>
          </div>

          {restoring && (
            <div style={{ marginBottom: 16 }}>
              <Progress percent={progress} status="active" />
              <Text type="secondary">正在恢复数据...</Text>
            </div>
          )}

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={handleClose} disabled={restoring}>
                取消
              </Button>
              <Button type="primary" onClick={handleRestore} loading={restoring}>
                开始恢复
              </Button>
            </Space>
          </div>
        </>
      ) : restoreResult.success ? (
        <Result
          status="success"
          title="恢复成功"
          subTitle={`已恢复 ${restoreResult.restored || 0} 个片段，跳过 ${restoreResult.skipped || 0} 个重复片段`}
          extra={[
            <Button type="primary" key="ok" onClick={handleClose}>
              确定
            </Button>
          ]}
        />
      ) : (
        <Result
          status="error"
          title="恢复失败"
          subTitle={restoreResult.errors?.join('，')}
          extra={[
            <Button key="ok" onClick={handleClose}>
              确定
            </Button>
          ]}
        />
      )}
    </Modal>
  );
};