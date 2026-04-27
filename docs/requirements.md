# 需求规范文档

## 介绍

SnippetBox 是一款面向开发者的轻量级代码片段管理工具。它提供本地优先的片段管理体验，支持分类、标签、全文搜索、语法高亮、一键复制、导出和分享功能。

核心特性：

- 本地优先架构：所有核心功能完全离线可用
- 智能搜索：统一搜索框自动选择最佳搜索方式，用户无需关心技术细节
- 灵活部署：支持本地语义搜索模型（可选下载，约 80MB）或纯关键词搜索（轻量模式）
- 友好的首次体验：安装后首次启动时引导用户选择功能模式，支持后台下载
- 可选云同步：支持多设备间同步片段数据
- 隐私保护：本地模式下代码片段不会发送到外部服务器

该工具帮助开发者高效管理和检索代码片段，同时保护代码隐私。

## 术语表

- **Snippet_Manager**: 代码片段管理器，负责片段的增删改查操作
- **Local_Database**: 本地数据库（SQLite），存储片段数据
- **Search_Engine**: 搜索引擎，智能选择全文搜索或语义搜索，自动降级以提供最佳体验
- **Editor**: 代码编辑器组件（Monaco Editor），提供语法高亮
- **Export_Service**: 导出服务，负责生成 Markdown 和 PDF 文件
- **Share_Service**: 分享服务，生成和管理短链接
- **Sync_Service**: 同步服务，处理云端数据同步
- **Auth_Service**: 认证服务，处理用户登录和授权
- **Local_Embedding_Service**: 本地嵌入服务，使用本地模型将代码片段转换为向量表示
- **Model_Downloader**: 模型下载器，负责下载和管理嵌入模型文件，支持后台下载、暂停/恢复
- **Vector_Store**: 向量存储（SQLite），存储和检索片段向量
- **Cloud_API**: 云端 API 服务（FastAPI）
- **Desktop_Client**: 桌面客户端（Electron 应用）
- **Valid_Snippet**: 包含标题和代码内容的片段对象
- **Conflict**: 本地和云端数据不一致的情况
- **Embedding_Model**: 嵌入模型，使用 multilingual-e5-small（约 134MB，多语言支持）
- **Model_Cache**: 模型缓存目录，存储已下载的模型文件
- **Welcome_Wizard**: 欢迎向导，在首次启动时引导用户选择功能模式
- **Lightweight_Mode**: 轻量模式，不使用语义搜索，仅使用全文搜索，节省存储空间

## 需求

### 需求 1: 片段基础管理

**用户故事**: 作为开发者，我想要创建、查看、编辑和删除代码片段，以便管理我的代码库。

#### 验收标准

1. WHEN 用户提供标题和代码内容时，THE Snippet_Manager SHALL 创建新片段并存储到 Local_Database
2. WHEN 用户请求查看片段列表时，THE Snippet_Manager SHALL 从 Local_Database 检索所有片段并按创建时间倒序返回
3. WHEN 用户选择一个片段时，THE Desktop_Client SHALL 在 Editor 中显示该片段的完整内容
4. WHEN 用户修改片段内容并保存时，THE Snippet_Manager SHALL 更新 Local_Database 中的对应记录
5. WHEN 用户删除片段时，THE Snippet_Manager SHALL 从 Local_Database 中移除该片段
6. THE Snippet_Manager SHALL 为每个片段生成唯一标识符
7. THE Snippet_Manager SHALL 记录片段的创建时间和最后修改时间

### 需求 2: 分类和标签系统

**用户故事**: 作为开发者，我想要通过分类和标签组织片段，以便快速找到相关代码。

#### 验收标准

1. WHEN 用户创建或编辑片段时，THE Snippet_Manager SHALL 允许用户指定一个分类
2. WHEN 用户创建或编辑片段时，THE Snippet_Manager SHALL 允许用户添加多个标签
3. WHEN 用户按分类筛选时，THE Snippet_Manager SHALL 返回该分类下的所有片段
4. WHEN 用户按标签筛选时，THE Snippet_Manager SHALL 返回包含该标签的所有片段
5. WHEN 用户同时使用多个标签筛选时，THE Snippet_Manager SHALL 返回包含所有指定标签的片段
6. THE Snippet_Manager SHALL 维护分类和标签的列表供用户选择
7. THE Snippet_Manager SHALL 支持创建新的分类和标签

### 需求 3: 全文搜索

**用户故事**: 作为开发者，我想要通过关键词搜索片段，以便快速定位包含特定代码的片段。

#### 验收标准

1. WHEN 用户输入搜索关键词时，THE Search_Engine SHALL 使用 SQLite FTS5 在片段标题和内容中搜索
2. WHEN 搜索完成时，THE Search_Engine SHALL 返回匹配的片段列表并按相关度排序
3. THE Search_Engine SHALL 支持多关键词搜索
4. THE Search_Engine SHALL 在搜索结果中高亮显示匹配的关键词
5. WHEN 片段被创建或修改时，THE Search_Engine SHALL 自动更新全文搜索索引

### 需求 4: 语法高亮和代码编辑

**用户故事**: 作为开发者，我想要看到带语法高亮的代码，以便更容易阅读和编辑。

#### 验收标准

1. WHEN 用户查看或编辑片段时，THE Editor SHALL 使用 Monaco Editor 显示代码
2. WHEN 用户选择编程语言时，THE Editor SHALL 应用对应语言的语法高亮规则
3. THE Editor SHALL 支持至少 20 种常见编程语言的语法高亮
4. THE Editor SHALL 提供代码自动缩进功能
5. THE Editor SHALL 支持行号显示
6. THE Editor SHALL 支持代码折叠功能

### 需求 5: 一键复制

**用户故事**: 作为开发者，我想要快速复制片段代码，以便在其他地方使用。

#### 验收标准

1. WHEN 用户点击复制按钮时，THE Desktop_Client SHALL 将片段代码复制到系统剪贴板
2. WHEN 复制成功时，THE Desktop_Client SHALL 显示复制成功的提示信息
3. IF 复制失败，THEN THE Desktop_Client SHALL 显示错误提示信息
4. THE Desktop_Client SHALL 在复制成功后 2 秒内自动隐藏提示信息

### 需求 6: 打印功能

**用户故事**: 作为开发者，我想要打印代码片段，以便离线查看或分享。

#### 验收标准

1. WHEN 用户点击打印按钮时，THE Desktop_Client SHALL 打开浏览器打印对话框
2. THE Desktop_Client SHALL 生成包含语法高亮的打印页面
3. THE Desktop_Client SHALL 支持选择打印机和打印份数
4. THE Desktop_Client SHALL 在打印页面中包含片段的标题和元数据

### 需求 7: 导出功能

**用户故事**: 作为开发者，我想要将片段导出为 Markdown 或 PDF 格式，以便分享或备份。

#### 验收标准

1. WHEN 用户选择导出为 Markdown 时，THE Export_Service SHALL 生成包含片段标题、代码和元数据的 Markdown 文件
2. WHEN 用户选择导出为 PDF 时，THE Export_Service SHALL 生成包含语法高亮的 PDF 文件
3. WHEN 用户选择多个片段导出时，THE Export_Service SHALL 将所有片段合并到一个文件中
4. THE Export_Service SHALL 在导出的文件中包含片段的分类和标签信息
5. THE Export_Service SHALL 允许用户选择导出文件的保存位置
6. WHEN 导出完成时，THE Desktop_Client SHALL 显示成功提示并提供打开文件的选项
7. IF 导出失败，THEN THE Desktop_Client SHALL 显示具体的错误信息

### 需求 7: 短链接分享

**用户故事**: 作为开发者，我想要生成片段的短链接，以便快速分享给他人。

#### 验收标准

1. WHEN 用户请求分享片段时，THE Share_Service SHALL 将片段上传到云端并生成唯一的短链接
2. THE Share_Service SHALL 生成长度不超过 8 个字符的短链接标识符
3. WHEN 短链接生成成功时，THE Desktop_Client SHALL 将链接复制到剪贴板并显示提示
4. WHEN 访问者打开短链接时，THE Cloud_API SHALL 返回包含片段内容和语法高亮的网页
5. THE Share_Service SHALL 记录短链接的创建时间和访问次数
6. WHERE 用户设置了分享有效期，THE Share_Service SHALL 在过期后使短链接失效
7. IF 短链接已过期或不存在，THEN THE Cloud_API SHALL 返回友好的错误页面

### 需求 8: 用户认证系统

**用户故事**: 作为开发者，我想要创建账户并登录，以便使用云同步和语义搜索功能。

#### 验收标准

1. WHEN 用户提供邮箱和密码注册时，THE Auth_Service SHALL 创建新用户账户
2. THE Auth_Service SHALL 验证邮箱格式的有效性
3. THE Auth_Service SHALL 要求密码长度至少为 8 个字符
4. THE Auth_Service SHALL 使用安全哈希算法存储密码
5. WHEN 用户提供正确的邮箱和密码登录时，THE Auth_Service SHALL 返回有效的访问令牌
6. WHEN 用户提供错误的凭据时，THE Auth_Service SHALL 拒绝登录并返回错误信息
7. THE Auth_Service SHALL 生成有效期为 7 天的访问令牌
8. WHEN 访问令牌过期时，THE Auth_Service SHALL 要求用户重新登录

### 需求 9: 云端同步

**用户故事**: 作为开发者，我想要在多台设备间同步片段，以便在任何地方访问我的代码库。

#### 验收标准

1. WHERE 用户已登录，WHEN 用户创建或修改片段时，THE Sync_Service SHALL 将变更上传到云端
2. WHERE 用户已登录，WHEN 用户启动应用时，THE Sync_Service SHALL 从云端下载最新的片段数据
3. WHEN 检测到本地和云端数据冲突时，THE Sync_Service SHALL 保留两个版本并提示用户选择
4. THE Sync_Service SHALL 使用时间戳和版本号检测冲突
5. THE Sync_Service SHALL 在同步失败时重试最多 3 次
6. IF 同步失败超过 3 次，THEN THE Sync_Service SHALL 记录错误并通知用户
7. THE Sync_Service SHALL 支持增量同步以减少数据传输量
8. WHEN 用户删除片段时，THE Sync_Service SHALL 在云端标记该片段为已删除而不是物理删除
9. WHEN 用户登录时检测到本地片段，THE Desktop_Client SHALL 提示用户选择是否合并到云端

### 需求 10: 智能搜索

**用户故事**: 作为开发者，我想要使用统一的搜索框进行搜索，系统自动选择最佳搜索方式，无需关心技术细节。

#### 验收标准

1. THE Desktop_Client SHALL 提供统一的搜索框，不区分全文搜索和语义搜索
2. WHEN 用户输入搜索查询时，THE Search_Engine SHALL 根据当前配置自动选择搜索策略
3. WHERE 本地模型已下载，THE Search_Engine SHALL 使用本地语义搜索
4. WHERE 本地模型未下载，THE Search_Engine SHALL 使用全文搜索（SQLite FTS5）
5. WHEN 搜索完成时，THE Desktop_Client SHALL 在搜索结果旁显示当前使用的搜索模式指示器（本地搜索/关键词搜索）
7. WHEN 用户悬停在搜索模式指示器上时，THE Desktop_Client SHALL 显示详细说明
8. THE Search_Engine SHALL 返回相似度最高的前 10 个片段（语义搜索）或相关度最高的结果（全文搜索）
9. THE Local_Embedding_Service SHALL 在 200 毫秒内完成查询向量的生成

### 需求 11: 片段向量化和存储

**用户故事**: 作为系统，我需要将片段转换为向量并存储在本地，以支持离线语义搜索功能。

#### 验收标准

1. WHEN 片段被创建或修改时，WHERE 本地模型已下载，THE Local_Embedding_Service SHALL 将片段标题和代码内容组合后生成向量
2. THE Local_Embedding_Service SHALL 使用 all-MiniLM-L6-v2 模型（ONNX 格式）进行本地推理
3. THE Local_Embedding_Service SHALL 生成 384 维的向量表示
4. WHEN 向量生成完成时，THE Vector_Store SHALL 将向量存储到本地 SQLite 数据库
5. THE Vector_Store SHALL 支持基于余弦相似度的向量检索
6. THE Vector_Store SHALL 在检索时返回相似度分数
7. WHEN 片段被删除时，THE Vector_Store SHALL 删除对应的向量数据
8. WHERE 用户未下载本地模型，THE Snippet_Manager SHALL 跳过向量化步骤，不影响片段的正常创建和修改

### 需求 12: 嵌入模型下载和管理

**用户故事**: 作为开发者，我想要在首次启动时选择是否使用语义搜索功能，并在后台下载模型，不影响其他操作。

#### 验收标准

1. WHEN 用户首次启动应用时，THE Desktop_Client SHALL 显示 Welcome_Wizard 欢迎向导
2. THE Welcome_Wizard SHALL 询问用户是否需要语义搜索功能，并说明模型大小（约 134MB，支持多语言）和用途
3. WHEN 用户选择需要语义搜索时，THE Model_Downloader SHALL 在后台开始下载模型文件
4. WHEN 用户选择跳过时，THE Desktop_Client SHALL 进入轻量模式，仅使用全文搜索
5. WHEN 下载进行中时，THE Desktop_Client SHALL 在界面上显示下载进度（百分比、速度、剩余时间）
6. THE Desktop_Client SHALL 允许用户在下载过程中继续使用其他功能（创建、编辑、全文搜索片段）
7. THE Model_Downloader SHALL 支持暂停和恢复下载
8. THE Model_Downloader SHALL 提供多个 CDN 镜像源供用户选择
9. WHEN 下载完成时，THE Model_Downloader SHALL 验证模型文件的完整性（使用 SHA256 校验）
10. IF 校验失败，THEN THE Model_Downloader SHALL 删除损坏的文件并提示用户重新下载
11. THE Model_Downloader SHALL 将模型文件缓存到用户数据目录的 Model_Cache 子目录
12. THE Desktop_Client SHALL 在设置中提供"下载本地模型"按钮，显示当前搜索能力状态
13. THE Desktop_Client SHALL 在设置中显示已下载的模型和占用空间
14. THE Desktop_Client SHALL 允许用户删除已下载的模型以释放空间并切换到轻量模式
15. WHEN 模型被删除后，THE Search_Engine SHALL 自动降级到全文搜索

### 需求 13: 数据持久化和完整性

**用户故事**: 作为系统，我需要可靠地存储片段数据，以防止数据丢失。

#### 验收标准

1. THE Local_Database SHALL 使用 SQLite 存储所有片段数据
2. THE Local_Database SHALL 在每次写操作后确保数据持久化到磁盘
3. WHEN 应用启动时，THE Local_Database SHALL 验证数据库文件的完整性
4. IF 数据库文件损坏，THEN THE Desktop_Client SHALL 尝试从备份恢复或提示用户
5. THE Local_Database SHALL 使用事务确保数据操作的原子性
6. THE Local_Database SHALL 定期创建数据库备份文件
7. THE Local_Database SHALL 保留最近 7 天的备份文件

### 需求 14: 性能要求

**用户故事**: 作为开发者，我期望应用响应迅速，以便流畅使用。

#### 验收标准

1. WHEN 用户打开应用时，THE Desktop_Client SHALL 在 2 秒内显示主界面
2. WHEN 用户执行本地搜索时，THE Search_Engine SHALL 在 200 毫秒内返回结果
3. WHEN 用户切换片段时，THE Editor SHALL 在 100 毫秒内加载并显示内容
4. WHEN 用户保存片段时，THE Snippet_Manager SHALL 在 100 毫秒内完成保存操作
5. THE Desktop_Client SHALL 支持管理至少 10000 个片段而不出现明显性能下降
6. THE Cloud_API SHALL 在 1 秒内完成同步请求的处理
7. THE Local_Embedding_Service SHALL 在 100-200 毫秒内完成单个片段的本地向量化
8. WHERE 用户使用云端高精度模式，THE Cloud_Embedding_Service SHALL 在 500 毫秒内完成向量化

### 需求 15: 错误处理和用户反馈

**用户故事**: 作为开发者，当出现错误时，我想要清晰的错误信息，以便了解问题并采取行动。

#### 验收标准

1. WHEN 发生错误时，THE Desktop_Client SHALL 显示用户友好的错误消息
2. THE Desktop_Client SHALL 在错误消息中说明错误原因和建议的解决方案
3. IF 网络请求失败，THEN THE Desktop_Client SHALL 提示用户检查网络连接
4. IF 云端服务不可用，THEN THE Desktop_Client SHALL 允许用户继续使用本地功能
5. THE Desktop_Client SHALL 记录详细的错误日志到本地文件
6. THE Desktop_Client SHALL 提供查看日志文件的功能
7. WHEN 用户操作成功时，THE Desktop_Client SHALL 显示简短的成功提示

### 需求 16: 缓存机制

**用户故事**: 作为系统，我需要缓存热点数据，以提高响应速度和减少服务器负载。

#### 验收标准

1. WHERE 用户已登录，THE Cloud_API SHALL 使用 Redis 缓存频繁访问的片段数据
2. WHEN 片段被请求时，THE Cloud_API SHALL 首先检查 Redis 缓存
3. IF 缓存命中，THEN THE Cloud_API SHALL 直接返回缓存的数据
4. IF 缓存未命中，THEN THE Cloud_API SHALL 从 PostgreSQL 查询数据并更新缓存
5. THE Cloud_API SHALL 设置缓存过期时间为 1 小时
6. WHEN 片段被修改或删除时，THE Cloud_API SHALL 立即使对应的缓存失效
7. THE Cloud_API SHALL 缓存语义搜索的查询结果

### 需求 17: 安全性要求

**用户故事**: 作为开发者，我希望我的数据是安全的，防止未授权访问。

#### 验收标准

1. THE Cloud_API SHALL 使用 HTTPS 加密所有网络通信
2. THE Auth_Service SHALL 使用 bcrypt 或 argon2 算法哈希存储密码
3. THE Cloud_API SHALL 验证每个请求的访问令牌
4. IF 访问令牌无效或过期，THEN THE Cloud_API SHALL 拒绝请求并返回 401 状态码
5. THE Cloud_API SHALL 实施速率限制以防止暴力攻击
6. THE Cloud_API SHALL 记录所有认证失败的尝试
7. THE Desktop_Client SHALL 在本地安全存储访问令牌
8. THE Cloud_API SHALL 确保用户只能访问自己的片段数据
9. THE Local_Embedding_Service SHALL 完全在本地运行，确保代码片段不会发送到外部服务器
10. THE Desktop_Client SHALL 在设置中明确说明本地模式和云端模式的隐私差异

### 需求 18: 数据导入

**用户故事**: 作为开发者，我想要从其他来源导入片段，以便迁移现有的代码库。

#### 验收标准

1. WHEN 用户选择导入 Markdown 文件时，THE Snippet_Manager SHALL 解析文件并创建对应的片段
2. WHEN 用户选择导入 JSON 文件时，THE Snippet_Manager SHALL 验证 JSON 格式并导入片段
3. THE Snippet_Manager SHALL 支持批量导入多个文件
4. WHEN 导入过程中遇到格式错误时，THE Snippet_Manager SHALL 跳过该条目并继续处理其他数据
5. WHEN 导入完成时，THE Desktop_Client SHALL 显示成功导入的片段数量和失败的条目数量
6. THE Snippet_Manager SHALL 在导入时自动检测代码语言
7. IF 检测到重复的片段，THEN THE Snippet_Manager SHALL 提示用户选择是否覆盖或保留两者

### 需求 19: 用户界面响应性

**用户故事**: 作为开发者，我希望界面操作流畅，不会因为后台任务而卡顿。

#### 验收标准

1. WHEN 执行耗时操作时，THE Desktop_Client SHALL 在独立线程中处理以避免阻塞 UI
2. WHEN 后台任务运行时，THE Desktop_Client SHALL 显示进度指示器
3. THE Desktop_Client SHALL 允许用户在同步或搜索进行时继续浏览和编辑片段
4. WHEN 用户输入搜索关键词时，THE Desktop_Client SHALL 在用户停止输入 300 毫秒后才执行搜索
5. THE Desktop_Client SHALL 使用虚拟滚动技术渲染大量片段列表
6. THE Desktop_Client SHALL 在滚动时延迟加载片段预览内容
7. THE Desktop_Client SHALL 在 16 毫秒内完成每帧渲染以保持 60 FPS

### 需求 20: 离线功能支持

**用户故事**: 作为开发者，即使没有网络连接，我也想要使用核心功能。

#### 验收标准

1. WHEN 网络不可用时，THE Desktop_Client SHALL 允许用户创建、编辑和删除本地片段
2. WHEN 网络不可用时，THE Desktop_Client SHALL 允许用户使用全文搜索功能
3. WHEN 网络不可用时，WHERE 本地模型已下载，THE Desktop_Client SHALL 允许用户使用本地语义搜索功能
4. WHEN 网络不可用时，THE Search_Engine SHALL 自动降级到本地可用的搜索方式
5. WHEN 网络不可用时，THE Desktop_Client SHALL 禁用云同步功能
6. WHEN 网络恢复时，THE Sync_Service SHALL 自动同步离线期间的所有变更
7. THE Desktop_Client SHALL 在界面上显示当前的网络连接状态和可用的搜索能力
8. THE Desktop_Client SHALL 将离线期间的操作队列化以便后续同步
9. IF 离线操作与云端数据冲突，THEN THE Sync_Service SHALL 在网络恢复后按照冲突解决策略处理

### 需求 21: 配置和个性化

**用户故事**: 作为开发者，我想要自定义应用设置，以适应我的工作习惯。

#### 验收标准

1. THE Desktop_Client SHALL 允许用户选择界面主题（浅色或深色）
2. THE Desktop_Client SHALL 允许用户自定义编辑器字体和字号
3. THE Desktop_Client SHALL 允许用户设置默认的编程语言
4. THE Desktop_Client SHALL 允许用户配置自动同步的频率
5. THE Desktop_Client SHALL 允许用户选择是否启用自动备份
6. THE Desktop_Client SHALL 在设置中显示当前搜索能力状态（轻量模式/本地语义搜索/云端语义搜索）
7. THE Desktop_Client SHALL 将用户设置保存到本地配置文件
8. WHEN 应用启动时，THE Desktop_Client SHALL 加载并应用用户的个性化设置

### 需求 22: 短链接访问页面

**用户故事**: 作为访问者，我想要通过短链接查看分享的代码片段，无需登录或安装应用。

#### 验收标准

1. WHEN 访问者打开短链接时，THE Cloud_API SHALL 返回一个独立的网页
2. THE Cloud_API SHALL 在网页中显示片段的标题、代码内容、编程语言和创建时间
3. THE Cloud_API SHALL 在网页中应用语法高亮显示代码
4. THE Cloud_API SHALL 在网页中提供复制代码按钮
5. THE Cloud_API SHALL 在网页中显示 SnippetBox 的品牌信息和下载链接
6. THE Cloud_API SHALL 确保短链接页面在移动设备上正常显示
7. THE Cloud_API SHALL 记录每次短链接访问的时间和来源

### 需求 24: 批量操作

**用户故事**: 作为开发者，我想要批量操作多个片段，以提高管理效率。

#### 验收标准

1. THE Desktop_Client SHALL 允许用户选择多个片段
2. WHEN 用户选择多个片段时，THE Desktop_Client SHALL 提供批量删除选项
3. WHEN 用户选择多个片段时，THE Desktop_Client SHALL 提供批量修改标签选项
4. WHEN 用户选择多个片段时，THE Desktop_Client SHALL 提供批量修改分类选项
5. WHEN 用户选择多个片段时，THE Desktop_Client SHALL 提供批量导出选项
6. WHEN 执行批量操作时，THE Desktop_Client SHALL 显示操作进度
7. IF 批量操作中某些项失败，THEN THE Desktop_Client SHALL 继续处理其他项并在完成后报告失败的项

### 需求 25: API 速率限制

**用户故事**: 作为系统管理员，我需要限制 API 请求频率，以防止滥用和保护服务器资源。

#### 验收标准

1. THE Cloud_API SHALL 限制每个用户每分钟最多发送 60 个请求
2. THE Cloud_API SHALL 限制每个 IP 地址每分钟最多发送 100 个请求
3. WHEN 用户超过速率限制时，THE Cloud_API SHALL 返回 429 状态码
4. THE Cloud_API SHALL 在响应头中包含剩余请求配额和重置时间
5. THE Cloud_API SHALL 对语义搜索请求实施更严格的限制（每分钟 10 次）
6. THE Cloud_API SHALL 对短链接访问不实施速率限制
7. THE Cloud_API SHALL 记录所有触发速率限制的事件

### 需求 26: 数据统计和分析

**用户故事**: 作为开发者，我想要查看我的片段使用统计，以了解我的代码管理习惯。

#### 验收标准

1. THE Desktop_Client SHALL 统计用户创建的片段总数
2. THE Desktop_Client SHALL 统计每种编程语言的片段数量
3. THE Desktop_Client SHALL 统计每个分类和标签的片段数量
4. THE Desktop_Client SHALL 记录每个片段的访问次数
5. THE Desktop_Client SHALL 显示最常访问的前 10 个片段
6. THE Desktop_Client SHALL 显示最近 7 天创建的片段数量趋势
7. THE Desktop_Client SHALL 在统计页面以图表形式展示数据

### 需求 27: 跨平台支持

**用户故事**: 作为开发者，我想要在不同操作系统上使用 SnippetBox，以便在任何设备上工作。

#### 验收标准

1. THE Desktop_Client SHALL 支持 Windows 10 及以上版本
2. THE Desktop_Client SHALL 支持 macOS 10.15 及以上版本
3. THE Desktop_Client SHALL 支持主流 Linux 发行版（Ubuntu、Fedora、Debian）
4. THE Desktop_Client SHALL 在所有支持的平台上提供一致的用户体验
5. THE Desktop_Client SHALL 使用平台原生的文件对话框和通知系统
6. THE Desktop_Client SHALL 遵循各平台的界面设计规范
7. THE Desktop_Client SHALL 将数据库文件存储在平台标准的用户数据目录中

### 需求 28: 自动更新机制

**用户故事**: 作为开发者，我希望应用能够自动更新，以获得最新功能和安全修复。

#### 验收标准

1. WHEN 应用启动时，THE Desktop_Client SHALL 检查是否有新版本可用
2. WHEN 发现新版本时，THE Desktop_Client SHALL 提示用户是否下载更新
3. WHEN 用户同意更新时，THE Desktop_Client SHALL 在后台下载更新包
4. WHEN 下载完成时，THE Desktop_Client SHALL 验证更新包的数字签名
5. IF 签名验证失败，THEN THE Desktop_Client SHALL 拒绝安装更新并通知用户
6. THE Desktop_Client SHALL 允许用户选择在下次启动时安装更新
7. THE Desktop_Client SHALL 在设置中提供禁用自动检查更新的选项

### 需求 29: 数据备份和恢复

**用户故事**: 作为开发者，我想要备份和恢复我的片段数据，以防止数据丢失。

#### 验收标准

1. THE Desktop_Client SHALL 提供手动备份功能
2. WHEN 用户执行备份时，THE Desktop_Client SHALL 创建包含所有片段和设置的备份文件
3. THE Desktop_Client SHALL 允许用户选择备份文件的保存位置
4. THE Desktop_Client SHALL 支持从备份文件恢复数据
5. WHEN 用户恢复备份时，THE Desktop_Client SHALL 提示用户是否覆盖现有数据或合并数据
6. THE Desktop_Client SHALL 在恢复前验证备份文件的完整性
7. IF 备份文件损坏，THEN THE Desktop_Client SHALL 拒绝恢复并显示错误信息

### 需求 30: 搜索结果排序

**用户故事**: 作为开发者，我想要自定义搜索结果的排序方式，以便按照我的偏好查看结果。

#### 验收标准

1. THE Desktop_Client SHALL 默认按相关度排序搜索结果
2. THE Desktop_Client SHALL 允许用户按创建时间排序搜索结果
3. THE Desktop_Client SHALL 允许用户按最后修改时间排序搜索结果
4. THE Desktop_Client SHALL 允许用户按访问次数排序搜索结果
5. THE Desktop_Client SHALL 允许用户按片段标题的字母顺序排序搜索结果
6. THE Desktop_Client SHALL 支持升序和降序排序
7. THE Desktop_Client SHALL 记住用户的排序偏好并在下次搜索时应用

### 需求 31: 快捷键支持

**用户故事**: 作为开发者，我想要使用键盘快捷键，以提高操作效率。

#### 验收标准

1. THE Desktop_Client SHALL 支持 Ctrl+S（或 Cmd+S）保存当前片段

## 正确性属性

### 属性 1: 片段数据完整性（不变性）

**描述**: 片段的核心属性在任何操作后都应保持一致性。

**属性**: 对于任何有效的片段操作（创建、更新、检索），片段的唯一标识符保持不变，且创建时间不会被修改。

**测试方法**: 属性测试 - 生成随机的片段操作序列，验证 ID 和创建时间的不变性。

### 属性 2: 搜索结果一致性（幂等性）

**描述**: 相同的搜索查询应该返回相同的结果（在数据未变化的情况下）。

**属性**: 对于任何搜索查询 Q，连续执行两次搜索应返回相同的结果集：search(Q) = search(Q)。

**测试方法**: 属性测试 - 生成随机搜索查询，执行多次并比较结果。

### 属性 3: 导出-导入往返一致性（往返属性）

**描述**: 导出后再导入的片段应该与原始片段等价。

**属性**: 对于任何片段 S，执行 import(export(S)) 应该产生与 S 等价的片段（内容、标题、语言相同）。

**测试方法**: 属性测试 - 生成随机片段，导出为 Markdown/JSON，再导入，验证内容一致性。这对于序列化器至关重要。

### 属性 4: 同步冲突解决的确定性（汇合性）

**描述**: 无论同步操作的顺序如何，最终状态应该一致。

**属性**: 对于两个设备 A 和 B 的变更集，sync(A, B) 和 sync(B, A) 应该产生相同的最终状态。

**测试方法**: 属性测试 - 生成不同顺序的同步操作序列，验证最终数据一致性。

### 属性 5: 标签过滤的子集关系（变形属性）

**描述**: 添加更多标签过滤条件应该返回更少或相同数量的结果。

**属性**: 对于标签集合 T1 和 T2，如果 T1 ⊂ T2，则 |filter(T2)| ≤ |filter(T1)|。

**测试方法**: 属性测试 - 生成不同的标签组合，验证结果集大小关系。

### 属性 6: 向量相似度的对称性（不变性）

**描述**: 语义搜索的相似度计算应该是对称的。

**属性**: 对于任意两个片段 A 和 B，similarity(A, B) = similarity(B, A)。

**测试方法**: 属性测试 - 生成随机片段对，验证相似度计算的对称性。

### 属性 7: 本地向量化的确定性（不变性）

**描述**: 对于相同的输入，本地嵌入服务应该生成相同的向量。

**属性**: 对于任何片段 S，多次调用 Local_Embedding_Service.embed(S) 应该产生相同的向量：embed(S) = embed(S)。

**测试方法**: 属性测试 - 生成随机片段，多次向量化并比较结果的一致性。

### 属性 8: 向量存储的往返一致性（往返属性）

**描述**: 存储和检索向量应该保持数据完整性。

**属性**: 对于任何向量 V 和片段 ID，执行 retrieve(store(ID, V)) 应该返回与 V 等价的向量。

**测试方法**: 属性测试 - 生成随机向量，存储后检索，验证向量值的一致性（考虑浮点精度）。

### 属性 9: 批量操作的原子性（不变性）

**描述**: 批量操作要么全部成功，要么全部失败（或部分失败时正确报告）。

**属性**: 对于批量删除操作，如果操作成功，所有指定的片段都应该被删除；如果失败，应该准确报告哪些片段未被删除。

**测试方法**: 属性测试 - 生成包含有效和无效片段 ID 的批量操作，验证操作结果的一致性。

### 属性 10: 缓存一致性（等价性）

**描述**: 从缓存读取的数据应该与从数据库读取的数据一致。

**属性**: 对于任何片段 ID，cache_read(ID) = db_read(ID)（在缓存有效期内）。

**测试方法**: 属性测试 - 生成随机片段访问序列，比较缓存和数据库返回的数据。

### 属性 11: 认证令牌的时效性（时间不变性）

**描述**: 过期的令牌应该被拒绝，有效的令牌应该被接受。

**属性**: 对于任何令牌 T，如果 current_time < expiry_time(T)，则 validate(T) = true；否则 validate(T) = false。

**测试方法**: 属性测试 - 生成不同过期时间的令牌，验证验证逻辑的正确性。

### 属性 12: 搜索索引的完整性（不变性）

**描述**: 所有存储的片段都应该可以被搜索到。

**属性**: 对于数据库中的任何片段 S，使用 S 的标题或内容的唯一词作为查询，应该能在搜索结果中找到 S。

**测试方法**: 属性测试 - 随机选择片段，使用其内容的关键词搜索，验证该片段出现在结果中。

### 属性 14: 数据备份的完整性（往返属性）

**描述**: 备份和恢复操作应该保持数据完整性。

**属性**: 对于任何数据集 D，restore(backup(D)) 应该产生与 D 等价的数据集。

**测试方法**: 属性测试 - 生成随机的片段集合，执行备份和恢复，验证数据一致性。

### 属性 15: 速率限制的公平性（不变性）

**描述**: 速率限制应该对所有用户公平应用。

**属性**: 对于任何用户 U，在时间窗口 T 内的请求数不应超过限制 L：count_requests(U, T) ≤ L。

**测试方法**: 属性测试 - 模拟多个用户的并发请求，验证速率限制的正确执行。

### 属性 16: 离线操作队列的顺序性（不变性）

**描述**: 离线操作应该按照发生的顺序同步到云端。

**属性**: 对于离线操作序列 [O1, O2, ..., On]，同步时应该按照相同的顺序应用：sync_order = [O1, O2, ..., On]。

**测试方法**: 属性测试 - 生成随机的离线操作序列，验证同步后的操作顺序。

### 属性 17: 错误处理的幂等性（幂等性）

**描述**: 重试失败的操作应该产生相同的结果。

**属性**: 对于任何可重试的操作 Op，retry(Op) 应该产生与 Op 相同的最终状态（如果成功）。

**测试方法**: 属性测试 - 模拟网络失败场景，验证重试机制的幂等性。

## 非功能性需求

### 可用性

1. THE Desktop_Client SHALL 提供直观的用户界面，新用户无需培训即可完成基本操作
2. THE Desktop_Client SHALL 提供上下文相关的帮助提示
3. THE Desktop_Client SHALL 支持键盘导航以提高可访问性

### 可维护性

1. THE 代码库 SHALL 遵循一致的编码规范
2. THE 代码库 SHALL 包含单元测试，测试覆盖率至少达到 80%
3. THE 代码库 SHALL 包含详细的 API 文档

### 可扩展性

1. THE Cloud_API SHALL 支持水平扩展以处理增长的用户量
2. THE Vector_Store SHALL 支持存储至少 1000 万个片段向量
3. THE 系统架构 SHALL 允许添加新的导出格式而不影响现有功能

### 兼容性

1. THE Desktop_Client SHALL 向后兼容至少两个主要版本的数据库格式
2. THE Cloud_API SHALL 维护 API 版本控制以支持旧版本客户端
3. THE 导出格式 SHALL 遵循标准规范以确保与其他工具的兼容性

### 可靠性

1. THE Desktop_Client SHALL 在崩溃后能够恢复未保存的工作
2. THE Cloud_API SHALL 实现健康检查端点以支持监控
3. THE 系统 SHALL 记录所有关键操作的审计日志

### 部署要求

1. THE Desktop_Client SHALL 提供独立的安装包，基础安装不包含嵌入模型
2. THE Desktop_Client SHALL 在首次使用语义搜索时提示下载嵌入模型
3. THE Model_Downloader SHALL 支持从 CDN 或备用服务器下载模型文件
4. THE Cloud_API SHALL 支持容器化部署（Docker）
5. THE 系统 SHALL 提供自动化部署脚本
6. THE Desktop_Client SHALL 将模型文件缓存到平台标准的用户数据目录

## 验收测试计划

### 单元测试

- 每个核心模块（Snippet_Manager、Search_Engine、Sync_Service 等）都应有独立的单元测试
- 使用属性测试框架（如 Hypothesis for Python、fast-check for TypeScript）验证正确性属性
- 测试覆盖率目标：80% 以上

### 端到端测试

- 使用自动化测试工具（如 Playwright）模拟用户操作
- 测试完整的用户工作流程：创建片段 → 搜索 → 编辑 → 导出 → 分享
- 测试离线到在线的同步场景
- 测试首次使用语义搜索时的模型下载流程

### 性能测试

- 使用 10000 个片段测试应用性能
- 测试并发用户场景（100 个并发用户）
- 测试本地语义搜索的响应时间（目标：100-200ms）
- 测试云端语义搜索的响应时间（目标：500ms）
- 测试模型加载时间和内存占用

### 安全测试

- 测试认证和授权机制
- 测试 SQL 注入和 XSS 防护
- 测试速率限制和防暴力攻击机制

## 项目里程碑

### 里程碑 1: 本地核心功能（第 1 周结束）

- 完成片段 CRUD 操作
- 完成分类和标签系统
- 完成全文搜索
- 完成语法高亮和编辑器集成
- 完成欢迎向导界面

### 里程碑 2: 智能搜索和导出（第 2 周结束）

- 完成 Markdown 和 PDF 导出
- 完成本地嵌入模型集成（all-MiniLM-L6-v2 + ONNX Runtime）
- 完成模型下载器（支持后台下载、暂停/恢复、多镜像源）
- 完成本地向量存储（SQLite）
- 完成智能搜索引擎（自动降级策略）
- 完成搜索模式指示器
- 完成短链接生成

### 里程碑 3: 云同步和分享（第 3 周结束）

- 完成用户认证系统
- 完成云端同步功能
- 完成冲突解决机制
- 完成短链接访问页面
- 完成云端语义搜索支持（作为降级选项）

### 里程碑 4: 测试和发布（第 4 周结束）

- 完成所有测试
- 完成性能优化
- 完成安装包打包
- 完成文档编写
- 发布到 GitHub 并部署演示服务

## 风险和缓解措施

### 风险 1: 本地嵌入模型性能不足

**缓解**: 使用 ONNX Runtime 优化推理性能，选择轻量级模型（multilingual-e5-small），实施向量缓存机制，提供云端语义搜索作为降级选项。

### 风险 2: 模型下载失败或速度慢

**缓解**: 提供多个 CDN 镜像源，支持暂停/恢复下载，允许用户手动下载模型文件并导入，提供轻量模式作为替代方案，在首次启动时就引导用户选择。

### 风险 3: 用户不理解搜索模式差异

**缓解**: 使用统一搜索框简化交互，自动选择最佳搜索策略，提供清晰的搜索模式指示器和说明，在欢迎向导中解释各种模式的优缺点。

### 风险 4: 跨平台模型兼容性问题

**缓解**: 使用 ONNX 格式确保跨平台兼容性，在所有目标平台上测试模型加载和推理，提供平台特定的优化版本。

### 风险 5: 同步冲突处理复杂

**缓解**: 采用简单的"最后写入获胜"策略，并提供手动解决选项。

### 风险 6: 跨平台兼容性问题

**缓解**: 在所有目标平台上进行早期测试，使用 Electron 的跨平台 API。

### 风险 7: 数据库性能瓶颈

**缓解**: 使用 SQLite FTS5 优化全文搜索，使用 SQLite 表存储向量，实施分页加载，定期优化数据库。

### 风险 8: 云服务成本超预算

**缓解**: 本地模式作为主要使用方式减少云端调用，实施有效的缓存策略，优化向量存储，监控资源使用情况。

---
