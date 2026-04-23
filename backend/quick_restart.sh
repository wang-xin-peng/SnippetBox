#!/bin/bash
# 快速重启服务（不重新构建镜像）

echo "========================================="
echo "快速重启云端向量服务"
echo "========================================="
echo ""

cd ~/SnippetBox/backend

# 1. 重启容器
echo "1. 重启后端容器..."
docker compose restart api
echo "✓ 容器已重启"
echo ""

# 2. 等待服务启动
echo "2. 等待服务启动（20秒）..."
sleep 20
echo ""

# 3. 查看日志
echo "3. 查看后端日志（最近30行）..."
docker logs snippetbox-api --tail 30
echo ""

# 4. 测试服务
echo "4. 测试嵌入服务..."
curl -s http://localhost:8000/api/v1/embed/status | python3 -m json.tool || echo "API 测试失败"
echo ""

echo "========================================="
echo "重启完成！"
echo "========================================="
