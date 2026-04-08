# API 使用指南

本文档提供 SnippetBox Backend API 的详细使用示例。

## 基础信息

- **Base URL**: `http://localhost:8000`
- **API Version**: v1
- **Content-Type**: `application/json`

## 认证

当前版本暂不需要认证。第三周将实现 JWT 认证。

## API 端点

### 1. 健康检查

检查 API 服务是否正常运行。

**请求**:
```http
GET /health
```

**响应**:
```json
{
  "status": "healthy",
  "service": "snippetbox-api"
}
```

**示例**:
```bash
curl http://localhost:8000/health
```

---

### 2. 单个文本向量化

将单个文本转换为 384 维向量。

**请求**:
```http
POST /api/v1/embed
Content-Type: application/json

{
  "text": "这是一段示例文本"
}
```

**响应**:
```json
{
  "vector": [0.123, 0.456, ..., 0.789],
  "dimension": 384
}
```

**示例**:
```bash
curl -X POST http://localhost:8000/api/v1/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "这是一段示例文本"}'
```

**Python 示例**:
```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/embed",
    json={"text": "这是一段示例文本"}
)

data = response.json()
vector = data["vector"]
dimension = data["dimension"]

print(f"向量维度: {dimension}")
print(f"向量前5个值: {vector[:5]}")
```

**JavaScript 示例**:
```javascript
const response = await fetch('http://localhost:8000/api/v1/embed', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: '这是一段示例文本'
  })
});

const data = await response.json();
console.log('向量维度:', data.dimension);
console.log('向量前5个值:', data.vector.slice(0, 5));
```

---

### 3. 批量文本向量化

批量将多个文本转换为向量，提高处理效率。

**请求**:
```http
POST /api/v1/embed/batch
Content-Type: application/json

{
  "texts": [
    "第一段文本",
    "第二段文本",
    "第三段文本"
  ]
}
```

**响应**:
```json
{
  "vectors": [
    [0.123, 0.456, ..., 0.789],
    [0.234, 0.567, ..., 0.890],
    [0.345, 0.678, ..., 0.901]
  ],
  "dimension": 384,
  "count": 3
}
```

**示例**:
```bash
curl -X POST http://localhost:8000/api/v1/embed/batch \
  -H "Content-Type: application/json" \
  -d '{"texts": ["文本1", "文本2", "文本3"]}'
```

**Python 示例**:
```python
import requests

texts = [
    "def hello(): print('Hello')",
    "function greet() { console.log('Hi'); }",
    "public void sayHello() { System.out.println(\"Hello\"); }"
]

response = requests.post(
    "http://localhost:8000/api/v1/embed/batch",
    json={"texts": texts}
)

data = response.json()
print(f"生成了 {data['count']} 个向量")
print(f"每个向量维度: {data['dimension']}")
```

---

### 4. 获取嵌入服务状态

查询嵌入服务的当前状态。

**请求**:
```http
GET /api/v1/embed/status
```

**响应**:
```json
{
  "initialized": true,
  "model_name": "sentence-transformers/all-MiniLM-L6-v2",
  "device": "cpu",
  "dimension": 384
}
```

**示例**:
```bash
curl http://localhost:8000/api/v1/embed/status
```

---

### 5. 存储向量（占位符）

存储片段的向量到数据库。

**请求**:
```http
POST /api/v1/vectors/store
Content-Type: application/json

{
  "snippet_id": "snippet-123",
  "vector": [0.123, 0.456, ..., 0.789]
}
```

**响应**:
```json
{
  "message": "Vector stored successfully",
  "snippet_id": "snippet-123"
}
```

**注意**: 此端点为占位符，实际实现需要在第三周完成 PostgreSQL + pgvector 集成。

---

### 6. 向量相似度搜索（占位符）

搜索与查询向量最相似的片段。

**请求**:
```http
POST /api/v1/vectors/search
Content-Type: application/json

{
  "query_vector": [0.123, 0.456, ..., 0.789],
  "limit": 10,
  "threshold": 0.7
}
```

**响应**:
```json
{
  "results": [
    {
      "snippet_id": "snippet-123",
      "similarity": 0.95
    },
    {
      "snippet_id": "snippet-456",
      "similarity": 0.87
    }
  ],
  "count": 2
}
```

**注意**: 此端点为占位符，实际实现需要在第三周完成。

---

## 错误处理

### 错误响应格式

```json
{
  "detail": "错误描述信息"
}
```

### 常见错误码

- `400 Bad Request`: 请求参数错误
- `422 Unprocessable Entity`: 请求验证失败
- `500 Internal Server Error`: 服务器内部错误

### 示例错误

**空文本**:
```bash
curl -X POST http://localhost:8000/api/v1/embed \
  -H "Content-Type: application/json" \
  -d '{"text": ""}'
```

响应:
```json
{
  "detail": [
    {
      "loc": ["body", "text"],
      "msg": "ensure this value has at least 1 characters",
      "type": "value_error.any_str.min_length"
    }
  ]
}
```

---

## 性能建议

### 1. 使用批量 API

批量处理可以显著提升性能：

```python
# 不推荐：逐个处理
for text in texts:
    response = requests.post("/api/v1/embed", json={"text": text})
    # 处理响应...

# 推荐：批量处理
response = requests.post("/api/v1/embed/batch", json={"texts": texts})
vectors = response.json()["vectors"]
```

### 2. 缓存向量结果

对于相同的文本，可以缓存向量结果避免重复计算。

### 3. 控制文本长度

模型对长文本的处理时间更长，建议：
- 单个文本不超过 512 个 token（约 400 个中文字符）
- 批量处理时每批不超过 100 个文本

---

## 集成示例

### Electron 应用集成

```typescript
// src/main/services/CloudEmbeddingService.ts
import axios from 'axios';

class CloudEmbeddingService {
  private baseURL = 'http://localhost:8000/api/v1';
  
  async embed(text: string): Promise<number[]> {
    const response = await axios.post(`${this.baseURL}/embed`, {
      text
    });
    return response.data.vector;
  }
  
  async batchEmbed(texts: string[]): Promise<number[][]> {
    const response = await axios.post(`${this.baseURL}/embed/batch`, {
      texts
    });
    return response.data.vectors;
  }
}
```

### 向量相似度计算

```python
import numpy as np

def cosine_similarity(vec1, vec2):
    """计算余弦相似度"""
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

# 使用示例
query_vector = [0.1, 0.2, ...]  # 查询向量
snippet_vector = [0.15, 0.25, ...]  # 片段向量

similarity = cosine_similarity(query_vector, snippet_vector)
print(f"相似度: {similarity:.4f}")
```

---

## 故障排查

### 模型加载慢

首次启动时，模型需要从 Hugging Face 下载（约 90MB），可能需要几分钟。

**解决方案**:
1. 检查网络连接
2. 使用国内镜像（配置 HF_ENDPOINT）
3. 手动下载模型到 `models/` 目录

### 内存不足

模型加载需要约 500MB 内存。

**解决方案**:
1. 确保服务器有足够内存
2. 使用 ONNX 优化模型
3. 考虑使用更小的模型

### 推理速度慢

**解决方案**:
1. 使用批量 API
2. 启用 GPU 加速（设置 MODEL_DEVICE=cuda）
3. 使用 ONNX Runtime 优化

---

## 下一步

- 第三周将实现 PostgreSQL + pgvector 向量存储
- 第三周将实现用户认证（JWT）
- 第三周将实现云端片段同步 API

## 反馈

如有问题或建议，请联系开发团队。
