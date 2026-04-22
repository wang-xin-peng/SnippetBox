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
git stash  # 暂存本地修改
git fetch origin
git checkout feature/fix-vector-embedding
git pull origin feature/fix-vector-embedding
echo "✓ 代码已更新"
echo ""

# 2. 停止现有容器（但不删除）
echo "2. 停止现有容器..."
cd ~/SnippetBox/backend
docker compose stop api
echo "✓ 容器已停止"
echo ""

# 3. 重新构建镜像（使用缓存加速）
echo "3. 重新构建后端镜像（使用缓存）..."
# 使用 DOCKER_BUILDKIT 启用 BuildKit 加速
DOCKER_BUILDKIT=1 docker compose build api
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
echo "7. 查看后端日志（最近30行）..."
docker logs snippetbox-api --tail 30
echo ""

# 8. 测试嵌入服务
echo "8. 测试嵌入服务..."
echo "等待5秒让模型加载..."
sleep 5
curl -s http://localhost:8000/api/v1/embed/status | python3 -m json.tool || echo "API 测试失败"
echo ""

echo "========================================="
echo "更新完成！"
echo "========================================="
echo ""
echo "如果看到 'initialized': true，说明嵌入服务已成功启动"
echo "如果仍然失败，请查看完整日志："
echo "  docker logs snippetbox-api"
echo ""
echo "提示：首次启动时模型需要下载，可能需要几分钟"
echo "可以使用以下命令查看实时日志："
echo "  docker logs -f snippetbox-api"
