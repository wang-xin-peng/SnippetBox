#!/bin/bash
# 以调试模式启动服务器

cd /home/xinpeng/SnippetBox/backend

# 杀掉旧进程
killall -9 uvicorn python3 2>/dev/null
sleep 2

# 启动服务器，输出详细日志
/home/xinpeng/.local/bin/uvicorn main:app \
    --host 0.0.0.0 \
    --port 8001 \
    --log-level debug \
    --access-log \
    2>&1 | tee server_debug.log &

echo "服务器已启动，日志输出到 server_debug.log"
echo "使用 tail -f server_debug.log 查看实时日志"
