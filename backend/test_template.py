#!/usr/bin/env python3
"""测试模板渲染"""
import sys
import os

# 添加路径
sys.path.insert(0, '/home/xinpeng/SnippetBox/backend')

from fastapi.templating import Jinja2Templates
from fastapi import Request
from starlette.datastructures import Headers

# 测试模板路径
template_dir = os.path.join(os.path.dirname(__file__), "templates")
print(f'模板目录: {template_dir}')
print(f'绝对路径: {os.path.abspath(template_dir)}')
print(f'目录存在: {os.path.exists(template_dir)}')
print()

if os.path.exists(template_dir):
    files = os.listdir(template_dir)
    print(f'模板文件: {files}')
    print()

# 尝试初始化Jinja2Templates
try:
    templates = Jinja2Templates(directory=template_dir)
    print('✅ Jinja2Templates 初始化成功')
    print()
    
    # 创建一个模拟的Request对象
    scope = {
        'type': 'http',
        'method': 'GET',
        'path': '/s/test',
        'query_string': b'',
        'headers': [],
        'server': ('localhost', 8001),
    }
    
    # 尝试渲染模板
    print('测试渲染 share.html:')
    print('='*60)
    
    class MockRequest:
        def __init__(self):
            self.url = type('obj', (object,), {'path': '/s/test'})()
            self.headers = {}
            self.query_params = {}
            self.path_params = {}
            self.scope = scope
    
    request = MockRequest()
    
    response = templates.TemplateResponse("share.html", {
        "request": request,
        "snippet": {
            "title": "测试片段",
            "language": "python",
            "code": "print('Hello')",
            "description": "测试描述"
        },
        "view_count": 1,
        "created_at": "2026-04-18"
    })
    
    print('✅ 模板渲染成功')
    print(f'响应类型: {type(response)}')
    
except Exception as e:
    print(f'❌ 错误: {e}')
    import traceback
    traceback.print_exc()
