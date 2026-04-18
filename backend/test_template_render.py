#!/usr/bin/env python3
"""直接测试模板渲染"""
import sys
import os
sys.path.insert(0, '/home/xinpeng/SnippetBox/backend')

from fastapi.templating import Jinja2Templates
from datetime import datetime

# 初始化模板
template_dir = os.path.join(os.path.dirname(__file__), "templates")
print(f'模板目录: {template_dir}')
print(f'目录存在: {os.path.exists(template_dir)}')

templates = Jinja2Templates(directory=template_dir)

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

# 测试数据
context = {
    "request": request,
    "snippet": {
        "title": "测试片段",
        "language": "python",
        "code": "print('Hello, World!')",
        "description": "这是一个测试"
    },
    "view_count": 1,
    "created_at": "2026-04-18"
}

print('\n测试渲染 share.html:')
print('='*60)

try:
    response = templates.TemplateResponse("share.html", context)
    print('✅ 模板渲染成功')
    print(f'响应类型: {type(response)}')
    print(f'状态码: {response.status_code}')
    
    # 尝试获取body
    print('\n尝试渲染body...')
    # 注意：TemplateResponse需要在ASGI上下文中才能完全渲染
    print('模板响应对象创建成功，但需要ASGI上下文才能完全渲染')
    
except Exception as e:
    print(f'❌ 错误: {e}')
    import traceback
    traceback.print_exc()

# 直接测试Jinja2渲染
print('\n直接使用Jinja2渲染:')
print('='*60)

try:
    template = templates.env.get_template("share.html")
    html = template.render(context)
    print('✅ Jinja2渲染成功')
    print(f'HTML长度: {len(html)} 字节')
    print(f'HTML预览（前200字符）:')
    print(html[:200])
    
except Exception as e:
    print(f'❌ 错误: {e}')
    import traceback
    traceback.print_exc()
