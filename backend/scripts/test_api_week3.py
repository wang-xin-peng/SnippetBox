"""
第三周 API 测试脚本
用于快速测试认证、同步和分享功能
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

# 测试数据
test_user = {
    "email": "test@example.com",
    "username": "testuser",
    "password": "test123456"
}

test_snippet = {
    "title": "测试代码片段",
    "language": "python",
    "code": "print('Hello, SnippetBox!')",
    "description": "这是一个测试片段",
    "category": "测试",
    "tags": ["test", "python"]
}


def print_response(title, response):
    """打印响应信息"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"状态码: {response.status_code}")
    try:
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    except:
        print(f"响应: {response.text}")


def test_auth():
    """测试认证功能"""
    print("\n" + "="*60)
    print("测试认证功能")
    print("="*60)
    
    # 1. 注册
    print("\n1. 测试用户注册...")
    response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
    print_response("注册结果", response)
    
    if response.status_code != 201:
        print("注册失败，可能用户已存在，继续测试登录...")
    
    # 2. 登录
    print("\n2. 测试用户登录...")
    login_data = {
        "email": test_user["email"],
        "password": test_user["password"]
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print_response("登录结果", response)
    
    if response.status_code != 200:
        print("登录失败！")
        return None
    
    tokens = response.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    
    # 3. 获取当前用户信息
    print("\n3. 测试获取当前用户信息...")
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print_response("用户信息", response)
    
    # 4. 刷新令牌
    print("\n4. 测试刷新令牌...")
    response = requests.post(f"{BASE_URL}/auth/refresh", json={"refresh_token": refresh_token})
    print_response("刷新令牌结果", response)
    
    if response.status_code == 200:
        new_tokens = response.json()
        access_token = new_tokens["access_token"]
    
    return access_token


def test_snippets(access_token):
    """测试片段管理功能"""
    print("\n" + "="*60)
    print("测试片段管理功能")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 1. 创建片段
    print("\n1. 测试创建片段...")
    response = requests.post(f"{BASE_URL}/snippets", json=test_snippet, headers=headers)
    print_response("创建片段结果", response)
    
    if response.status_code != 201:
        print("创建片段失败！")
        return None
    
    snippet_id = response.json()["id"]
    
    # 2. 获取片段列表
    print("\n2. 测试获取片段列表...")
    response = requests.get(f"{BASE_URL}/snippets", headers=headers)
    print_response("片段列表", response)
    
    # 3. 获取单个片段
    print("\n3. 测试获取单个片段...")
    response = requests.get(f"{BASE_URL}/snippets/{snippet_id}", headers=headers)
    print_response("片段详情", response)
    
    # 4. 更新片段
    print("\n4. 测试更新片段...")
    update_data = {
        "title": "更新后的标题",
        "description": "更新后的描述"
    }
    response = requests.put(f"{BASE_URL}/snippets/{snippet_id}", json=update_data, headers=headers)
    print_response("更新片段结果", response)
    
    return snippet_id


def test_sync(access_token):
    """测试同步功能"""
    print("\n" + "="*60)
    print("测试同步功能")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 1. 首次同步
    print("\n1. 测试首次同步...")
    sync_data = {
        "last_sync_time": None,
        "changes": []
    }
    response = requests.post(f"{BASE_URL}/sync", json=sync_data, headers=headers)
    print_response("首次同步结果", response)
    
    # 2. 增量同步
    print("\n2. 测试增量同步...")
    sync_data = {
        "last_sync_time": datetime.utcnow().isoformat(),
        "changes": []
    }
    response = requests.post(f"{BASE_URL}/sync", json=sync_data, headers=headers)
    print_response("增量同步结果", response)
    
    # 3. 获取分类
    print("\n3. 测试获取分类...")
    response = requests.get(f"{BASE_URL}/categories", headers=headers)
    print_response("分类列表", response)
    
    # 4. 获取标签
    print("\n4. 测试获取标签...")
    response = requests.get(f"{BASE_URL}/tags", headers=headers)
    print_response("标签列表", response)


def test_share(access_token, snippet_id):
    """测试分享功能"""
    print("\n" + "="*60)
    print("测试分享功能")
    print("="*60)
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 1. 创建分享
    print("\n1. 测试创建分享...")
    share_data = {
        "snippet_id": snippet_id,
        "expires_in_days": 7,
        "password": None
    }
    response = requests.post(f"{BASE_URL}/share", json=share_data, headers=headers)
    print_response("创建分享结果", response)
    
    if response.status_code != 201:
        print("创建分享失败！")
        return
    
    short_code = response.json()["short_code"]
    short_url = response.json()["short_url"]
    
    print(f"\n短链接: {short_url}")
    print(f"短码: {short_code}")
    
    # 2. 获取分享列表
    print("\n2. 测试获取分享列表...")
    response = requests.get(f"{BASE_URL}/shares", headers=headers)
    print_response("分享列表", response)
    
    # 3. 获取分享信息
    print("\n3. 测试获取分享信息...")
    response = requests.get(f"{BASE_URL}/share/{short_code}/info", headers=headers)
    print_response("分享信息", response)
    
    # 4. 获取分享统计
    print("\n4. 测试获取分享统计...")
    response = requests.get(f"{BASE_URL}/share/{short_code}/stats", headers=headers)
    print_response("分享统计", response)
    
    # 5. 访问短链接（HTML 页面）
    print(f"\n5. 访问短链接页面: {short_url}")
    print(f"请在浏览器中打开: {short_url}")


def main():
    """主函数"""
    print("\n" + "="*60)
    print("SnippetBox 第三周 API 测试")
    print("="*60)
    print(f"API 地址: {BASE_URL}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 测试认证
        access_token = test_auth()
        if not access_token:
            print("\n认证测试失败，终止测试")
            return
        
        # 测试片段管理
        snippet_id = test_snippets(access_token)
        if not snippet_id:
            print("\n片段管理测试失败，终止测试")
            return
        
        # 测试同步
        test_sync(access_token)
        
        # 测试分享
        test_share(access_token, snippet_id)
        
        print("\n" + "="*60)
        print("所有测试完成！")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("\n错误：无法连接到 API 服务器")
        print("请确保后端服务正在运行：uvicorn main:app --reload")
    except Exception as e:
        print(f"\n测试过程中出错: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
