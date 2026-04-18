#!/bin/bash
# 启动服务器并记录详细日志

cd /home/xinpeng/SnippetBox/backend

# 杀掉旧进程
killall -9 uvicorn python3 2>/dev/null
sleep 1

# 启动服务器，记录详细日志
/home/xinpeng/.local/bin/uvicorn main:app \
    --host 0.0.0.0 \
    --port 8001 \
    --log-level debug \
    > /home/xinpeng/SnippetBox/backend/server_debug.log 2>&1 &

echo "服务器已启动，PID: $!"
echo "查看日志: tail -f /home/xinpeng/SnippetBox/backend/server_debug.log"
