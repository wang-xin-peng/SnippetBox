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

const ICON_OPTIONS = [
  { value: 'fas fa-folder', label: '文件夹' },
  { value: 'fas fa-code', label: '代码' },
  { value: 'fas fa-brain', label: '算法' },
  { value: 'fas fa-palette', label: 'UI设计' },
  { value: 'fas fa-wrench', label: '工具' },
  { value: 'fas fa-plug', label: 'API' },
  { value: 'fas fa-database', label: '数据库' },
  { value: 'fas fa-cog', label: '配置' },
  { value: 'fas fa-shield-alt', label: '安全' },
  { value: 'fas fa-chart-bar', label: '数据' },
];

const EMPTY_CATEGORY = { name: '', color: '#007bff', icon: 'fas fa-folder' };

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
  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>(EMPTY_CATEGORY);
  const [newTagName, setNewTagName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'tag'; id: string; name: string } | null>(null);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
    setNewCategory(EMPTY_CATEGORY);
    setNewTagName('');
    setDeleteConfirm(null);
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;
    onAddCategory(newCategory);
    setNewCategory(EMPTY_CATEGORY);
  };

  const handleUpdateCategory = () => {
    if (!selectedCategory || !newCategory.name.trim()) return;
    onUpdateCategory({ ...selectedCategory, ...newCategory });
    setSelectedCategory(null);
    setNewCategory(EMPTY_CATEGORY);
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    onAddTag({ name: newTagName.trim() });
    setNewTagName('');
  };

  const handleMergeTags = () => {
    if (selectedTags.length !== 2) return;
    onMergeTags(selectedTags[0], selectedTags[1]);
    setSelectedTags([]);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'category') {
      onDeleteCategory(deleteConfirm.id);
    } else {
      onDeleteTag(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="分类和标签管理" width="600px">
      <div className="category-tag-manager">
        <div className="manager-tabs">
          <button className={`tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            分类管理
          </button>
          <button className={`tab ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}>
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
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  placeholder="输入分类名称"
                />
              </div>
              <div className="form-group">
                <label>颜色</label>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                  onClick={e => e.stopPropagation()}
                />
              </div>
              <div className="form-group">
                <label>图标</label>
                <div className="icon-picker">
                  {ICON_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`icon-option ${newCategory.icon === opt.value ? 'selected' : ''}`}
                      onClick={e => { e.stopPropagation(); setNewCategory({ ...newCategory, icon: opt.value }); }}
                      title={opt.label}
                    >
                      <i className={opt.value} style={{ color: newCategory.icon === opt.value ? newCategory.color : undefined }}></i>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                {selectedCategory ? (
                  <>
                    <button className="btn btn-primary" onClick={handleUpdateCategory}>更新分类</button>
                    <button className="btn btn-secondary" onClick={() => { setSelectedCategory(null); setNewCategory(EMPTY_CATEGORY); }}>取消编辑</button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={handleAddCategory}>添加分类</button>
                )}
              </div>
            </div>

            <div className="list-section">
              <h4>分类列表</h4>
              <div className="category-list">
                {categories.length === 0 ? (
                  <p className="no-items">暂无分类</p>
                ) : (
                  categories.map(category => (
                    <div key={category.id} className="category-item">
                      <span className="category-icon" style={{ color: category.color }}>
                        {category.icon?.startsWith('fa')
                          ? <i className={category.icon}></i>
                          : category.icon}
                      </span>
                      <span className="category-name">{category.name}</span>
                      {category.name !== '未分类' && (
                        <div className="category-actions">
                          <button className="action-btn edit" onClick={() => { setSelectedCategory(category); setNewCategory({ ...category }); }}>编辑</button>
                          <button className="action-btn delete" onClick={() => setDeleteConfirm({ type: 'category', id: category.id, name: category.name })}>删除</button>
                        </div>
                      )}
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
                  onChange={e => setNewTagName(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder="输入标签名称"
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleAddTag}>添加标签</button>
              </div>
            </div>

            <div className="list-section">
              <h4>标签列表</h4>
              <div className="tag-actions">
                <button className="btn btn-secondary" onClick={handleMergeTags} disabled={selectedTags.length !== 2}>
                  合并选中标签
                </button>
              </div>
              <div className="tag-list">
                {tags.length === 0 ? (
                  <p className="no-items">暂无标签</p>
                ) : (
                  tags.map(tag => (
                    <div key={tag.id} className="tag-item">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            if (selectedTags.length < 2) setSelectedTags([...selectedTags, tag.id]);
                          } else {
                            setSelectedTags(selectedTags.filter(id => id !== tag.id));
                          }
                        }}
                      />
                      <span className="tag-name">{tag.name}</span>
                      <span className="tag-count">使用 {tag.usageCount} 次</span>
                      <button className="action-btn delete" onClick={() => setDeleteConfirm({ type: 'tag', id: tag.id, name: tag.name })}>删除</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">{deleteConfirm.type === 'category' ? '确认删除分类' : '确认删除标签'}</div>
            <div className="confirm-msg">
              {deleteConfirm.type === 'category'
                ? `确定要删除分类"${deleteConfirm.name}"吗？该分类下的代码片段将变为无分类状态。`
                : `确定要删除标签"${deleteConfirm.name}"吗？`}
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn" onClick={() => setDeleteConfirm(null)}>取消</button>
              <button className="confirm-btn confirm-btn--danger" onClick={confirmDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CategoryTagManager;
