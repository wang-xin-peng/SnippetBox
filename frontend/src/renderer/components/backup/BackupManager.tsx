import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Modal, message, Switch, InputNumber, Tooltip } from 'antd';
import { ReloadOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, SettingOutlined } from '@ant-design/icons';
import { BackupList, RestoreDialog } from './index';

interface Backup {
  backupId: string;
  filePath: string;
  size: number;
  timestamp: number;
  date: string;
}

export const BackupManager: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreVisible, setRestoreVisible] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupDays, setAutoBackupDays] = useState(1);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const result = await window.electron.ipcRenderer.invoke('backup:list');
      if (result.success) {
        setBackups(result.data);
      } else {
        message.error('加载备份列表失败');
      }
    } catch (error) {
      message.error('加载备份列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('backup:create');
      if (result.success) {
        message.success('备份创建成功');
        loadBackups();
      } else {
        message.error(result.error || '备份创建失败');
      }
    } catch (error) {
      message.error('备份创建失败');
    }
  };

  const handleRestore = (backup: Backup) => {
    setSelectedBackup(backup);
    setRestoreVisible(true);
  };

  const handleDelete = async (backup: Backup) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除备份 ${backup.date} 吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await window.electron.ipcRenderer.invoke('backup:delete', backup.backupId);
          if (result.success) {
            message.success('备份删除成功');
            loadBackups();
          } else {
            message.error(result.error || '备份删除失败');
          }
        } catch (error) {
          message.error('备份删除失败');
        }
      }
    });
  };

  const handleEnableAutoBackup = async (enabled: boolean) => {
    try {
      if (enabled) {
        const result = await window.electron.ipcRenderer.invoke('backup:enable-auto', autoBackupDays);
        if (result.success) {
          setAutoBackupEnabled(true);
          message.success('自动备份已启用');
        } else {
          message.error(result.error || '启用自动备份失败');
        }
      } else {
        const result = await window.electron.ipcRenderer.invoke('backup:disable-auto');
        if (result.success) {
          setAutoBackupEnabled(false);
          message.success('自动备份已禁用');
        } else {
          message.error(result.error || '禁用自动备份失败');
        }
      }
    } catch (error) {
      message.error('设置自动备份失败');
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const columns = [
    {
      title: '备份日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => <Text>{date}</Text>
    },
    {
      title: '文件大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatSize(size)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Backup) => (
        <Space>
          <Tooltip title="恢复">
            <Button
              type="link"
              icon={<UploadOutlined />}
              onClick={() => handleRestore(record)}
            >
              恢复
            </Button>
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const { Text } = require('antd').Typography;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="备份管理"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleCreateBackup}
            >
              创建备份
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadBackups}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Card size="small" title={<SettingOutlined />}>
            <Space>
              <Text>自动备份：</Text>
              <Switch checked={autoBackupEnabled} onChange={handleEnableAutoBackup} />
              {autoBackupEnabled && (
                <>
                  <Text>每</Text>
                  <InputNumber
                    min={1}
                    max={30}
                    value={autoBackupDays}
                    onChange={(value) => setAutoBackupDays(value || 1)}
                    style={{ width: 60 }}
                  />
                  <Text>天</Text>
                </>
              )}
            </Space>
          </Card>
        </div>

        <BackupList backups={backups} loading={loading} />
      </Card>

      <RestoreDialog
        visible={restoreVisible}
        backup={selectedBackup}
        onClose={() => setRestoreVisible(false)}
        onRestoreComplete={loadBackups}
      />
    </div>
  );
};