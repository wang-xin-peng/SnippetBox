#!/usr/bin/env python3
"""调试短链接访问错误"""
import asyncio
import sys
import os
sys.path.insert(0, '/home/xinpeng/SnippetBox/backend')

async def debug_share():
    from fastapi import Request
    from api.v1.share import access_share_page, templates
    from database.connection import init_db, get_db_pool
    from starlette.datastructures import Headers, QueryParams
    
    # 初始化数据库
    await init_db()
    pool = get_db_pool()
    
    # 创建模拟Request
    scope = {
        'type': 'http',
        'method': 'GET',
        'path': '/s/0kd6n1',
        'query_string': b'',
        'headers': [],
        'server': ('localhost', 8001),
        'scheme': 'http',
        'root_path': '',
    }
    
    class MockRequest:
        def __init__(self):
            self.url = type('obj', (object,), {
                'path': '/s/0kd6n1',
                'scheme': 'http',
                'netloc': 'localhost:8001'
            })()
            self.headers = Headers()
            self.query_params = QueryParams()
            self.path_params = {'short_code': '0kd6n1'}
            self.scope = scope
            self.base_url = type('obj', (object,), {'scheme': 'http', 'netloc': 'localhost:8001'})()
    
    request = MockRequest()
    
    print('测试短链接访问函数...')
    print('='*60)
    
    try:
        async with pool.acquire() as conn:
            response = await access_share_page(
                request=request,
                short_code='0kd6n1',
                password=None,
                conn=conn
            )
            print(f'✅ 函数调用成功')
            print(f'响应类型: {type(response)}')
            print(f'状态码: {response.status_code}')
            
    except Exception as e:
        print(f'❌ 错误: {e}')
        import traceback
        traceback.print_exc()
    
    # 测试模板目录
    print('\n检查模板配置:')
    print('='*60)
    print(f'模板对象: {templates}')
    print(f'模板目录: {templates.env.loader.searchpath if hasattr(templates.env.loader, "searchpath") else "N/A"}')

if __name__ == '__main__':
    asyncio.run(debug_share())
