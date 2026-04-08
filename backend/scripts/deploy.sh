#!/bin/bash

# SnippetBox Backend 部署脚本
# 用于将本地代码部署到服务器

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量（请根据实际情况修改）
SERVER_USER="your_username"
SERVER_HOST="your_server_ip"
SERVER_PATH="/opt/snippetbox/backend"
LOCAL_PATH="."

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查配置
check_config() {
    print_info "检查配置..."
    
    if [ "$SERVER_USER" = "your_username" ] || [ "$SERVER_HOST" = "your_server_ip" ]; then
        print_error "请先修改脚本中的服务器配置！"
        print_info "编辑 scripts/deploy.sh，修改以下变量："
        echo "  - SERVER_USER: 服务器用户名"
        echo "  - SERVER_HOST: 服务器 IP 或域名"
        echo "  - SERVER_PATH: 服务器上的部署路径"
        exit 1
    fi
    
    print_info "配置检查通过"
}

# 检查必要文件
check_files() {
    print_info "检查必要文件..."
    
    required_files=(
        "main.py"
        "config.py"
        "requirements.txt"
        "api/__init__.py"
        "services/__init__.py"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "缺少必要文件: $file"
            exit 1
        fi
    done
    
    print_info "文件检查通过"
}

# 创建部署包
create_deploy_package() {
    print_info "创建部署包..."
    
    # 创建临时目录
    TEMP_DIR=$(mktemp -d)
    print_info "临时目录: $TEMP_DIR"
    
    # 复制必要文件
    cp -r api "$TEMP_DIR/"
    cp -r services "$TEMP_DIR/"
    cp main.py "$TEMP_DIR/"
    cp config.py "$TEMP_DIR/"
    cp requirements.txt "$TEMP_DIR/"
    
    # 如果存在 Dockerfile，也复制
    if [ -f "Dockerfile" ]; then
        cp Dockerfile "$TEMP_DIR/"
    fi
    
    if [ -f "docker-compose.yml" ]; then
        cp docker-compose.yml "$TEMP_DIR/"
    fi
    
    print_info "部署包创建完成"
    echo "$TEMP_DIR"
}

# 上传文件到服务器
upload_files() {
    local temp_dir=$1
    print_info "上传文件到服务器..."
    
    # 使用 rsync 上传（保持权限和时间戳）
    rsync -avz --delete \
        --exclude='__pycache__/' \
        --exclude='*.pyc' \
        --exclude='.pytest_cache/' \
        "$temp_dir/" \
        "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"
    
    if [ $? -eq 0 ]; then
        print_info "文件上传成功"
    else
        print_error "文件上传失败"
        exit 1
    fi
}

# 在服务器上执行命令
remote_exec() {
    local command=$1
    ssh "$SERVER_USER@$SERVER_HOST" "$command"
}

# 部署到服务器
deploy_to_server() {
    print_info "开始部署到服务器..."
    
    # 检查服务器连接
    print_info "检查服务器连接..."
    if ! ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_HOST" "echo 'Connected'" > /dev/null 2>&1; then
        print_error "无法连接到服务器"
        exit 1
    fi
    print_info "服务器连接成功"
    
    # 创建服务器目录
    print_info "创建服务器目录..."
    remote_exec "mkdir -p $SERVER_PATH"
    
    # 创建部署包
    temp_dir=$(create_deploy_package)
    
    # 上传文件
    upload_files "$temp_dir"
    
    # 清理临时目录
    rm -rf "$temp_dir"
    print_info "清理临时文件"
}

# 重启服务
restart_service() {
    print_info "重启服务..."
    
    # 检查是否使用 Docker
    if remote_exec "[ -f $SERVER_PATH/docker-compose.yml ]"; then
        print_info "检测到 Docker Compose，重启容器..."
        remote_exec "cd $SERVER_PATH && docker-compose restart api"
    else
        print_info "检测到 systemd 服务，重启服务..."
        remote_exec "sudo systemctl restart snippetbox-api"
    fi
    
    print_info "服务重启完成"
}

# 检查服务状态
check_service() {
    print_info "检查服务状态..."
    
    sleep 3  # 等待服务启动
    
    # 检查健康端点
    if remote_exec "curl -s http://localhost:8000/health | grep -q 'healthy'"; then
        print_info "服务运行正常 ✓"
    else
        print_warning "服务可能未正常启动，请检查日志"
    fi
}

# 显示帮助信息
show_help() {
    echo "SnippetBox Backend 部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  deploy      部署代码到服务器"
    echo "  restart     重启服务"
    echo "  status      检查服务状态"
    echo "  logs        查看服务日志"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 deploy   # 部署代码"
    echo "  $0 restart  # 重启服务"
    echo "  $0 status   # 检查状态"
}

# 查看日志
show_logs() {
    print_info "查看服务日志..."
    
    if remote_exec "[ -f $SERVER_PATH/docker-compose.yml ]"; then
        remote_exec "cd $SERVER_PATH && docker-compose logs -f --tail=50 api"
    else
        remote_exec "sudo journalctl -u snippetbox-api -f -n 50"
    fi
}

# 主函数
main() {
    case "${1:-deploy}" in
        deploy)
            print_info "开始部署流程..."
            check_config
            check_files
            deploy_to_server
            restart_service
            check_service
            print_info "部署完成！"
            ;;
        restart)
            check_config
            restart_service
            check_service
            ;;
        status)
            check_config
            check_service
            ;;
        logs)
            check_config
            show_logs
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
