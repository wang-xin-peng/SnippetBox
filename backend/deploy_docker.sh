#!/bin/bash
# 使用 Docker Compose 部署 SnippetBox API

echo "使用 Docker Compose 部署 SnippetBox API..."

cd /home/xinpeng/SnippetBox/backend

# 1. 停止当前运行的进程
echo "停止当前运行的进程..."
killall -9 uvicorn python3 2>/dev/null
sleep 2
echo "✅ 旧进程已停止"

# 2. 停止并删除旧的 API 容器（如果存在）
if docker ps -a | grep -q snippetbox-api; then
    echo "停止旧的 API 容器..."
    docker stop snippetbox-api 2>/dev/null
    docker rm snippetbox-api 2>/dev/null
    echo "✅ 旧容器已删除"
fi

# 3. 构建镜像
echo "构建 Docker 镜像..."
docker build -t snippetbox-api:latest .
echo "✅ 镜像构建完成"

# 4. 启动服务
echo "启动服务..."
docker-compose up -d api
echo "✅ 服务已启动"

# 5. 等待服务启动
sleep 5

# 6. 检查容器状态
echo ""
echo "=========================================="
echo "容器状态："
echo "=========================================="
docker ps | grep snippetbox

echo ""
echo "=========================================="
echo "测试 API："
echo "=========================================="
curl -s http://localhost:8000/health | jq .

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "常用命令："
echo "  查看容器: docker ps"
echo "  查看日志: docker logs -f snippetbox-api"
echo "  停止服务: docker-compose stop api"
echo "  启动服务: docker-compose start api"
echo "  重启服务: docker-compose restart api"
echo "  进入容器: docker exec -it snippetbox-api bash"
echo ""
echo "注意：Docker 方式使用端口 8000，systemd 方式使用端口 8001"
echo ""
