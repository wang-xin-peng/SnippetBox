#!/bin/bash
# 部署 SnippetBox API 为 systemd 服务

echo "部署 SnippetBox API 服务..."

# 1. 创建日志目录
mkdir -p /home/xinpeng/SnippetBox/backend/logs
echo "✅ 日志目录已创建"

# 2. 停止当前运行的进程
echo "停止当前运行的进程..."
killall -9 uvicorn python3 2>/dev/null
sleep 2
echo "✅ 旧进程已停止"

# 3. 复制服务文件到 systemd 目录
sudo cp /home/xinpeng/SnippetBox/backend/snippetbox-api.service /etc/systemd/system/
echo "✅ 服务文件已复制"

# 4. 重新加载 systemd
sudo systemctl daemon-reload
echo "✅ systemd 已重新加载"

# 5. 启用服务（开机自启动）
sudo systemctl enable snippetbox-api.service
echo "✅ 服务已设置为开机自启动"

# 6. 启动服务
sudo systemctl start snippetbox-api.service
echo "✅ 服务已启动"

# 7. 等待服务启动
sleep 3

# 8. 检查服务状态
echo ""
echo "=========================================="
echo "服务状态："
echo "=========================================="
sudo systemctl status snippetbox-api.service --no-pager

echo ""
echo "=========================================="
echo "测试 API："
echo "=========================================="
curl -s http://localhost:8001/health | jq .

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "常用命令："
echo "  查看状态: sudo systemctl status snippetbox-api"
echo "  启动服务: sudo systemctl start snippetbox-api"
echo "  停止服务: sudo systemctl stop snippetbox-api"
echo "  重启服务: sudo systemctl restart snippetbox-api"
echo "  查看日志: tail -f /home/xinpeng/SnippetBox/backend/logs/api.log"
echo "  查看错误: tail -f /home/xinpeng/SnippetBox/backend/logs/api.error.log"
echo ""
