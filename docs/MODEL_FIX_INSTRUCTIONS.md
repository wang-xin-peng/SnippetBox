# 模型下载修复说明

## 问题描述

之前的版本只下载了单个 `.onnx` 文件，缺少 tokenizer 等必需文件，导致语义搜索无法工作。

## 已修复

现在模型下载器会下载完整的模型文件，包括：
- `model.onnx` - ONNX 模型文件
- `tokenizer.json` - Tokenizer 配置
- `tokenizer_config.json` - Tokenizer 配置
- `config.json` - 模型配置
- `special_tokens_map.json` - 特殊 token 映射
- `vocab.txt` - 词汇表

## 操作步骤

### 1. 删除旧模型文件

打开文件资源管理器，导航到：
```
C:\Users\<你的用户名>\AppData\Roaming\SnippetBox\models\
```

删除以下文件（如果存在）：
- `all-MiniLM-L6-v2.onnx`
- `all-MiniLM-L6-v2.onnx.tmp`
- `all-MiniLM-L6-v2.onnx.state`
- `all-MiniLM-L6-v2` 文件夹（如果存在）

### 2. 重启应用

关闭并重新启动 SnippetBox 应用。

### 3. 重新下载模型

1. 打开设置页面
2. 在"模型管理"部分，点击"下载模型"
3. 选择镜像源（推荐"Hugging Face 镜像（国内）"）
4. 等待下载完成（约 90MB，需要 1-5 分钟）

下载完成后，系统会自动：
- 为所有现有片段生成向量
- 切换到语义搜索模式

### 4. 验证模型文件

下载完成后，检查以下目录：
```
C:\Users\<你的用户名>\AppData\Roaming\SnippetBox\models\all-MiniLM-L6-v2\
```

应该包含以下文件：
- ✅ model.onnx
- ✅ tokenizer.json
- ✅ tokenizer_config.json
- ✅ config.json
- ✅ special_tokens_map.json
- ✅ vocab.txt

### 5. 测试语义搜索

1. 创建几个测试片段：
   - "冒泡排序"
   - "快速排序"
   - "归并排序"

2. 在搜索框中输入："排序方法"

3. 应该能看到所有排序相关的片段

## 常见问题

### Q: 下载失败怎么办？

**A**: 
1. 检查网络连接
2. 尝试切换镜像源
3. 查看控制台日志（F12）了解详细错误

### Q: 向量生成失败怎么办？

**A**:
1. 确认模型文件已完整下载
2. 打开设置，点击"重新生成向量"
3. 查看控制台日志了解详细错误

### Q: 搜索仍然返回空结果？

**A**:
1. 确认搜索模式为"本地模型搜索"
2. 确认向量已生成（查看控制台日志）
3. 尝试使用不同的搜索词

### Q: 如何查看控制台日志？

**A**:
1. 按 F12 打开开发者工具
2. 切换到 Console 标签
3. 查看日志输出

## 技术细节

### 模型文件结构

```
models/
└── all-MiniLM-L6-v2/
    ├── model.onnx          (90MB - ONNX 模型)
    ├── tokenizer.json      (466KB - Tokenizer)
    ├── tokenizer_config.json (350B - Tokenizer 配置)
    ├── config.json         (612B - 模型配置)
    ├── special_tokens_map.json (112B - 特殊 token)
    └── vocab.txt           (232KB - 词汇表)
```

### 下载源

- **Hugging Face 官方**: `https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/`
- **Hugging Face 镜像**: `https://hf-mirror.com/sentence-transformers/all-MiniLM-L6-v2/`

### 向量数据库

向量存储在 SQLite 数据库中：
```
<项目目录>/frontend/snippets.db
```

表结构：
- `snippet_vectors` - 存储向量数据（BLOB）
- `snippet_vector_mapping` - 片段 ID 到向量 ID 的映射

## 下一步

完成上述步骤后，语义搜索应该可以正常工作了。如果仍有问题，请查看：
- [语义搜索完整修复报告](./SEMANTIC_SEARCH_FIX_COMPLETE.md)
- [语义搜索测试指南](./SEMANTIC_SEARCH_TEST_GUIDE.md)
- [快速启动指南](./QUICK_START_SEMANTIC_SEARCH.md)
