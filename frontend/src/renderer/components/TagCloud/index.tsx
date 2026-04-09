import React from 'react';
import './TagCloud.css';

interface Tag {
  id: string;
  name: string;
  usageCount: number;
}

interface TagCloudProps {
  tags: Tag[];
  onTagClick: (tag: Tag) => void;
  maxTags?: number;
  sizeRange?: [number, number];
  colorRange?: [string, string];
}

const TagCloud: React.FC<TagCloudProps> = ({
  tags,
  onTagClick,
  maxTags = 20,
  sizeRange = [12, 24],
  colorRange = ['#6c757d', '#007bff']
}) => {
  const sortedTags = [...tags]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, maxTags);

  if (sortedTags.length === 0) {
    return (
      <div className="tag-cloud">
        <p className="no-tags">暂无标签</p>
      </div>
    );
  }

  const maxUsage = Math.max(...sortedTags.map(tag => tag.usageCount));
  const minUsage = Math.min(...sortedTags.map(tag => tag.usageCount));
  const usageRange = maxUsage - minUsage || 1;

  const getTagSize = (usage: number) => {
    const ratio = (usage - minUsage) / usageRange;
    return sizeRange[0] + (sizeRange[1] - sizeRange[0]) * ratio;
  };

  const getTagColor = (usage: number) => {
    const ratio = (usage - minUsage) / usageRange;
    const startColor = parseInt(colorRange[0].slice(1), 16);
    const endColor = parseInt(colorRange[1].slice(1), 16);
    
    const r1 = (startColor >> 16) & 0xff;
    const g1 = (startColor >> 8) & 0xff;
    const b1 = startColor & 0xff;
    
    const r2 = (endColor >> 16) & 0xff;
    const g2 = (endColor >> 8) & 0xff;
    const b2 = endColor & 0xff;
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="tag-cloud">
      <div className="tag-cloud-container">
        {sortedTags.map((tag) => {
          const size = getTagSize(tag.usageCount);
          const color = getTagColor(tag.usageCount);
          
          return (
            <span
              key={tag.id}
              className="tag-cloud-item"
              style={{
                fontSize: `${size}px`,
                color,
                padding: `${size * 0.3}px ${size * 0.6}px`,
              }}
              onClick={() => onTagClick(tag)}
              title={`使用次数: ${tag.usageCount}`}
            >
              {tag.name}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default TagCloud;
