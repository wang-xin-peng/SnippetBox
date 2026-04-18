#!/bin/bash
# 获取服务器日志

# 方法1: 查找uvicorn进程并读取其输出
PID=$(lsof -i :8001 | grep uvicorn | awk '{print $2}' | head -1)

if [ -n "$PID" ]; then
    echo "Uvicorn PID: $PID"
    echo "=========================================="
    
    # 触发一个请求
    echo "触发测试请求..."
    curl -s http://localhost:8001/s/0kd6n1 > /dev/null
    
    # 等待日志写入
    sleep 1
    
    # 查看Python进程的日志
    echo "查看进程日志..."
    journalctl _PID=$PID -n 50 --no-pager 2>/dev/null || echo "无法使用journalctl"
    
    # 尝试strace
    echo ""
    echo "尝试strace最后的系统调用..."
    timeout 2 strace -p $PID 2>&1 | tail -20 || echo "无法使用strace"
else
    echo "未找到uvicorn进程"
fi
