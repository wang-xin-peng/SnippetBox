-- 清理向量相关的数据库表
-- 警告：这将删除所有向量数据！

BEGIN;

-- 删除向量表
DROP TABLE IF EXISTS cloud_snippet_vectors CASCADE;

COMMIT;

-- 完成！向量表已删除
