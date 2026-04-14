import React, { useState, useEffect } from 'react';
import { MirrorInfo } from '../../../shared/types/model';
import './MirrorSelector.css';

interface MirrorSelectorProps {
  onSelect: (mirrorUrl: string) => void;
  disabled?: boolean;
}

export const MirrorSelector: React.FC<MirrorSelectorProps> = ({ 
  onSelect, 
  disabled = false 
}) => {
  const [mirrors, setMirrors] = useState<MirrorInfo[]>([]);
  const [selectedMirror, setSelectedMirror] = useState<string>('');

  useEffect(() => {
    loadMirrors();
  }, []);

  const loadMirrors = async () => {
    try {
      const mirrorList = await window.electron.model.getMirrors();
      setMirrors(mirrorList);
      if (mirrorList.length > 0) {
        setSelectedMirror(mirrorList[0].url);
        onSelect(mirrorList[0].url);
      }
    } catch (error) {
      console.error('加载镜像源失败:', error);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const url = event.target.value;
    setSelectedMirror(url);
    onSelect(url);
  };

  return (
    <div className="mirror-selector">
      <label className="mirror-label">选择下载源:</label>
      <select 
        className="mirror-select"
        value={selectedMirror}
        onChange={handleChange}
        disabled={disabled}
      >
        {mirrors.map((mirror) => (
          <option key={mirror.url} value={mirror.url}>
            {mirror.name} ({mirror.location})
          </option>
        ))}
      </select>
    </div>
  );
};
