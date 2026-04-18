#!/bin/bash
# 直接测试短链接并查看详细错误

echo "测试短链接访问..."
echo "=========================================="

# 测试短链接
curl -v http://localhost:8001/s/0kd6n1 2>&1 | head -100

echo ""
echo "=========================================="
echo "查看最近的服务器日志..."
echo "=========================================="

# 查看uvicorn进程的日志（如果有）
PID=$(lsof -i :8001 | grep uvicorn | awk '{print $2}' | head -1)
if [ -n "$PID" ]; then
    echo "Uvicorn PID: $PID"
    # 尝试查看进程的stderr
    if [ -f "/proc/$PID/fd/2" ]; then
        echo "进程stderr:"
        tail -50 "/proc/$PID/fd/2" 2>/dev/null || echo "无法读取stderr"
    fi
fi
