# YondeLabs 登录页与官网风格对齐文档（给其他 AI 的上下文包）

更新时间：2026-05-06  
项目路径：`/Users/ben99/Desktop/Vibecoding/yondelabs_web/yondelabs-main`

## 1. 目标与用途
这份文档用于在和其他 AI 协作时，快速对齐本项目的前端上下文，避免因上下文窗口不足导致风格漂移或改错文件。  
聚焦范围：
- 官网参考风格（legacy static website）
- 登录门户（Login/Register/Forgot/Reset）前端实现

## 2. 项目架构分区（非常重要）
当前项目存在两套并行前端：

1. Next.js 应用（当前开发主线）
- 框架：Next.js Pages Router（`pages/`）
- 技术：JavaScript + CSS Modules（不使用 TypeScript）
- 认证：Supabase
- 登录门户在这里实现

2. Legacy 静态官网（视觉/文案参考源）
- `index.html`
- `research-website-styles.css`
- `research-website-script.js`
- `Lumiere Education.html` 与 `Lumiere Education_files/`（历史参考素材）
- 这套不是当前 Next 运行主入口，但其视觉语言是登录页的重要参考来源

## 3. 当前运行入口与关键路由
Next 运行入口：
- `pages/_app.js`
- `pages/_document.js`

登录门户核心路由：
- `pages/login.jsx`
- `pages/register.jsx`
- `pages/forgot-password.jsx`
- `pages/reset-password.jsx`
- `pages/auth/callback.jsx`

其他相关：
- `pages/dashboard.jsx`（登录后去向之一）
- `pages/index.js` 当前是 `Coming Soon` 占位页，不是正式官网内容页

## 4. 登录门户组件分层
### 4.1 页面层（page）
- `login/register/forgot-password/reset-password` 页面只组织业务逻辑和表单流程

### 4.2 复用组件层（portal）
- `components/portal/AuthCard.jsx`  
  左右分栏壳组件：左侧品牌叙事，右侧表单容器
- `components/portal/PasswordInput.jsx`  
  密码输入框复用组件（含眼睛显隐切换）
- `components/portal/StatusTracker.jsx`
- `components/portal/ApplicationSummary.jsx`

### 4.3 样式层
- `styles/portal.module.css`：登录门户主视觉（本次重点）
- `styles/dashboard.module.css`
- `styles/statusTracker.module.css`
- `styles/applicationSummary.module.css`
- `styles/globals.css`：全局 token

## 5. 技术与改动约束（给其他 AI 的硬约束）
- 仅 JavaScript（`.js/.jsx`），不要引入 TypeScript
- 不新增 npm 包（除非明确要求）
- 优先沿用现有组件结构与 class 命名
- 登录 UI 优化优先改：
  - `components/portal/AuthCard.jsx`
  - `components/portal/PasswordInput.jsx`
  - `styles/portal.module.css`
- 如果仅视觉改动，优先只动 CSS

## 6. 视觉语言总纲（官网参考 + 登录落地）
## 6.1 色彩体系来源
来源文件：
- `styles/globals.css`
- `COLOR_SCHEME.txt`
- `COLOR_SCHEME_v2.txt`

核心色（当前项目高频）：
- 深蓝：`#03256C`
- 主蓝：`#2541B2`
- 中蓝：`#3266A6`
- 亮青：`#06BEE1`
- 正文深灰：`#1A1A1A`
- 白：`#FFFFFF`

常用渐变：
- Hero/login 左侧背景梯度：深蓝 -> 主蓝 -> 青蓝（含 overlay）
- CTA：主蓝到中蓝或亮青方向的线性渐变

## 6.2 字体策略
- 登录门户主字体：`Inter, sans-serif`
- legacy 官网引入：`Inter` + `Noto Sans SC`
- 当前登录门户没有引入新的字体家族，不建议新增

## 6.3 版式与气质关键词
- 左侧：沉浸式品牌叙事（深色背景、科技网格、机构背书）
- 右侧：高可读、低噪音的表单交互区
- 关键词：权威、专业、克制、可信

## 7. 登录页关键样式锚点（供 AI 精准定位）
以下 class 集中在 `styles/portal.module.css`：

左侧品牌区：
- `.leftPanel`
- `.leftContent`
- `.leftTop`
- `.leftMid`
- `.leftFoot`
- `.lpLogo`, `.lpLogoImg`, `.lpLogoFallback`, `.lpLogoIcon`, `.lpLogoName`
- `.portalPill`, `.portalDot`, `.portalLabel`
- `.leftTitle`, `.leftTitleAccent`, `.leftDesc`
- `.marqueeWrapper`, `.marqueeTrack`, `.marqueeItem`, `.marqueeText`

右侧表单区：
- `.rightPanel`
- `.formEyebrow`
- `.heading`
- `.subtext`
- `.form`, `.inputGroup`, `.labelRow`, `.label`
- `.input`, `.inputWrapper`, `.eyeButton`, `.inputHint`
- `.submitButton`
- `.errorMessage`, `.infoBanner`, `.successBanner`

响应式：
- `@media (max-width: 768px)` 下会覆盖标题尺寸并隐藏部分左侧内容

## 8. 交互与行为规范（登录门户）
- 登录：
  - Supabase `signInWithPassword`
  - 未验证邮箱时展示专门提示
- 注册：
  - 密码长度 >= 8
  - 二次确认一致
  - 注册成功后跳转 `/login?registered=true`
- 忘记密码：
  - 发送重置邮件，回调到 `/auth/callback?type=recovery`
- 重置密码：
  - 校验后调用 `supabase.auth.updateUser`
- 密码框显隐：
  - 统一使用 `PasswordInput` 组件

## 9. 与官网参考的关系（避免误解）
- 当前 `pages/index.js` 不是正式官网，而是占位
- 视觉参考应主要看 `index.html + research-website-styles.css`
- 登录页是“门户化 UI”，不是直接复刻官网页面结构
- 允许在蓝色体系内做现代化收敛，但不要偏离品牌色族

## 10. 推荐给其他 AI 的工作方式
1. 先读本文件  
2. 再读：
- `components/portal/AuthCard.jsx`
- `components/portal/PasswordInput.jsx`
- `styles/portal.module.css`
- `styles/globals.css`
3. 若要参考官网风格，再读：
- `index.html`
- `research-website-styles.css`
4. 仅在指定文件范围改动，避免影响 Supabase 业务流程

## 11. 一段可直接复制给其他 AI 的提示词
你正在修改 YondeLabs 的登录门户前端。请先遵守以下约束：  
- 仅使用 JavaScript 与现有 CSS Modules；不要 TypeScript；不要新增依赖。  
- 优先保持现有组件结构：`AuthCard.jsx + PasswordInput.jsx + portal.module.css`。  
- 品牌视觉必须保持蓝色体系：`#03256C #2541B2 #3266A6 #06BEE1`。  
- 登录页是“官网风格的门户化表达”，不是复刻官网 DOM。  
- 不要改动 Supabase 认证流程逻辑，除非任务明确要求。  
- 所有视觉变更需同时考虑 desktop 与 `max-width:768px` 响应式覆盖。  

