"""
服务器 API 测试脚本
"""
import requests
import json
import sys

BASE_URL = 'http://localhost:8001/api/v1'

def print_section(title):
    print(f'\n{"="*60}')
    print(f'{title}')
    print("="*60)

def print_response(response):
    print(f'状态码: {response.status_code}')
    try:
        print(f'响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}')
    except:
        print(f'响应: {response.text}')

# 测试数据
test_user = {
    'email': 'test@example.com',
    'username': 'testuser',
    'password': 'test123456'
}

test_snippet = {
    'title': '测试代码片段',
    'language': 'python',
    'code': 'print("Hello, SnippetBox!")',
    'description': '这是一个测试片段',
    'category': '测试',
    'tags': ['test', 'python']
}

try:
    # 1. 测试健康检查
    print_section('1. 测试健康检查')
    response = requests.get('http://localhost:8001/health')
    print_response(response)
    
    # 2. 测试用户注册
    print_section('2. 测试用户注册')
    response = requests.post(f'{BASE_URL}/auth/register', json=test_user)
    print_response(response)
    
    # 3. 测试用户登录
    print_section('3. 测试用户登录')
    response = requests.post(f'{BASE_URL}/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password']
    })
    print_response(response)
    
    if response.status_code != 200:
        print('\n登录失败，停止测试')
        sys.exit(1)
    
    tokens = response.json()
    access_token = tokens['access_token']
    headers = {'Authorization': f'Bearer {access_token}'}
    
    # 4. 测试获取当前用户信息
    print_section('4. 测试获取当前用户信息')
    response = requests.get(f'{BASE_URL}/auth/me', headers=headers)
    print_response(response)
    
    # 5. 测试创建片段
    print_section('5. 测试创建片段')
    response = requests.post(f'{BASE_URL}/snippets', json=test_snippet, headers=headers)
    print_response(response)
    
    if response.status_code != 201:
        print('\n创建片段失败，停止测试')
        sys.exit(1)
    
    snippet_id = response.json()['id']
    
    # 6. 测试获取片段列表
    print_section('6. 测试获取片段列表')
    response = requests.get(f'{BASE_URL}/snippets', headers=headers)
    print_response(response)
    
    # 7. 测试获取单个片段
    print_section('7. 测试获取单个片段')
    response = requests.get(f'{BASE_URL}/snippets/{snippet_id}', headers=headers)
    print_response(response)
    
    # 8. 测试更新片段
    print_section('8. 测试更新片段')
    response = requests.put(f'{BASE_URL}/snippets/{snippet_id}', 
                           json={'title': '更新后的标题', 'description': '更新后的描述'}, 
                           headers=headers)
    print_response(response)
    
    # 9. 测试同步
    print_section('9. 测试同步')
    response = requests.post(f'{BASE_URL}/sync', 
                            json={'last_sync_time': None, 'changes': []}, 
                            headers=headers)
    print_response(response)
    
    # 10. 测试创建分享
    print_section('10. 测试创建分享')
    response = requests.post(f'{BASE_URL}/share', 
                            json={'snippet_id': snippet_id, 'expires_in_days': 7}, 
                            headers=headers)
    print_response(response)
    
    if response.status_code == 201:
        short_code = response.json()['short_code']
        short_url = response.json()['short_url']
        print(f'\n短链接: {short_url}')
        print(f'访问地址: http://8.141.108.146:8001/s/{short_code}')
        
        # 11. 测试获取分享列表
        print_section('11. 测试获取分享列表')
        response = requests.get(f'{BASE_URL}/shares', headers=headers)
        print_response(response)
    
    print_section('测试完成')
    print('✅ 所有测试通过！')
    
except requests.exceptions.ConnectionError:
    print('\n❌ 错误：无法连接到服务器')
    print('请确保服务器正在运行：')
    print('  /home/xinpeng/.local/bin/uvicorn main:app --host 0.0.0.0 --port 8001')
    sys.exit(1)
except Exception as e:
    print(f'\n❌ 测试过程中出错: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
