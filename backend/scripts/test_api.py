"""
API 测试脚本
用于快速测试 API 端点是否正常工作
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"


def test_health():
    """测试健康检查"""
    print("Testing /health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    return response.status_code == 200


def test_embed():
    """测试单个文本向量化"""
    print("Testing /api/v1/embed endpoint...")
    
    data = {
        "text": "这是一个测试文本，用于验证嵌入服务是否正常工作。"
    }
    
    start_time = time.time()
    response = requests.post(f"{BASE_URL}/api/v1/embed", json=data)
    elapsed_time = time.time() - start_time
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Dimension: {result['dimension']}")
        print(f"Vector (first 5 values): {result['vector'][:5]}")
        print(f"Time: {elapsed_time:.3f}s\n")
        return True
    else:
        print(f"Error: {response.text}\n")
        return False


def test_batch_embed():
    """测试批量文本向量化"""
    print("Testing /api/v1/embed/batch endpoint...")
    
    data = {
        "texts": [
            "def hello(): print('Hello, World!')",
            "function greet() { console.log('Hi!'); }",
            "public void sayHello() { System.out.println(\"Hello\"); }"
        ]
    }
    
    start_time = time.time()
    response = requests.post(f"{BASE_URL}/api/v1/embed/batch", json=data)
    elapsed_time = time.time() - start_time
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Dimension: {result['dimension']}")
        print(f"Count: {result['count']}")
        print(f"Time: {elapsed_time:.3f}s")
        print(f"Avg time per text: {elapsed_time/result['count']:.3f}s\n")
        return True
    else:
        print(f"Error: {response.text}\n")
        return False


def test_embed_status():
    """测试嵌入服务状态"""
    print("Testing /api/v1/embed/status endpoint...")
    response = requests.get(f"{BASE_URL}/api/v1/embed/status")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}\n")
        return True
    else:
        print(f"Error: {response.text}\n")
        return False


def test_vector_similarity():
    """测试向量相似度计算"""
    print("Testing vector similarity...")
    
    # 生成两个相似文本的向量
    text1 = "Python 是一种编程语言"
    text2 = "Python 是一门编程语言"
    
    response1 = requests.post(f"{BASE_URL}/api/v1/embed", json={"text": text1})
    response2 = requests.post(f"{BASE_URL}/api/v1/embed", json={"text": text2})
    
    if response1.status_code == 200 and response2.status_code == 200:
        vector1 = response1.json()["vector"]
        vector2 = response2.json()["vector"]
        
        # 计算余弦相似度
        import numpy as np
        similarity = np.dot(vector1, vector2) / (np.linalg.norm(vector1) * np.linalg.norm(vector2))
        
        print(f"Text 1: {text1}")
        print(f"Text 2: {text2}")
        print(f"Cosine Similarity: {similarity:.4f}\n")
        return True
    else:
        print("Failed to generate vectors\n")
        return False


def main():
    """运行所有测试"""
    print("=" * 60)
    print("SnippetBox API Test Suite")
    print("=" * 60 + "\n")
    
    tests = [
        ("Health Check", test_health),
        ("Single Text Embedding", test_embed),
        ("Batch Text Embedding", test_batch_embed),
        ("Embedding Status", test_embed_status),
        ("Vector Similarity", test_vector_similarity),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"Error in {name}: {e}\n")
            results.append((name, False))
    
    # 打印总结
    print("=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status} - {name}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except requests.exceptions.ConnectionError:
        print("\n\nError: Cannot connect to API server")
        print("Please make sure the server is running at http://localhost:8000")
