# 探索报告: CineKit 方案完善 — 确保极高可用性

**日期**: 2026-06-06
**探索者**: AI Explorer

---

## 1. 问题与范围

**核心问题**: 在"Skills + CLI"模式下，如何确保 CineKit 在落地时有极高的可用性——用户零摩擦上手、CLI 稳定可靠、Launcher Skill 真正有用而非添乱？

**探索范围**:
- 包含: CLI 设计、Launcher Skill 设计、PROGRESS.md 设计、文档版本化、失败模式、初始化体验、更新机制
- 不包含: 具体 Skill 的写作内容、UI 设计、多语言支持、非 Claude Code 平台

---

## 2. 核心洞察 (Key Insights)

> **洞察 1 — CLI 必须比 ANWS 更"笨"**: ANWS 的 init 有 6 个交互式选择步骤（target、locale、冲突覆盖），对写作者来说是灾难。CineKit 的 init 应该零交互，一键创建，用户事后配置。

> **洞察 2 — PROGRESS.md 的核心矛盾**: 创作不是工程。软件工程的文档漂移需要"纠正"，但创意写作的"漂移"往往是灵感发现。PROGRESS.md 必须区分"事实记录"（机器可写）和"创作意图"（人可改），且永远不强制后者匹配前者。

> **洞察 3 — Launcher Skill 最大的风险是"太聪明"**: 它应该是一个哑路由器——检测状态、汇报进度、路由技能。决不能替用户做创意判断。如果它在"帮我写剧本"和"让我看看进度"之间犹豫，就已经失败了。

> **洞察 4 — 按需加载技能（à la carte）远优于全量安装**: ANWS 一次性安装 13 个 skill + 11 个 command，用户打开 `.claude/commands/` 会懵。CineKit 应该支持 `ck add-skill <name>` 按需安装，Launcher 根据已安装的技能动态路由。

> **洞察 5 — "首次体验"决定生死**: 用户运行 `npm install -g cinekit && ck init` 后 30 秒内的体验决定是否会继续使用。如果 init 后用户不知道下一步做什么，产品就死了。

---

## 3. 详细发现

### 3.1 Skills + CLI 模式的成败关键

**探索方式**: 🔍🧠 混合（ANWS 源码分析 + 发散思考）

**发现**:

ANWS 的成功在于边界清晰：
- CLI = 纯粹的文件分发器（安装、更新、状态记录）
- Skills = 全部的智能行为（分析、生成、审查）
- 两者通过 **RESOURCE_REGISTRY + Projection Plan** 桥接

但 ANWS 也有明显的可用性问题：
1. **init 交互过多**: 选择 target → 选择 locale → 确认覆盖 → 5+ 次交互
2. **全量安装**: 无论项目类型，安装全部 24 个资源
3. **AGENTS.md 过重**: AUTO block 合并策略对非技术用户不友好
4. **检测机制脆弱**: sentinel 文件检测容易因手动删除文件而漂移

**CineKit 改进方向**:

| ANWS 做法 | 问题 | CineKit 改进 |
|----------|------|-------------|
| 多 target 交互选择 | 写作者不理解"target IDE" | 硬编码 Claude Code，零交互 |
| 全量安装所有 skill | 24 个文件，用户不知所措 | `ck add-skill` 按需安装，初始只装 Launcher |
| AGENTS.md AUTO block | 合并策略复杂 | PROGRESS.md 用 `<!-- CINEKIT: -->` 标记保护区 |
| sentinel 文件检测 | 脆弱 | 直接用 install-lock.json 作为唯一真相源 |

---

### 3.2 CLI 命令设计（最小可行 + 扩展性）

**探索方式**: 🧠 发散

**核心命令**:

#### `ck init [path]`
- **零交互**。不接受任何交互式选择（除非 `--interactive` 显式指定）
- 创建内容：
  ```
  .claude/
  ├── commands/
  │   └── cinekit.md          # Launcher command
  └── skills/                  # 空目录，等待 ck add-skill
  .cinekit/
  ├── install-lock.json
  ├── PROGRESS.md
  └── v1/
      ├── 00_MANIFEST.md
      ├── 01_BRIEF.md          # 创作简报（替代 PRD，更适合写作）
      ├── 05_OUTLINE.md        # 创作大纲（替代 TASKS）
      └── 06_CHANGELOG.md
  CLAUDE.md                    # 自动创建/更新
  ```
- `--name` 参数设置项目名称（写入 PROGRESS.md）
- `--skill` 参数可重复，指定初始安装的 skill（如 `--skill screenwriter`）

#### `ck add-skill <skill-id>`
- 从内置 registry 安装指定 skill 到 `.claude/skills/`
- 支持 `ck add-skill --list` 查看可用 skill 列表
- 如果是 command 类型（`type: command`），安装到 `.claude/commands/`

#### `ck status`
- 读取 PROGRESS.md + install-lock.json
- 输出：
  - CLI 版本（是否最新）
  - 项目名称和版本
  - 已安装 skill 列表
  - 当前进度摘要（从 PROGRESS.md 解析）
  - 上一次 update 时间

#### `ck update`
- 对比 install-lock 中的模板版本与当前 CLI 版本
- 更新 managed files（skills、commands、模板）
- 生成 changelog
- 保留 PROGRESS.md 用户区域

**为什么不要 `ck remove-skill`？** 初期不做。用户手动删除 `.claude/skills/<name>/` 即可。简单的文件系统操作不需要 CLI 包装。

---

### 3.3 PROGRESS.md 设计 — 防止文档漂移

**探索方式**: 🧠 发散

**核心设计原则**:

```
PROGRESS.md 分为两个区域：

┌──────────────────────────────────┐
│  <!-- CINEKIT:HEADER -->         │  ← 机器写入区
│  项目名、版本、CLI 版本、日期     │     ck init/update 自动维护
│  <!-- /CINEKIT:HEADER -->        │
├──────────────────────────────────┤
│                                  │
│  用户自由编辑区                    │  ← 人类编辑区
│  - 项目描述                       │     skills 和用户都可以修改
│  - 创作笔记                       │
│  - 当前思路                       │
│                                  │
├──────────────────────────────────┤
│  <!-- CINEKIT:TASKS -->          │  ← 机器可读区
│  ## 任务进度                      │     skills 执行后自动勾选
│  - [x] 概念设计                   │     用户也可以手动勾选
│  - [ ] 分场大纲                   │
│  <!-- /CINEKIT:TASKS -->         │
├──────────────────────────────────┤
│  <!-- CINEKIT:MANIFEST -->       │  ← 机器写入区
│  ## 产出文档                      │     ck init/update 自动维护
│  | 文件 | 状态 | 路径 |           │
│  <!-- /CINEKIT:MANIFEST -->      │
└──────────────────────────────────┘
```

**关键创新**: "任务区"不是强制计划，而是"记录板"：
- Skill 执行完一个步骤后，可以勾选对应任务
- 用户可以随时添加/删除/重排任务
- 不存在"计划 vs 实际"的冲突——任务区记录的是"当前意图"，不是"历史承诺"

**与 ANWS AGENTS.md 的关键差异**:
- ANWS: AGENTS.md 是 AI 的"行为契约"，定义了工作流纪律和不可变规则
- CineKit: PROGRESS.md 是"项目仪表盘"，追踪状态但不断言规则
- 规则和纪律放在 skills 的 SKILL.md 中（如 screenwriter 的"写作红线"），不放在 PROGRESS.md

---

### 3.4 Launcher Skill 精确定义

**探索方式**: 🧠 发散 + 🔍 ANWS quickstart 参考

**设计原则**: 
1. **哑路由，不哑体验** — 路由逻辑简单，但输出的人话要自然
2. **首次使用零摩擦** — 检测到没有 `.cinekit/` 时，不是报错，而是引导
3. **后续使用无感** — 如果一切正常，一句话汇报状态然后退出

**触发条件**:
- 用户说 `/cinekit`（显式调用）
- 用户说"帮我开始一个创作项目"、"我要写剧本"、"看看我的项目进度"

**工作流**:

```
用户输入 → Launcher Skill
  │
  ├─ Step 0: 环境检测
  │   运行 ck status（如 CLI 未安装，引导 npm install -g cinekit）
  │
  ├─ Step 1: 项目状态检测
  │   检查 .cinekit/install-lock.json 是否存在
  │
  ├─ 情况 A: 项目未初始化
  │   → "看起来你还没有 CineKit 项目。我可以帮你创建一个。
  │      你的项目叫什么名字？想做什么类型的创作？"
  │   → 收集信息后运行 ck init --name "..." --skill screenwriter
  │   → "项目已创建！下一步：跟我说'开始写剧本'来启动编剧工作流。"
  │
  ├─ 情况 B: 项目已初始化，有活跃任务
  │   → 读取 PROGRESS.md
  │   → "你的项目'xxx'当前进度：概念设计 ✅，人物设定 ✅，分场大纲 ⏳
  │      要继续分场大纲吗？还是想做其他事情？"
  │
  ├─ 情况 C: 项目已初始化，无活跃任务
  │   → "你的项目'xxx'目前没有进行中的任务。
  │      可用的创作技能：编剧、风格分析、修辞评审。
  │      你想做什么？"
  │
  └─ 情况 D: CLI 版本过期
      → "cinekit CLI 有新版本可用 (1.1.0 → 1.2.0)。
         运行 npm update -g cinekit && ck update 来升级。"
```

**关键约束**:
- Launcher 不做任何创意决策
- Launcher 不预设用户"应该"用什么 skill
- 路由基于"已安装的 skill"而非"假设的 skill"
- 每次对话只说当前最相关的 1-3 条信息，不倾倒全部状态

---

### 3.5 按需安装的 Skill Registry

**探索方式**: 🧠 发散

**内置 Skill Registry 设计**:

```javascript
const SKILL_REGISTRY = [
  {
    id: "screenwriter",
    name: "山音编剧大师",
    type: "skill",
    description: "全格式影视编剧",
    source: "skills/screenwriter/SKILL.md",
    dependencies: [],
    category: "writing"
  },
  {
    id: "narrative-analysis",
    name: "叙事分析",
    type: "skill",
    description: "叙事学分析工具",
    source: "skills/narrative-analysis/SKILL.md",
    dependencies: [],
    category: "analysis"
  },
  {
    id: "rhetoric-review",
    name: "修辞评审",
    type: "skill",
    description: "修辞学审查",
    source: "skills/rhetoric-review/SKILL.md",
    dependencies: [],
    category: "review"
  },
  {
    id: "style-extractor",
    name: "风格提取",
    type: "skill",
    description: "作家风格分析",
    source: "skills/style-extractor/SKILL.md",
    dependencies: [],
    category: "analysis"
  }
];
```

**为什么这是 ANWS 的重要改进**:
- ANWS: 24 个资源一次性安装，用户需要在 24 个文件中找到自己需要的
- CineKit: 用户按需安装，"我需要编剧功能" → `ck add-skill screenwriter` → 只装 1 个 skill
- Launcher 可以检测已安装的 skill 并据此提供路由建议

---

### 3.6 创意写作特有失败模式与预防

**探索方式**: 🧠 发散

| 失败模式 | 症状 | 预防机制 |
|---------|------|---------|
| **计划与灵感的冲突** | 用户写到一半发现新方向，但 PROGRESS.md 的任务还指向旧方向 | PROGRESS.md 任务区使用"记录板"模式而非"合同"模式；用户可随时修改；skill 执行时不验证"是否按计划" |
| **创作卡壳循环** | Skill 要求用户提供创意输入，用户给不出，skill 反复追问 | 所有 skill 必须有"跳过"选项；Launcher 提供"换个方向"的逃生路径 |
| **版本爆炸** | 用户反复修改，生成 v1/v2/.../v20 | `.cinekit/v{N}/` 仅由用户显式触发创建（`ck version` 命令），不自动生成 |
| **模板恐惧** | 用户看到 01_BRIEF.md 等"正式文档"感到压力，不敢开始写 | 模板内容极简（3-5 行引导），标题避免使用"需求文档"等工程术语，改用"创作简报""创作大纲" |
| **CLI 与 Skill 的不同步** | Skill 假设某个文件存在但 CLI 未创建 | Launcher 在路由前验证项目完整性；Skill 在开头检查所需文件 |
| **用户不知道有哪些 skill** | 安装了 screenwriter 但不知道还有其他 skill | `ck add-skill --list` + Launcher 在汇报状态时列出可用但未安装的 skill |

---

### 3.7 初始化体验详细设计

**探索方式**: 🧠 发散 + 🔍 ANWS init 源码分析

**对比 ANWS 的 init 流程问题**:

ANWS `init.js` 的流程：
1. `detectInstallState` — 读 lock + 扫描目录
2. `resolveRetainedTargetIds` — 检测已有 target
3. `selectTargets` — **交互式多选 target**（用户困惑点 #1）
4. `resolveTemplateLocaleForInit` — **交互式选择语言**（用户困惑点 #2）
5. 对每个 target 循环：**检测冲突 → 确认覆盖**（用户困惑点 #3）
6. 写入文件 → 写入 lock → 打印 summary

CineKit 的简化：

```
ck init
  │
  ├─ 1. 检查 .cinekit/install-lock.json
  │     ├─ 存在且有效 → "项目已初始化。使用 ck status 查看状态。"
  │     └─ 不存在 → 继续
  │
  ├─ 2. 创建目录结构
  │     mkdir -p .claude/commands .claude/skills .cinekit/v1
  │
  ├─ 3. 写入文件（全部从模板复制，无交互）
  │     ├─ .claude/commands/cinekit.md        (Launcher Command)
  │     ├─ .cinekit/install-lock.json         (状态锁)
  │     ├─ .cinekit/PROGRESS.md               (进度追踪)
  │     ├─ .cinekit/v1/00_MANIFEST.md         (版本清单)
  │     ├─ .cinekit/v1/01_BRIEF.md            (创作简报)
  │     ├─ .cinekit/v1/05_OUTLINE.md          (创作大纲)
  │     ├─ .cinekit/v1/06_CHANGELOG.md        (变更记录)
  │     └─ CLAUDE.md                          (创建或合并)
  │
  ├─ 4. 如果指定了 --skill:
  │     安装对应 skill 到 .claude/skills/
  │
  └─ 5. 输出简洁的下一步指引
       "✅ CineKit 项目已创建！
        已安装: Launcher
        下一步: 跟我说'开始创作'来启动你的第一个项目。"
```

**为什么零交互？**
- 写作者不应被技术选择打断创意流程
- 事后配置（装 skill、改名字）比事前选择更符合创作习惯
- ANWS 的交互式 init 适合"我知道我要用什么 IDE"的技术用户，不适合"我只想开始写作"的创作者

---

### 3.8 npm 发布与更新策略

**探索方式**: 🔍🧠 混合

**发布策略**（借鉴 ANWS）:
- npm package name: `cinekit`
- bin: `ck` → `./bin/cli.js`
- 零依赖（像 ANWS 一样只用 Node.js 内置模块）
- 版本号：从 `1.0.0` 开始

**更新周期**:
```
用户侧：npm update -g cinekit  →  ck update
                               │
                               ├─ 对比 install-lock 中的 CLI 版本
                               ├─ 更新 managed files (skills, commands, 模板)
                               ├─ 生成 .cinekit/changelog/v1.0.1.md
                               └─ 更新 install-lock.json
```

**关键保护**:
- `ck update` 永远不触碰 `.cinekit/v{N}/` 中的用户文档
- PROGRESS.md 只更新 CINEKIT:HEADER 和 CINEKIT:MANIFEST 标记区
- CLAUDE.md 只更新 CINEKIT 标记区，保留用户自定义内容
- 如果检测到 install-lock 损坏，从目录扫描重建（不回退到全量重装）

---

## 4. 改进后的完整架构

```
┌─────────────────────────────────────────────────────┐
│                    CineKit 用户视角                    │
├─────────────────────────────────────────────────────┤
│                                                       │
│  1. npm install -g cinekit                            │
│  2. cd my-project && ck init --name "我的剧本"          │
│     → 一键创建完整项目结构（零交互）                      │
│  3. 在 Claude Code 中说 "我要写剧本"                     │
│     → Launcher Skill 检测到未安装 screenwriter          │
│     → "需要安装编剧技能。要现在安装吗？"                    │
│     → ck add-skill screenwriter                       │
│  4. 开始创作 → screenwriter skill 工作流                │
│     → 每步完成后更新 PROGRESS.md 任务区                  │
│  5. 随时查看进度: /cinekit (或 "看看项目进度")            │
│  6. 升级: npm update -g cinekit && ck update           │
│                                                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    CineKit 内部架构                    │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐   调用    ┌──────────────┐          │
│  │ Launcher     │────────▶│ CLI (ck)      │          │
│  │ Skill        │          │              │          │
│  │ /cinekit     │◀────────│ init/status/  │          │
│  │              │  输出    │ update/       │          │
│  │ • 环境检测    │          │ add-skill     │          │
│  │ • 状态汇报    │          └──────┬───────┘          │
│  │ • 技能路由    │                 │ 读写              │
│  │ • 升级提醒    │          ┌──────▼───────┐          │
│  └──────┬───────┘          │ .cinekit/    │          │
│         │ 路由              │ install-lock │          │
│         ▼                  │ PROGRESS.md  │          │
│  ┌──────────────┐          │ v1/*.md      │          │
│  │ Writing      │          └──────────────┘          │
│  │ Skills       │                                    │
│  │ • screenwriter│        ┌──────────────┐          │
│  │ • narrative   │        │ .claude/     │          │
│  │ • rhetoric    │        │ commands/    │          │
│  │ • style       │        │ skills/      │          │
│  └──────────────┘        └──────────────┘          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 5. 行动建议

| 优先级 | 建议 | 理由 |
|:------:|------|------|
| **P0** | `ck init` 必须零交互、30 秒内完成 | 首次体验决定生死 |
| **P0** | Launcher Skill 必须"哑"——只做路由和状态汇报 | 防止 AI 越权做创意判断 |
| **P0** | PROGRESS.md 使用标记区隔离机器/人类编辑域 | 解决文档漂移的核心机制 |
| **P1** | 实现 `ck add-skill` 按需安装 | 避免 ANWS 式全量安装的信息过载 |
| **P1** | 模板内容极简化，标题去工程化 | "创作简报"而非"产品需求文档" |
| **P1** | Launcher 在每步路由前验证项目完整性 | 防止 skill 假设的文件不存在 |
| **P2** | 添加 `ck version` 命令手动创建新版本目录 | 版本控制由用户主导 |
| **P2** | Launcher 提供"可用但未安装的 skill"发现 | 帮助用户探索能力边界 |
| **P2** | 支持 `ck init --interactive` 高级模式 | 为有经验的用户保留选项 |

---

## 6. 局限性与待探索

- [ ] **多项目协同**: 如果用户同时有多个创作项目，Launcher 如何区分？（当前假设单项目）
- [ ] **Skill 之间的数据共享**: screenwriter 产出的角色设定如何被 narrative-analysis 消费？（当前未设计数据层）
- [ ] **备份与导出**: 用户如何把 `.cinekit/v1/` 中的文档导出为可分享的格式？
- [ ] **CLI 安装失败时的降级策略**: 如果用户无法安装 npm 包，Launcher 能否纯手动模式运行？
- [ ] **PROGRESS.md 的并发编辑**: 如果用户和 skill 同时修改，如何避免冲突？

---

## 7. 参考来源

1. ANWS 源码分析: `ANWS/src/anws/lib/init.js`, `update.js`, `install-state.js`, `manifest.js`, `copy.js`, `adapters/index.js`
2. ANWS README_CN.md: spec-driven workflow 设计理念
3. shanyin-screenwriter-pro/SKILL.md: 现有 skill 结构和设计模式
4. `.anws/v1/01_PRD.md`: 现有故事创作插件的需求文档
5. `.anws/v1/concept_model.json`: 现有项目的概念模型和架构设计
