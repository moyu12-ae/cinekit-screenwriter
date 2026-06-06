# CineKit 重新设计 — 基于 shanyin-screenwriter-pro 本体分析

**日期**: 2026-06-06
**前提**: 认真读完 skill 本体（SKILL.md 230行 + core-methodology.md 1870行 + 4个format文件共~2000行 = 总计~4100行）

---

## 1. 真正的痛点是什么

读完 `shanyin-screenwriter-pro` 后，我理解了你为什么要 ANWS 机制：

### 技能已经有一个"伪持久化系统"但没有基础设施支撑

`core-methodology.md` 第十节 **"记忆检查点系统"** 暴露了一切：

```
═══════════════════════════════════
📌 记忆检查点 #[编号] | [格式] | [当前位置]
═══════════════════════════════════

【已完成进度】当前处于第几步 / 已写到哪个场景
【故事核心】Logline / 主题论点 / 核心戏剧动作
【角色当前状态】物理/情感/认知/欲望
【已完成段落摘要】每个已完成场景一句话
【活跃线索】当前运行中的、必须回应的线索
【伏笔状态】已埋未回扣 / 已回扣
【节奏状态】上一段的情节节奏 / 情感节奏
【待写内容预告】下一个要写的场景
```

**这段话暴露了当前系统的最大问题：**

> "跨对话时：如果用户在新一轮对话中要求继续创作，先请用户提供上一次的检查点内容（或在对话中寻找），以此为基础恢复上下文。"

**用户需要手动复制粘贴检查点来跨会话保持状态。** 这不是 skill 的设计缺陷——skill 做到了它能做的一切。问题是 skill 运行在 Claude Code 的上下文里，上下文一断，状态就丢了。

### 问题拆解

| 问题      | 当前状态               | 应该怎样（ANWS 模式）                |
| ------- | ------------------ | ---------------------------- |
| 跨会话状态丢失 | 用户手动复制检查点          | PROGRESS.md + 产出文档持久化        |
| 方法论太重   | 4100行全在一个 skill 里  | Skill 存方法论，Command 管工作流      |
| 产出无存档   | 剧本在对话里，关了就没        | 每步产出写为 `.cinekit/v{N}/` 下的文档 |
| 进度不可见   | 要翻聊天记录才知道到哪了       | PROGRESS.md 一眼看到当前步骤         |
| 无版本管理   | 改了就没了              | `v1/v2/` 版本化，历史可追溯           |
| 更新困难    | 改 skill 内容 = 手动改文件 | `ck update` 对比模板差异，保护用户产出    |

---

## 2. 重新设计：把检查点系统变成持久化文档系统

**核心思路：** `core-methodology.md` 第十节的检查点字段，就是 `.cinekit/v{N}/` 下的文档蓝图。

### 检查点 → 文档映射

| 检查点字段 | 对应文档 | 说明 |
|-----------|---------|------|
| 【已完成进度】当前第几步 | `PROGRESS.md` | 会话级状态，CLI + Command 共同维护 |
| 【故事核心】Logline + 主题论点 | `02_CONCEPT.md` | 不可变，除非用户主动修改 |
| 【角色当前状态】 | `03_CHARACTERS.md` | 随着写作推进而更新（角色在变化） |
| 【已完成段落摘要】 | `06_SCENES.md` + `07_SCRIPT.md` | 场景级和台词级的产出 |
| 【活跃线索】 | `05_OUTLINE.md` | 结构大纲的一部分 |
| 【伏笔状态】 | `05_OUTLINE.md` | 结构大纲的追踪字段 |
| 【节奏状态】 | `05_OUTLINE.md` | 结构大纲的追踪字段 |
| 【待写内容预告】 | `PROGRESS.md` | 下一步的任务描述 |

**关键设计决策：** 不是每个检查点字段独立成文件——那会碎片化。而是**合并到语义相关的文档中**。检查点是"快照"，文档是"持续更新的状态"。

---

## 3. 完整架构

### 目录结构（`ck init` 创建）

```
<项目>/
│
├── .claude/
│   ├── commands/                    # ← 用户交互的主要入口（用 / 调用）
│   │   ├── screenwriter.md          # 8步编剧工作流
│   │   ├── challenge.md             # 对抗式审查（类似 ANWS /challenge）
│   │   └── cinekit.md               # 启动器 / 状态查看
│   │
│   └── skills/                      # ← 知识库（按需加载，不是入口）
│       ├── screenwriter-core/       # 编剧方法论本体
│       │   ├── SKILL.md
│       │   └── references/
│       │       ├── core-methodology.md    # 1870行方法论
│       │       ├── format-ultrashort.md
│       │       ├── format-short.md
│       │       ├── format-feature.md
│       │       └── format-series.md
│       └── director-core/             # 导演方法论（开发中，后续加入）
│
├── .cinekit/
│   ├── install-lock.json           # CLI 状态锁
│   ├── PROGRESS.md                 # 会话级仪表盘
│   │
│   └── v1/                         # 当前版本的产出文档
│       ├── 00_MANIFEST.md          # 版本清单
│       ├── 01_BRIEF.md             # 项目简报
│       ├── 02_CONCEPT.md           # Step 1+1.5: 核心概念+主题论点
│       ├── 03_CHARACTERS.md        # Step 3: 人物深度与弧光
│       ├── 04_WORLD.md             # Step 4: 前史与世界观
│       ├── 05_OUTLINE.md           # Step 5: 结构大纲
│       ├── 06_SCENES.md            # Step 6: 场景拆解
│       ├── 07_SCRIPT.md            # Step 7: 剧本/小说文本
│       ├── 08_DOCTOR.md            # Step 8: 诊断报告（可选）
│       └── CHANGELOG.md            # 本文档的变更记录
│
└── CLAUDE.md                       # 项目级指令（引用 PROGRESS.md）
```

### 架构对比：ANWS vs CineKit

| 层面 | ANWS | CineKit |
|------|------|---------|
| **Commands** | genesis, blueprint, forge, challenge... | screenwriter, challenge, cinekit |
| **Skills** | spec-writer, system-architect, task-planner... | screenwriter-core, director-core（开发中） |
| **入口** | `/quickstart` → 自动路由 | `/cinekit` → 检测状态 → 路由 `/screenwriter` |
| **产出文档** | PRD, Architecture, ADR, Tasks | Brief, Concept, Characters, World, Outline, Scenes, Script |
| **进度追踪** | AGENTS.md（AI行为契约） | PROGRESS.md（进度仪表盘） |
| **版本化** | `.anws/v{N}/` | `.cinekit/v{N}/` |
| **CLI 命令** | `anws init`, `anws update` | `ck init`, `ck update`, `ck status` |

### 关键设计原则

1. **Command 是入口，Skill 是知识库。** 用户输入 `/screenwriter`，Command 读取 PROGRESS.md 判断当前步骤，然后引用 screenwriter-core skill 中的方法论执行对应步骤，产出写入 `.cinekit/v{N}/`。

2. **全量安装，不做按需。** `ck init` 一次性安装所有 command + skill。用户不需要知道"我应该装哪个 skill"——装就是了。就像 ANWS 一次性安装 11 个 command + 13 个 skill。

3. **Command 是工作流脚本，不是大段方法论。** `/screenwriter` 只有 100-200 行，是编排逻辑。4000 行方法论在 skill 的 references 中，只在需要时加载。

4. **每步产出 = 文档文件。** 不是"对话中说一下"，而是"读写到磁盘"。第二步产出的梗概写入 `02_CONCEPT.md`，下次对话时读取该文件即可继续。

---

## 4. `/screenwriter` Command 设计

这是最核心的组件。它替代了当前 SKILL.md 中的"通用八步工作流"，变成持久化的文档驱动工作流。

```
/screenwriter 的完整工作流:

Step 0: 读取 PROGRESS.md，判断当前处于哪一步
  │
  ├─ 如果是首次运行（无 01_BRIEF.md）
  │   → 引导用户填写项目简报
  │   → 写入 .cinekit/v1/01_BRIEF.md
  │   → 更新 PROGRESS.md：当前步骤 = 1
  │
  ├─ 如果处于 Step 1（破题与核心动作）
  │   → 读取 screenwriter-core skill 的「对抗」「鸿沟」「代价」章节
  │   → 执行破题，产出核心概念
  │   → 写入 .cinekit/v1/02_CONCEPT.md
  │   → 暂停，等用户 [通过/修改/自检]
  │   → 更新 PROGRESS.md：当前步骤 = 1.5
  │
  ├─ Step 1.5（主题论点）
  │   → 读取 screenwriter-core skill 的「一点五节」
  │   → 执行主题论点设计
  │   → 追加到 02_CONCEPT.md
  │   → 暂停...
  │
  ├─ Step 2（梗概草稿）
  │   → 读取已有概念和论点
  │   → 写梗概 → 追加到 02_CONCEPT.md
  │   ...
  │
  └─ Step 8（剧本医生）
      → 读取所有产出文档
      → 执行诊断
      → 写入 08_DOCTOR.md
```

### 关键行为规则

- **Command 不包含方法论。** Command 只说"执行 Step 3: 人物设计"，具体怎么设计 → 去读 skill references。
- **每一步暂停。** 保留原始 skill 的工作流纪律——每步输出后等待用户确认。
- **文档是增量的。** 不是"每步重新生成整个文档"，而是追加/更新对应章节。
- **PROGRESS.md 是导航。** 标明"当前步骤 X / 总步骤 8"，用户和 Command 都据此定位。

---

## 5. PROGRESS.md 设计（基于检查点模板）

直接借用 `core-methodology.md` 第十节的检查点结构，做成持久化文档：

```markdown
# 项目进度

<!-- CINEKIT:HEADER -->
- 项目名称: 《未命名项目》
- 当前版本: v1
- CLI 版本: cinekit 1.0.0
- 创建日期: 2026-06-06
- 最后更新: 2026-06-06
- 当前步骤: 1 / 8
<!-- /CINEKIT:HEADER -->

## 故事核心
- Logline: [待填写]
- 主题论点: [待填写]
- 核心戏剧动作: 目标 → 阻碍 = [待填写]

## 角色状态
| 角色 | 物理状态 | 情感状态 | 当前欲望 | 备注 |
|------|---------|---------|---------|------|
|      |         |         |         |      |

## 已完成进度
- [x] 项目初始化
- [ ] Step 1: 破题与核心动作
- [ ] Step 1.5: 主题论点
- [ ] Step 2: 梗概草稿
- [ ] Step 3: 人物深度与弧光
- [ ] Step 4: 前史与世界观
- [ ] Step 5: 结构大纲
- [ ] Step 6: 场景拆解
- [ ] Step 7: 场景写作
- [ ] Step 8: 剧本医生

## 活跃线索
- [无]

## 伏笔状态
| 伏笔 | 状态 | 计划回扣位置 |
|------|------|-------------|
|      |      |             |

## 节奏状态
- 上一段落: [无]
- 下一段落建议: [无]

## 待写内容
[下一步要做什么]
```

**关键点：** 这个 PROGRESS.md 就是持久化的检查点。不再需要用户手动复制粘贴检查点——所有字段都在文件里，Command 自动读写。

---

## 6. CLI 命令设计

```
ck init [path]
  → 创建完整目录结构
  → 安装所有 command（screenwriter, challenge, cinekit）
  → 安装所有 skill（screenwriter-core；director-core 预留位置）
  → 写入 PROGRESS.md 骨架
  → 创建 CLAUDE.md
  → 零交互，一键完成

ck status
  → 读取 PROGRESS.md
  → 输出: 项目名 / 当前步骤 / 已产出文档 / CLI版本

ck update
  → 对比 install-lock 中的 CLI 版本
  → 更新 managed files（commands, skills）
  → 生成 .cinekit/changelog/v{X.Y.Z}.md
  → 不触碰 v{N}/ 下的用户产出文档
```

---

## 7. 与原始规划的差异总结

| 之前的设计（被你批评的） | 修正后的设计 |
|------------------------|------------|
| 按需安装 skill（à la carte） | 全量安装（像 ANWS，init 时全部装上） |
| Skills 作为主要交互入口 | **Commands 作为主要交互入口** |
| 产出文档命名随意 | 严格对应 8 步工作流 + 检查点字段 |
| 没看 skill 本体就设计 | 基于 skill 第十节检查点系统重新设计 |
| Launcher Skill 作核心 | Launcher 降级为简单的状态路由，`/screenwriter` 是核心工作流 |
| 零交互 init 但结构模糊 | 零交互 init + 结构完全对齐 skill 工作流 |
| PROGRESS.md 是新发明 | PROGRESS.md = 持久化的检查点模板 |
| 忽略现有 .anws/ PRD | 对齐现有 PRD 中的 4 角色 + 双输出模式愿景 |

---

## 8. 关于现有 `.anws/v1/01_PRD.md` 的整合

当前 `.anws/v1/01_PRD.md` 描述了一个 **4 角色故事创作工程系统**（导演/编剧/演员/写手），这是一个比 `shanyin-screenwriter-pro` 更大的愿景。CineKit 的架构应该能够容纳这个愿景：

- **当前阶段**：`shanyin-screenwriter-pro` = 编剧角色，走完 8 步流程
- **未来阶段**：可能会添加导演 skill（冲突定位+创意变形）、演员 skill（角色扮演+内心记录）、写手 skill（叙事学小说写作）

CineKit 的文档结构（01_BRIEF → ... → 07_SCRIPT）目前对齐编剧角色。未来扩展时，只需按角色增加对应文档即可，框架不变。

---

## 9. 行动建议

| 优先级 | 行动 |
|:------:|------|
| P0 | 实现 `ck init`：一键创建含 screenwriter command + screenwriter-core skill 的完整结构（导演 skill 预留位置） |
| P0 | 实现 `/screenwriter` command：从 SKILL.md 提取工作流编排逻辑，引用 skill references 获取方法论 |
| P0 | PROGRESS.md 对齐检查点模板：直接用第十节的结构，让 Command 自动读写 |
| P1 | 迁移现有 `shanyin-screenwriter-pro/` 的内容到 `screenwriter-core/` skill |
| P1 | 实现 `ck update`：模板更新 + changelog 生成 |
| P2 | 添加 `/challenge` command：类似 ANWS 的对抗式审查，适用于剧本审查 |
| P2 | 添加 `ck version`：手动创建新版本 `v{N}/` 目录 |
