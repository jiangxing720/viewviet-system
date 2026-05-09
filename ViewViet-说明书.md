# ViewViet 平台功能说明书

> 专为在越华人与跨境旅行者打造的一站式内容平台  
> 技术栈：React + Vite 前端 / Express API 后端 / PostgreSQL 数据库

---

## 一、平台概览

ViewViet 是一个面向在越南及东南亚生活的华人社群的综合性内容平台，整合了**语言学习、出行攻略、法律资讯、律师目录**和**社区活动**五大核心模块，同时提供完整的**后台管理系统**。

- 前端地址：`/`（Vite 开发服务器，端口 20108）
- API 地址：`/api`（Express 服务器，端口 8080）
- 数据库：PostgreSQL（通过 `DATABASE_URL` 环境变量连接）
- 界面语言：支持 **中文 / English / Tiếng Việt** 三语切换

---

## 二、公开页面功能

### 2.1 首页（`/`）

首页整合了平台所有核心模块的精华内容，包括：

| 区域 | 内容 |
|------|------|
| Hero 横幅 | 全屏背景图、品牌 Slogan、"开始学习" / "浏览攻略" 快捷按钮 |
| 快速入口模块 | 越南语学习 / 出行攻略 / 法律中心 / 社区活动 四格入口 |
| 精选攻略 | 最多展示 3 篇精选旅行攻略卡片 |
| 法律资讯 | 最多展示 4 篇精选法律文章（含封面图、摘要） |
| 推荐律师 | 最多展示 3 位精选律师卡片（含专业领域、联系方式） |
| 近期活动 | 最多展示 4 条近期社区活动（含时间、地点） |
| CTA 号召区 | 底部引导用户免费注册 / 开始学习 |

---

### 2.2 语言学习（`/learn`）

#### 语言选择中心（`/learn`）
展示四种学习语言的入口卡片：越南语、英语、中文、韩语。

---

#### 词汇页（`/learn/:lang/words`）

- **分类侧边栏**：桌面端显示全部词汇分类列表（如：日常用语、餐饮、交通等）；移动端点击筛选按钮打开抽屉侧栏
- **关键词搜索**：实时按词汇名称搜索
- **词汇卡片**：每张卡片包含：
  - 词汇原文 + 发音标注
  - 中文 / 英文 / 越文 三语释义
  - 点击 🔊 按钮可**朗读词汇**（Web Speech API TTS）
  - 例句区域：例句 + 例句翻译，例句也可单独点击 🔊 **朗读**
  - 难度星级（1–5 星）
  - 所属分类标签
- **分页**：每页 20 条，支持上一页 / 下一页
- **快速切换**：顶部导航可跳转至情景会话 / 复杂句型页面

---

#### 情景会话（`/learn/:lang/scenes`）

- **场景 Tab 切换**：水平滚动的场景标签（餐厅、机场、超市等），移动端可横向滑动
- **KTV 卡拉OK 朗读效果**：点击每条句子右侧的 🔊 按钮，播放 TTS 语音的同时，句子中**当前正在朗读的词汇**会以金色背景实时高亮，逐词推进
- **句子卡片**：
  - 原文（大号字体）+ 发音标注
  - 中文 / 英文 / 越文 三语翻译
  - 场景标签 + 难度标签

---

#### 复杂句型（`/learn/:lang/complex`）

- **难度筛选**：按难度 1–5 级筛选，或选"全部"
- **KTV 朗读高亮**：同情景会话，播放时逐词金色高亮
- **语法说明区**：每条句子底部可展示语法注释（蓝色背景区域）
- **语境标签**：标注句子适用场景（如：商务、日常等）

---

### 2.3 出行攻略（`/guides`）

- **精选 Banner 轮播**：顶部全宽图片轮播，展示精选攻略，可点击圆点切换
- **分类筛选**：美食 / 文化 / 户外 / 夜生活 / 购物 / 咖啡 / 住宿，水平滚动（移动端友好）
- **国家筛选**：下拉选择越南、中国、东南亚
- **关键词搜索**：按攻略标题搜索
- **攻略卡片**：封面图 + 城市/国家 + 标题 + 分类标签 + 浏览量
- **攻略详情页**（`/guides/:id`）：全文渲染（支持 Markdown）、封面大图、作者信息、阅读时间
- **分页**：每页 12 条

---

### 2.4 法律资讯（`/legal`）

- **分类侧边栏**（桌面端）：劳动法 / 公司注册 / 知识产权 / 税务 / FDI投资 / 房地产 / 移民签证 / 刑事，每类显示文章数量
- **国家筛选**（侧边栏）：越南 / 东南亚 / 中国
- **移动端水平滚动分类 Tab**
- **精选文章区**：在无筛选状态下，首页展示最多 2 篇精选文章（大图卡片）
- **文章列表**：封面图 + 分类标签 + 国家标签 + 标题 + 摘要 + 浏览量
- **文章详情**（`/legal/:slug`）：
  - 全文 Markdown 渲染
  - 右侧：相关文章推荐、"寻找律师" CTA 模块
- **分页**：每页 10 条

---

### 2.5 律师目录（`/lawyers`）

- **三栏筛选**：按姓名搜索 + 国家下拉 + 城市下拉
- **律师卡片**：头像 / 姓名（中英文）/ 职称 / 律所 / 城市 / 简介 / 专业领域标签 / 语言标签 / 联系方式图标（邮件 / 电话 / WhatsApp）/ 联系按钮
- **"精选"徽章**：精选律师显示 Featured 标记

---

### 2.6 社区活动（`/community`）

- **分类 Tab 筛选**：文化 / 户外 / 商务 / 美食 / 语言交流 / 志愿者，水平滚动
- **"仅显示近期"开关**：勾选后只显示尚未结束的活动
- **活动卡片**：封面图 + 分类 + 标题 + 时间 + 地点 + 名额（当前参与者 / 最大名额）
- **活动详情**（`/community/:id`）：全文介绍 + 主办方信息 + 报名按钮

---

## 三、用户认证

| 页面 | 路径 | 说明 |
|------|------|------|
| 用户登录 | `/login` | 邮箱 + 密码登录 |
| 用户注册 | `/register` | 邮箱 / 用户名 / 密码注册 |
| 管理员登录 | `/admin/login` | 独立后台登录入口 |

**当前管理员账号：**
- 邮箱：`admin@viewviet.com`
- 密码：`admin123`

---

## 四、后台管理系统（`/admin`）

访问管理后台需先在 `/admin/login` 登录。顶部导航栏显示所有管理模块快捷链接。

---

### 4.1 控制台（`/admin`）

- 数据统计卡片：词汇总数 / 文章总数 / 攻略总数 / 律师总数 / 活动总数 / 待审核活动数
- 内容分布柱状图
- 最近内容列表

---

### 4.2 词汇管理（`/admin/words`）

三个标签页：

**列表 Tab**
- 按语言切换（越南语 / 英语 / 中文 / 韩语）
- 按关键词搜索
- 表格显示所有词汇：词 / 语言 / 分类 / 难度 / 发布状态
- 每行支持**编辑**（铅笔图标弹出编辑对话框）和**删除**操作
- 分页：每页 20 条

**新增 Tab**
- 表单字段：词汇 / 语言 / 发音 / 中文含义 / 英文含义 / 越文含义 / 分类 / 例句 / 例句翻译 / 难度（1–5）/ 是否发布
- 提交后自动刷新列表

**批量上传 Tab（CSV）**
- CSV 格式：`word, languageCode, pronunciation, meaningZh, meaningEn, meaningVi, category, difficulty, isPublished`
- 提供示例数据可一键填入
- 上传后显示成功条数 + 错误明细

---

### 4.3 句子管理（`/admin/sentences`）

两个标签页，均支持 **CSV 批量上传**：

**情景句子 Tab**
- CSV 必填列：`sentence`（句子）、`sceneName`（场景名）
- 可选列：`languageCode, pronunciation, translationZh, translationEn, translationVi, difficulty, isPublished`
- API 端点：`POST /api/admin/scene-sentences/bulk`

**复杂句型 Tab**
- CSV 必填列：`sentence`
- 可选列：`languageCode, pronunciation, translationZh, translationEn, translationVi, grammarNotes, context, difficulty, isPublished`
- API 端点：`POST /api/admin/complex-sentences/bulk`

两个 Tab 均提供：
- 示例 CSV 数据（点击"填入示例数据"按钮）
- 上传结果：成功条数 + 逐行错误报告

---

### 4.4 法律文章管理（`/admin/legal`）

- **文章列表**：搜索、分页，每行显示标题 / 分类 / 国家 / 发布状态 / 精选状态
- **编辑 / 新增表单**字段：
  - 标题（自动生成 Slug）
  - Slug（URL 路径，可手动修改）
  - 封面图 URL
  - 分类（下拉选择，8 种类别）
  - **"自动识别分类"按钮**（✨ 闪光图标）：根据标题、摘要、正文的关键词自动匹配最合适的分类
  - 国家（下拉选择，8 个国家/地区）
  - 摘要（简短描述，用于卡片展示）
  - 正文（Markdown 格式，支持标题 / 加粗 / 斜体 / 列表 / 链接）
  - 预览按钮：弹窗展示正文渲染效果
  - 是否发布 / 是否精选 复选框

**自动分类关键词映射：**

| 分类 | 关键词示例 |
|------|-----------|
| 劳动法 | 劳动、合同、工资、员工、雇佣、工伤 |
| 公司注册 | 注册、公司、企业、章程、营业执照 |
| 知识产权 | 专利、商标、版权、著作权 |
| 税务 | 税、VAT、报税、增值税、发票 |
| FDI/投资 | 投资、FDI、外资、股权、合资 |
| 房地产 | 购房、租赁、土地、产权、不动产 |
| 移民签证 | 签证、居留、工作许可、入境 |
| 刑事 | 犯罪、逮捕、刑法、诈骗 |

---

### 4.5 攻略管理（`/admin/guides`）

- 搜索 + 列表 + 分页
- 新增 / 编辑表单：标题 / Slug / 封面图 / 摘要 / 正文（Markdown）/ 城市 / 国家 / 分类 / 预计阅读时长 / 是否发布 / 是否精选

---

### 4.6 律师管理（`/admin/lawyers`）

- 律师列表，支持搜索
- 新增 / 编辑字段：姓名（中/英）/ 职称 / 律所 / 头像 URL / 简介 / 城市 / 国家 / 邮箱 / 电话 / WhatsApp / 专业领域（多选）/ 语言（多选）/ 是否精选

---

### 4.7 活动管理（`/admin/activities`）

- 活动列表：显示标题 / 状态（pending / approved / rejected）
- **审核功能**：对待审核活动点击"通过"或"拒绝"
- 新增 / 编辑：标题 / 描述 / 分类 / 地点 / 开始时间 / 结束时间 / 最大名额 / 封面图 / 主办方 / 是否精选

---

## 五、界面与交互特性

### 5.1 多语言（i18n）
- 顶部导航右侧点击地球图标下拉切换语言：**中文 / EN / VI**
- 语言偏好存储于浏览器 `localStorage`（键名：`vv-lang`）
- 切换后全站所有页面文字（导航、按钮、标签、提示）即时刷新，无需重载

### 5.2 深色 / 浅色主题
- 顶部导航栏右侧太阳/月亮图标切换
- 主题偏好持久化存储

### 5.3 TTS 语音朗读
- 词汇卡片：词汇本身 + 例句各有独立朗读按钮
- 情景句子 / 复杂句型：点击 🔊 按钮播放 TTS，同时触发 KTV 高亮效果
- 底层使用浏览器原生 `window.speechSynthesis` API，无需外部服务
- 各语言对应：越南语 `vi-VN` / 英语 `en-US` / 中文 `zh-CN` / 韩语 `ko-KR`

### 5.4 KTV 卡拉OK 高亮
- 情景会话和复杂句型页面的 TTS 播放时，当前朗读的词语以**金色背景 + 轻微放大**效果高亮
- 利用 `SpeechSynthesisUtterance.onboundary` 事件实时追踪字符位置
- 中文等 CJK 字符按单字拆分高亮，拉丁语言按空格分词高亮

### 5.5 移动端适配
- 词汇分类：移动端隐藏侧边栏，改为顶部筛选按钮弹出 Sheet 抽屉
- 场景 Tab / 难度 Tab：移动端水平可滚动，不折行
- 分类筛选（法律、社区、攻略）：移动端水平滚动 pill 胶囊
- 律师 / 攻略 / 社区页面：响应式网格（1列→2列→3列）
- 整体响应式断点：`sm`（640px）/ `md`（768px）/ `lg`（1024px）

---

## 六、数据库表结构（简述）

| 表名 | 字段概述 |
|------|----------|
| `words` | id, word, languageCode, pronunciation, meaningZh/En/Vi, category, exampleSentence, exampleTranslation, difficulty, isPublished |
| `scene_sentences` | id, sentence, languageCode, sceneName, pronunciation, translationZh/En/Vi, difficulty, isPublished |
| `complex_sentences` | id, sentence, languageCode, pronunciation, translationZh/En/Vi, grammarNotes, context, difficulty, isPublished |
| `legal_articles` | id, title, slug, summary, content, category, country, coverImage, viewCount, isPublished, isFeatured |
| `travel_guides` | id, title, slug, summary, content, category, city, country, coverImage, viewCount, budgetRange, readingTime, isPublished, isFeatured |
| `lawyers` | id, name, nameEn, title, lawFirm, bio, city, country, email, phone, whatsapp, photo, specialties[], languages[], isFeatured |
| `activities` | id, title, description, category, location, startTime, endTime, maxParticipants, currentParticipants, organizer, coverImage, status, isFeatured |
| `users` | id, email, username, passwordHash, displayName, role |

---

## 七、API 端点速查

### 公开端点
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/words` | 词汇列表（支持 language_code, category, search, page, limit） |
| GET | `/api/words/categories` | 词汇分类列表 |
| GET | `/api/scene-sentences` | 情景句子（支持 language_code, scene_name） |
| GET | `/api/scene-sentences/scene-names` | 场景名称列表 |
| GET | `/api/complex-sentences` | 复杂句型（支持 language_code, difficulty） |
| GET | `/api/legal-articles` | 法律文章列表 |
| GET | `/api/legal-articles/featured` | 精选法律文章 |
| GET | `/api/legal-articles/:slug` | 文章详情 |
| GET | `/api/travel-guides` | 攻略列表 |
| GET | `/api/travel-guides/featured` | 精选攻略 |
| GET | `/api/lawyers` | 律师列表 |
| GET | `/api/lawyers/featured` | 精选律师 |
| GET | `/api/activities` | 活动列表 |

### 管理端点（需登录）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/words` | 新增词汇 |
| POST | `/api/admin/words/bulk` | 批量上传词汇（CSV 解析后 JSON） |
| PUT | `/api/admin/words/:id` | 更新词汇 |
| DELETE | `/api/admin/words/:id` | 删除词汇 |
| POST | `/api/admin/scene-sentences` | 新增情景句子 |
| POST | `/api/admin/scene-sentences/bulk` | 批量上传情景句子 |
| POST | `/api/admin/complex-sentences` | 新增复杂句型 |
| POST | `/api/admin/complex-sentences/bulk` | 批量上传复杂句型 |
| POST/PUT/DELETE | `/api/admin/legal-articles` | 法律文章 CRUD |
| POST/PUT/DELETE | `/api/admin/travel-guides` | 攻略 CRUD |
| POST/PUT/DELETE | `/api/admin/lawyers` | 律师 CRUD |
| POST/PUT/DELETE | `/api/admin/activities` | 活动 CRUD |
| POST | `/api/admin/activities/:id/approve` | 审核通过活动 |
| POST | `/api/admin/activities/:id/reject` | 拒绝活动 |

---

## 八、品牌规范

| 要素 | 规格 |
|------|------|
| 主色（Primary） | 茶绿色 `#0D7377` |
| 强调色（Accent） | 金色 `#F2A900` |
| 字体 | 系统默认无衬线字体 |
| UI 组件库 | shadcn/ui（基于 Radix UI + Tailwind CSS） |
| 界面语言原则 | 中文为主要内容语言，面向华人用户 |
| 图标库 | lucide-react |

---

*文档生成日期：2026年5月9日*  
*平台版本：ViewViet v1.0*
