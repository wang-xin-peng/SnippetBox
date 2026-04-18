#!/usr/bin/env python3
"""测试短链接访问页面"""
import requests

# 测试短链接访问
short_codes = ['0kd6n1', 'nmR75M', 'XzKt9U']

for code in short_codes:
    url = f'http://localhost:8001/s/{code}'
    print(f'\n测试短链接: {url}')
    print('='*60)
    
    try:
        response = requests.get(url)
        print(f'状态码: {response.status_code}')
        
        if response.status_code == 200:
            print('✅ 页面访问成功')
            # 检查HTML内容
            if '<html' in response.text.lower():
                print('✅ 返回了HTML页面')
            if 'snippetbox' in response.text.lower():
                print('✅ 包含SnippetBox内容')
            print(f'\n页面内容预览（前500字符）:')
            print(response.text[:500])
        else:
            print(f'❌ 访问失败')
            print(f'错误信息: {response.text[:200]}')
    except Exception as e:
        print(f'❌ 请求出错: {e}')
