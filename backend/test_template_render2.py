#!/usr/bin/env python3
"""测试模板渲染 - 使用datetime对象"""
import sys
import os
sys.path.insert(0, '/home/xinpeng/SnippetBox/backend')

from fastapi.templating import Jinja2Templates
from datetime import datetime

# 初始化模板
template_dir = os.path.join(os.path.dirname(__file__), "templates")
templates = Jinja2Templates(directory=template_dir)
templates.env.cache = {}  # 禁用缓存

# 创建模拟Request
class MockRequest:
    def __init__(self):
        self.url = type('obj', (object,), {
            'path': '/s/test',
            'scheme': 'http',
            'netloc': 'localhost:8001',
            '_url': 'http://localhost:8001/s/test'
        })()
        self.headers = {}
        self.query_params = {}
        self.path_params = {}
        self.base_url = type('obj', (object,), {
            'scheme': 'http',
            'netloc': 'localhost:8001',
            '_url': 'http://localhost:8001'
        })()
        self.scope = {
            'type': 'http',
            'method': 'GET',
            'path': '/s/test',
            'query_string': b'',
            'headers': [],
            'server': ('localhost', 8001),
            'scheme': 'http',
        }

request = MockRequest()

# 测试数据 - 使用datetime对象
context = {
    "request": request,
    "snippet": {
        "title": "测试片段",
        "language": "python",
        "code": "print('Hello, World!')",
        "description": "这是一个测试"
    },
    "view_count": 1,
    "created_at": datetime.now()  # 使用datetime对象
}

print('直接使用Jinja2渲染（使用datetime对象）:')
print('='*60)

try:
    template = templates.env.get_template("share.html")
    html = template.render(context)
    print('✅ Jinja2渲染成功')
    print(f'HTML长度: {len(html)} 字节')
    print(f'\nHTML预览（前500字符）:')
    print(html[:500])
    print('\n...')
    print(f'\nHTML预览（最后200字符）:')
    print(html[-200:])
    
except Exception as e:
    print(f'❌ 错误: {e}')
    import traceback
    traceback.print_exc()
