#!/bin/bash

# 启动开发环境脚本

echo "Starting SnippetBox Backend Development Environment..."

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "Installing dependencies..."
pip install -r requirements.txt

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env file with your configuration"
fi

# 启动 Docker 服务
echo "Starting PostgreSQL and Redis..."
docker-compose up -d postgres redis

# 等待服务启动
echo "Waiting for services to be ready..."
sleep 5

# 启动 API 服务器
echo "Starting API server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
