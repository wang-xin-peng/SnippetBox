# 使用 Python 3.10 作为基础镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 替换为国内 apt 镜像源（阿里云）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件（单独复制以利用 Docker 缓存）
COPY requirements-docker.txt .

# 配置 pip 使用阿里云镜像（对 PyTorch 等大包更快）
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    pip config set install.trusted-host mirrors.aliyun.com

# 升级 pip 并安装 Python 依赖
# 使用 pip cache 加速重复构建
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -r requirements-docker.txt

# 复制应用代码
COPY . .

# 创建模型缓存目录
RUN mkdir -p /app/models

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
