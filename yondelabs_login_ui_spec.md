# YondeLabs Login Portal — UI 优化技术规格文档

**版本：** v1.0  
**日期：** 2026-05-06  
**适用范围：** `components/portal/AuthCard.jsx` · `components/portal/PasswordInput.jsx` · `styles/portal.module.css`  
**不触碰：** Supabase 认证逻辑 · `pages/` 业务层 · TypeScript · 新 npm 包

---

## 0. 改动优先级总览

| 优先级 | 改动项 | 影响文件 |
|--------|--------|----------|
| P0 | 合作机构 Marquee 扩充（内容 + 样式） | `AuthCard.jsx` · `portal.module.css` |
| P0 | CTA 按钮改为亮青渐变 | `portal.module.css` |
| P1 | 右侧面板背景 & 左右视觉融合 | `portal.module.css` |
| P1 | 右侧顶部加 Logo | `AuthCard.jsx` · `portal.module.css` |
| P1 | 输入框 focus 态增强 | `portal.module.css` |
| P2 | Error / Success state 样式打磨 | `portal.module.css` |

---

## 1. P0 — 合作机构 Marquee 扩充

### 1.1 背景

当前 Marquee 仅展示 5–6 所机构，且在视口底部几乎不可见。  
目标：**内容扩充** + **视觉上移** + **样式强化**，让名校背书成为可信度的核心资产。

### 1.2 机构列表（完整版，按学术权威排序）

将 `AuthCard.jsx` 中 `marqueeItems` 数组替换为以下内容。  
每条包含 `label`（显示名）和 `abbr`（缩写，辅助 dot 颜色或未来 icon 扩展）：

```js
const marqueeItems = [
  { label: "MIT CSAIL",         abbr: "MIT"       },
  { label: "Stanford HAI",      abbr: "Stanford"  },
  { label: "Stanford Medicine", abbr: "Stanford"  },
  { label: "Stanford d.school", abbr: "Stanford"  },
  { label: "UC Berkeley",       abbr: "UCB"       },
  { label: "MIT Media Lab",     abbr: "MIT"       },
  { label: "Johns Hopkins",     abbr: "JHU"       },
  { label: "Caltech",           abbr: "Caltech"   },
  { label: "Columbia University", abbr: "Columbia"},
  { label: "Notre Dame",        abbr: "ND"        },
  { label: "Carnegie Mellon",   abbr: "CMU"       },
  { label: "University of Michigan", abbr: "UMich"},
];
```

> **重复策略**：为保证滚动连续无缝，渲染时将数组 spread 两次：  
> `[...marqueeItems, ...marqueeItems]`

### 1.3 Marquee DOM 结构（参考，维持现有结构不破坏）

```jsx
<div className={styles.leftFoot}>
  <p className={styles.partnerLabel}>PARTNER INSTITUTIONS</p>
  <div className={styles.marqueeWrapper}>
    <div className={styles.marqueeTrack}>
      {[...marqueeItems, ...marqueeItems].map((item, i) => (
        <span key={i} className={styles.marqueeItem}>
          <span className={styles.marqueeDot} />
          <span className={styles.marqueeText}>{item.label}</span>
        </span>
      ))}
    </div>
  </div>
</div>
```

### 1.4 CSS 改动 — `portal.module.css`

#### 位置上移

```css
/* 原：leftFoot 在 flex 列底部 */
.leftFoot {
  margin-top: auto;          /* 保持推到底部的行为 */
  padding-bottom: 2.5rem;    /* 原值，保留 */
}
```

**在 `.leftContent` 上加 `justify-content`：**

```css
.leftContent {
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* 让 leftFoot 自然贴底，但不超出视口 */
  height: 100%;
}
```

#### Marquee 动画提速（项目增多后原速度偏慢）

```css
.marqueeTrack {
  display: flex;
  gap: 2rem;
  animation: marqueeScroll 28s linear infinite; /* 原来可能是 20s，适当延长 */
  width: max-content;
}

@keyframes marqueeScroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); } /* 两倍数组，滚一半即无缝 */
}

.marqueeWrapper {
  overflow: hidden;
  /* 两侧渐隐遮罩 */
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
}

.marqueeItem {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.75);
}

.marqueeDot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #06BEE1;  /* 品牌亮青，与左侧 accent 色统一 */
  flex-shrink: 0;
}

.partnerLabel {
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.75rem;
}
```

---

## 2. P0 — CTA 按钮改为亮青渐变

### 目标

将"Sign In"按钮从纯深蓝色改为品牌亮青方向的渐变，提升视觉焦点权重，与左侧 `know.` accent 色形成呼应。

### CSS 改动

```css
.submitButton {
  width: 100%;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #ffffff;

  /* 渐变：主蓝 -> 亮青 */
  background: linear-gradient(135deg, #2541B2 0%, #06BEE1 100%);
  box-shadow: 0 4px 20px rgba(6, 190, 225, 0.25);

  transition: box-shadow 0.2s ease, transform 0.15s ease, filter 0.2s ease;
}

.submitButton:hover:not(:disabled) {
  box-shadow: 0 6px 28px rgba(6, 190, 225, 0.4);
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.submitButton:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(6, 190, 225, 0.2);
}

.submitButton:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}
```

---

## 3. P1 — 右侧面板背景与左右融合

### 问题

右侧纯白与左侧深蓝产生强烈"拼贴感"。

### 改动

```css
.rightPanel {
  background: #F4F7FB;      /* 极浅冷灰蓝，非纯白 */
  /* 或者使用：background: #F7F9FC; */
  
  /* 左侧加细线分隔，替代硬切 */
  border-left: 1px solid rgba(37, 65, 178, 0.08);
}
```

> **不要改动 `leftPanel`**，左侧渐变保持现有深蓝体系。

---

## 4. P1 — 右侧顶部加品牌 Logo

### 目标

用户进入右侧表单区时，第一眼看到品牌标识，增强信任感和品牌一致性。

### AuthCard.jsx 改动

在 `.rightPanel` 的 JSX 顶部（`formEyebrow` 之前）插入：

```jsx
<div className={styles.rightLogoBar}>
  {/* 复用左侧 logo 逻辑，或直接用 img */}
  <img
    src="/logo.png"          /* 根据实际 public/ 路径调整 */
    alt="YondeLabs"
    className={styles.rightLogoImg}
    onError={(e) => {
      e.target.style.display = 'none';
    }}
  />
</div>
```

### CSS 改动

```css
.rightLogoBar {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
}

.rightLogoImg {
  height: 28px;
  width: auto;
  object-fit: contain;
  opacity: 0.85;
}
```

---

## 5. P1 — 输入框 Focus 态增强

### 问题

当前输入框边框浅、内边距小，显得"模板感"较重。

### CSS 改动

```css
.input {
  width: 100%;
  padding: 0.75rem 1rem;           /* 原来可能是 0.6rem，加大内边距 */
  font-size: 0.9375rem;
  color: #1A1A1A;
  background: #FFFFFF;
  border: 1.5px solid #D8E0ED;     /* 加粗并带蓝调 */
  border-radius: 8px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.input:focus {
  border-color: #2541B2;                          /* 品牌主蓝 */
  box-shadow: 0 0 0 3px rgba(37, 65, 178, 0.12); /* 柔和光晕 */
}

.input::placeholder {
  color: #A8B5C9;
}

/* inputWrapper 包裹密码框时同步处理 */
.inputWrapper:focus-within {
  border-color: #2541B2;
  box-shadow: 0 0 0 3px rgba(37, 65, 178, 0.12);
}

.inputWrapper {
  border: 1.5px solid #D8E0ED;
  border-radius: 8px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  overflow: hidden;       /* 确保内部 input 圆角不溢出 */
}

/* inputWrapper 内的 input 去掉自己的 border，由 wrapper 统一控制 */
.inputWrapper .input {
  border: none;
  box-shadow: none;
}
.inputWrapper .input:focus {
  border: none;
  box-shadow: none;
}
```

---

## 6. P2 — Error / Success State 样式打磨

### 目标

让 `errorMessage`、`infoBanner`、`successBanner` 视觉更完善，让用户感知"这个产品是认真做的"。

### CSS 改动

```css
/* ── Error ── */
.errorMessage {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-left: 3px solid #DC2626;
  border-radius: 6px;
  color: #B91C1C;
  font-size: 0.8125rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

/* Error 触发时，输入框也变红边 */
.inputError {
  border-color: #DC2626 !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important;
}

/* ── Info Banner ── */
.infoBanner {
  padding: 0.75rem 1rem;
  background: rgba(6, 190, 225, 0.07);
  border: 1px solid rgba(6, 190, 225, 0.25);
  border-left: 3px solid #06BEE1;
  border-radius: 6px;
  color: #0369A1;
  font-size: 0.8125rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

/* ── Success Banner ── */
.successBanner {
  padding: 0.75rem 1rem;
  background: rgba(22, 163, 74, 0.06);
  border: 1px solid rgba(22, 163, 74, 0.2);
  border-left: 3px solid #16A34A;
  border-radius: 6px;
  color: #15803D;
  font-size: 0.8125rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}
```

---

## 7. 响应式（Mobile ≤ 768px）补充

以下改动需要在现有 `@media (max-width: 768px)` 块内追加或覆盖：

```css
@media (max-width: 768px) {
  /* Marquee 在移动端字号略小 */
  .marqueeItem {
    font-size: 0.7rem;
  }

  /* 右侧 Logo 在移动端也展示（左侧整体隐藏时尤其重要） */
  .rightLogoBar {
    display: flex;
    margin-bottom: 1.5rem;
  }

  /* 按钮在移动端保持全宽 */
  .submitButton {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }
}
```

---

## 8. 改动顺序建议（给 Codex 的执行顺序）

```
Step 1  portal.module.css   →  submitButton 渐变（P0，最快，无结构变动）
Step 2  portal.module.css   →  inputWrapper + input focus 样式（P1）
Step 3  portal.module.css   →  rightPanel 背景色（P1，一行改动）
Step 4  AuthCard.jsx        →  marqueeItems 数组替换（P0，内容）
Step 5  portal.module.css   →  marqueeWrapper mask + marqueeDot 颜色 + 动画时长（P0）
Step 6  AuthCard.jsx        →  rightLogoBar JSX 插入（P1）
Step 7  portal.module.css   →  rightLogoBar + rightLogoImg 样式（P1）
Step 8  portal.module.css   →  errorMessage / infoBanner / successBanner（P2）
Step 9  portal.module.css   →  @media 响应式补充
Step 10 全量：视觉验证（desktop + mobile 两个断点）
```

---

## 9. 验收标准（Definition of Done）

- [ ] 合作机构展示 ≥ 10 所，滚动流畅无跳帧，两侧渐隐生效
- [ ] "Sign In" 按钮呈现蓝→青渐变，hover 有上浮 + 光晕动效
- [ ] 右侧顶部可见 YondeLabs Logo
- [ ] 输入框 focus 时出现蓝色边框 + 浅光晕，无突兀跳变
- [ ] 右侧背景为浅冷灰蓝（非纯白），左右不再有强烈割裂感
- [ ] Error / Info / Success banner 各有独立色彩语义，左侧有 3px 色条
- [ ] 以上改动在 375px（iPhone SE）宽度下无元素溢出或遮挡
- [ ] Supabase 认证流程（login / register / forgot / reset）功能不受影响

---

## 10. 不允许的操作（硬性约束）

- ❌ 不引入 TypeScript
- ❌ 不新增 npm 依赖
- ❌ 不改动 `pages/` 下的业务逻辑层
- ❌ 不修改 Supabase `signInWithPassword` / `signUp` / `updateUser` 调用
- ❌ 不将品牌色改出蓝色体系（`#03256C` · `#2541B2` · `#3266A6` · `#06BEE1`）
- ❌ 不新建组件文件，在现有 `AuthCard.jsx` / `PasswordInput.jsx` 内改动
