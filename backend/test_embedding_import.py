#!/usr/bin/env python3
"""测试嵌入服务导入"""

print("Testing embedding service import...")

try:
    from services.embedding import EmbeddingService
    print("✓ EmbeddingService import successful")
    
    # 测试初始化
    service = EmbeddingService()
    print(f"✓ EmbeddingService instance created")
    print(f"  Model: {service.model_name}")
    print(f"  Device: {service.device}")
    print(f"  Dimension: {service.dimension}")
    
except ImportError as e:
    print(f"✗ Import failed: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
