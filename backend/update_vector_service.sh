#!/bin/bash
# 更新云端向量服务脚本

set -e  # 遇到错误立即退出

echo "========================================="
echo "更新云端向量服务"
echo "========================================="
echo ""

# 1. 拉取最新代码
echo "1. 拉取最新代码..."
cd ~/SnippetBox
git fetch origin
git checkout feature/fix-vector-embedding
git pull origin feature/fix-vector-embedding
echo "✓ 代码已更新"
echo ""

# 2. 停止现有容器
echo "2. 停止现有容器..."
cd ~/SnippetBox/backend
docker compose down
echo "✓ 容器已停止"
echo ""

# 3. 重新构建镜像（包含新依赖）
echo "3. 重新构建后端镜像..."
docker compose build --no-cache api
echo "✓ 镜像已重新构建"
echo ""

# 4. 启动容器
echo "4. 启动容器..."
docker compose up -d
echo "✓ 容器已启动"
echo ""

# 5. 等待服务启动
echo "5. 等待服务启动（30秒）..."
sleep 30
echo ""

# 6. 检查容器状态
echo "6. 检查容器状态..."
docker ps | grep snippetbox
echo ""

# 7. 查看日志
echo "7. 查看后端日志（最近20行）..."
docker logs snippetbox-api --tail 20
echo ""

# 8. 测试嵌入服务
echo "8. 测试嵌入服务..."
curl -s http://localhost:8000/api/v1/embed/status | python3 -m json.tool || echo "API 测试失败"
echo ""

echo "========================================="
echo "更新完成！"
echo "========================================="
echo ""
echo "如果看到 'initialized': true，说明嵌入服务已成功启动"
echo "如果仍然失败，请查看完整日志："
echo "  docker logs snippetbox-api"
