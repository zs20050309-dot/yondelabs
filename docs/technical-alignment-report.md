# YondeLabs 项目技术对齐报告

更新时间：2026-05-08
项目路径：`/Users/ben99/Desktop/Vibecoding/yondelabs_web/yondelabs-main`

## 1. 报告目的

这份文档面向后续开发、设计协作、代码 review 和项目交接使用，目标是在**不通读全部源代码**的前提下，让协作者快速掌握：

- 项目当前真实状态
- 已完成与未完成范围
- 技术栈与工程结构
- 路由、组件、样式与数据接口
- 认证与数据库依赖
- 当前风险、缺口与后续建议

本报告以**当前仓库代码事实**为准，同时对照现有 PRD / Spec / Alignment 文档，明确“计划”和“已落地”之间的差异。

## 2. 一句话结论

当前仓库是一个基于 **Next.js Pages Router + React + JavaScript + CSS Modules + Supabase Auth** 的官网/申请门户混合项目。

其中：

- **登录与学生门户相关页面已基本可运行**
- **Dashboard 已能读取 Supabase 中的 `applications` 数据并展示状态**
- **官网首页和产品页仍未真正迁移到 Next.js**
- **`/apply`、`/admin`、`verify-email`、后台状态编辑 API 等关键模块尚未实现**
- 仓库内仍保留了大量 **legacy 静态官网文件** 作为视觉与内容参考源

## 3. 项目定位与业务范围

根据 `YondeLabs_PRD.md`、`Spec.md`、`YondeLabs_Team_Alignment_Doc.md`，项目目标是把原本基于 Google Form 的申请流程升级为一个正式的学生申请平台，核心用户流为：

1. 学生访问官网
2. 点击 Apply Now
3. 注册 / 登录
4. 填写申请表
5. 在 Dashboard 查看申请状态
6. 管理员在后台更新状态

当前仓库主要落地的是其中的 **Assisi scope**：

- 认证系统
- 登录相关 UI
- 学生 Dashboard
- 一部分路由保护

Ashlyn scope 中的以下内容，在当前 Next 工程里尚未完成：

- 正式官网首页
- 四个项目详情页
- 申请表页面 `/apply`
- Navbar / Footer 共享组件

## 4. 当前实现状态总览

### 已完成或基本可用

- Next.js 工程基础可运行
- Supabase 浏览器端 client 已接入
- 登录页 `/login`
- 注册页 `/register`
- 忘记密码 `/forgot-password`
- 重置密码 `/reset-password`
- 邮件回调 `/auth/callback`
- 学生 Dashboard `/dashboard`
- 受保护路由的重定向逻辑
- 登录门户的大部分视觉设计和响应式样式
- 申请状态展示组件
- 申请摘要展示组件

### 未完成或仅在文档中定义

- 正式官网首页 `pages/index.js` 目前只是 Coming Soon
- `/apply` 页面不存在
- `/admin` 页面不存在
- `pages/verify-email.jsx` 不存在
- `pages/api/admin/update-status.js` 不存在
- 产品页 `/ra` `/irp` `/passion-project` `/isef` 不存在
- Navbar / Footer 共享组件不存在
- Admin 数据读写流程未落地
- 申请表写入 `applications` 的 Ashlyn 对接部分未落地

## 5. 技术栈与工程约束

### 运行时与框架

- **Next.js** `16.2.4`
- **React** `19.2.4`
- **React DOM** `19.2.4`
- 路由模式：**Pages Router**

### 语言与样式

- 语言：**JavaScript / JSX**
- 未使用 TypeScript
- 样式方案：**CSS Modules + globals.css**
- 未使用 Tailwind、styled-components、UI 框架

### 认证与后端依赖

- `@supabase/supabase-js`
- `@supabase/auth-helpers-nextjs`
- `@supabase/ssr` 已安装，但当前代码主流程未明显依赖其能力

### 依赖策略

当前依赖非常克制，适合继续保持轻量。若后续新增库，需要特别评估：

- 是否真的解决当前工程痛点
- 是否会破坏“纯 JS + CSS Modules”的协作约定
- 是否会增加 Ashlyn / Assisi 之间的接入复杂度

## 6. 目录结构与职责划分

### 6.1 当前关键目录

```text
yondelabs-main/
├── pages/                  Next 页面路由
├── components/portal/      登录门户与 dashboard 相关复用组件
├── lib/                    Supabase client
├── styles/                 CSS Modules 与全局 token
├── public/images/          当前 Next 应用实际使用的图片资源
├── docs/                   对齐文档与上下文文档
├── index.html              legacy 静态官网参考
├── research-website-*.css/js  legacy 官网样式与脚本参考
├── YondeLabs_PRD.md
├── Spec.md
├── YondeLabs_Team_Alignment_Doc.md
└── progress.md
```

### 6.2 两套前端并存

当前仓库存在两套并行内容，必须区分：

1. **Next.js 应用主线**
   - 真正运行中的项目
   - 登录门户与 dashboard 在这里实现

2. **Legacy 静态官网参考**
   - `index.html`
   - `research-website-styles.css`
   - `research-website-script.js`
   - `Lumiere Education.html` 及相关资源
   - 主要用于参考视觉风格、文案组织与内容结构

结论：**不要把 legacy 文件误认为当前线上逻辑主入口。**

## 7. 页面与路由现状

### 已存在页面

| 路由 | 文件 | 现状 |
|---|---|---|
| `/` | `pages/index.js` | 仅占位页，非正式官网 |
| `/login` | `pages/login.jsx` | 已实现 |
| `/register` | `pages/register.jsx` | 已实现 |
| `/forgot-password` | `pages/forgot-password.jsx` | 已实现 |
| `/reset-password` | `pages/reset-password.jsx` | 已实现 |
| `/auth/callback` | `pages/auth/callback.jsx` | 已实现 |
| `/dashboard` | `pages/dashboard.jsx` | 已实现 |

### 文档中存在但代码未实现

| 路由 | 文档来源 | 当前状态 |
|---|---|---|
| `/apply` | PRD / Spec | 未实现 |
| `/admin` | PRD / Spec | 未实现 |
| `/verify-email` | Spec | 未实现 |
| `/ra` `/irp` `/passion-project` `/isef` | Team Alignment / Spec | 未实现 |

## 8. 认证与会话流

### 8.1 浏览器端 Supabase client

文件：`lib/supabaseClient.js`

当前做法：

- 使用 `createBrowserClient(...)`
- 依赖环境变量：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 启动时做了缺失校验，若未配置会直接抛错

这部分实现清晰，适合作为前端统一 client 入口继续复用。

### 8.2 登录流程

文件：`pages/login.jsx`

核心行为：

- 使用 `supabase.auth.signInWithPassword`
- 对 `email not confirmed` 做专门提示
- 其他失败提示统一为通用错误文案
- 成功后根据 `user_metadata.role` 跳转：
  - `admin` -> `/admin`
  - 其他 -> `/dashboard`

附加行为：

- 读取 `registered=true` 查询参数，展示注册成功提示
- 读取 `message` 查询参数，展示页面级 info banner

### 8.3 注册流程

文件：`pages/register.jsx`

核心行为：

- 前端校验密码长度 `>= 8`
- 校验确认密码一致
- `supabase.auth.signUp(...)`
- `emailRedirectTo` 指向 `/auth/callback`
- 注册时写入 `user_metadata.role = 'student'`
- 成功后跳转 `/login?registered=true`

### 8.4 忘记密码 / 重置密码

文件：

- `pages/forgot-password.jsx`
- `pages/reset-password.jsx`

核心行为：

- 忘记密码页通过 `resetPasswordForEmail(...)` 发送邮件
- 回跳地址为 `/auth/callback?type=recovery`
- 重置密码页通过 `supabase.auth.updateUser({ password })` 更新密码

### 8.5 回调页

文件：`pages/auth/callback.jsx`

当前兼容两种回调场景：

1. URL hash 中携带 `access_token` / `refresh_token`
2. URL query 中携带 `code`

成功后跳转：

- `type=recovery` -> `/reset-password`
- 其他 -> `/dashboard`

失败时跳回：

- `/login?message=Verification+link+expired...`

### 8.6 路由保护

文件：`proxy.js`

当前受保护路由：

- `/dashboard`
- `/apply`
- `/admin`

当前认证页面：

- `/login`
- `/register`

当前逻辑：

- 未登录访问受保护路由 -> 重定向到 `/login`
- 已登录访问 `/login` 或 `/register` -> 重定向到 `/dashboard`
- 已登录但非 admin 访问 `/admin` -> 重定向到 `/dashboard`

说明：

- 虽然 `/apply` 和 `/admin` 页面尚未存在，但保护规则已经预留
- 当前项目使用的是 `proxy.js` 命名，而不是文档中的 `middleware.js`
- 这是后续交接时必须特别说明的一个实现差异

## 9. Dashboard 与数据读取

文件：`pages/dashboard.jsx`

### 当前数据流

1. `supabase.auth.getUser()` 获取当前用户
2. 若无用户，跳回 `/login`
3. 从 `applications` 表读取当前用户最新一条申请记录：
   - `.eq('user_id', u.id)`
   - `.order('submitted_at', { ascending: false })`
   - `.limit(1)`
   - `.maybeSingle()`

### 页面状态

- `loading`
- `fetchError`
- `application == null` 的空状态
- `application != null` 的正常展示状态

### 已实现展示内容

- 顶部 header
- 用户问候语
- 登出按钮
- Hero 区块
- `StatusTracker`
- `ApplicationSummary`
- 申请 ID 简化展示

### 空状态逻辑

若用户已登录但未查到申请记录：

- 展示空态卡片
- CTA 指向 `/apply`

注意：**该 CTA 现在会跳到一个尚未实现的页面。**

## 10. 数据模型与接口契约

### 10.1 当前代码依赖的数据表

唯一明确使用到的业务表：

- `applications`

### 10.2 代码与文档共同指向的数据字段

根据 `dashboard.jsx`、`ApplicationSummary.jsx`、PRD 与 Spec，可推断当前前后端契约为：

```js
{
  id: string,
  user_id: string,
  program: 'ra' | 'irp' | 'passion-project' | 'isef',
  status: 'submitted' | 'interview' | 'offer' | 'rejected',
  submitted_at: string,
  form_data: {
    cohort?: string,
    email?: string,
    preferred_name?: string,
    full_name?: string,
    ...
  }
}
```

### 10.3 当前前端实际消费的字段

#### `StatusTracker`

消费：

- `application.status`

支持状态值：

- `submitted`
- `interview`
- `offer`
- `rejected`

#### `ApplicationSummary`

消费：

- `application.program`
- `application.submitted_at`
- `application.form_data.cohort`
- `application.form_data.email`

#### Dashboard Header

消费：

- `user.user_metadata.preferred_name`
- `user.email`

### 10.4 已定义但未实现的后续接口

根据文档，后续仍需实现：

- 申请表提交写入 `applications`
- 管理后台读取所有 `applications`
- 管理后台更新 `status`
- 可能新增 admin 专用 API route

## 11. 核心组件说明

### `components/portal/AuthCard.jsx`

作用：

- 登录门户壳组件
- 左侧品牌故事，右侧表单卡片
- 提供一致的视觉框架给 login/register/forgot/reset 页面

主要结构：

- 左侧 logo
- Applicant Portal pill
- 大标题与品牌文案
- 合作机构 marquee
- 右侧 form card
- 右侧 YondeLabs logo
- 表单标题、副标题与 children slot

特点：

- 已内置多个大学 logo 资源
- 通过三倍数组实现无缝滚动
- 是当前 login portal 视觉的中心组件

### `components/portal/PasswordInput.jsx`

作用：

- 统一密码输入 UI
- 内置 show / hide 切换
- 支持 `label`、`hint`、`extra` 等可复用能力

价值：

- 消除了 login / register / reset-password 中的重复密码 UI 代码

### `components/portal/StatusTracker.jsx`

作用：

- 展示申请状态进度

当前 stage 定义：

- `submitted`
- `interview`
- `offer`

特殊状态：

- `rejected`

特点：

- 桌面端横向 stepper
- 移动端纵向 stepper
- 对 rejected 使用单独 message box，而非直接显示“Rejected”

### `components/portal/ApplicationSummary.jsx`

作用：

- 只读展示申请摘要

当前 program 映射：

- `ra` -> `Research Scholar Program`
- `irp` -> `Independent Research Program`
- `passion-project` -> `Passion Project`
- `isef` -> `ISEF Coaching`

## 12. 样式系统与设计实现

### 12.1 全局 token

文件：`styles/globals.css`

当前全局色值包括：

- `--color-navy-deepest`
- `--color-navy-primary`
- `--color-blue-medium`
- `--color-cyan-bright`
- `--color-white`
- `--color-gray-light`
- `--color-gray`
- `--color-text-dark`
- `--gradient-hero`
- `--gradient-cta`

### 12.2 登录门户样式中心

文件：`styles/portal.module.css`

作用范围：

- 整个 auth portal 的布局、表单、品牌视觉、marquee、响应式

当前视觉特征：

- 全屏背景图 + 深蓝 overlay
- 左右双栏
- 左侧沉浸式品牌文案
- 右侧玻璃感 form card
- 大学 logo 横向滚动
- Inter 字体体系

### 12.3 Dashboard 样式

文件：

- `styles/dashboard.module.css`
- `styles/statusTracker.module.css`
- `styles/applicationSummary.module.css`

特征：

- 与登录页保持同色系
- 结构优先于装饰
- 已有移动端适配

## 13. 图片与静态资源

当前 Next 应用主要使用：

- `/public/images/hero1.jpg`
- `/public/images/hero2.jpg`
- `/public/images/logos/yondelabs-logo.svg`
- `/public/images/logos/yondelabs-white.svg`
- `/public/images/uni-logos/*`
- `/public/images/lab-logos/*`

说明：

- `public/images` 是 Next 实际资源目录
- 根目录下另有 `images/`，内容与 `public/images/` 高度重复，更像迁移残留或参考副本
- 后续最好统一静态资源来源，减少重复维护

## 14. 文档体系现状

当前与项目相关的主要文档包括：

- `YondeLabs_PRD.md`
- `Spec.md`
- `YondeLabs_Team_Alignment_Doc.md`
- `docs/ai-context/login-website-context-alignment.md`
- `yondelabs_login_ui_spec.md`
- `progress.md`

它们的角色分别更像：

- **PRD**：业务目标与功能范围
- **Spec**：技术实现设想
- **Team Alignment**：角色协作约束
- **AI Context / UI Spec**：给协作者或 AI 的局部上下文
- **Progress**：开发轨迹日志

目前缺的不是“文档数量”，而是一个以**当前代码实际状态为中心**的统一说明，本报告就是为了补这一层。

## 15. 当前进度判断

如果把整体项目拆成四块，当前成熟度大致如下：

| 模块 | 状态 | 备注 |
|---|---|---|
| 登录/注册/密码找回 | 80% | 主流程可用，缺 resend verify 等增强项 |
| 邮件回调与会话衔接 | 75% | 主流程可用，边界场景待补充验证 |
| 学生 Dashboard | 70% | 查询与展示已实现，但依赖 `/apply` 完成整体闭环 |
| 官网与产品页 | 10% | Next 首页仍为占位，主体内容还在 legacy 参考层 |
| 申请表 `/apply` | 0% | 未实现 |
| Admin 后台 | 0% | 未实现 |

## 16. 代码与文档的关键偏差

这些偏差是后续开发和 review 时最容易踩坑的地方：

### 1. 文档说有正式官网结构，但代码里没有

- 文档已规划首页和多个项目页
- 实际 Next 项目只有占位首页

### 2. 文档说有 `/admin`，但代码里没有页面实现

- 登录逻辑和路由保护已预留 admin 分支
- 但实际 admin UI 与数据更新流程不存在

### 3. 文档说有 `/apply`，但代码里没有

- Dashboard 空状态 CTA 已指向 `/apply`
- 当前会跳到未实现页面

### 4. 文档写 `middleware.js`，代码实际为 `proxy.js`

- 接手人如果只看 Spec，会找错文件

### 5. 文档提到 `verify-email.jsx`

- 代码中当前实际依赖的是 `/auth/callback`
- `verify-email.jsx` 并未实现

## 17. 当前风险与技术债

### 高优先级风险

1. **主业务闭环未打通**
   - 注册 -> 登录 -> Dashboard 可运行
   - 但 Apply 与 Admin 缺失，导致整个平台还不是可交付 MVP

2. **首页仍是占位页**
   - 官网入口尚未迁移到 Next 主线
   - 这会影响真实用户入口和品牌一致性

3. **静态资源重复**
   - `images/` 与 `public/images/` 并存
   - 后续容易出现引用不一致

4. **文档与代码命名偏差**
   - `middleware.js` vs `proxy.js`
   - 会增加新成员理解成本

### 中优先级风险

1. **Admin service role 方案未落地**
   - `.env.local` 中已预留服务端 key 的使用场景
   - 但当前代码并没有真正实现服务端 admin 操作链路

2. **状态模型仍偏简化**
   - 当前只有 4 个状态值
   - 如果后续录取流程变复杂，可能需要扩展状态机与 UI 表达

3. **目前缺少自动化测试**
   - 当前验证主要依赖 build 与手工 smoke check
   - 没有单测、集成测试或 e2e

## 18. 推荐后续开发顺序

建议按下面顺序推进，收益最大，也最接近 MVP：

1. **实现 `/apply`**
   - 先把学生申请提交流打通
   - 确保能正确写入 `applications`

2. **实现正式首页与产品页**
   - 把 legacy 官网内容迁移到 Next
   - 至少先完成首页 + 一个主 program 页

3. **实现 `/admin`**
   - 最少先做列表 + 状态编辑
   - 让运营能推动真实申请流

4. **补文档与文件命名对齐**
   - 统一 `proxy.js` / `middleware.js` 说明
   - 明确最终页面清单

5. **补测试与验收脚本**
   - 最少覆盖 auth 流、dashboard 空态、dashboard 已提交态

## 19. 给后续开发者的最小阅读顺序

如果要最快上手，不需要先看完整仓库，建议按这个顺序：

1. `docs/technical-alignment-report.md`
2. `progress.md`
3. `YondeLabs_PRD.md`
4. `pages/login.jsx`
5. `pages/register.jsx`
6. `pages/auth/callback.jsx`
7. `pages/dashboard.jsx`
8. `components/portal/AuthCard.jsx`
9. `styles/portal.module.css`
10. `proxy.js`

## 20. 结论

这个项目当前最扎实的部分是 **登录门户 UI 和学生侧认证基础流**，最欠缺的部分是 **官网主站迁移、申请表闭环和 admin 后台**。

换句话说，项目已经有了一条像样的“门”，也有一个能显示申请状态的“房间”，但真正的“官网入口”、“申请填写过程”和“招生运营后台”还没有完全建好。后续开发和 review 应优先围绕这三块展开。
