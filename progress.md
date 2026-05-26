# Progress Log — YondeLabs Web

Last updated: 2026-05-26

---

## Session: 2026-05-26 — CLAUDE.md 架构梳理 + Navbar 修复 + 部署教训

### Background
用户反馈 yondelabs.com 的 navbar 跟随页面滚动（fixed 定位）且带有中/英切换按钮，要求改为非粘性 navbar 并去掉语言选项。

### ⚠️ 关键教训：本次犯了"改错文件"的典型错误

**错误过程：**
1. 第一次修改了 `index.html` 和 `research-website-styles.css`（旧静态网站文件）
2. 推送后用户反馈没有效果，等待许久仍无变化
3. 经排查发现：Vercel 部署的是 Next.js app，`index.html` / `research-website-styles.css` / `research-website-script.js` 这三个文件**完全不参与构建，对线上没有任何影响**

**根本原因：** 没有在动手前先确认哪些文件实际被 Vercel 构建和服务，误以为根目录的 `index.html` 就是首页。

**正确文件：**
- Navbar → `components/home/Navbar.jsx`
- 首页样式 → `styles/home.module.css`
- 首页逻辑 → `pages/index.js`

**防错规则（已写入 CLAUDE.md）：**
- `index.html`、`research-website-styles.css`、`research-website-script.js` 是死代码，永远不要修改
- 所有首页改动 → `components/home/` + `styles/home.module.css`
- 任何前端视觉问题，先读 `pages/index.js` 确认组件入口，再追到对应 `components/` 文件

### Files modified（第一次，无效的改动）
- `index.html` — 改了 lang / title / 删语言切换按钮（无效，已提交但对线上无影响）
- `research-website-styles.css` — 改了 navbar position 和 lang 默认值（无效）

### Files modified（第二次，正确改动）
- `components/home/Navbar.jsx` — 删掉语言切换 `<div class="languageSwitch">` 整段；移除 `language`、`onLanguageChange`、`scrolled` props
- `styles/home.module.css` — `.navbar` position: fixed → relative；移除 `.navbar.scrolled`、所有 `body padding-top` 和 `.hero margin-top` 的 fixed nav 补偿；简化移动端 media query
- `pages/index.js` — 移除 `language` state 和 `setLanguage`；`styles.en` 直接硬编码；简化 `handleAnchorClick`（不再需要减去 navbar 高度）；移除 `scrolled` state

### Files created / modified（架构文档）
- `CLAUDE.md` — 全面重写：加入"两套文件系统"警告表格、Deployment 信息、完整 Active File Map、Code Ownership 更新
- `progress.md` — 本条记录

### Deployment
- Git remote: `https://github.com/zs20050309-dot/yondelabs` (branch: `main`)
- Vercel 监听 main 分支，push 后自动重新部署
- 本次最终正确的 commit: `21b98f3`

### Verification
```
npm run build
✓ Compiled successfully
✓ Generating static pages (11/11)
Exit code: 0
```

### What's intentionally NOT done
- 没有删除 `index.html` 等遗留文件——用户未要求，且删除可能影响 git 历史参考价值
- 没有修改 `LocalizedText.jsx` / `Lang` 组件本身——组件仍存在，只是首页 wrapper 现在固定加 `styles.en`，zh 内容永远不渲染

---

## Session: 2026-05-24 (cont. 3) — Supabase migration 指南中文化

### Background
用户反馈看不懂英文，要求把 `docs/supabase-migration-guide.md` 翻译成中文。

### Files modified
- `docs/supabase-migration-guide.md` — 整篇覆盖为中文版。结构、SQL、文件路径、英文专有名词（SQL Editor、Dashboard、RLS、CHECK 约束、Run 按钮、Cmd/Ctrl 快捷键等）保留不译。语气保持原文那种"非技术用户友好 + 谨慎别瞎试"的风格。
- `progress.md` — 本条记录。

### Decision
- **直接覆盖原英文文件**，不保留双语版本。用户是唯一受众；引用这份指南的地方（CLAUDE.md、progress.md、SQL 文件注释）都是文件路径引用，不依赖文件内容是英文还是中文。
- SQL migration 本身（`docs/sql/migrations/*.sql`）**没动** —— SQL 是代码，注释里的英文是给未来跨语言开发者看的标准做法。

### Pending — 用户反馈
- 邮件通知 setup guide (`docs/email-notifications-setup-guide.md`) 同样是英文，同样的用户、同样的"看不懂"问题 → 等用户确认是否一起翻译。

---



### Background
管理员翻 application 状态后，学生只能靠刷 dashboard 知道。本段实现状态变更自动发邮件。学生在 `submitted → interview / offer / rejected` 三类转变时收到 transactional 邮件。

### Stack decision
- **Resend** 作为 transactional email provider（用户拍板）：免费 3000/月 够初期、SDK 简洁、定价后续涨幅缓。
- **Supabase Edge Function** 承载发信逻辑（不在 Next.js app 里，零网络延迟相关耦合）。
- **Supabase Database Webhook** 监听 `applications` UPDATE → POST 到 Edge Function（不用写 pg_net SQL，全在 Supabase Dashboard UI 配置）。
- **共享 secret 鉴权**：Webhook 加 `Authorization: Bearer <WEBHOOK_SECRET>` 头，Function 端校验。比 IP 白名单灵活。
- **发件人**：`noreply@yondelabs.com`（用户域名，需配置 SPF/DKIM）。

### Files created
- `supabase/functions/send-status-email/index.ts` — Edge Function：webhook 鉴权 → 解析 payload → 过滤非 notifiable 状态 → 取学生 email + preferred_name + program → 调 Resend API。文本邮件，三种状态各一份模板。
- `docs/email-notifications-setup-guide.md` — 给非技术用户的完整 setup 指南，约 280 行。覆盖：Resend 注册 / 域名 DNS 配置 / API key 创建 / Edge Function 部署（仅 Supabase Dashboard UI 操作，无需 CLI）/ Webhook 挂接 / 测试 / 故障排查。

### Send rules（已实现）
- 仅在 UPDATE 事件触发（INSERT / DELETE 一律 skip）
- `oldStatus === newStatus` → skip
- `newStatus` 不在 `{interview, offer, rejected}` → skip（draft / submitted 不发邮件，避免「你提交了」这种噪声）
- `form_data.email` 为空 → skip（理论不会发生，因为表单要求 email 必填；保留兜底）
- Resend 失败 → 返回 500，Supabase 端 webhook 重试按钮可手动触发

### Pending — needs user action
- **跑 Resend 全套配置**：详见 `docs/email-notifications-setup-guide.md`，约 30 分钟（多数时间是等 DNS）。在跑完之前，状态变更不会发邮件（但 admin 操作本身正常工作；当前 admin 还没做，所以这条没有阻塞）。
- 当前 admin 面板还没实现 → 状态实际上只能通过 Supabase Table Editor 手改。配合本次邮件系统已经足够 end-to-end 跑通。

### What's intentionally not done
- HTML 模板 / 品牌邮件 — 文本版先上线（spam 友好、跨客户端兼容、易维护），未来再加 HTML。
- `submitted` 确认邮件 — dashboard 已经显示「Application Submitted」，再发邮件是冗余。
- 多语言模板 — 项目英文 only。
- 失败重试 — 当前体量不需要，Supabase webhook 后台有手动重试。

### Verification
- 没有起 Supabase 本地实例（需要 Docker），但 Edge Function 是 standalone Deno 文件，语法层面与项目其他代码无耦合。
- 部署到 Supabase 之后才能完整测；guide 第 4 部分给出了手动测步骤（在 Table Editor 改一行 status 看是否收到邮件）。

---



### Background
本会话上一段把 native form 上线后，旧文档（Spec.md / CLAUDE.md）仍引用 `middleware.js`、admin 仍写为 pending、status flow 没含 `draft`，与 shipping 状态脱节。同时 wizard 没在真机测过，step dot 点击区不够大、超窄屏 footer 按钮可能挤。

### Files modified
- `Spec.md` — 顶部加 doc-currency 提示；§1 file structure 标注 `middleware.js` 实际为 `proxy.js`；§5 标题与正文同步。
- `CLAUDE.md` — Currently Completed/Pending 列表重写；Key Spec Reference 加 `draft` 状态、提到 schema 是 admin 渲染的 source of truth。
- `styles/wizard.module.css` — step dot 按钮加 `min-height: 44px`（iOS HIG tap target）；超窄屏（≤420px）`primaryBtn / secondaryBtn` 加 `flex: 1 1 0; min-width: 0`，让 Previous / Submit 平分宽度且能正确收缩。
- `progress.md` — 本条记录。

### Verification
- 起 dev server：`✓ Ready in 551ms`，端口被占用自动 fallback 到 3001，无编译错误。
- 路由 smoke test：
  - `/login` → 200 OK ✓
  - `/apply` → 307 → `/login?message=Please+log+in+to+continue.` ✓
  - `/apply/ra` → 307 → `/login?...` ✓ (新动态路由被 proxy 正确保护)
  - `/apply/garbage` → 307 → `/login?...` ✓ (未登录先 proxy 拦截；登录后客户端路由会 redirect 回 `/apply`)
- Build 再跑一次确认 CSS 改动不破坏构建：`✓ Compiled successfully`，11 个路由全过。

### Known limitations
- 真机视觉 QA 仍未做（开发环境无 device farm）。下次跑完 Supabase migration 之后可以用 Chrome devtools mobile mode 走一遍完整流程。
- 国家 `<select>` 在移动端原生 picker 里 254 个选项滚动比较累；type-ahead 搜索框是另一个改进点，本次不做。

---

## Session: 2026-05-24 — Native In-App Application Form (replaces Google Forms)

### Background
权宜之计阶段 `/apply` 是点击 program card → 立刻向 `applications` insert 空 `form_data` → 跳 Google Form。问题：Supabase 永远拿不到学生答案，dashboard 上 `cohort` 等字段永远显示 `—`，admin 端做不出来，任何"逻辑判断、数据回流"都失去基础。本会话改造为原生内置问卷：JSON schema 驱动的 multi-step wizard，自动草稿（Supabase + localStorage 双写），提交后真把 `form_data` 写库。

### Decisions made this session
- 字段 key 策略：snake_case；跨 program 同义题共用 key（`gpa`, `research_area`, `parent_email` 等），program 专属字段独立命名。Schema 是 source of truth。
- UX：multi-step wizard + 顶部进度条 + 底部 sticky footer（Prev / 保存状态 / Next or Submit）。
- 草稿策略：永不过期。debounce 2s 双写 Supabase + localStorage；离线时 localStorage 兜底；重连时若 localStorage 比 Supabase 新则 push 上去。
- 已提交不允许编辑：FormWizard 检测到 `submittedAlready` → 显示"联系 admin"指引 + "Apply for another program" CTA。
- PP 双语题目按用户要求改为只渲染英文（label 仅保留 English，提示语单独放在 helper）。
- 国家列表清洗 OCR 错字（lran→Iran、Bumma→Burma、Moldov→Moldova、Kenyа Cyrillic→Kenya、所有 "lslands"→"Islands" 等）。
- RA Q16 `research_area` JSON 类型与副文本冲突（CHECKBOX 但提示 "select one"），按 JSON 类型走多选，避免跨学科选项失效。
- Section 切分：RA 5 steps、IRP 5 steps、PP 7 steps（沿用 PP 原 PAGE_BREAK 结构）+ Review step。
- 部分 PP TEXT 题（如 long_term_direction、rough_idea、community_roles 等内容性题目）升级为 textarea，因为原 Google Form TEXT 单行明显不够用。

### Files created
- `lib/forms/countries.js` — 254 个国家清洗后的常量（修 OCR 错字）。
- `lib/forms/schema.js` — RA / IRP / PP 三份表单完整 JSON schema 配置（source of truth）。
- `lib/forms/useDraft.js` — 草稿持久化 hook（Supabase + localStorage 双写，debounce 2s，stale-detection）。
- `lib/forms/validators.js` — 必填 + email 格式校验。
- `components/apply/FormWizard.jsx` — wizard 壳（state、step 切换、进度条、提交逻辑、SaveIndicator）。
- `components/apply/FormStep.jsx` — 单 step 内容容器。
- `components/apply/ReviewStep.jsx` — 提交前 review 页。
- `components/apply/FieldRenderer.jsx` — 按 schema field type 调度具体字段组件。
- `components/apply/fields/TextField.jsx`
- `components/apply/fields/TextAreaField.jsx`
- `components/apply/fields/DateField.jsx`
- `components/apply/fields/SelectField.jsx`
- `components/apply/fields/RadioField.jsx`
- `components/apply/fields/CheckboxField.jsx`
- `styles/wizard.module.css` — wizard 全套样式（约 470 行）。
- `pages/apply/[program].jsx` — 动态路由页面，承载 wizard。
- `docs/sql/migrations/2026-05-24_add_draft_status.sql` — Supabase migration（draft status CHECK + RLS + 索引）。
- `docs/supabase-migration-guide.md` — 给非技术用户的 Supabase SQL Editor 图文操作教程。

### Files modified
- `pages/apply.jsx` — 拆掉 INSERT + Google Form 跳转逻辑；改为纯导航 + 程序卡片显示 program state（new / draft / submitted）。
- `pages/dashboard.jsx` — 拉数据时排除 `draft`；额外加载 drafts 列表；只有 drafts 时显示"Drafts in progress"卡片；已提交时加"Need to update? Contact info@yondelabs.com"指引；加"Apply for another program" CTA。
- `styles/dashboard.module.css` — 加 draft list / emptyCta / anotherProgram / infoBannerLink 样式。
- `styles/apply.module.css` — 加 program card 上的 statusPill（draft / submitted 徽章）样式。
- `proxy.js` — matcher 增加 `/apply/:path*`，保护新动态路由。
- `progress.md` — 本次记录。

### Schema 范围确认
- RA 共 28 题，分 5 step：basic / academic / credentials / logistics / guardian。
- IRP 共 27 题，分 5 step：basic / research / commitment / credentials / guardian。
- PP 共 22 题 + 7 PAGE_BREAK，分 7 step：basic / academic_direction / experience / expression / community / project_thinking / commitment_pp / guardian（最后一 step 含 parent name/email 因为原表里这两题在所有 Section 之外）。
- ISEF 仍是 contact-only（不走 wizard）。

### Pending — needs user action
- **运行 Supabase migration**：用户需打开 Supabase Dashboard → SQL Editor → 粘贴 `docs/sql/migrations/2026-05-24_add_draft_status.sql` 内全部内容 → Run。详细图文步骤在 `docs/supabase-migration-guide.md`。在 migration 跑完之前，新表单提交会被 DB 拒绝（CHECK 约束）。

### Verification
Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 1438ms
✓ Generating static pages using 9 workers (11/11) in 85ms
Route (pages):
  /
  /404
  /apply
  /apply/[program]
  /auth/callback
  /dashboard
  /forgot-password
  /login
  /register
  /reset-password
ƒ Proxy (Middleware)
```

Exit code: 0.

Manual smoke testing 待用户在 Supabase migration 跑完后在浏览器中验证：
- 进入 `/apply` 看到 4 个 program 卡片
- 点击 RA → 进入 `/apply/ra` 5-step wizard
- 修改字段 2 秒后 footer 显示 "Saved Xs ago"
- 关闭浏览器再回来，看到 draft 自动恢复
- review 页 Submit → 写库 → 跳 `/dashboard` 看到 "Application Submitted"

### Known limitations / explicit non-goals this session
- 不做"逻辑判断"（条件 show/hide、自动初判 cohort 等），用户说后续单独讨论。
- 不迁移历史 Google Forms 数据（用户明确不需要）。
- Admin 端仍未实现（独立工作流，超出本会话范围）。
- ISEF 仍走 mailto，未来如果要做也是单独流程。

---

## Session: 2026-05-18 — Lab Showcase Program Cards

### Background
用户要求将 homepage 中左侧照片 panel + 右侧三条 benefit items 的 section 改为左侧照片 panel 保持不变、右侧显示四个 program cards，并要求所有 card 点击进入 `/login`。

### Target section identified
- 目标 section 位于 `components/home/LabShowcase.jsx`。
- 原右侧三条 benefit items 为：
  - `Hands-On Access to $2M+ Equipment`
  - `Work on Actual Cutting-Edge Research`
  - `One-on-One PhD Mentorship`

### Files modified
- `components/home/LabShowcase.jsx`
- `styles/home.module.css`
- `progress.md`

### Changes made
- 保留 `LabShowcase` 左侧 `labGallery` / photo panel / thumbnails 结构不变。
- 删除右侧旧 `Outcome` JSX 使用和 `Outcome` helper component。
- 新增 `programCards` 数据数组，包含四张卡：
  - RA — `In-Person Research Assistant`
  - IRP — `Independent Research Program`
  - PP — `Passion Project`
  - ISEF — `ISEF Mentorship`
- 使用 Next.js `<Link href="/login">` 渲染每张 card；没有使用 `window.location` 或外部硬编码 URL。
- 新增 `styles.home.module.css` 中的同组件样式：
  - `labProgramGrid`
  - `labProgramCard`
  - `labProgramBadge`
  - `labProgramTitle`
  - `labProgramDescription`
  - `labProgramCta`
- Desktop grid 使用 `grid-template-columns: repeat(2, minmax(0, 1fr))`。
- Mobile media query 中 `labProgramGrid` 改为 `grid-template-columns: 1fr`。
- Badge 使用 `--color-navy-primary`，CTA 使用 `--color-cyan-bright`。
- 未修改 `pages/index.js` 结构、routing logic、`proxy.js`、`supabaseClient.js`，未新增 npm package。

### Verification
Source-level RED check before changes:
```
Error: missing program card content: RA
```

Source-level GREEN check after changes:
```
source checks passed
```

Diff check:
```
git diff --check
```

Result: exit code 0.

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 700ms
✓ Generating static pages using 9 workers (10/10) in 36ms
```

Exit code: 0.

---

## Session: 2026-05-13 — Homepage WeChat and Hard-Coded Chinese Text Removal

### Background
用户要求从 homepage 中硬删除截图可见的 WeChat references 和 footer 中的硬编码中文品牌副标题，不允许注释保留，不允许删除 `WeChatModal.jsx` 文件，不允许修改 CSS。

### Files modified
- `components/home/Footer.jsx`
- `pages/index.js`
- `progress.md`

### Elements deleted
- `components/home/Footer.jsx`
  - Deleted `FinalCta` prop parameter `onConsult`.
  - Deleted the `Schedule Consultation` / `预约咨询` button using `styles.btnConsult`.
  - Deleted the Final CTA contact `<p>` containing `微信: YondeLabs-Abrielle` / `WeChat: YondeLabs-Abrielle`.
  - Deleted `凌研阁` from the About Us `<strong>Yonde Labs 凌研阁</strong>` brand line, leaving `Yonde Labs`.
  - Deleted the footer Contact column line `<p>📱 WeChat: YondeLabs-Abrielle</p>`.
  - Deleted `凌研阁` from the footer copyright line, leaving `© 2024 Yonde Labs. All rights reserved.`
- `pages/index.js`
  - Deleted the `WeChatModal` import.
  - Deleted the `wechatOpen` state.
  - Deleted the `onConsult={() => setWechatOpen(true)}` prop from `<FinalCta />`.
  - Deleted the `<WeChatModal open={wechatOpen} onClose={() => setWechatOpen(false)} />` usage.
  - Deleted hard-coded Chinese text from the homepage `<title>`, changing it from `Yonde Labs 凌研阁 | 顶尖科研体验项目` to `Yonde Labs`.

### Notes
- `components/home/WeChatModal.jsx` was intentionally left in place and unchanged, per user instruction.
- No CSS/style files were modified.
- Existing bilingual `Lang zh` copy outside the requested visible WeChat/footer brand removals was not removed.

### Verification
Source-level RED check before changes:
```
Error: Footer must not contain YondeLabs-Abrielle
```

Source-level GREEN check after changes:
```
source checks passed
```

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 825ms
✓ Generating static pages using 9 workers (10/10) in 35ms
```

Exit code: 0.

---

## Session: 2026-05-13 — Hero Deadline Bar Disable

### Background
用户要求隐藏 Hero section 中两个 CTA 下方的 deadline info bar，因为日期已过期；要求保留 JSX 代码，方便未来 cohort cycle 重新启用。

### Files modified
- `components/home/Hero.jsx`
- `progress.md`

### Changes made
- 在 `components/home/Hero.jsx` 中保留原 deadline bar JSX，但用 JSX comment 包裹，不再渲染。
- 添加注释：
  `DEADLINE BAR DISABLED — dates have passed. Uncomment and update dates for next cohort cycle.`
- 被注释保留的 block 是 `styles.deadlineBanner` 这一整段：
  - `Early Decision Deadline:`
  - `December 15, 2025`
  - separator `|`
  - `Regular Decision:`
  - `March 15, 2026`
- 未修改两个 Hero CTA、其他 Hero 文案、路由逻辑、CSS/style 文件。

### Verification
Source-level RED check before changes:
```
Error: deadline disabled comment must be present
```

Source-level GREEN check after changes:
```
source checks passed
```

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 808ms
✓ Generating static pages using 9 workers (10/10) in 35ms
```

Exit code: 0.

---

## Session: 2026-05-11 — RA Label Unification and Announcement Banner Disable

### Background
用户要求统一 `ra` program key 的展示文案为 `In-Person Research Assistant`，并隐藏首页顶部过期 Winter Cohort announcement banner，同时保留原 banner JSX 方便后续重新启用。

### Files modified
- `pages/dashboard.jsx`
- `components/home/AnnouncementBanner.jsx`
- `docs/ai-context/current-project-ai-alignment.md`
- `progress.md`

### Changes made
- 将 `pages/dashboard.jsx` 中 `PROGRAM_LABELS.ra` 从 `Research Apprenticeship Program` 改为 `In-Person Research Assistant`。
- 检查 `pages/apply.jsx`，`ra` card title 已经是 `In-Person Research Assistant`，未修改该文件。
- 在 `components/home/AnnouncementBanner.jsx` 中让组件 `return null`，并用 JS block comment 保留原完整 banner JSX。
- 添加注释：`BANNER DISABLED — re-enable and update text for next cohort announcement.`
- 更新 `docs/ai-context/current-project-ai-alignment.md` 中 dashboard label 示例，并移除 RA label mismatch 风险备注。
- 未修改 Supabase program key；数据库值仍为 `ra`。
- 未修改其他 program label、路由、数据库逻辑或样式文件。

### Verification
Source-level RED check before changes:
```
Error: dashboard ra label must be In-Person Research Assistant
```

Source-level GREEN check after changes:
```
source checks passed
```

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 669ms
✓ Generating static pages using 9 workers (10/10) in 53ms
```

Exit code: 0.

---

## Session: 2026-05-11 — Current Project AI Alignment Context

### Background
用户需要将当前官网/申请门户开发进度、架构规范、API 调用方式、spec 与 progress 状态整理成一份可交给其他 AI 阅读的对齐文档。目标是让无法直接读取完整源码的 AI 也能理解当前系统边界与后续开发注意事项。

### Files created
- `docs/ai-context/current-project-ai-alignment.md`

### Work performed
- 阅读并对齐当前关键文档与源码：
  - `CLAUDE.md`
  - `progress.md`
  - `Spec.md`
  - `YondeLabs_PRD.md`
  - `YondeLabs_Team_Alignment_Doc.md`
  - `docs/technical-alignment-report.md`
  - `docs/ai-context/login-website-context-alignment.md`
  - `pages/index.js`
  - `pages/login.jsx`
  - `pages/register.jsx`
  - `pages/forgot-password.jsx`
  - `pages/reset-password.jsx`
  - `pages/auth/callback.jsx`
  - `pages/apply.jsx`
  - `pages/dashboard.jsx`
  - `components/home/*`
  - `components/portal/*`
  - `lib/supabaseClient.js`
  - `proxy.js`
  - `styles/globals.css`
- 新文档以当前代码事实为准，明确指出旧技术报告中的已知过期点：
  - `pages/index.js` 当前已是组件化官网首页，不再是 coming-soon 占位。
  - `/apply` 当前已实现。
  - admin 用户当前临时进入 `/dashboard`，因为 `/admin` 尚未实现。
  - 当前路由保护文件是 `proxy.js`，不是旧文档中的 `middleware.js`。
- 整理了给其他 AI 的可复制 prompt、路由表、目录职责、Supabase Auth 调用示例、`applications` 表契约、`/apply` Google Form handoff、dashboard 数据流、当前完成/未完成清单与后续建议顺序。
- `.env.local` 只提取变量名，没有暴露任何实际 secret/value。

### Verification
- 文档已写入 `docs/ai-context/current-project-ai-alignment.md`。
- 本次只新增文档与更新进度记录，未改业务代码；无需运行 `npm run build`。

---

## Session: 2026-05-11 — GitHub Account Preference

### Preference
- 以后所有 GitHub 相关提交、push、PR 创建与仓库操作，默认使用 `zs20050309-dot / Jane99`。
- 如本地 git commit author 或 GitHub CLI active account 不是 `zs20050309-dot / Jane99`，在提交或创建 PR 前先切换/修正，不要默认继续。
- 若必须使用其他账号，需先明确告知并等待用户确认。

### Context
- 上一次 PR 创建账号是 `zs20050309-dot / Jane99`。
- 上一次 commit author 显示为 `Francesca1226 / Ben99`，后续应避免这种不一致。

---

## Session: 2026-05-10 — Commit and Branch Publish Attempt

### Background
用户要求将当前所有改动提交到 `main`，从 `main` 创建 `dev` 分支，并推送 `dev` 与 `main` 到 GitHub。

### Pre-flight
- 当前分支：`main`
- 工作区存在已修改和未跟踪文件，用户明确要求 `git add .` 提交所有改动。
- `git remote -v` 未输出任何 remote，说明本地仓库当前没有配置 `origin`。

### Planned commands
```
git add .
git commit -m "feat: add auth flow, apply page, dashboard with Supabase integration"
git checkout -b dev
git push origin dev
git checkout main
git push origin main
```

### Follow-up
- `origin` was added as `https://github.com/ashlyndong/yondelabs`.
- Direct push to `main` was not the right workflow for the remote, so a PR branch was prepared instead.
- Remote `main` has a separate static-site history from this local Next.js app history; a PR-compatible branch needs to be based on `origin/main` and then add the full portal project snapshot.
- Target PR branch: `feature/auth-apply-dashboard-pr`.

## Session: 2026-05-08 — Apply Program Title Correction

### Background
用户反馈上一轮 `/apply` program card titles 仍不完全准确，要求改为：
- `In-Person Research Assistant`
- `Independent Research Program`
- `ISEF Mentorship`
- `Passion Project`

### Changes made
- 更新 `pages/apply.jsx` 中 `PROGRAMS` 的 display `title`：
  - RA: `In-Person Research Assistant`
  - IRP: `Independent Research Program`
  - Passion Project: `Passion Project`
  - ISEF: `ISEF Mentorship`
- 保持 `key`, `shortTitle`, descriptions, Google Form URL, Supabase 写入逻辑不变。
- 保持当前卡片顺序不变：RA / IRP / Passion Project / ISEF。

### Verification
Source title check:
```
node - <<'NODE'
...
NODE
```

Result: exits with code 0.

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 670ms
✓ Generating static pages using 9 workers (10/10) in 50ms
```

## Session: 2026-05-08 — End-to-End Route QA and Launch Prep

### Background
用户提供“全链路联调与上线预备”spec，要求检查并修复官网外部入口到 `/login`、`/apply`、Google Form、`/dashboard` 的核心申请链路，覆盖路由保护、登录分流、申请选择、dashboard 防御空态、callback、loading、错误处理和移动端基础约束。

### Methodology
- 使用 Superpowers 风格流程：
  - `systematic-debugging`: 先读必需文件并定位真实断点。
  - source-level RED check: 先确认 shared navbar、admin routing、dashboard 空态等要求当前不满足。
  - 最小改动实现修复。
  - source-level GREEN check + `npm run build` + local route smoke check。
- `CODEX.md` 未在项目或上级目录找到；按用户本次 spec 和项目已有文档执行。

### Files created
- `components/portal/PortalNavbar.jsx`
- `styles/portalNavbar.module.css`

### Files modified
- `pages/login.jsx`
- `pages/register.jsx`
- `pages/apply.jsx`
- `pages/dashboard.jsx`
- `pages/auth/callback.jsx`
- `progress.md`

### Root causes / findings
- `/login` 中 admin 登录仍跳转到未实现的 `/admin`，会造成死路；本次 spec 要求 admin 进入 `/dashboard`。
- `/apply` 与 `/dashboard` navbar 重复实现，且 logo 不可点击，无法保证已登录页面导航完全一致。
- 多数 Supabase 操作只有 `{ error }` 分支检查，没有 `try/catch`，网络异常可能导致页面停在 loading 或无明确错误。
- Dashboard 无申请空态仍使用旧文案 `No application submitted yet`，不符合本次防御性空态要求。
- `/auth/callback` 没有 try/catch 兜底。

### Changes made
1. Shared navbar
   - 新增 `PortalNavbar` 组件，统一 `/apply` 和 `/dashboard` 的已登录 navbar。
   - Logo 点击 `router.push('/dashboard')`。
   - 右侧显示 `preferred_name || email`。
   - Logout 统一 `supabase.auth.signOut()` -> `router.replace('/login')`。
   - 样式放入 `styles/portalNavbar.module.css`，保留 64px 高度、白底和 `#e5e7eb` bottom border。

2. Login routing
   - admin 登录成功后进入 `/dashboard`，不再进入未实现的 `/admin`。
   - student 登录后查询 `applications`：
     - 有 application -> `/dashboard`
     - 无 application -> `/apply`
   - 使用 `router.replace(...)` 避免登录后浏览器后退回登录提交态。
   - application lookup 失败时显示统一错误文案。
   - 登录页注册链接文案改为 `Register`，链接仍指向 `/register`。

3. Register hardening
   - 保留注册成功后 `/login?registered=true`。
   - 保留密码 8 位和确认密码一致校验。
   - Supabase signup 错误不再直接暴露 raw `error.message`，改为统一错误文案。
   - 登录链接文案改为 `Login`。

4. Apply hardening
   - 接入 `PortalNavbar`。
   - 页面加载和 Supabase insert 都增加 `try/catch`。
   - 保留已有 application 自动 redirect `/dashboard`。
   - 保留 RA / IRP / Passion Project 写入 Supabase 后跳 Google Form。
   - 保留 ISEF 不写入、不跳转、只展示 `mailto:info@yondelabs.com`。

5. Dashboard hardening
   - 接入 `PortalNavbar`。
   - 查询 application 增加 `try/catch`。
   - fetch error 改为统一错误文案。
   - 无 application 防御空态文案改为：
     `Your application is being processed. If you believe this is an error, please contact info@yondelabs.com.`
   - 保留 `form_data?.cohort || '—'` 和 short month date format。

6. Auth callback
   - `setSession` / `exchangeCodeForSession` 流程增加 `try/catch`。
   - recovery 仍跳 `/reset-password`。
   - verification 仍跳 `/dashboard`。
   - callback 失败跳 `/login?message=...` 并由 login 页面展示 message。

### Verification
RED source check:
```
Error: shared PortalNavbar must exist
```

GREEN source acceptance check:
```
node - <<'NODE'
...
NODE
```

Result: exits with code 0.

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 688ms
✓ Generating static pages using 9 workers (10/10) in 51ms
```

Local route smoke check against existing dev server on `localhost:3000`:
```
curl -I http://localhost:3000/login
HTTP/1.1 200 OK

curl -I http://localhost:3000/register
HTTP/1.1 200 OK

curl -I http://localhost:3000/apply
HTTP/1.1 307 Temporary Redirect
location: /login?message=Please+log+in+to+continue.

curl -I http://localhost:3000/dashboard
HTTP/1.1 307 Temporary Redirect
location: /login?message=Please+log+in+to+continue.
```

### Known limitations / manual checks still required
- Supabase live insert and Google Form redirect require an authenticated browser session and real Supabase account; source-level checks confirm code path and URLs, but live DB write should still be manually smoke-tested.
- Status tracker visual states for `submitted`, `interview`, `offer`, `rejected` are covered by source-level logic review, but final visual QA should be done in browser with actual Supabase status changes.
- 375px no-horizontal-overflow was checked via CSS constraints and global `overflow-x: hidden`; visual mobile QA in browser is still recommended before public launch.

## Session: 2026-05-08 — Apply Program Card Title Refinement

### Background
用户反馈 `/apply` 四个项目的名字也需要根据上一轮产品定位文案同步调整，而不只是修改简介。

### Changes made
- 更新 `pages/apply.jsx` 中 `PROGRAMS` 的四个 `title`：
  - `Research Apprenticeship` -> `In-Person Research Apprenticeship`
  - `Independent Research Program` -> `Independent Research Paper Program`
  - `Passion Project` -> `Community Passion Project`
  - `ISEF Coaching` -> `ISEF Competition Coaching`
- 保持 `key`, `shortTitle`, Google Form URL, Supabase 写入逻辑不变。

### Verification
Source title check:
```
node - <<'NODE'
...
NODE
```

Result: exits with code 0.

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 644ms
✓ Generating static pages using 9 workers (10/10) in 51ms
```

## Session: 2026-05-08 — Apply Program Card Copy Refinement

### Background
用户要求按照新的产品定位调整 `/apply` 四张 program cards 的简介文案：
- IRP 突出 ownership，以及 paper + narrative 双成果。
- Passion Project 突出 genuine interests 和 community-rooted，并用 T15 mentor 表达导师质量。
- ISEF 突出 PhD + coach + SSM 三角色团队结构，以及 publication safety net。
- In-Person RA 突出真实实验室、hands-on 和 recommendation letter。

### Changes made
- 更新 `pages/apply.jsx` 中 `PROGRAMS` 的四条 `description`：
  - RA: in-person lab, hands-on real research, recommendation letter
  - IRP: ownership, paper-ready deliverable, application narrative
  - Passion Project: genuine interests, community-rooted project, T15 mentor
  - ISEF: three-role team, PhD mentor + competition coach + SSM, publication safety net
- 未修改路由、Supabase 写入逻辑、Google Form URL 或 CSS。

### Verification
Source copy check:
```
node - <<'NODE'
...
NODE
```

Result: exits with code 0.

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 790ms
✓ Generating static pages using 9 workers (10/10) in 34ms
```

## Session: 2026-05-08 — Login Redirect to Apply for New Applicants

### Background
用户反馈通过 `/login` 登录后直接进入 `/dashboard`，看到 `No application submitted yet`，预期应该进入 `/apply` 项目选择页。

### Root cause
- `/apply` 页面已创建并由 `proxy.js` 保护。
- 但 `pages/login.jsx` 登录成功后仍使用旧逻辑：
  - admin -> `/admin`
  - 所有非 admin -> `/dashboard`
- 因此没有 application 的学生也会被硬编码送到 dashboard 空态，而不是进入 apply flow。

### Changes made
- 更新 `pages/login.jsx` 登录成功后的 student routing：
  - admin 仍进入 `/admin`
  - 非 admin 登录后查询 `applications.select('id').eq('user_id', data.user.id).limit(1).maybeSingle()`
  - 已有 application -> `/dashboard`
  - 没有 application -> `/apply`
- 如果 application 状态查询失败，保留在 login 页并展示明确错误，不盲目跳转。

### Verification
RED source check:
```
Error: login must check applications after student sign-in
```

GREEN source check:
```
node - <<'NODE'
...
NODE
```

Result: exits with code 0.

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 688ms
✓ Generating static pages using 9 workers (10/10) in 51ms
Route (pages): /apply generated
```

## Session: 2026-05-08 — Apply Program Selection Page

### Background
用户要求按照 Codex Spec 开发 `/apply` 项目选择页，并借鉴 Superpowers 方法论进行开发。该页面用于让已登录学生选择 RA / IRP / Passion Project 并立即写入 Supabase `applications` 记录，然后跳转对应 Google Form；ISEF Coaching 仅展示咨询联系信息。

### Methodology
- 使用 Superpowers 风格的轻量 RED/GREEN 流程：
  - 先运行 source-level RED check，确认 `pages/apply.jsx` 缺失导致检查失败。
  - 实现页面与 CSS Module。
  - 重新运行 source-level behavior checks 和 `npm run build`。
- `CODEX.md` 未在项目或上级目录中找到；已按用户提供 spec、`docs/technical-alignment-report.md`、dashboard 模式和现有项目约束执行。

### Files created
- `pages/apply.jsx`
- `styles/apply.module.css`

### Changes made
- 新增 `/apply` Pages Router 页面。
- 页面加载时调用 `supabase.auth.getUser()`：
  - 未登录用户 `router.replace('/login')`
  - 已有 application 的用户通过 `.maybeSingle()` 检测后 `router.replace('/dashboard')`
- 新增 4 个 program cards：
  - RA -> 写入 `program: 'ra'` 后跳转 `https://forms.gle/io4J6YgvmUBCCbUUA`
  - IRP -> 写入 `program: 'irp'` 后跳转 `https://forms.gle/tX6EtMNaW1zxGjCR6`
  - Passion Project -> 写入 `program: 'passion-project'` 后跳转 `https://forms.gle/jacuFwVv6SukLwTf6`
  - ISEF -> 不写 Supabase，不跳转，仅展开咨询信息和 `mailto:info@yondelabs.com`
- Supabase insert 使用：
  - `user_id: user.id`
  - `program: programKey`
  - `status: 'submitted'`
  - `form_data: {}`
- Google Form 外部跳转使用 `window.location.href`。
- 复刻 dashboard navbar 结构与 logout 行为。
- 新增 loading、submitting、error、ISEF expanded 状态。
- 新增 responsive 2x2 -> 1-column card grid，移动端在 `max-width: 768px` 堆叠。

### Verification
RED source check:
```
Error: pages/apply.jsx must exist
```

GREEN source behavior check:
```
node - <<'NODE'
...
NODE
```

Result: exits with code 0.

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 675ms
✓ Generating static pages using 9 workers (10/10) in 48ms
Route (pages): /apply generated
```

### Notes
- 未修改 `lib/supabaseClient.js`。
- 未修改 `proxy.js`，因为 `/apply` 已在 protected route matcher 中。
- 没有新增 npm dependencies。
- Supabase/Google Form click-through behavior 已通过 source-level checks 验证；真实数据库写入需要在已登录浏览器会话中配合 Supabase 环境手动 smoke test。

## Session: 2026-05-08 — Project Orientation for Upcoming Feature Work

### Background
用户要求先熟悉整个项目内容，重点理解官网、login、dashboard 的设计和代码结构，为后续新功能开发做准备。

### Files reviewed
- `CLAUDE.md`, `progress.md`, `Spec.md`, `YondeLabs_PRD.md`, `YondeLabs_Team_Alignment_Doc.md`
- `docs/technical-alignment-report.md`
- `package.json`, `next.config.js`, `pages/_app.js`, `pages/_document.js`
- `pages/index.js`, `index.html`, `research-website-styles.css`, `research-website-script.js`
- `pages/login.jsx`, `pages/register.jsx`, `pages/forgot-password.jsx`, `pages/reset-password.jsx`, `pages/auth/callback.jsx`, `pages/dashboard.jsx`
- `components/portal/AuthCard.jsx`, `components/portal/PasswordInput.jsx`, `components/portal/StatusTracker.jsx`, `components/portal/ApplicationSummary.jsx`
- `styles/globals.css`, `styles/portal.module.css`, `styles/dashboard.module.css`, `styles/statusTracker.module.css`
- `lib/supabaseClient.js`, `proxy.js`

### Findings
- 当前应用主体在 `yondelabs-main/`，是 Next.js 16 Pages Router + JavaScript/JSX + CSS Modules + Supabase。
- Next 首页 `pages/index.js` 仍是 Coming Soon 占位；完整官网内容仍在 legacy 静态 `index.html` 与 `research-website-*` 文件中。
- Auth/login 设计已比较完整，核心由 `AuthCard`, `PasswordInput`, `portal.module.css` 组成。
- Dashboard 已实现学生申请状态读取与展示，使用 `StatusTracker` 三阶段进度条和 `dashboard.module.css` 的 academic editorial 风格。
- `proxy.js` 已保护 `/dashboard`, `/apply`, `/admin`，但 `/apply` 和 `/admin` 页面仍未实现。
- `ApplicationSummary.jsx` 仍存在，但当前 `pages/dashboard.jsx` 没有使用它。
- `.env.local` 存在；当前构建可通过。

### Verification
Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 806ms
✓ Generating static pages using 9 workers (9/9) in 50ms
```

## Session: 2026-05-08 — Progress Stepper Alignment Fix

### Background
用户反馈 Application Progress stepper 中圆圈节点和下方文字没有准确对齐：中间节点基本对齐，但左右两侧偏差明显。

### Root cause
- 旧版 desktop stepper 使用两套布局：
  - 圆圈和连接线使用 flex 轨道
  - 下方文字使用三等分 grid
- 中间节点因对称关系碰巧对齐，但左右节点的 flex 坐标与文字 grid 坐标不同，导致视觉错位。

### Changes made
- 将 desktop stepper 改为单一三列 `stepGrid`。
- 每个 `desktopStep` 同时包含圆圈和对应文字，保证共享同一列中心线。
- 连接线改为绝对定位，按三列节点中心之间的位置绘制，不再参与 flex 分配。
- 移除旧的 `desktopCircles` / `desktopLabels` / `dLabelSlot` 分离式布局。
- 保持 mobile vertical stepper 逻辑不变。

### Verification
Chrome DOM measurement:
```
Step 1 circle/text center delta: 0px
Step 2 circle/text center delta: 0px
Step 3 circle/text center delta: 0px
Connector 1 width: 285.19px
Connector 2 width: 285.19px
```

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 866ms
✓ Generating static pages using 9 workers (9/9) in 52ms
```

## Session: 2026-05-08 — Dashboard Final Logo and Status Divider Tweak

### Background
用户确认 summary layout 基本 OK，要求：
- 去掉 `Current Status` 左侧竖线
- 左上角 YondeLabs logo 放大三倍

### Changes made
- 从 `.statusItem` 移除 `border-left`，保留原有横向 spacing，不改变其他 summary layout。
- 将 dashboard nav logo 高度从 `30px` 调整为 `90px`。
- 将移动端 logo 高度从 `26px` 调整为 `78px`。
- 为 `.header` 增加 `overflow: hidden`，避免 SVG viewBox 放大后透明区域影响导航条布局。

### Verification
Served CSS check:
```
height: 90px
height: 78px
padding-left: clamp(18px, 2vw, 30px)
```

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 749ms
✓ Generating static pages using 9 workers (9/9) in 52ms
```

Local server:
```
npm run dev
Local: http://localhost:3000
```

## Session: 2026-05-08 — Current Status Block Layout Optimization

### Background
用户反馈 Welcome Card 右侧 `Current Status` 区块下方留白过大，显得不美观。

### Design diagnosis
- 上一版让 `Current Status` 独占右侧并跨越两行 grid。
- Status badge 本身内容很少，跨行后右侧底部自然形成大块空白。
- 继续往 status 区加说明文字会让 dashboard 变啰嗦，因此采用结构调整而非增加文案。

### Changes made
- 将 summary grid 改为：
  - 第一行：`Program` 横跨全部三列
  - 第二行：`Cohort` / `Date Submitted` / `Current Status`
- `Current Status` 不再跨两行，只作为 metadata rail 的第三项展示。
- 缩小 status badge 高度与字号，并改为左对齐，减少 pill 的笨重感。
- 保留顶部细分组线，让三项 metadata 形成统一的一排信息。

### Verification
Chrome DOM measurement after refresh:
```
grid areas: "program program program" "cohort date status"
grid template: 237.375px 180px 260px
status block height: 99.2px
badge right: 1300.76px
welcome card right: 1350.73px
remaining space: ~49.97px
```

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 876ms
✓ Generating static pages using 9 workers (9/9) in 55ms
```

## Session: 2026-05-08 — Dashboard Top Spacing Adjustment

### Background
用户要求去掉 Welcome Card 中的 `Applicant Dashboard` 字段，并让 dashboard 两张主卡片整体上移一些，减少顶栏与内容之间的空隙。

### Changes made
- 从有申请和无申请两种状态中移除 `Applicant Dashboard` kicker 文案。
- 删除不再使用的 `.dashboardKicker` CSS。
- 将 dashboard 主内容顶部 padding 从 `clamp(42px, 5.4vw, 78px)` 调整为 `clamp(30px, 3.6vw, 54px)`，桌面端内容整体上移约 24px。

### Verification
Static text check:
```
rg -n "Applicant Dashboard|dashboardKicker" pages/dashboard.jsx styles/dashboard.module.css
```

Result: no matches.

Served CSS check:
```
padding: clamp(30px, 3.6vw, 54px) clamp(34px, 6.2vw, 112px) 48px;
```

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 791ms
✓ Generating static pages using 9 workers (9/9) in 52ms
```

## Session: 2026-05-08 — Dashboard Summary Layout Refinement

### Background
用户反馈 Welcome Card 右侧一排 Program / Cohort / Date Submitted / Current Status 信息上下不齐、视觉凌乱，允许重新调整整体排版。

### Design diagnosis
- 四个字段不是同一类信息：
  - Program 是长标题型主信息
  - Cohort / Date 是短 metadata
  - Current Status 是状态 pill
- 旧版强行放入单行四列后，长标题、多行日期标签和 pill 的视觉基线无法自然对齐。
- 纵向分割线强化了“不齐”的观感，让每个字段都像同等权重的数据列。

### Changes made
- 将右侧信息区改为 application dossier layout：
  - `Program` 横跨左侧上方，作为主信息
  - `Current Status` 独立占据右侧状态区
  - `Cohort` 和 `Date Submitted` 放在下方同一条 metadata rail
- 为 `Cohort` / `Date Submitted` 增加专用 class，便于 CSS grid area 管理
- 移除桌面端强烈竖向分割线，改为更轻的局部分组线
- 调整 Program 字体尺寸与行高，使长项目名更像标题而不是被挤压的数据值
- 将 dashboard summary 的响应式断点提前到 `1120px`，中等宽度下自动堆叠，避免硬挤。

### Verification
Chrome DOM measurement after refresh:
```
grid areas: "program program status" "cohort date status"
grid template: 232.508px 194.875px 250px
badge right: 1300.77px
welcome card right: 1350.73px
remaining space: ~49.96px
```

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 727ms
✓ Generating static pages using 9 workers (9/9) in 52ms
```

## Session: 2026-05-08 — Dashboard Status Badge Overflow Fix

### Background
用户反馈 Welcome Card 右侧 `Application Submitted` status badge 溢出卡片右边界。

### Root cause
- Chrome DOM 实测发现 `.infoGrid` 实际可用宽度约为 `760px`
- 旧列定义使用了较大的 `minmax(260px/130px/170px/310px, ...)` 最小值，四列最小宽度合计 `870px`
- 因此不是 badge 单独溢出，而是整个右侧信息 grid 被硬性最小列宽撑出了 welcome card

### Changes made
- 将 `styles/dashboard.module.css` 中 `.infoGrid` 的桌面列定义改为 `minmax(0, ...)` 分数列，允许四列在实际容器宽度内收缩
- 调整 `.infoItem` 横向 padding，减少窄列下的内部挤压
- 为 `.statusItem` 增加 `min-width: 0`
- 将 `.statusBadge` 从 `width: fit-content` 改为 `width: 100%`
- 增加 `box-sizing: border-box`、`overflow-wrap: anywhere`，确保状态文案限制在自己的列内

### Verification
Chrome DOM measurement after refresh:
```
badge right: 1311.23px
welcome card right: 1350.73px
remaining space: ~39.5px
grid template: 235.594px 110.203px 148.203px 266px
```

Served CSS check:
```
.infoGrid {
  grid-template-columns: minmax(0, 1.24fr) minmax(0, .58fr) minmax(0, .78fr) minmax(0, 1.4fr);
}
```

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 763ms
✓ Generating static pages using 9 workers (9/9) in 52ms
```

## Session: 2026-05-08 — Dashboard Visual Design Pass

### Background
用户反馈申请后 dashboard 已可触发，但前端视觉仍有两个问题：
- 页面和卡片排版过于拥挤，宽屏旁边空间没有充分利用
- 字体和层级过于普通，整体像默认 AI 生成 UI，缺少艺术性和视觉重点

### Design direction
- 采用更偏 **academic editorial dashboard** 的视觉方向
- 保持 dashboard 是功能型门户，不做营销化 hero
- 用更宽松的卡片节奏、更宽的内容容器、非等分信息网格提升可读性
- 使用 `Fraunces` 作为 display serif，`Manrope` 作为 dashboard UI 字体，避免全页 Inter 单字体带来的模板感

### Changes made
1. **Dashboard font loading** (`pages/_document.js`)
   - 新增 Google Fonts：`Fraunces` 和 `Manrope`
   - 保留 `Inter`，避免影响现有 login portal 样式

2. **Greeting hierarchy update** (`pages/dashboard.jsx`)
   - 增加 `greetingName`，当用户没有 preferred name 时使用邮箱前缀作为欢迎标题名
   - 顶部 nav 仍展示完整账号 email
   - Welcome Card 中新增 `Applicant Dashboard` kicker
   - 将标题拆成 `Welcome back,` + 用户名两层，避免长邮箱撑爆视觉重心
   - Program 和 Current Status 信息项增加专用 class，用于更合理分配宽度和字体层级

3. **Dashboard layout and typography** (`styles/dashboard.module.css`)
   - 内容最大宽度从 1180px 扩展到 1560px，更好利用宽屏空间
   - 页面左右 padding 改为 responsive clamp，桌面端更舒展
   - Welcome Card padding、圆角和 shadow 提升
   - Welcome 标题改用 `Fraunces`，数据和正文改用 `Manrope`
   - 信息网格从等分 4 列改为非等分列：Program 和 Status 获取更多空间
   - Program 值使用 display serif，提高学术/申请门户气质
   - Status badge 放大并优化内部 spacing
   - Info banner、empty state、footer notification line 的字号和呼吸感同步提升

4. **Progress card typography and spacing** (`styles/statusTracker.module.css`)
   - Progress card 与 Welcome Card 使用统一 18px radius / elevated shadow
   - 标题改用 `Fraunces`
   - Stepper node 从 44px 放大到 58px
   - Connector line、label 和 sub-label 加大，提高 dashboard 主状态的视觉权重
   - 移动端 rail 宽度同步调整，避免节点和纵向轨道错位

### Verification
Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 840ms
✓ Generating static pages using 9 workers (9/9) in 50ms
```

Route smoke check:
```
curl -I http://localhost:3000/dashboard
HTTP/1.1 307 Temporary Redirect
location: /login?message=Please+log+in+to+continue.
```

Note: redirect is expected for unauthenticated curl. Logged-in browser session should render the updated dashboard.

## Session: 2026-05-08 — Student Dashboard UI Implementation

### Background
用户提供 `/dashboard` dashboard spec，要求按照参考结构完成学生 dashboard 板块开发，并以 Superpowers 方法论作为执行指导。

### Method
- 使用 `writing-plans` 产出执行计划：`docs/superpowers/plans/2026-05-08-student-dashboard.md`
- 使用 TDD 风格的 source-level RED/GREEN 检查覆盖关键约束：
  - 不再链接 `/apply`
  - 使用 `router.replace('/login')`
  - 渲染 Welcome Card
  - `StatusTracker` 接收 `submittedAt`
  - Progress card 显示 `Application Progress`
  - 用户可见文案不出现 `Rejected`

### Changes made
1. **Dashboard page refactor** (`pages/dashboard.jsx`)
   - 保留现有 Supabase `applications` 查询链与 `.maybeSingle()`
   - 登录缺失与 logout 跳转改为 `router.replace('/login')`
   - 移除旧 hero 区、`ApplicationSummary` 渲染、raw Application ID 展示
   - 移除空态 `/apply` CTA，避免跳转到未实现页面
   - 新增 Welcome Card、四列 application info grid、status badge、submitted-only info banner
   - 新增 email notification footer line

2. **Status tracker redesign** (`components/portal/StatusTracker.jsx`)
   - 改为 `Application Progress` 卡片
   - 固定 3 步：Application Submitted、Interview Scheduled、Offer Sent
   - 根据 `submitted` / `interview` / `offer` / `rejected` status 显示对应 completed、active、inactive 状态
   - `rejected` 状态前端展示为 reviewed copy，stepper 冻结在 Step 1
   - Step 1 sub-label 使用 `submitted_at` 格式化日期；后续 inactive 步骤显示 `Pending`

3. **Dashboard CSS update** (`styles/dashboard.module.css`)
   - 页面背景改为 `--color-gray-light`
   - 顶栏改为 64px 白底、logo + student name + logout
   - 新增 welcome card、info grid、status badge、submitted info banner、empty/error state、notification line 样式
   - 移动端下 Welcome Card 与 info grid 改为纵向堆叠

4. **Stepper CSS update** (`styles/statusTracker.module.css`)
   - 新增 progress card 样式
   - cyan completed nodes、cyan outlined pulsing active node、gray inactive nodes
   - desktop horizontal stepper 与 mobile vertical stepper 均已覆盖

### Verification
Source-level dashboard spec checks:
```
node - <<'NODE'
...
NODE
```

Result: passed with exit code 0.

Build:
```
npm run build
```

Result:
```
✓ Compiled successfully in 792ms
✓ Generating static pages using 9 workers (9/9) in 50ms
```

Static residual check:
```
rg -n "href=\"/apply\"|Start Your Application|Application ID|Rejected" pages/dashboard.jsx components/portal/StatusTracker.jsx styles/dashboard.module.css styles/statusTracker.module.css
```

Result: no matches.

## Session: 2026-05-08 — Comprehensive Technical Alignment Report

### Background
用户需要一份面向后续开发与 review 的全面技术对齐报告，要求让协作者在不通读全部源代码的情况下，也能清楚理解当前项目架构、实现范围、进度、接口依赖、组件分层与主要缺口。

### Changes made
- 通读项目主干代码、现有产品文档、登录门户上下文文档与最近提交记录
- 基于“当前代码事实优先”的原则，整理官网/登录门户混合仓的真实实现状态
- 新增交接文档：`docs/technical-alignment-report.md`

### Report coverage
- 项目定位与当前实现范围
- 技术栈、目录结构与页面/路由现状
- Supabase 认证流、Dashboard 数据流与 `applications` 数据契约
- 组件分层、样式体系、静态资源情况与文档体系
- 当前进度判断、代码/文档偏差、风险项与推荐后续开发顺序

## Session: 2026-05-08 — Increase Login Portal Logo Scale

### Background
用户反馈 YondeLabs logo 仍不够显眼，要求继续放大 logo，其他布局保持不变。

### Changes made
- 放大 desktop 左侧 `.lpLogoImg`：提升顶部品牌识别度
- 放大 desktop 右侧 `.rightLogoImg`：增强登录卡片内品牌存在感
- 同步放大 mobile 下的两个 logo 尺寸覆盖

### Verification
```
npm run build
```

Result:
```
✓ Compiled successfully in 830ms
✓ Generating static pages using 9 workers (9/9) in 56ms
```

Local route smoke check:
```
curl -I http://localhost:3000/login
HTTP/1.1 200 OK
```

## Session: 2026-05-08 — Remove Right-Side Background Tint

### Background
用户反馈右侧登录卡片下方仍有一片蓝色蒙版区域，要求彻底去掉右侧独立底色，让左右背景完全统一。

### Changes made

1. **Removed right-side cyan/radial tint** (`styles/portal.module.css`)
   - 从 `.authPage` 背景中移除右侧 `radial-gradient`
   - 将整页背景改为单一 `hero1.jpg` + 统一深蓝透明 overlay
   - 去掉右侧偏 cyan 的渐变终点，减少登录卡片下方的独立色块感

2. **Unified background layer ownership** (`styles/portal.module.css`)
   - 停用左侧 `.photoBg` 和 `.photoOverlay`
   - 避免左侧、右侧各自使用不同背景层导致视觉断层
   - 保留左侧 `.gridPattern`、文案、marquee 和右侧 form card

### Verification
```
npm run build
```

Result:
```
✓ Compiled successfully in 789ms
✓ Generating static pages using 9 workers (9/9) in 53ms
```

Local route smoke check:
```
curl -I http://localhost:3000/login
HTTP/1.1 200 OK
```

## Session: 2026-05-08 — Login Logo Scale & Unified Background Pass

### Background
用户提出两个视觉修正：两个 YondeLabs logo 需要更显眼；右侧登录区域不要再有独立蓝色分割背景，应和左侧 hero 图片/蓝色场景打通统一。

### Changes made

1. **Logo scale increased** (`styles/portal.module.css`)
   - 放大左侧 `.lpLogoImg`，提升第一屏品牌识别度
   - 放大右侧 `.rightLogoImg`，让登录卡片内 logo 更接近参考图存在感
   - 同步调整移动端 logo 尺寸覆盖

2. **Unified page background** (`styles/portal.module.css`)
   - 将 `.authPage` 改为同一张 `hero1.jpg` + 蓝色 overlay 的整页背景
   - 移除 `.rightPanel` 自己的 radial/linear 背景，改为透明
   - 隐藏 `.rightPanel::before` / `.rightPanel::after` 圆线装饰，减少左右分区感
   - 移动端 `.rightPanel` 也改为透明，保持背景连续

### Verification
```
npm run build
```

Result:
```
✓ Compiled successfully in 900ms
✓ Generating static pages using 9 workers (9/9) in 53ms
```

Local route smoke check:
```
curl -I http://localhost:3000/login
HTTP/1.1 200 OK
```

## Session: 2026-05-08 — Login Layout Correction After Visual Feedback

### Background
用户反馈上一版误解了参考图用途：参考图只用于字体和排版参考，底部大学 logo 区域的原有 marquee 动效、蒙版和渲染方式需要保留；同时桌面端页面不应超过一屏高度。

### Changes made

1. **Restored university logo marquee behavior** (`styles/portal.module.css`)
   - 恢复 `.marqueeTrack` 的 `seamlessScroll 36s linear infinite`
   - 恢复 hover 暂停动画
   - 恢复 `.marqueeOuter` 两侧渐隐 mask
   - 恢复原先 logo 尺寸、filter、mix-blend-mode、opacity 和 shape-specific sizing
   - 保留 `AuthCard.jsx` 中已存在的三倍 logo 数组结构

2. **Compressed desktop vertical rhythm** (`styles/portal.module.css`)
   - 将 desktop `.authPage` 固定为 `100svh` 并隐藏溢出，避免页面出现上下滚动
   - 压缩 left panel padding、标题字号、pill 间距、描述字号
   - 压缩 right form card padding、logo 间距、标题尺寸、输入框高度、按钮高度和 divider spacing
   - 移除上一版按钮伪元素箭头，避免引入额外视觉内容

3. **Mobile behavior preserved**
   - 在 `max-width: 980px` 下恢复 `height: auto` 和 `overflow: visible`
   - 移动端仍可自然堆叠，避免小屏内容被桌面的一屏限制裁切

### Verification
```
npm run build
```

Result:
```
✓ Compiled successfully in 897ms
✓ Generating static pages using 9 workers (9/9) in 60ms
```

Local route smoke check:
```
curl -I http://localhost:3000/login
HTTP/1.1 200 OK
```

## Session: 2026-05-07 — Login Portal Reference Layout Pass

### Background
根据用户提供的参考图，优化 login portal 前端布局，让页面更接近“左侧沉浸式品牌大标题 + 右侧悬浮登录卡片”的视觉结构。内容和 Supabase 认证流程保持不变。

### Changes made

1. **AuthCard 右侧结构调整** (`components/portal/AuthCard.jsx`)
   - 在 `.rightPanel` 内新增 `.formCard` 容器
   - 将右侧 logo、eyebrow、标题、副标题和表单内容全部包进悬浮卡片
   - 未修改认证表单业务逻辑

2. **Login portal 桌面布局重排** (`styles/portal.module.css`)
   - 将整体背景改为深蓝到青蓝的全屏场景背景
   - 左侧标题放大并收紧行距，`know.` 保持亮青强调
   - 为标题下方新增短 cyan 横线，贴近参考图节奏
   - Partner Institutions 区域改成更像参考图底部 logo tray 的静态横条
   - 右侧从整块浅灰 panel 改为蓝青背景中的独立玻璃感表单卡片
   - 输入框、按钮、分割线、提示文字间距按参考图重新统一

3. **Responsive adaptation** (`styles/portal.module.css`)
   - 将堆叠断点提前到 `980px`，避免平板宽度左右分栏过挤
   - 移动端保留顶部品牌 hero，右侧卡片变为全宽表单
   - 小屏幕下收紧卡片 padding、输入框高度和辅助文字尺寸

### Verification
```
npm run build
```

Result:
```
✓ Compiled successfully in 955ms
✓ Generating static pages using 9 workers (9/9) in 51ms
```

Local route smoke check:
```
curl -I http://localhost:3000/login
HTTP/1.1 200 OK
```

Local dev server:
```
http://localhost:3000/login
```

## Session: 2026-05-07 — Repository Orientation & Login Portal Context

### Background
通读项目目录、文档、页面路由、portal 组件与样式，梳理当前官网与 login 系统的前端结构，为后续完善登录系统 UI 做准备。

### Files reviewed
- `CLAUDE.md`, `Spec.md`, `YondeLabs_PRD.md`, `PROJECT_INFO.txt`
- `docs/ai-context/login-website-context-alignment.md`
- `pages/login.jsx`, `pages/register.jsx`, `pages/forgot-password.jsx`, `pages/reset-password.jsx`, `pages/auth/callback.jsx`, `pages/dashboard.jsx`
- `components/portal/AuthCard.jsx`, `components/portal/PasswordInput.jsx`, `components/portal/StatusTracker.jsx`, `components/portal/ApplicationSummary.jsx`
- `styles/portal.module.css`, `styles/dashboard.module.css`, `styles/statusTracker.module.css`, `styles/applicationSummary.module.css`, `styles/globals.css`
- `lib/supabaseClient.js`, `proxy.js`, `package.json`, `next.config.js`

### Findings
- Current app is Next.js Pages Router with JavaScript/JSX and CSS Modules.
- Login portal UI is centered around `AuthCard.jsx`, `PasswordInput.jsx`, and `portal.module.css`.
- Supabase auth flows are implemented for login, register, forgot password, reset password, callback handling, and student dashboard.
- Legacy static website files remain as visual/content reference, while `pages/index.js` is currently a Coming Soon placeholder.
- Existing uncommitted UI work is present in `AuthCard.jsx` and `portal.module.css`.

### Build verification
```
npm run build
```

Result:
```
✓ Compiled successfully in 867ms
✓ Generating static pages using 9 workers (9/9) in 51ms
```

### Known remaining gaps
- `/admin` page and admin components are not implemented.
- `/apply` is referenced but not implemented in this workstream.
- `verify-email.jsx` is specified but not present.

## Session: 2026-05-06 — Login Portal Code Review & Optimization

### Background
对 login 门户分区（Assisi 负责的认证系统）进行了系统性 code review，随后按 Superpowers 方法论的 surgical changes 原则逐项优化。

### Commits (main branch)

```
8fcb9c8 fix: add env validation to supabaseClient
5cca27d refactor: extract callback inline styles to CSS Module, add StrictMode guard
f69ad22 refactor: extract PasswordInput component to eliminate 5x SVG duplication
1e97fc5 fix: replace imperative DOM in AuthCard logo with declarative useState
db6e7fa backup: initial commit before login portal optimization
```

### Changes made

1. **AuthCard 命令式 DOM → 声明式 state** (`components/portal/AuthCard.jsx`)
   - `document.getElementById('yl-fallback')` + 手动 `style.display` 替换为 `useState(false)` + 条件渲染
   - 不再渲染隐藏的 fallback DOM 节点

2. **提取 PasswordInput 共享组件** (`components/portal/PasswordInput.jsx` — 新建)
   - 3 个页面中 5 处重复的 SVG 眼标图标 + 各自的 show/hide state 合并为 1 个组件
   - 支持 `label`, `value`, `onChange`, `hint`, `extra`, `placeholder` props
   - 替换了 `login.jsx`, `register.jsx`, `reset-password.jsx` 中的重复代码
   - 净减少 ~60 行

3. **callback 页面内联样式 → CSS Module** (`styles/callback.module.css` — 新建)
   - 30+ 行内联 style 对象 + `<style>` 标签替换为标准 CSS Module
   - 同时添加 `useRef` guard 防止 React Strict Mode 下 useEffect 双重执行

4. **supabaseClient 环境变量校验** (`lib/supabaseClient.js`)
   - 启动时检查 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 缺失时抛出清晰错误，而非后续出现晦涩的 Supabase 内部错误

### Build verification
```
▲ Next.js 16.2.4 (Turbopack)
✓ Compiled successfully in 802ms
✓ Generating static pages (9/9) in 58ms
```

### NOT changed (intentionally skipped)
- `decodeMessageParam` 防御性函数 — 保留（无害但不必要）
- `setTimeout` in reset-password — Next.js Router 有 unmount 保护
- login.jsx security shield SVG — 单次使用，不算重复

### Known remaining issues from code review
- Admin panel (`pages/admin/`, `components/admin/`) — 未创建
- `pages/api/admin/update-status.js` — 未创建
- Spec 中的 `verify-email.jsx` — 未创建
- `pages/index.js` — 占位页，Ashlyn 负责
- 项目页 (`ra.jsx`, `irp.jsx`, `passion-project.jsx`, `isef.jsx`) — Ashlyn 负责
- `/apply` 页面 — Ashlyn 负责

### Project conventions (from Spec.md)
- Next.js Pages Router（非 App Router）
- JavaScript (.jsx / .js)，不使用 TypeScript
- 纯 CSS Modules，不使用 Tailwind 等库
- Supabase 统一认证和数据库
- `lib/supabaseClient.js` 为唯一共享客户端
- 中间件文件: `proxy.js`
- 不新增 npm 依赖除非 spec 要求
