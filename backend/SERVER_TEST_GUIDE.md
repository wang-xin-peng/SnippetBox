# 服务器测试指南

## 📋 测试前准备

### 1. SSH 连接到服务器

```bash
ssh -p 22 xinpeng@8.141.108.146
```

### 2. 进入项目目录

```bash
cd SnippetBox/backend
```

### 3. 确认环境

```bash
# 查看 Python 版本
python3 --version  # 应该是 3.10.12

# 查看数据库状态
docker exec snippetbox-postgres psql -U snippetbox -c '\dt'

# 应该看到 7 个表：
# - users
# - cloud_snippets
# - cloud_categories
# - cloud_tags
# - shared_snippets
# - token_blacklist
# - cloud_snippet_vectors
```

---

## 🚀 启动服务器

### 方式一：使用启动脚本（推荐）

```bash
chmod +x start_server.sh
./start_server.sh
```

### 方式二：手动启动

```bash
/home/xinpeng/.local/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

启动成功后，你应该看到类似输出：

```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Starting SnippetBox API...
INFO:     Database initialized
INFO:     Application startup complete.
```

---

## 🧪 运行测试

### 在另一个终端窗口

```bash
# 新开一个 SSH 连接
ssh -p 22 xinpeng@8.141.108.146

# 进入项目目录
cd SnippetBox/backend

# 安装 requests 库（如果还没安装）
pip3 install requests --user

# 运行测试脚本
python3 test_server.py
```

---

## ✅ 预期测试结果

测试脚本会依次测试以下功能：

### 1. 健康检查
```json
{
  "status": "healthy",
  "service": "snippetbox-api"
}
```

### 2. 用户注册
```json
{
  "id": "uuid",
  "email": "test@example.com",
  "username": "testuser",
  "created_at": "2024-xx-xx..."
}
```

### 3. 用户登录
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### 4. 获取当前用户信息
```json
{
  "id": "uuid",
  "email": "test@example.com",
  "username": "testuser",
  "created_at": "2024-xx-xx..."
}
```

### 5. 创建片段
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "测试代码片段",
  "language": "python",
  "code": "print(\"Hello, SnippetBox!\")",
  "description": "这是一个测试片段",
  "category": "测试",
  "tags": ["test", "python"],
  "created_at": "2024-xx-xx...",
  "updated_at": "2024-xx-xx...",
  "deleted_at": null
}
```

### 6-11. 其他功能测试

测试脚本会继续测试：
- 获取片段列表
- 获取单个片段
- 更新片段
- 同步功能
- 创建分享
- 获取分享列表

---

## 🌐 测试短链接分享

测试脚本会输出一个短链接，例如：

```
短链接: http://8.141.108.146:8001/s/abc123
访问地址: http://8.141.108.146:8001/s/abc123
```

### 在浏览器中测试

1. 复制短链接地址
2. 在浏览器中打开
3. 应该看到一个精美的代码展示页面，包含：
   - 片段标题
   - 编程语言
   - 代码内容（带语法高亮）
   - 描述信息
   - 复制代码按钮
   - SnippetBox 品牌信息

---

## 🔍 手动测试 API

### 使用 curl 测试

```bash
# 1. 健康检查
curl http://localhost:8001/health

# 2. 注册用户
curl -X POST http://localhost:8001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"manual@test.com","username":"manualuser","password":"test123456"}'

# 3. 登录
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manual@test.com","password":"test123456"}'

# 保存返回的 access_token，用于后续请求
TOKEN="your_access_token_here"

# 4. 创建片段
curl -X POST http://localhost:8001/api/v1/snippets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"手动测试","language":"javascript","code":"console.log(\"test\");"}'

# 5. 获取片段列表
curl -X GET http://localhost:8001/api/v1/snippets \
  -H "Authorization: Bearer $TOKEN"
```

### 使用浏览器测试

访问 API 文档：
```
http://8.141.108.146:8001/docs
```

在 Swagger UI 中可以：
1. 查看所有 API 端点
2. 测试每个 API
3. 查看请求和响应格式

---

## 📊 查看数据库数据

```bash
# 连接到数据库
docker exec -it snippetbox-postgres psql -U snippetbox

# 查看用户
SELECT * FROM users;

# 查看片段
SELECT id, title, language, created_at FROM cloud_snippets;

# 查看分享
SELECT short_code, snippet_id, expires_at, view_count FROM shared_snippets;

# 退出
\q
```

---

## 🐛 故障排查

### 问题 1: 无法连接到服务器

**症状**: `Connection refused` 或 `Connection error`

**解决方案**:
```bash
# 检查服务器是否运行
ps aux | grep uvicorn

# 检查端口是否被占用
sudo lsof -i :8001

# 重启服务器
pkill -f uvicorn
./start_server.sh
```

### 问题 2: 数据库连接失败

**症状**: `password authentication failed`

**解决方案**:
```bash
# 检查数据库容器
docker ps | grep postgres

# 检查 .env 文件
cat .env | grep DATABASE

# 应该是：
# DATABASE_URL=postgresql://snippetbox:snippetbox@localhost:5432/snippetbox
```

### 问题 3: 导入错误

**症状**: `ModuleNotFoundError`

**解决方案**:
```bash
# 确保在正确的目录
pwd  # 应该是 /home/xinpeng/SnippetBox/backend

# 检查 Python 路径
python3 -c "import sys; print('\n'.join(sys.path))"

# 重新安装依赖
pip3 install fastapi uvicorn asyncpg bcrypt pyjwt jinja2 pydantic pydantic-settings python-multipart --user
```

### 问题 4: 权限错误

**症状**: `Permission denied`

**解决方案**:
```bash
# 修改文件权限
chmod +x start_server.sh
chmod +x test_server.py

# 修改目录权限
sudo chown -R xinpeng:xinpeng /home/xinpeng/SnippetBox
```

---

## 📝 测试检查清单

完成以下测试后，在方框中打勾：

- [ ] 服务器成功启动（端口 8001）
- [ ] 健康检查通过
- [ ] 用户注册成功
- [ ] 用户登录成功
- [ ] 获取用户信息成功
- [ ] 创建片段成功
- [ ] 获取片段列表成功
- [ ] 更新片段成功
- [ ] 同步功能正常
- [ ] 创建分享成功
- [ ] 短链接可以访问
- [ ] 短链接页面显示正常
- [ ] API 文档可以访问
- [ ] 数据库数据正确

---

## 🎉 测试完成

如果所有测试都通过，恭喜！第三周的后端功能已经成功部署并测试完成。

### 下一步

1. 将测试结果截图或日志保存
2. 记录任何问题或改进建议
3. 准备与前端进行联调
4. 完成任务 23（云端向量存储）

---

## 📞 需要帮助？

如果遇到问题：

1. 查看服务器日志：
   ```bash
   # 查看最近的日志
   tail -f /home/xinpeng/SnippetBox/backend/logs/*.log
   ```

2. 查看数据库日志：
   ```bash
   docker logs snippetbox-postgres
   ```

3. 检查环境配置：
   ```bash
   cat .env
   ```

4. 联系开发团队或查看文档：
   - [QUICKSTART.md](./QUICKSTART.md)
   - [DEPLOYMENT.md](./DEPLOYMENT.md)
   - [WEEK3_IMPLEMENTATION.md](./WEEK3_IMPLEMENTATION.md)
