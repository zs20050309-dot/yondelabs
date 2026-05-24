# Supabase 数据库迁移指南 — 加 draft 状态

**Migration 文件：** `2026-05-24_add_draft_status.sql`
**用途：** 让新版内置申请表单（自动草稿 + 原生提交流程）能正常工作。
**预计耗时：** 5 分钟。

这份指南面向**没在 Supabase 跑过 SQL migration 的人**。如果你看到的界面跟下面写的不一样，**先停下来问工程师，别瞎猜**。

---

## 这次迁移为什么必须做

目前 `applications` 表的 `status` 列只允许四个值：

```
submitted   →   interview   →   offer   /   rejected
```

新版表单需要第五个状态：**`draft`**。学生一打开表单就在数据库里建一条 `draft` 记录，之后每 2 秒自动保存一次。最终他点 **Submit** 时，这条记录的状态从 `draft` 翻成 `submitted`。

**不跑这次 migration 会发生什么：**
- 自动保存会失败（数据库拒绝它不认识的 `draft` 状态）。
- 学生根本进不到新版表单。

跑完之后一切自动工作。

---

## 这次迁移改了什么

**三个小改动，全部是新增类，不破坏任何已有数据：**

1. **让 `draft` 进 status 的 CHECK 约束。** 现有的行（目前都是 `submitted` / `interview` / `offer` / `rejected`）原封不动。
2. **加一个索引**，在 `(user_id, program, status)` 上，让 app 查"某学生在某 program 的草稿"更快。
3. **加一条 RLS 策略**，叫 `student_update_own_draft`，让已登录学生能编辑并提交**他自己的草稿** —— 也仅限他自己的草稿。别人的任何一行他都碰不到。

整个 migration 是**幂等的** —— 跑多次也没关系。每条语句都用了 `IF EXISTS` / `IF NOT EXISTS` 的写法。

---

## 一步一步操作

### 第 1 步：打开 Supabase Dashboard

1. 浏览器打开 <https://supabase.com/dashboard>。
2. 登录。
3. 点 **YondeLabs** 项目（或者你给项目起的别的名字）。

### 第 2 步：打开 SQL Editor

左边侧边栏里找到 **SQL Editor**（图标是一个数据库带 `>_` 符号），点进去。

然后点页面顶部的绿色按钮 **+ New query**。

右边会出现一个空白的文本编辑框。

### 第 3 步：粘贴 migration 的 SQL

在代码编辑器里（Cursor / VS Code 之类）打开这个文件：

```
docs/sql/migrations/2026-05-24_add_draft_status.sql
```

**复制整份文件的内容** —— 包括注释，整段都要。粘贴到 Supabase SQL Editor 那个文本框里。

注释看起来颜色不一样不用慌 —— Supabase 自己给注释做了高亮。实际起作用的是 SQL 语句。

### 第 4 步：运行 migration

点 SQL Editor 右下角绿色的 **Run** 按钮（或者按快捷键 **Cmd+Enter** / **Ctrl+Enter**）。

屏幕底部应该弹出**三个结果块**：

| 块 | 看到什么意味着对了 |
|---|---|
| 第 1 块 | `CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, …]))` —— 证明 CHECK 约束现在允许 `'draft'` |
| 第 2 块 | 一行：`idx_applications_user_program_status` —— 证明索引建好了 |
| 第 3 块 | 一行：`student_update_own_draft` + `UPDATE` —— 证明 RLS 策略生效了 |

**三个块都看到了 = 迁移成功，结束。**

### 第 5 步（可选保险检查）：手动验证一下

还在 SQL Editor 里，粘贴下面这段 → Run：

```sql
-- 这个 SELECT 应该在允许值列表里看到 'draft'
SELECT pg_get_constraintdef(c.oid) AS allowed_statuses
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'applications' AND c.conname = 'applications_status_check';
```

预期输出：

```
CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'interview'::text, 'offer'::text, 'rejected'::text]))
```

只要里面出现 `'draft'::text` 就 OK。

---

## 如果出问题怎么办

### 报错："constraint applications_status_check does not exist"

**没关系。** migration 用了 `DROP CONSTRAINT IF EXISTS`，所以会安静跳过，然后照常加新的。只要最后的三个验证查询返回预期结果，就说明全跑通了。

### 报错："relation applications does not exist"

说明最初的 `applications` 表都还没建。先去跑 `Spec.md` 第 3.1 节里的初始建表 SQL（`CREATE TABLE applications …`），再回来跑这次迁移。

### 报错："policy student_update_own_draft already exists"

理论不该出现 —— migration 一开始就 `DROP POLICY IF EXISTS`。万一真出现了，重新跑一次整份文件就好，第二次一定干净通过。

### 验证查询返回零行

说明 migration 实际上没跑成功。看一下 SQL Editor 里结果块上方有没有红色错误信息，最常见是粘贴的时候漏了字符。把文件整段重新拷一遍粘贴再跑。

### 其他奇怪情况

把 SQL Editor 截图（完整的 query + 结果或错误都要），发给我或工程师。**别再继续乱跑 SQL 想着"修一下"** —— 先把实际状态看清楚再说。

---

## 跑完之后

Supabase 这边**不用再做任何事**。app 代码会自动：

- 学生第一次打开表单时，建一条 `draft` 记录
- 学生打字时，每 2 秒更新这条记录
- 学生点 Submit 时，把这条记录翻成 `submitted`（并设置 `submitted_at`）

**草稿永久保留，没有清理任务。** 这是故意的 —— 草稿 JSON 占的磁盘空间可以忽略不计，不值得为了"省"而冒错删用户数据的风险。

---

## 这些文件在代码库里的位置

- **Migration SQL：** `docs/sql/migrations/2026-05-24_add_draft_status.sql`
- **本指南：** `docs/supabase-migration-guide.md`
- **原始表设计文档：** `Spec.md`（第 3.1 节）

将来再有 migration 时，会在 `docs/sql/migrations/` 下加新文件（带日期前缀），本指南也会新加一节链接到它。
