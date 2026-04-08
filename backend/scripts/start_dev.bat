@echo off
REM 启动开发环境脚本 (Windows)

echo Starting SnippetBox Backend Development Environment...

REM 检查虚拟环境
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

REM 安装依赖
echo Installing dependencies...
pip install -r requirements.txt

REM 检查 .env 文件
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit .env file with your configuration
)

REM 启动 Docker 服务
echo Starting PostgreSQL and Redis...
docker-compose up -d postgres redis

REM 等待服务启动
echo Waiting for services to be ready...
timeout /t 5 /nobreak

REM 启动 API 服务器
echo Starting API server...
uvicorn main:app --reload --host 0.0.0.0 --port 8000
