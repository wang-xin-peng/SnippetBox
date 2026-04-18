"""
数据库模块
"""
from .connection import get_db_connection, init_db

__all__ = ['get_db_connection', 'init_db']
