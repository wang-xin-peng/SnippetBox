#!/usr/bin/env python3
"""
测试云端向量 API
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_embedding_status():
    """测试嵌入服务状态"""
    print("=" * 50)
    print("测试 1: 嵌入服务状态")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/embed/status", timeout=5)
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"错误: {e}")
        return False


def test_single_embed():
    """测试单个文本向量化"""
    print("\n" + "=" * 50)
    print("测试 2: 单个文本向量化")
    print("=" * 50)
    
    try:
        data = {"text": "console.log('Hello World');"}
        response = requests.post(f"{BASE_URL}/embed", json=data, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"向量维度: {result['dimension']}")
            print(f"向量前10个值: {result['vector'][:10]}")
            return True
        else:
            print(f"错误响应: {response.text}")
            return False
    except Exception as e:
        print(f"错误: {e}")
        return False


def test_batch_embed():
    """测试批量文本向量化"""
    print("\n" + "=" * 50)
    print("测试 3: 批量文本向量化")
    print("=" * 50)
    
    try:
        data = {
            "texts": [
                "console.log('Hello');",
                "print('World')",
                "System.out.println('Test');"
            ]
        }
        response = requests.post(f"{BASE_URL}/embed/batch", json=data, timeout=15)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"向量数量: {result['count']}")
            print(f"向量维度: {result['dimension']}")
            print(f"第一个向量前10个值: {result['vectors'][0][:10]}")
            return True
        else:
            print(f"错误响应: {response.text}")
            return False
    except Exception as e:
        print(f"错误: {e}")
        return False


def test_vector_upload():
    """测试向量上传（需要认证）"""
    print("\n" + "=" * 50)
    print("测试 4: 向量上传（需要登录）")
    print("=" * 50)
    print("此测试需要有效的 JWT token，跳过...")
    return None


def test_vector_search():
    """测试向量搜索（需要认证）"""
    print("\n" + "=" * 50)
    print("测试 5: 向量搜索（需要登录）")
    print("=" * 50)
    print("此测试需要有效的 JWT token，跳过...")
    return None


def main():
    print("开始测试云端向量 API...\n")
    
    results = []
    
    # 测试嵌入服务
    results.append(("嵌入服务状态", test_embedding_status()))
    results.append(("单个文本向量化", test_single_embed()))
    results.append(("批量文本向量化", test_batch_embed()))
    results.append(("向量上传", test_vector_upload()))
    results.append(("向量搜索", test_vector_search()))
    
    # 打印总结
    print("\n" + "=" * 50)
    print("测试总结")
    print("=" * 50)
    
    for name, result in results:
        if result is True:
            status = "✓ 通过"
        elif result is False:
            status = "✗ 失败"
        else:
            status = "- 跳过"
        print(f"{name}: {status}")
    
    # 返回退出码
    failed = sum(1 for _, result in results if result is False)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
