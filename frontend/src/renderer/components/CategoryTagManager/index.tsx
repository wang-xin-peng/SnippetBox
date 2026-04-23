import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import './CategoryTagManager.css';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Tag {
  id: string;
  name: string;
  usageCount: number;
}

interface CategoryTagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  tags: Tag[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddTag: (tag: { name: string }) => void;
  onDeleteTag: (tagId: string) => void;
  onMergeTags: (sourceId: string, targetId: string) => void;
}

const CategoryTagManager: React.FC<CategoryTagManagerProps> = ({
  isOpen,
  onClose,
  categories,
  tags,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddTag,
  onDeleteTag,
  onMergeTags
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>({
    name: '',
    color: '#007bff',
    icon: '📁'
  });
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
    setNewCategory({ name: '', color: '#007bff', icon: '📁' });
    setNewTagName('');
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;
    onAddCategory(newCategory);
    setNewCategory({ name: '', color: '#007bff', icon: '📁' });
  };

  const handleUpdateCategory = () => {
    if (!selectedCategory || !newCategory.name.trim()) return;
    onUpdateCategory({ ...selectedCategory, ...newCategory });
    setSelectedCategory(null);
    setNewCategory({ name: '', color: '#007bff', icon: '📁' });
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    onAddTag({ name: newTagName.trim() });
    setNewTagName('');
  };

  const handleMergeTags = () => {
    if (selectedTags.length !== 2) return;
    const [sourceId, targetId] = selectedTags;
    onMergeTags(sourceId, targetId);
    setSelectedTags([]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="分类和标签管理"
      width="600px"
    >
      <div className="category-tag-manager">
        <div className="manager-tabs">
          <button
            className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            分类管理
          </button>
          <button
            className={`tab ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            标签管理
          </button>
        </div>

        {activeTab === 'categories' && (
          <div className="category-manager">
            <div className="form-section">
              <h4>{selectedCategory ? '编辑分类' : '添加分类'}</h4>
              <div className="form-group">
                <label>分类名称</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => {
                    e.stopPropagation();
                    setNewCategory({ ...newCategory, name: e.target.value });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="输入分类名称"
                />
              </div>
              <div className="form-group">
                <label>颜色</label>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => {
                    e.stopPropagation();
                    setNewCategory({ ...newCategory, color: e.target.value });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="form-group">
                <label>图标</label>
                <input
                  type="text"
                  value={newCategory.icon}
                  onChange={(e) => {
                    e.stopPropagation();
                    setNewCategory({ ...newCategory, icon: e.target.value });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="输入 emoji 图标"
                />
              </div>
              <div className="form-actions">
                {selectedCategory ? (
                  <>
                    <button className="btn btn-primary" onClick={handleUpdateCategory}>
                      更新分类
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                      setSelectedCategory(null);
                      setNewCategory({ name: '', color: '#007bff', icon: '📁' });
                    }}>
                      取消编辑
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={handleAddCategory}>
                    添加分类
                  </button>
                )}
              </div>
            </div>

            <div className="list-section">
              <h4>分类列表</h4>
              <div className="category-list">
                {categories.length === 0 ? (
                  <p className="no-items">暂无分类</p>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className="category-item">
                      <span className="category-icon" style={{ color: category.color }}>
                        {category.icon}
                      </span>
                      <span className="category-name">{category.name}</span>
                      <div className="category-actions">
                        <button
                          className="action-btn edit"
                          onClick={() => {
                            setSelectedCategory(category);
                            setNewCategory({ ...category });
                          }}
                        >
                          编辑
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => onDeleteCategory(category.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="tag-manager">
            <div className="form-section">
              <h4>添加标签</h4>
              <div className="form-group">
                <label>标签名称</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => {
                    e.stopPropagation();
                    setNewTagName(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="输入标签名称"
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleAddTag}>
                  添加标签
                </button>
              </div>
            </div>

            <div className="list-section">
              <h4>标签列表</h4>
              <div className="tag-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleMergeTags}
                  disabled={selectedTags.length !== 2}
                >
                  合并选中标签
                </button>
              </div>
              <div className="tag-list">
                {tags.length === 0 ? (
                  <p className="no-items">暂无标签</p>
                ) : (
                  tags.map((tag) => (
                    <div key={tag.id} className="tag-item">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selectedTags.length < 2) {
                              setSelectedTags([...selectedTags, tag.id]);
                            }
                          } else {
                            setSelectedTags(selectedTags.filter(id => id !== tag.id));
                          }
                        }}
                      />
                      <span className="tag-name">{tag.name}</span>
                      <span className="tag-count">使用 {tag.usageCount} 次</span>
                      <button
                        className="action-btn delete"
                        onClick={() => onDeleteTag(tag.id)}
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CategoryTagManager;
