import React from 'react';
import { Table, Tag, Typography, Space, Button, Tooltip } from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Backup {
  backupId: string;
  filePath: string;
  size: number;
  timestamp: number;
  date: string;
}

interface BackupListProps {
  backups: Backup[];
  loading: boolean;
}

export const BackupList: React.FC<BackupListProps> = ({ backups, loading }) => {
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  const columns = [
    {
      title: '备份日期',
      dataIndex: 'date',
      key: 'date',
      sorter: (a: Backup, b: Backup) => a.timestamp - b.timestamp,
      defaultSortOrder: 'descend' as const,
      render: (date: string) => (
        <Space direction="vertical" size={0}>
          <Text strong>{formatDate(date)}</Text>
        </Space>
      )
    },
    {
      title: '文件名',
      dataIndex: 'filePath',
      key: 'filePath',
      ellipsis: true,
      render: (filePath: string) => (
        <Tooltip title={filePath}>
          <Text type="secondary">{filePath.split(/[/\\]/).pop()}</Text>
        </Tooltip>
      )
    },
    {
      title: '文件大小',
      dataIndex: 'size',
      key: 'size',
      sorter: (a: Backup, b: Backup) => a.size - b.size,
      render: (size: number) => (
        <Tag color="blue">{formatSize(size)}</Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: (a: Backup, b: Backup) => a.timestamp - b.timestamp,
      render: (timestamp: number) => (
        <Text type="secondary">
          {new Date(timestamp).toLocaleString('zh-CN')}
        </Text>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={backups}
      rowKey="backupId"
      loading={loading}
      locale={{
        emptyText: '暂无备份记录'
      }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 个备份`
      }}
    />
  );
};