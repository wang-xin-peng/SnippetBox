#!/usr/bin/env python3
"""直接测试API端点"""
import asyncio
import sys
sys.path.insert(0, '/home/xinpeng/SnippetBox/backend')

async def test_api():
    from fastapi.testclient import TestClient
    from main import app
    
    # 等待应用启动
    await asyncio.sleep(1)
    
    client = TestClient(app)
    
    print('测试短链接访问...')
    print('='*60)
    
    try:
        response = client.get('/s/0kd6n1')
        print(f'状态码: {response.status_code}')
        
        if response.status_code == 200:
            print('✅ 访问成功')
            print(f'内容长度: {len(response.text)} 字节')
            print(f'\n内容预览（前500字符）:')
            print(response.text[:500])
        else:
            print(f'❌ 访问失败')
            print(f'响应: {response.text}')
            
    except Exception as e:
        print(f'❌ 错误: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_api())
