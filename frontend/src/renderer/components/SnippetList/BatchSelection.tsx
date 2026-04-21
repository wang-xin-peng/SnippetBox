import React, { useCallback } from 'react';

interface BatchSelectionProps {
  totalCount: number;
  selectedIds: Set<string>;
  allIds: string[];
  onSelectAll: () => void;
  onClearAll: () => void;
}

/**
 * 批量选择工具栏：全选/取消全选 + 选择计数
 */
export const BatchSelection: React.FC<BatchSelectionProps> = ({
  totalCount,
  selectedIds,
  allIds,
  onSelectAll,
  onClearAll,
}) => {
  const selectedCount = selectedIds.size;
  const isAllSelected = selectedCount > 0 && selectedCount === totalCount;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

  const handleToggleAll = useCallback(() => {
    if (isAllSelected || isIndeterminate) {
      onClearAll();
    } else {
      onSelectAll();
    }
  }, [isAllSelected, isIndeterminate, onSelectAll, onClearAll]);

  return (
    <div className="batch-selection-bar">
      <label className="batch-select-all">
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={(el) => {
            if (el) el.indeterminate = isIndeterminate;
          }}
          onChange={handleToggleAll}
          aria-label="全选/取消全选"
        />
        <span className="batch-select-label">
          {selectedCount > 0
            ? `已选择 ${selectedCount} / ${totalCount} 项`
            : `全选 (${totalCount} 项)`}
        </span>
      </label>
      {selectedCount > 0 && (
        <button className="batch-clear-btn" onClick={onClearAll}>
          取消选择
        </button>
      )}
    </div>
  );
};
