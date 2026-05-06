# Progress Log — YondeLabs Web

Last updated: 2026-05-06

---

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
