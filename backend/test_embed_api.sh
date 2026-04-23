#!/bin/bash
# 测试嵌入API

echo "========================================="
echo "测试云端向量嵌入 API"
echo "========================================="
echo ""

# 1. 测试服务状态
echo "1. 测试服务状态..."
curl -s http://localhost:8000/api/v1/embed/status | python3 -m json.tool
echo ""

# 2. 测试单个文本向量化
echo "2. 测试单个文本向量化..."
echo "发送请求..."
curl -s -X POST http://localhost:8000/api/v1/embed \
  -H "Content-Type: application/json" \
  -d '{"text":"console.log(\"Hello World\");"}' | python3 -m json.tool | head -20
echo ""

# 3. 再次检查状态（应该显示已初始化）
echo "3. 再次检查状态（模型应该已加载）..."
curl -s http://localhost:8000/api/v1/embed/status | python3 -m json.tool
echo ""

# 4. 测试批量向量化
echo "4. 测试批量向量化..."
curl -s -X POST http://localhost:8000/api/v1/embed/batch \
  -H "Content-Type: application/json" \
  -d '{"texts":["print(\"Hello\")", "console.log(\"World\")", "System.out.println(\"Test\")"]}' \
  | python3 -m json.tool | head -30
echo ""

echo "========================================="
echo "测试完成！"
echo "========================================="
