#!/bin/bash
# 重启服务器脚本

echo "正在重启 SnippetBox 服务器..."

# 1. 拉取最新代码
cd /home/xinpeng/SnippetBox
git pull
echo "✅ 代码已更新"

# 2. 杀掉旧进程
killall -9 uvicorn python3 2>/dev/null
sleep 2
echo "✅ 旧进程已清理"

# 3. 检查端口
if lsof -i :8001 > /dev/null 2>&1; then
    echo "❌ 端口8001仍被占用"
    lsof -i :8001
    exit 1
fi
echo "✅ 端口8001已释放"

# 4. 启动新服务器
cd /home/xinpeng/SnippetBox/backend
setsid /home/xinpeng/.local/bin/uvicorn main:app --host 0.0.0.0 --port 8001 > /dev/null 2>&1 < /dev/null &
sleep 3

# 5. 检查服务器状态
if lsof -i :8001 > /dev/null 2>&1; then
    echo "✅ 服务器启动成功"
    lsof -i :8001
else
    echo "❌ 服务器启动失败"
    exit 1
fi

echo ""
echo "服务器已重启完成！"
echo "API文档: http://8.141.108.146:8001/docs"
echo "健康检查: http://8.141.108.146:8001/health"
