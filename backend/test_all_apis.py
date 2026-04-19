#!/usr/bin/env python3
"""
SnippetBox API 完整测试脚本
测试所有API端点，包括认证、片段管理、同步、分享、向量同步
"""
import requests
import json
import sys
import time
from datetime import datetime

# 配置
BASE_URL = 'http://localhost:8000/api/v1'
SHARE_BASE_URL = 'http://localhost:8000'

# 颜色输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_section(title):
    print(f'\n{Colors.BLUE}{"="*70}')
    print(f'{title}')
    print(f'{"="*70}{Colors.END}')

def print_success(message):
    print(f'{Colors.GREEN}✅ {message}{Colors.END}')

def print_error(message):
    print(f'{Colors.RED}❌ {message}{Colors.END}')

def print_info(message):
    print(f'{Colors.YELLOW}ℹ️  {message}{Colors.END}')

def print_response(response, show_body=True):
    print(f'状态码: {response.status_code}')
    if show_body:
        try:
            data = response.json()
            print(f'响应: {json.dumps(data, indent=2, ensure_ascii=False)}')
        except:
            print(f'响应: {response.text[:200]}')

# 测试数据
test_user = {
    'email': f'test_{int(time.time())}@example.com',
    'username': f'testuser_{int(time.time())}',
    'password': 'test123456'
}

test_snippet = {
    'title': 'Python Hello World',
    'language': 'python',
    'code': 'print("Hello, SnippetBox!")',
    'description': '一个简单的Python示例',
    'category': 'Python',
    'tags': ['python', 'basic', 'test']
}

# 全局变量
access_token = None
snippet_id = None
short_code = None

def test_health_check():
    """测试健康检查"""
    print_section('1. 健康检查')
    try:
        response = requests.get(f'{SHARE_BASE_URL}/health')
        print_response(response)
        if response.status_code == 200:
            print_success('健康检查通过')
            return True
        else:
            print_error('健康检查失败')
            return False
    except Exception as e:
        print_error(f'连接失败: {e}')
        return False

def test_user_register():
    """测试用户注册"""
    print_section('2. 用户注册')
    try:
        response = requests.post(f'{BASE_URL}/auth/register', json=test_user)
        print_response(response)
        if response.status_code == 201:
            print_success('用户注册成功')
            return True
        else:
            print_error('用户注册失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_user_login():
    """测试用户登录"""
    print_section('3. 用户登录')
    global access_token
    try:
        response = requests.post(f'{BASE_URL}/auth/login', json={
            'email': test_user['email'],
            'password': test_user['password']
        })
        print_response(response)
        if response.status_code == 200:
            data = response.json()
            access_token = data['access_token']
            print_success('用户登录成功')
            print_info(f'Access Token: {access_token[:50]}...')
            return True
        else:
            print_error('用户登录失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_get_current_user():
    """测试获取当前用户信息"""
    print_section('4. 获取当前用户信息')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(f'{BASE_URL}/auth/me', headers=headers)
        print_response(response)
        if response.status_code == 200:
            print_success('获取用户信息成功')
            return True
        else:
            print_error('获取用户信息失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_create_snippet():
    """测试创建片段"""
    print_section('5. 创建片段')
    global snippet_id
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.post(f'{BASE_URL}/snippets', json=test_snippet, headers=headers)
        print_response(response)
        if response.status_code == 201:
            data = response.json()
            snippet_id = data['id']
            print_success('创建片段成功')
            print_info(f'Snippet ID: {snippet_id}')
            return True
        else:
            print_error('创建片段失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_get_snippets():
    """测试获取片段列表"""
    print_section('6. 获取片段列表')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(f'{BASE_URL}/snippets', headers=headers)
        print_response(response)
        if response.status_code == 200:
            data = response.json()
            print_success(f'获取片段列表成功，共 {len(data)} 个片段')
            return True
        else:
            print_error('获取片段列表失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_get_snippet():
    """测试获取单个片段"""
    print_section('7. 获取单个片段')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(f'{BASE_URL}/snippets/{snippet_id}', headers=headers)
        print_response(response)
        if response.status_code == 200:
            print_success('获取片段成功')
            return True
        else:
            print_error('获取片段失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_update_snippet():
    """测试更新片段"""
    print_section('8. 更新片段')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        update_data = {
            'title': 'Updated Python Example',
            'description': '更新后的描述'
        }
        response = requests.put(f'{BASE_URL}/snippets/{snippet_id}', json=update_data, headers=headers)
        print_response(response)
        if response.status_code == 200:
            print_success('更新片段成功')
            return True
        else:
            print_error('更新片段失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_sync():
    """测试同步"""
    print_section('9. 测试同步')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        sync_data = {
            'last_sync_time': None,
            'changes': []
        }
        response = requests.post(f'{BASE_URL}/sync', json=sync_data, headers=headers)
        print_response(response)
        if response.status_code == 200:
            data = response.json()
            print_success(f'同步成功，服务器返回 {len(data.get("server_changes", []))} 个变更')
            return True
        else:
            print_error('同步失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_create_share():
    """测试创建分享"""
    print_section('10. 创建分享')
    global short_code
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        share_data = {
            'snippet_id': snippet_id,
            'expires_in_days': 7
        }
        response = requests.post(f'{BASE_URL}/share', json=share_data, headers=headers)
        print_response(response)
        if response.status_code == 201:
            data = response.json()
            short_code = data['short_code']
            print_success('创建分享成功')
            print_info(f'短链接: {data["short_url"]}')
            return True
        else:
            print_error('创建分享失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_access_share():
    """测试访问分享页面"""
    print_section('11. 访问分享页面')
    try:
        response = requests.get(f'{SHARE_BASE_URL}/s/{short_code}')
        print(f'状态码: {response.status_code}')
        if response.status_code == 200:
            print_success('访问分享页面成功')
            print_info(f'页面大小: {len(response.text)} 字节')
            if '<html' in response.text.lower():
                print_success('返回了有效的HTML页面')
            return True
        else:
            print_error('访问分享页面失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_get_shares():
    """测试获取分享列表"""
    print_section('12. 获取分享列表')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(f'{BASE_URL}/shares', headers=headers)
        print_response(response)
        if response.status_code == 200:
            data = response.json()
            print_success(f'获取分享列表成功，共 {len(data)} 个分享')
            return True
        else:
            print_error('获取分享列表失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_get_share_info():
    """测试获取分享信息"""
    print_section('13. 获取分享信息')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(f'{BASE_URL}/share/{short_code}/info', headers=headers)
        print_response(response)
        if response.status_code == 200:
            print_success('获取分享信息成功')
            return True
        else:
            print_error('获取分享信息失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_get_share_stats():
    """测试获取分享统计"""
    print_section('14. 获取分享统计')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(f'{BASE_URL}/share/{short_code}/stats', headers=headers)
        print_response(response)
        if response.status_code == 200:
            print_success('获取分享统计成功')
            return True
        else:
            print_error('获取分享统计失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_upload_vector():
    """测试上传向量"""
    print_section('15. 上传向量')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        vector_data = {
            'snippet_id': snippet_id,
            'vector': [0.1] * 384  # 384维向量
        }
        response = requests.post(f'{BASE_URL}/vector-sync/upload', json=vector_data, headers=headers)
        print_response(response)
        if response.status_code == 200:
            print_success('上传向量成功')
            return True
        else:
            print_error('上传向量失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_vector_search():
    """测试向量搜索"""
    print_section('16. 向量搜索')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        search_data = {
            'query_vector': [0.1] * 384,
            'top_k': 5
        }
        response = requests.post(f'{BASE_URL}/vector-sync/search', json=search_data, headers=headers)
        print_response(response)
        if response.status_code == 200:
            data = response.json()
            print_success(f'向量搜索成功，返回 {len(data.get("results", []))} 个结果')
            return True
        else:
            print_error('向量搜索失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_refresh_token():
    """测试刷新令牌"""
    print_section('17. 刷新令牌')
    try:
        # 先登录获取refresh_token
        response = requests.post(f'{BASE_URL}/auth/login', json={
            'email': test_user['email'],
            'password': test_user['password']
        })
        if response.status_code == 200:
            refresh_token = response.json()['refresh_token']
            
            # 刷新令牌
            response = requests.post(f'{BASE_URL}/auth/refresh', json={
                'refresh_token': refresh_token
            })
            print_response(response)
            if response.status_code == 200:
                print_success('刷新令牌成功')
                return True
            else:
                print_error('刷新令牌失败')
                return False
        else:
            print_error('获取refresh_token失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_delete_share():
    """测试删除分享"""
    print_section('18. 删除分享')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.delete(f'{BASE_URL}/share/{short_code}', headers=headers)
        print(f'状态码: {response.status_code}')
        if response.status_code == 204:
            print_success('删除分享成功')
            return True
        else:
            print_error('删除分享失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_delete_snippet():
    """测试删除片段"""
    print_section('19. 删除片段')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.delete(f'{BASE_URL}/snippets/{snippet_id}', headers=headers)
        print(f'状态码: {response.status_code}')
        if response.status_code == 204:
            print_success('删除片段成功')
            return True
        else:
            print_error('删除片段失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def test_logout():
    """测试登出"""
    print_section('20. 登出')
    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.post(f'{BASE_URL}/auth/logout', headers=headers)
        print_response(response)
        if response.status_code == 200:
            print_success('登出成功')
            return True
        else:
            print_error('登出失败')
            return False
    except Exception as e:
        print_error(f'请求失败: {e}')
        return False

def main():
    """主测试流程"""
    print(f'\n{Colors.BLUE}{"="*70}')
    print(f'SnippetBox API 完整测试')
    print(f'测试服务器: {BASE_URL}')
    print(f'开始时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'{"="*70}{Colors.END}\n')
    
    tests = [
        ('健康检查', test_health_check),
        ('用户注册', test_user_register),
        ('用户登录', test_user_login),
        ('获取当前用户', test_get_current_user),
        ('创建片段', test_create_snippet),
        ('获取片段列表', test_get_snippets),
        ('获取单个片段', test_get_snippet),
        ('更新片段', test_update_snippet),
        ('同步', test_sync),
        ('创建分享', test_create_share),
        ('访问分享页面', test_access_share),
        ('获取分享列表', test_get_shares),
        ('获取分享信息', test_get_share_info),
        ('获取分享统计', test_get_share_stats),
        ('上传向量', test_upload_vector),
        ('向量搜索', test_vector_search),
        ('刷新令牌', test_refresh_token),
        ('删除分享', test_delete_share),
        ('删除片段', test_delete_snippet),
        ('登出', test_logout),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
            time.sleep(0.5)  # 避免请求过快
        except Exception as e:
            print_error(f'{name} 测试异常: {e}')
            results.append((name, False))
    
    # 打印测试总结
    print_section('测试总结')
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f'\n总测试数: {total}')
    print(f'{Colors.GREEN}通过: {passed}{Colors.END}')
    print(f'{Colors.RED}失败: {total - passed}{Colors.END}')
    print(f'通过率: {passed/total*100:.1f}%\n')
    
    # 详细结果
    print('详细结果:')
    for name, result in results:
        status = f'{Colors.GREEN}✅ PASS{Colors.END}' if result else f'{Colors.RED}❌ FAIL{Colors.END}'
        print(f'  {status} - {name}')
    
    print(f'\n{Colors.BLUE}{"="*70}')
    print(f'测试完成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'{"="*70}{Colors.END}\n')
    
    # 返回退出码
    sys.exit(0 if passed == total else 1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f'\n{Colors.YELLOW}测试被用户中断{Colors.END}')
        sys.exit(1)
    except Exception as e:
        print_error(f'测试过程中发生错误: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
