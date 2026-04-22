#!/bin/bash
# 云端向量存储诊断脚本

echo "========================================="
echo "云端向量存储诊断"
echo "========================================="
echo ""

# 1. 检查后端服务状态
echo "1. 检查后端服务状态..."
if systemctl is-active --quiet snippetbox-api; then
    echo "✓ 后端服务正在运行"
    systemctl status snippetbox-api --no-pager | head -20
else
    echo "✗ 后端服务未运行"
    echo "尝试启动服务..."
    sudo systemctl start snippetbox-api
fi
echo ""

# 2. 检查数据库连接
echo "2. 检查数据库连接..."
sudo -u postgres psql -c "SELECT version();" 2>&1 | head -5
echo ""

# 3. 检查 pgvector 扩展
echo "3. 检查 pgvector 扩展..."
sudo -u postgres psql -d snippetbox -c "SELECT * FROM pg_extension WHERE extname = 'vector';" 2>&1
echo ""

# 4. 检查向量表结构
echo "4. 检查 cloud_snippet_vectors 表..."
sudo -u postgres psql -d snippetbox -c "\d cloud_snippet_vectors" 2>&1
echo ""

# 5. 检查向量数据
echo "5. 检查向量数据统计..."
sudo -u postgres psql -d snippetbox -c "SELECT COUNT(*) as total_vectors FROM cloud_snippet_vectors;" 2>&1
echo ""

# 6. 检查后端日志
echo "6. 检查后端日志（最近50行）..."
if [ -f "/var/log/snippetbox-api.log" ]; then
    tail -50 /var/log/snippetbox-api.log
elif [ -f "/home/xinpeng/SnippetBox/backend/app.log" ]; then
    tail -50 /home/xinpeng/SnippetBox/backend/app.log
else
    journalctl -u snippetbox-api -n 50 --no-pager
fi
echo ""

# 7. 检查 API 端点
echo "7. 测试向量 API 端点..."
echo "测试 /api/v1/embed/status ..."
curl -s http://localhost:8000/api/v1/embed/status | python3 -m json.tool 2>&1 || echo "API 请求失败"
echo ""

# 8. 检查环境变量
echo "8. 检查环境变量..."
if [ -f "/home/xinpeng/SnippetBox/backend/.env" ]; then
    echo "DATABASE_URL: $(grep DATABASE_URL /home/xinpeng/SnippetBox/backend/.env | cut -d'=' -f1)"
    echo "EMBEDDING_MODEL: $(grep EMBEDDING_MODEL /home/xinpeng/SnippetBox/backend/.env)"
else
    echo "未找到 .env 文件"
fi
echo ""

# 9. 检查 Python 依赖
echo "9. 检查关键 Python 依赖..."
cd /home/xinpeng/SnippetBox/backend
source venv/bin/activate 2>/dev/null || echo "虚拟环境未激活"
pip list | grep -E "sentence-transformers|torch|transformers|asyncpg|pgvector" 2>&1
echo ""

# 10. 检查模型文件
echo "10. 检查嵌入模型文件..."
if [ -d "/home/xinpeng/.cache/huggingface" ]; then
    echo "模型缓存目录存在"
    du -sh /home/xinpeng/.cache/huggingface 2>&1
    ls -lh /home/xinpeng/.cache/huggingface/hub/ 2>&1 | head -10
else
    echo "模型缓存目录不存在"
fi
echo ""

echo "========================================="
echo "诊断完成"
echo "========================================="
