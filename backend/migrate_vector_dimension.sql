-- 迁移向量维度从 384 到 768
-- 警告：这将删除所有现有向量数据！

BEGIN;

-- 1. 删除旧的向量表
DROP TABLE IF EXISTS cloud_snippet_vectors CASCADE;

-- 2. 重新创建向量表（768维）
CREATE TABLE cloud_snippet_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id UUID NOT NULL REFERENCES cloud_snippets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vector vector(768),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snippet_id)
);

-- 3. 重新创建索引
CREATE INDEX idx_vectors_snippet_id ON cloud_snippet_vectors(snippet_id);
CREATE INDEX idx_vectors_user_id ON cloud_snippet_vectors(user_id);

-- 4. 创建向量相似度搜索索引（HNSW，更快的搜索）
CREATE INDEX idx_vectors_hnsw ON cloud_snippet_vectors 
USING hnsw (vector vector_cosine_ops);

COMMIT;

-- 完成！现在向量表使用 768 维度
