#!/usr/bin/env python3
"""检查短链接访问错误"""
import asyncio
import sys
sys.path.insert(0, '/home/xinpeng/SnippetBox/backend')

async def test_share_access():
    from database.connection import get_db_pool, init_db
    from services.auth import AuthService
    import asyncpg
    
    # 初始化数据库
    await init_db()
    pool = get_db_pool()
    
    async with pool.acquire() as conn:
        # 测试获取分享信息
        short_code = '0kd6n1'
        print(f'测试短码: {short_code}')
        print('='*60)
        
        try:
            share = await conn.fetchrow("""
                SELECT ss.id, ss.short_code, ss.snippet_id, ss.user_id, ss.password_hash,
                       ss.expires_at, ss.view_count, ss.created_at,
                       cs.title, cs.language, cs.code, cs.description
                FROM shared_snippets ss
                JOIN cloud_snippets cs ON ss.snippet_id = cs.id
                WHERE ss.short_code = $1
            """, short_code)
            
            if share:
                print('✅ 找到分享记录')
                print(f'标题: {share["title"]}')
                print(f'语言: {share["language"]}')
                print(f'过期时间: {share["expires_at"]}')
                print(f'访问次数: {share["view_count"]}')
            else:
                print('❌ 未找到分享记录')
                
        except Exception as e:
            print(f'❌ 数据库查询错误: {e}')
            import traceback
            traceback.print_exc()
    
    # 测试模板路径
    print('\n检查模板路径:')
    print('='*60)
    import os
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    print(f'模板目录: {template_dir}')
    print(f'目录存在: {os.path.exists(template_dir)}')
    
    if os.path.exists(template_dir):
        files = os.listdir(template_dir)
        print(f'模板文件: {files}')
        
        # 检查share.html
        share_html = os.path.join(template_dir, 'share.html')
        if os.path.exists(share_html):
            print(f'✅ share.html 存在')
            with open(share_html, 'r') as f:
                content = f.read()
                print(f'文件大小: {len(content)} 字节')
        else:
            print(f'❌ share.html 不存在')

if __name__ == '__main__':
    asyncio.run(test_share_access())
