import React from 'react';
import './CategorySidebar.css';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  count?: number;
}

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  onAddCategory,
  onEditCategory,
  onDeleteCategory
}) => {
  return (
    <div className="category-sidebar">
      <div className="category-sidebar-header">
        <h3>分类</h3>
        <button 
          className="add-category-btn" 
          onClick={onAddCategory}
          title="添加分类"
        >
          +
        </button>
      </div>
      
      <div className="category-list">
        <div 
          className={`category-item ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => onCategorySelect(null)}
        >
          <span className="category-icon">📁</span>
          <span className="category-name">全部</span>
        </div>
        
        {categories.map((category) => (
          <div 
            key={category.id}
            className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => onCategorySelect(category.id)}
          >
            <span 
              className="category-icon" 
              style={{ color: category.color }}
            >
              {category.icon || '📁'}
            </span>
            <span className="category-name">{category.name}</span>
            {category.count !== undefined && (
              <span className="category-count">{category.count}</span>
            )}
            <div className="category-actions">
              <button 
                className="action-btn edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCategory(category);
                }}
                title="编辑"
              >
                ✏️
              </button>
              <button 
                className="action-btn delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCategory(category.id);
                }}
                title="删除"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategorySidebar;
