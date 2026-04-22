# SnippetBox 后端 API 使用指南

## 目录

* [基本信息](https://kiro-diff+.vscode-resource.vscode-cdn.net/SnippetBox/backend/API_USAGE.md?commitId%3D17f3d55f%26executionId%3D17304457-acd0-4a62-ac4f-86d9c18909a5#%E5%9F%BA%E6%9C%AC%E4%BF%A1%E6%81%AF)
* [认证系统](https://kiro-diff+.vscode-resource.vscode-cdn.net/SnippetBox/backend/API_USAGE.md?commitId%3D17f3d55f%26executionId%3D17304457-acd0-4a62-ac4f-86d9c18909a5#%E8%AE%A4%E8%AF%81%E7%B3%BB%E7%BB%9F)
* [片段管理](https://kiro-diff+.vscode-resource.vscode-cdn.net/SnippetBox/backend/API_USAGE.md?commitId%3D17f3d55f%26executionId%3D17304457-acd0-4a62-ac4f-86d9c18909a5#%E7%89%87%E6%AE%B5%E7%AE%A1%E7%90%86)
* [云端同步](https://kiro-diff+.vscode-resource.vscode-cdn.net/SnippetBox/backend/API_USAGE.md?commitId%3D17f3d55f%26executionId%3D17304457-acd0-4a62-ac4f-86d9c18909a5#%E4%BA%91%E7%AB%AF%E5%90%8C%E6%AD%A5)
* [短链接分享](https://kiro-diff+.vscode-resource.vscode-cdn.net/SnippetBox/backend/API_USAGE.md?commitId%3D17f3d55f%26executionId%3D17304457-acd0-4a62-ac4f-86d9c18909a5#%E7%9F%AD%E9%93%BE%E6%8E%A5%E5%88%86%E4%BA%AB)
* [向量同步](https://kiro-diff+.vscode-resource.vscode-cdn.net/SnippetBox/backend/API_USAGE.md?commitId%3D17f3d55f%26executionId%3D17304457-acd0-4a62-ac4f-86d9c18909a5#%E5%90%91%E9%87%8F%E5%90%8C%E6%AD%A5)
* [错误处理](https://kiro-diff+.vscode-resource.vscode-cdn.net/SnippetBox/backend/API_USAGE.md?commitId%3D17f3d55f%26executionId%3D17304457-acd0-4a62-ac4f-86d9c18909a5#%E9%94%99%E8%AF%AF%E5%A4%84%E7%90%86)

## 基本信息

### 服务器地址

* **开发环境** : `http://localhost:8000`
* **生产环境** : `http://8.141.108.146:8000`
* **API文档** : `http://8.141.108.146:8000/docs`
* **健康检查** : `http://8.141.108.146:8000/health`

### 通用响应格式

所有API响应都使用JSON格式，HTTP状态码遵循RESTful规范：

* `200 OK` - 请求成功
* `201 Created` - 资源创建成功
* `204 No Content` - 删除成功
* `400 Bad Request` - 请求参数错误
* `401 Unauthorized` - 未认证或令牌无效
* `404 Not Found` - 资源不存在
* `500 Internal Server Error` - 服务器错误

---

## 认证系统

### 1. 用户注册

 **端点** : `POST /api/v1/auth/register`

 **请求体** :

```json
{
  "email": "user@example.com",
  "username": "testuser",
  "password": "password123"
}
```

**响应** (201):

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "testuser",
  "created_at": "2026-04-18T12:00:00"
}
```

 **错误** :

* `400` - 邮箱已注册或参数无效

---

### 2. 用户登录

 **端点** : `POST /api/v1/auth/login`

 **请求体** :

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应** (200):

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

 **说明** :

* `access_token`: 访问令牌，有效期1小时
* `refresh_token`: 刷新令牌，有效期7天
* 后续请求需在Header中携带: `Authorization: Bearer {access_token}`

---

### 3. 刷新令牌

 **端点** : `POST /api/v1/auth/refresh`

 **请求体** :

```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**响应** (200):

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

### 4. 获取当前用户信息

 **端点** : `GET /api/v1/auth/me`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**响应** (200):

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "testuser",
  "created_at": "2026-04-18T12:00:00"
}
```

---

### 5. 登出

 **端点** : `POST /api/v1/auth/logout`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**响应** (200):

```json
{
  "message": "Successfully logged out"
}
```

 **说明** : 将当前令牌加入黑名单，令牌立即失效

---

## 片段管理

### 1. 创建片段

 **端点** : `POST /api/v1/snippets`

 **请求头** :

```
Authorization: Bearer {access_token}
```

 **请求体** :

```json
{
  "title": "Python Hello World",
  "language": "python",
  "code": "print('Hello, World!')",
  "description": "A simple hello world program",
  "category": "Python",
  "tags": ["python", "basic", "tutorial"]
}
```

**响应** (201):

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Python Hello World",
  "language": "python",
  "code": "print('Hello, World!')",
  "description": "A simple hello world program",
  "category": "Python",
  "tags": ["python", "basic", "tutorial"],
  "created_at": "2026-04-18T12:00:00",
  "updated_at": "2026-04-18T12:00:00",
  "deleted_at": null
}
```

---

### 2. 获取片段列表

 **端点** : `GET /api/v1/snippets`

 **请求头** :

```
Authorization: Bearer {access_token}
```

 **查询参数** :

* `category` (可选): 按分类筛选
* `tags` (可选): 按标签筛选，多个标签用逗号分隔
* `language` (可选): 按语言筛选

 **示例** : `GET /api/v1/snippets?category=Python&tags=basic,tutorial`

**响应** (200):

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Python Hello World",
    "language": "python",
    "code": "print('Hello, World!')",
    "description": "A simple hello world program",
    "category": "Python",
    "tags": ["python", "basic", "tutorial"],
    "created_at": "2026-04-18T12:00:00",
    "updated_at": "2026-04-18T12:00:00",
    "deleted_at": null
  }
]
```

---

### 3. 获取单个片段

 **端点** : `GET /api/v1/snippets/{snippet_id}`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**响应** (200): 同创建片段的响应格式

---

### 4. 更新片段

 **端点** : `PUT /api/v1/snippets/{snippet_id}`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**请求体** (所有字段可选):

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "code": "print('Updated code')",
  "category": "New Category",
  "tags": ["new", "tags"]
}
```

**响应** (200): 返回更新后的完整片段信息

---

### 5. 删除片段

 **端点** : `DELETE /api/v1/snippets/{snippet_id}`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**响应** (204): 无内容

 **说明** : 软删除，设置 `deleted_at` 字段

---

## 云端同步

### 同步片段

 **端点** : `POST /api/v1/sync`

 **请求头** :

```
Authorization: Bearer {access_token}
```

 **请求体** :

```json
{
  "last_sync_time": "2026-04-18T12:00:00",
  "changes": [
    {
      "snippet_id": "uuid",
      "action": "create",
      "data": {
        "title": "New Snippet",
        "language": "javascript",
        "code": "console.log('Hello');",
        "description": "Test snippet",
        "category": "JavaScript",
        "tags": ["js", "test"]
      },
      "timestamp": "2026-04-18T12:05:00"
    },
    {
      "snippet_id": "uuid",
      "action": "update",
      "data": {
        "title": "Updated Title"
      },
      "timestamp": "2026-04-18T12:06:00"
    },
    {
      "snippet_id": "uuid",
      "action": "delete",
      "timestamp": "2026-04-18T12:07:00"
    }
  ]
}
```

**响应** (200):

```json
{
  "server_changes": [
    {
      "snippet_id": "uuid",
      "action": "update",
      "data": {
        "id": "uuid",
        "title": "Server Updated Snippet",
        "language": "python",
        "code": "print('Server version')",
        "description": "Updated on server",
        "category": "Python",
        "tags": ["python"],
        "created_at": "2026-04-18T11:00:00",
        "updated_at": "2026-04-18T12:10:00"
      },
      "timestamp": "2026-04-18T12:10:00"
    }
  ],
  "conflicts": [
    {
      "snippet_id": "uuid",
      "client_version": {
        "title": "Client Version",
        "updated_at": "2026-04-18T12:05:00"
      },
      "server_version": {
        "title": "Server Version",
        "updated_at": "2026-04-18T12:10:00"
      }
    }
  ],
  "sync_time": "2026-04-18T12:15:00"
}
```

 **说明** :

* `last_sync_time`: 客户端上次同步时间，首次同步传 `null`
* `changes`: 客户端的本地修改
* `server_changes`: 服务器端的修改
* `conflicts`: 冲突列表，需要客户端解决
* 支持的操作: `create`, `update`, `delete`

---

## 短链接分享

### 1. 创建分享

 **端点** : `POST /api/v1/share`

 **请求头** :

```
Authorization: Bearer {access_token}
```

 **请求体** :

```json
{
  "snippet_id": "uuid",
  "expires_in_days": 7,
  "password": "optional_password"
}
```

**响应** (201):

```json
{
  "short_code": "abc123",
  "short_url": "http://8.141.108.146:8000/s/abc123",
  "expires_at": "2026-04-25T12:00:00"
}
```

 **说明** :

* `expires_in_days`: 过期天数，范围 1-365，默认 7
* `password`: 可选，设置访问密码

---

### 2. 访问分享页面

 **端点** : `GET /s/{short_code}`

 **查询参数** :

* `password` (可选): 如果分享设置了密码，需要提供

 **示例** : `GET /s/abc123?password=mypassword`

**响应** (200): 返回HTML页面，包含：

* 代码片段内容
* 语法高亮
* 复制按钮
* 访问统计
* 创建时间

 **错误页面** :

* 分享不存在: 显示 "分享不存在或已被删除"
* 分享过期: 显示 "分享已过期"
* 需要密码: 显示密码输入表单
* 密码错误: 显示 "密码错误"

---

### 3. 获取分享信息

 **端点** : `GET /api/v1/share/{short_code}/info`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**响应** (200):

```json
{
  "short_code": "abc123",
  "snippet_id": "uuid",
  "user_id": "uuid",
  "expires_at": "2026-04-25T12:00:00",
  "view_count": 42,
  "created_at": "2026-04-18T12:00:00",
  "has_password": true
}
```

 **说明** : 只能查看自己创建的分享

---

### 4. 获取分享列表

 **端点** : `GET /api/v1/shares`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**响应** (200):

```json
[
  {
    "short_code": "abc123",
    "snippet_id": "uuid",
    "user_id": "uuid",
    "expires_at": "2026-04-25T12:00:00",
    "view_count": 42,
    "created_at": "2026-04-18T12:00:00",
    "has_password": true
  }
]
```

---

### 5. 删除分享

 **端点** : `DELETE /api/v1/share/{short_code}`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**响应** (204): 无内容

---

### 6. 获取分享统计

 **端点** : `GET /api/v1/share/{short_code}/stats`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**响应** (200):

```json
{
  "short_code": "abc123",
  "view_count": 42,
  "created_at": "2026-04-18T12:00:00",
  "expires_at": "2026-04-25T12:00:00",
  "last_accessed": "2026-04-20T15:30:00"
}
```

---

## 向量同步

### 1. 上传向量

 **端点** : `POST /api/v1/vector-sync/upload`

 **请求头** :

```
Authorization: Bearer {access_token}
```

 **请求体** :

```json
{
  "snippet_id": "uuid",
  "vector": [0.1, 0.2, 0.3, ..., 0.384]
}
```

**响应** (200):

```json
{
  "message": "Vector uploaded successfully",
  "snippet_id": "uuid"
}
```

 **说明** : 向量维度为 384（all-MiniLM-L6-v2 模型）

---

### 2. 批量上传向量

 **端点** : `POST /api/v1/vector-sync/batch-upload`

 **请求头** :

```
Authorization: Bearer {access_token}
```

 **请求体** :

```json
{
  "vectors": [
    {
      "snippet_id": "uuid1",
      "vector": [0.1, 0.2, ...]
    },
    {
      "snippet_id": "uuid2",
      "vector": [0.3, 0.4, ...]
    }
  ]
}
```

**响应** (200):

```json
{
  "message": "Batch upload completed",
  "uploaded_count": 2
}
```

---

### 3. 向量搜索

 **端点** : `POST /api/v1/vector-sync/search`

 **请求头** :

```
Authorization: Bearer {access_token}
```

 **请求体** :

```json
{
  "query_vector": [0.1, 0.2, 0.3, ..., 0.384],
  "top_k": 10
}
```

**响应** (200):

```json
{
  "results": [
    {
      "snippet_id": "uuid",
      "similarity": 0.95
    },
    {
      "snippet_id": "uuid",
      "similarity": 0.87
    }
  ]
}
```

 **说明** :

* `top_k`: 返回最相似的前K个结果，默认 10
* `similarity`: 余弦相似度，范围 0-1

---

### 4. 删除向量

 **端点** : `DELETE /api/v1/vector-sync/{snippet_id}`

 **请求头** :

```
Authorization: Bearer {access_token}
```

**响应** (204): 无内容

---

## 错误处理

### 错误响应格式

```json
{
  "detail": "错误描述信息"
}
```

### 常见错误

#### 401 Unauthorized

```json
{
  "detail": "Could not validate credentials"
}
```

 **原因** :

* 未提供令牌
* 令牌无效或过期
* 令牌已被加入黑名单

 **解决** : 重新登录获取新令牌

---

#### 404 Not Found

```json
{
  "detail": "Snippet not found"
}
```

 **原因** :

* 资源不存在
* 资源已被删除
* 无权访问该资源

---

#### 400 Bad Request

```json
{
  "detail": "Email already registered"
}
```

 **原因** :

* 请求参数格式错误
* 必填字段缺失
* 数据验证失败

---

## 开发建议

### 1. 令牌管理

```javascript
// 保存令牌
localStorage.setItem('access_token', response.access_token);
localStorage.setItem('refresh_token', response.refresh_token);

// 请求拦截器
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 自动刷新令牌
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      const response = await axios.post('/api/v1/auth/refresh', {
        refresh_token: refreshToken
      });
      localStorage.setItem('access_token', response.data.access_token);
      // 重试原请求
      error.config.headers.Authorization = `Bearer ${response.data.access_token}`;
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

### 2. 同步策略

```javascript
// 定期同步
setInterval(async () => {
  const lastSyncTime = localStorage.getItem('last_sync_time');
  const localChanges = getLocalChanges(); // 获取本地修改
  
  const response = await axios.post('/api/v1/sync', {
    last_sync_time: lastSyncTime,
    changes: localChanges
  });
  
  // 应用服务器修改
  applyServerChanges(response.data.server_changes);
  
  // 处理冲突
  if (response.data.conflicts.length > 0) {
    handleConflicts(response.data.conflicts);
  }
  
  // 更新同步时间
  localStorage.setItem('last_sync_time', response.data.sync_time);
}, 60000); // 每分钟同步一次
```

---

### 3. 错误处理

```javascript
try {
  const response = await axios.post('/api/v1/snippets', snippetData);
  console.log('创建成功:', response.data);
} catch (error) {
  if (error.response) {
    // 服务器返回错误
    switch (error.response.status) {
      case 400:
        console.error('请求参数错误:', error.response.data.detail);
        break;
      case 401:
        console.error('未授权，请重新登录');
        // 跳转到登录页
        break;
      case 404:
        console.error('资源不存在');
        break;
      case 500:
        console.error('服务器错误，请稍后重试');
        break;
    }
  } else if (error.request) {
    // 请求已发送但没有收到响应
    console.error('网络错误，请检查连接');
  } else {
    // 其他错误
    console.error('请求失败:', error.message);
  }
}
```

---

## 测试工具

### 使用 curl 测试

```bash
# 健康检查
curl http://localhost:8000/health

# 用户注册
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"test123"}'

# 用户登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 创建片段（需要替换 TOKEN）
curl -X POST http://localhost:8000/api/v1/snippets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Test","language":"python","code":"print(\"hello\")"}'

# 访问分享页面
curl http://localhost:8000/s/abc123
```

---

### 使用 Python 测试

项目提供了完整的测试脚本：

```bash
cd backend
python3 test_server.py
```

测试脚本会自动测试所有API端点并显示结果。

---

## 附录

### 部署信息

* **部署方式** : Docker Compose
* **容器名称** : snippetbox-api
* **端口** : 8000
* **数据库** : PostgreSQL (容器)
* **缓存** : Redis (容器)

### 支持的编程语言

* Python
* JavaScript
* TypeScript
* Java
* C++
* C#
* Go
* Rust
* Ruby
* PHP
* Swift
* Kotlin
* 等（支持所有主流编程语言）

### 向量模型

* 模型: `sentence-transformers/all-MiniLM-L6-v2`
* 维度: 384
* 用途: 代码片段语义搜索

### 限制

* 令牌有效期: 访问令牌 1 小时，刷新令牌 7 天
* 分享过期时间: 1-365 天
* 向量维度: 固定 384
* 短码长度: 6 字符（Base62编码）

---

## 联系方式

* 项目地址: [https://github.com/wang-xin-peng/SnippetBox](https://github.com/wang-xin-peng/SnippetBox)
* API文档: [http://8.141.108.146:8000/docs](http://8.141.108.146:8000/docs)
* 问题反馈: GitHub Issues

---

 **最后更新** : 2026-04-19  **API版本** : v1.0.0  **部署方式** : Docker Compose (端口 8000)
