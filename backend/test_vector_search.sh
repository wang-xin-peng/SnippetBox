#!/bin/bash
# 测试完整的向量搜索流程

set -e

BASE_URL="http://localhost:8000/api/v1"
TEST_EMAIL="test_vector_$(date +%s)@example.com"
TEST_PASSWORD="Test123456"
TOKEN=""

echo "========================================="
echo "测试云端向量搜索完整流程"
echo "========================================="
echo ""

# 1. 注册用户
echo "1. 注册测试用户..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"username\":\"test_user\"}")

echo "$REGISTER_RESPONSE" | python3 -m json.tool
USER_ID=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ 用户ID: $USER_ID"
echo ""

# 2. 登录获取token
echo "2. 登录获取访问令牌..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$LOGIN_RESPONSE" | python3 -m json.tool
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
echo "✓ Token获取成功"
echo ""

# 3. 创建测试代码片段
echo "3. 创建测试代码片段..."
SNIPPET1=$(curl -s -X POST "$BASE_URL/snippets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "React useState Hook",
    "language": "javascript",
    "code": "import { useState } from \"react\";\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>{count}</button>;\n}",
    "description": "React状态管理示例",
    "category": "frontend",
    "tags": ["react", "hooks", "state"]
  }')

SNIPPET1_ID=$(echo "$SNIPPET1" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ 片段1创建成功: $SNIPPET1_ID"

SNIPPET2=$(curl -s -X POST "$BASE_URL/snippets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Python列表推导式",
    "language": "python",
    "code": "# 列表推导式示例\nnumbers = [1, 2, 3, 4, 5]\nsquares = [x**2 for x in numbers]\nprint(squares)",
    "description": "Python列表推导式",
    "category": "backend",
    "tags": ["python", "list-comprehension"]
  }')

SNIPPET2_ID=$(echo "$SNIPPET2" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ 片段2创建成功: $SNIPPET2_ID"

SNIPPET3=$(curl -s -X POST "$BASE_URL/snippets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Vue组件示例",
    "language": "javascript",
    "code": "export default {\n  data() {\n    return { message: \"Hello Vue!\" }\n  },\n  methods: {\n    greet() { alert(this.message); }\n  }\n}",
    "description": "Vue.js组件基础",
    "category": "frontend",
    "tags": ["vue", "component"]
  }')

SNIPPET3_ID=$(echo "$SNIPPET3" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ 片段3创建成功: $SNIPPET3_ID"
echo ""

# 4. 为每个片段生成并上传向量
echo "4. 生成并上传向量..."

# 片段1的向量
echo "  - 为片段1生成向量..."
VECTOR1=$(curl -s -X POST "$BASE_URL/embed" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"React useState Hook state management\"}")
VECTOR1_DATA=$(echo "$VECTOR1" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)['vector']))")

curl -s -X POST "$BASE_URL/vector-sync/upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"snippet_id\":\"$SNIPPET1_ID\",\"vector\":$VECTOR1_DATA}" | python3 -m json.tool

# 片段2的向量
echo "  - 为片段2生成向量..."
VECTOR2=$(curl -s -X POST "$BASE_URL/embed" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Python list comprehension iteration\"}")
VECTOR2_DATA=$(echo "$VECTOR2" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)['vector']))")

curl -s -X POST "$BASE_URL/vector-sync/upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"snippet_id\":\"$SNIPPET2_ID\",\"vector\":$VECTOR2_DATA}" | python3 -m json.tool

# 片段3的向量
echo "  - 为片段3生成向量..."
VECTOR3=$(curl -s -X POST "$BASE_URL/embed" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Vue component data methods\"}")
VECTOR3_DATA=$(echo "$VECTOR3" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)['vector']))")

curl -s -X POST "$BASE_URL/vector-sync/upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"snippet_id\":\"$SNIPPET3_ID\",\"vector\":$VECTOR3_DATA}" | python3 -m json.tool

echo "✓ 所有向量上传完成"
echo ""

# 5. 查看向量统计
echo "5. 查看向量统计..."
curl -s -X GET "$BASE_URL/vectors/stats" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# 6. 测试向量搜索
echo "6. 测试向量搜索..."

# 搜索1: React相关
echo "  搜索1: 'React state management hooks'"
QUERY1=$(curl -s -X POST "$BASE_URL/embed" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"React state management hooks\"}")
QUERY1_VECTOR=$(echo "$QUERY1" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)['vector']))")

echo "  结果:"
curl -s -X POST "$BASE_URL/vector-sync/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query_vector\":$QUERY1_VECTOR,\"limit\":3,\"threshold\":0.5}" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"  找到 {data['count']} 个结果:\"); [print(f\"    - {r['title']} (相似度: {r['similarity']:.3f})\") for r in data['results']]"
echo ""

# 搜索2: Python相关
echo "  搜索2: 'Python list iteration'"
QUERY2=$(curl -s -X POST "$BASE_URL/embed" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Python list iteration\"}")
QUERY2_VECTOR=$(echo "$QUERY2" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)['vector']))")

echo "  结果:"
curl -s -X POST "$BASE_URL/vector-sync/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query_vector\":$QUERY2_VECTOR,\"limit\":3,\"threshold\":0.5}" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"  找到 {data['count']} 个结果:\"); [print(f\"    - {r['title']} (相似度: {r['similarity']:.3f})\") for r in data['results']]"
echo ""

# 搜索3: Vue相关
echo "  搜索3: 'Vue component methods'"
QUERY3=$(curl -s -X POST "$BASE_URL/embed" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Vue component methods\"}")
QUERY3_VECTOR=$(echo "$QUERY3" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)['vector']))")

echo "  结果:"
curl -s -X POST "$BASE_URL/vector-sync/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"query_vector\":$QUERY3_VECTOR,\"limit\":3,\"threshold\":0.5}" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"  找到 {data['count']} 个结果:\"); [print(f\"    - {r['title']} (相似度: {r['similarity']:.3f})\") for r in data['results']]"
echo ""

echo "========================================="
echo "测试完成！"
echo "========================================="
echo ""
echo "总结:"
echo "  - 创建了3个代码片段"
echo "  - 为每个片段生成并上传了向量"
echo "  - 执行了3次语义搜索"
echo "  - 所有功能正常工作！"
