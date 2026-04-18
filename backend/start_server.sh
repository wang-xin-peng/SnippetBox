#!/bin/bash

# 启动 SnippetBox API 服务器

echo "正在启动 SnippetBox API 服务器..."
echo "端口: 8001"
echo "访问 API 文档: http://localhost:8001/docs"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 添加 uvicorn 到 PATH
export PATH=$PATH:/home/xinpeng/.local/bin

# 启动服务器
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
