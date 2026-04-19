# 使用 Python 3.10 作为基础镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements-docker.txt .

# 升级 pip 并安装 Python 依赖
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements-docker.txt

# 复制应用代码
COPY . .

# 创建模型缓存目录
RUN mkdir -p /app/models

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
