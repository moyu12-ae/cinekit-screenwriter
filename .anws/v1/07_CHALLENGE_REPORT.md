# CineKit 质疑报告 (Challenge Report)

> **审查日期**: 2026-06-06
> **审查范围**: `explore/reports/20260606_cinekit_redesign.md` + `shanyin-screenwriter-pro/` + `.anws/v1/01_PRD.md`
> **审查目标**: 验证 CineKit 方案与现有 skill 的契合度，识别盲点，确认 ANWS 核心模式是否被充分吸收
> **审查模式**: `DESIGN`（设计审查）
> **累计轮次**: 1

---

## 问题总览

### 第1轮（当前活跃）

| 严重度 | 数量 | 摘要 | 状态 |
|--------|------|------|------|
| Critical | 3 | Command/Skill dispatch 与 Claude Code 机制抵触；格式路由未纳入设计；Reference 加载路径无设计 | ⏳ 待处理 |
| High | 3 | PROGRESS.md 混合机器/人类编辑域风险；文档增量写入语义模糊；ANWS 核心技术模式未被吸收 | ⏳ 待处理 |
| Medium | 3 | v{N}/ 版本化生命周期缺失；安装状态无容错机制；CLI 价值命题需重新聚焦 | ⏳ 待处理 |

---

## 审查摘要

**审查模式**: `DESIGN`
**整体判断**: 🟡 需先修复 Critical 问题，方向正确但核心机制有重大盲点
**高信号结论**: 设计对现有 skill 的理解是准确的（检查点→文档映射逻辑正确），但 **Claude Code 的 Skill/Command 分发机制与设计的"Command 是入口"假设根本性抵触**。此外，格式路由（4 种格式 × 8 步的不同行为）完全没有被纳入设计，导致 `/screenwriter` 命令无法正确处理概念片、剧情长片等不同格式。ANWS 的 RESOURCE_REGISTRY、drift detection、diff-based update 等核心技术模式也未被充分吸收。

| 指标 | 数值 |
|------|------|
| Critical | 3 |
| High | 3 |
| Medium | 3 |
| Total Findings | 9 |

| 证据来源 | 结论 |
|----------|------|
| design-reviewer | 执行（设计文档 + skill 源码分析） |
| task-reviewer | 跳过（无 05_TASKS.md） |
| Pre-Mortem | 执行：最大失败风险 = Command 不触发 + 格式路由错误 |
| 承诺闭合检查 | Partial — 设计对 CLI 管理文件有承诺，但对 Skill 加载机制无承诺建模 |
| ANWS 模式吸收 | Partial — 10/14 个核心模式被吸收，4 个缺失 |

---

## 核心发现清单

| ID | 类别 | 严重度 | 位置 | 发现 | 影响 | 建议 |
|----|------|--------|------|------|------|------|
| CH-01 | 分发机制 | 🔴 Critical | 设计 §3, §4 | "Command 是入口"与 Claude Code 的 Skill 自动加载机制根本抵触。Skills 通过 `description` 字段的触发词自动加载到上下文；Commands 需要用户显式输入 `/command-name`。`screenwriter-core/SKILL.md` 的 description 包含"编剧、写剧本"等触发词 → 用户说"我要写剧本"时，skill 自动加载但它的 SKILL.md 只是方法论，没有工作流编排。`/screenwriter` command 有工作流编排但不会自动触发。 | 用户说"我要写剧本"，skill 加载了但不知道做什么，command 没加载。结果：用户需要手动输入 `/screenwriter`，违背了自然语言交互的预期。 | 在 screenwriter-core 的 SKILL.md 中同时包含工作流编排 + 方法论引用。Command `/screenwriter` 作为等效快捷方式（内容相同或引用 skill）。详见修复方案。 |
| CH-02 | 格式路由 | 🔴 Critical | 设计 §4 | `/screenwriter` 设计为单一 8 步流水线，但现有 skill 有 4 种格式路由，每种格式的步骤行为不同（见 `SKILL.md` 格式缩放表）：概念超短片跳过 Step 3 和 Step 6；剧集需要季度规划+分集大纲前置步骤；长片 Step 5 需要结构方法论选型。当前设计未纳入任何格式感知逻辑。 | 用户想写概念片 → `/screenwriter` 仍要求完成 8 步（包括不必要的 Step 3 人物深度和 Step 6 场景拆解）。用户想写剧集 → 缺少季度规划阶段。核心工作流在当前设计下无法正确服务 4 种格式中的 3 种。 | Step 0 增加格式路由判断（复用现有 SKILL.md 的格式路由表），读取对应 format 文件，根据格式缩放规则调整步骤行为。 |
| CH-03 | Reference 加载 | 🔴 Critical | 设计 §4 | 设计说"Command 读取 screenwriter-core skill 的 references"，但未定义如何读取。Claude Code 的 skill 加载机制：只有 SKILL.md 自动加载，`references/` 下的文件需要显式 Read。Command 需要知道 `references/` 下每个文件的精确路径。`core-methodology.md` 有 1870 行，全部加载会消耗大量上下文。 | `/screenwriter` 执行 Step 3（人物设计）时，需要 reading references 中的「Want vs Need」「人物四维」「三P生活」章节。但如果不知道路径或加载了整本 methodology，要么找不到方法论，要么浪费大量 token。 | 在 SKILL.md 中维护一个操作卡片速查表（已有！见 SKILL.md §132-147），明确每个步骤需要读取 `references/` 下的哪个文件。Command 在执行每步前先 Read 对应 section。当前 SKILL.md 第 132-147 行的"操作速查"表可以直接复用。 |
| CH-04 | 数据模型 | 🟠 High | 设计 §5 | PROGRESS.md 混合了机器可写字段（步骤进度、版本号）和人类创意内容（故事核心、角色状态）。即使用了 `<!-- CINEKIT:HEADER -->` 标记区，但"故事核心"和"角色状态"不在任何标记区中——它们既需要 Command 更新（角色状态随写作推进变化），又需要用户手动编辑（修正创意决策）。 | Command 更新"角色状态"时可能覆盖用户的修改。或者相反：用户改了"故事核心"但 Command 执行 Step 2 时基于旧的 Logline 生成梗概。 | 把 PROGRESS.md 拆分为两个文件：`PROGRESS.md`（纯进度追踪，全机器可写）和 `01_BRIEF.md`（创意摘要，全人类可编辑，Command 只读）。或者把"故事核心"和"角色状态"也纳入 CINEKIT 标记区，定义明确的读写规则。 |
| CH-05 | 写入语义 | 🟠 High | 设计 §4 | 多步写入同一文件（Steps 1/1.5/2 → 02_CONCEPT.md）的语义未定义。是追加？替换章节？如果用户在 Step 5 时想回到 Step 1 修改核心概念，Command 的行为是什么？设计说"追加/更新对应章节"但没有定义章节标记方案。 | 用户在 Step 5 回头改 Step 1 的概念 → Command 可能：1) 覆盖整个 02_CONCEPT.md 丢失 Step 2 的梗概；2) 只追加造成重复内容；3) 无法定位要修改的章节。 | 为每个产出文档定义 `<!-- CINEKIT:SECTION:step-1 -->` 风格的章节标记，Command 通过标记定位和替换。ANWS 的 AGENTS.md AUTO block 机制可以复用。 |
| CH-06 | ANWS 模式缺失 | 🟠 High | 设计全文 | ANWS 的 4 个核心技术模式未被设计吸收：<br>1. **RESOURCE_REGISTRY** — 无集中式资源清单，CLI 不知道管理了哪些文件<br>2. **Drift detection** — 如果用户手动删除了 `.claude/commands/screenwriter.md`，CLI 无法检测<br>3. **Diff-based update** — `ck update` 未说明如何对比模板与已安装文件<br>4. **Non-TTY fallback** — 未处理 CI/非交互环境 | `ck update` 在没有 RESOURCE_REGISTRY 的情况下无法知道哪些文件需要检查更新。Drift 无法检测意味着用户手动删除文件后 install-lock 与实际状态不同步。 | 添加 RESOURCE_REGISTRY（参考 ANWS `manifest.js`），实现 drift detection（参考 ANWS `install-state.js`），为 `ck update` 定义 diff 策略。详见修复方案。 |
| CH-07 | 版本化 | 🟡 Medium | 设计 §3, §9 | `v{N}/` 版本化机制缺少生命周期定义：何时创建新版本？旧版本如何处理？如何标记"当前版本"？ANWS 中 `v{N}/` 对应重大架构变更（`/genesis` 触发），但 CineKit 的 v{N}/ 对应什么触发条件？ | 用户不知道什么时候该 `ck version` 创建 v2。或者 v1/v2 同时存在时，Command 不知道读哪个。 | 定义明确的版本触发条件（建议：用户显式执行 `ck version "原因"`）。在 install-lock.json 中记录 `currentVersion`。Command 始终读取 currentVersion 指向的目录。 |
| CH-08 | 容错 | 🟡 Medium | 设计 §6 | `ck init` 和 `ck update` 没有错误恢复路径。如果 init 中途失败（磁盘满、权限不足、文件被占用），没有回滚或断点续传。如果 install-lock.json 损坏，没有恢复机制。 | 部分安装的 CineKit 项目可能处于不一致状态：commands 安装了但 skills 没有，或 vice versa。用户可能不知道如何修复。 | 参考 ANWS `install-state.js`：添加 `detectInstallState()` 的 fallback 逻辑（lock 损坏时扫描目录重建），添加 `needsFallback` 和 `canRebuildLock` 语义。 |
| CH-09 | CLI 价值 | 🟡 Medium | 设计 §6 | CLI 三个命令中，`ck init`（创建目录+复制文件）和 `ck status`（读文件输出）可以用 Skill + Bash 替代。只有 `ck update`（模板对比+diff+changelog）需要 CLI。CLI 的价值命题需要重新聚焦到 ANWS 真正不可替代的部分：RESOURCE_REGISTRY 管理、模板投影、diff-based update、drift detection。 | CLI 增加 npm 安装依赖，如果它只做文件和状态读取，可以用更轻量的方式实现。但如果它做 ANWS-level 的模板管理和更新 diffing，npm 依赖是合理的代价。 | 精简 CLI 命令：`ck init` → 保留（需要零交互体验），`ck status` → 移除或合并到 Launcher Command，`ck update` → 保留并强化（核心价值）。新增 `ck doctor`（验证安装完整性，类似 drift detection）。 |

---

## Pre-Mortem：6 个月后项目失败的 3 个场景

| 失败原因 | 失真契约 | Root Cause | 证据 | 概率 |
|---------|---------|-----------|------|:----:|
| 用户说"我要写剧本"，但 skill 加载后只给出方法论定义，不知道工作流该怎么走 | 入口即服务承诺 | CH-01：Command/Skill dispatch 设计错误 | Claude Code 实测：skill 通过 description 自动加载，command 需手动 `/invoke` | 🔴高 |
| 用户写概念超短片，但 `/screenwriter` 要求完成 8 步（包括不需要的人物设计和场景拆解），体验极差 | 格式适配承诺 | CH-02：格式路由缺失 | 当前 skill 的格式缩放表 vs 设计的单一流水线 | 🔴高 |
| `ck update` 执行后，用户的 PROGRESS.md 中手写的角色分析笔记被覆盖 | 用户数据保护承诺 | CH-04：机器/人类编辑域混合 | PROGRESS.md 设计中有"故事核心"和"角色状态"但不属于任何 CINEKIT 标记区 | 🟡中 |

---

## ANWS 模式吸收度评估

| ANWS 模式 | 吸收状态 | 说明 |
|----------|:------:|------|
| CLI 命令路由 (parseArgs) | ✅ | `ck init/update/status` |
| 投影计划系统 | ✅ | 简化为单 target（Claude Code） |
| 安装状态管理 (install-lock) | ✅ | `.cinekit/install-lock.json` |
| 版本化文档 (v{N}/) | ⚠️ | 有结构但无生命周期定义 |
| 变更日志生成 | ⚠️ | 提到但未详细设计 |
| 文件写入工具 (copy.js) | ✅ | 参考 ANWS |
| **RESOURCE_REGISTRY** | ❌ | **缺失 — 无集中式文件清单** |
| **Drift detection** | ❌ | **缺失 — 无法检测文件系统与 lock 不一致** |
| **Diff-based update** | ❌ | **缺失 — update 无对比机制** |
| **Non-TTY handling** | ❌ | **缺失 — 无 CI 环境处理** |
| AGENTS.md AUTO block merge | ✅ | 转化为 PROGRESS.md 标记区 |
| User protected files | ✅ | v{N}/ 文档保护 |
| 30秒恢复协议 | ⚠️ | PROGRESS.md 有状态但无恢复指令 |
| Territory map | ⚠️ | CLAUDE.md 会指向 PROGRESS.md，但无完整领地地图 |

**吸收率**: 10/14 = 71%。4 个缺失项中，RESOURCE_REGISTRY 和 Drift detection 是 ANWS 最核心的稳定性保障机制，必须补上。

---

## 修复方案

### CH-01: Command/Skill dispatch 修复

**根因**: 设计假设"Command 是入口"，但 Claude Code 的自动加载机制是 Skill-based。

**修复**:
```
screenwriter-core/SKILL.md 应该同时包含：
  1. description 中的触发词（自动加载）
  2. 工作流编排逻辑（从当前 SKILL.md 提取）
  3. 对 references/ 的引用指令（操作卡片速查表，已有！）

/screenwriter command 的内容 = 对 screenwriter-core skill 的包装调用。
当 skill 自动加载时，它独立工作。
当用户手动 /screenwriter 时，加载同样的逻辑。
```

**验证方法**: 在 Claude Code 中说"我要写剧本"，观察 screenwriter-core skill 是否加载并正确执行 Step 0（判断进度）。

### CH-02: 格式路由修复

**根因**: 单一流水线无法适配 4 种格式。

**修复**: 在 `/screenwriter` 的 Step 0 中增加格式路由：
```
Step 0: 
  1. 读取 PROGRESS.md 判断进度
  2. 如果首次运行 → 问"什么格式？概念片/短片/长片/剧集？"
  3. 将格式写入 PROGRESS.md
  4. 根据格式加载对应 format 文件
  5. 根据格式缩放表调整后续步骤行为
```

格式缩放表已经是 SKILL.md 的一部分（第 150-162 行），直接复用。

### CH-06: ANWS 模式补全

**必须补的 3 个模块**（参考 ANWS 源码）：

1. **RESOURCE_REGISTRY** (`lib/manifest.js`):
```javascript
const RESOURCE_REGISTRY = [
  { id: "screenwriter-cmd", type: "command", source: "commands/screenwriter.md", outputPath: ".claude/commands/screenwriter.md" },
  { id: "cinekit-cmd", type: "command", source: "commands/cinekit.md", outputPath: ".claude/commands/cinekit.md" },
  { id: "challenge-cmd", type: "command", source: "commands/challenge.md", outputPath: ".claude/commands/challenge.md" },
  { id: "screenwriter-core", type: "skill", source: "skills/screenwriter-core/SKILL.md", outputPath: ".claude/skills/screenwriter-core/SKILL.md" },
  { id: "core-methodology", type: "skill-ref", source: "skills/screenwriter-core/references/core-methodology.md", outputPath: ".claude/skills/screenwriter-core/references/core-methodology.md" },
  // ... 其余 references
];
```

2. **Drift detection** (`lib/install-state.js`): 参考 ANWS 的 `detectLockDrift()`。

3. **Diff-based update** (`lib/update.js`): 参考 ANWS 的 `collectManagedFileDiffs()`。

---

## 承诺闭合验证

| 检查维度 | 结论 | 证据 |
|---------|:----:|------|
| **重复态**（同一操作再来一次是否安全） | Pass | `ck init` 检测已有 install-lock 则跳过；文档写入使用章节标记避免覆盖 |
| **失败态**（部分失败时系统是否一致） | **Fail** | CH-08：无 install-lock 恢复机制；部分安装状态不可检测 |
| **默认态**（框架默认路径是否与承诺一致） | **Fail** | CH-01：Claude Code 默认加载 skill 而非 command，与设计的"Command 是入口"不一致 |
| **运行态**（长期运行行为是否闭环） | Partial | 更新机制未设计 diff 和 changelog |
| **并发态**（多会话是否安全） | N/A | 单用户场景，暂不适用 |
| **观测态**（是否可审计/可追踪） | Partial | PROGRESS.md + CHANGELOG 提供基本追踪，但 install-lock drift 不可检测 |

---

## 建议行动清单

### P0 - 立即修复（阻塞实现）

1. **[CH-01]** 将工作流编排逻辑同时放入 screenwriter-core 的 SKILL.md，确保 skill 自动加载时可独立工作。Command 作为包装快捷方式。
2. **[CH-02]** 在 `/screenwriter` Step 0 增加格式路由判断，基于现有 format-scaling 表调整步骤行为。
3. **[CH-03]** 复用 SKILL.md 第 132-147 行的"操作速查"表，Command 每步执行前按表 Read 对应 references 章节。

### P1 - 近期修复（影响质量）

4. **[CH-06]** 实现 RESOURCE_REGISTRY 和 drift detection（参考 ANWS `manifest.js` + `install-state.js`）
5. **[CH-04]** PROGRESS.md 拆分机器编辑区和人类编辑区，所有可写内容纳入 CINEKIT 标记区
6. **[CH-05]** 为产出文档定义 `<!-- CINEKIT:SECTION:step-N -->` 章节标记

### P2 - 持续改进

7. **[CH-07]** 定义 v{N}/ 版本化生命周期
8. **[CH-08]** 添加 install-lock 容错恢复逻辑
9. **[CH-09]** 重新评估 CLI 命令范围，聚焦在模板管理和 diff-based update

---

## 最终判断

- [ ] 🟢 项目可继续，风险可控
- [x] 🟡 项目可继续，但需先解决 P0 问题（CH-01, CH-02, CH-03）
- [ ] 🔴 项目需要重新评估

**判断依据**: 设计方向正确，检查点→文档映射的逻辑是准确的。但 CH-01（Command/Skill dispatch）和 CH-02（格式路由）是两个会直接导致功能不可用的 Critical 问题，必须在编码前修复。CH-06（ANWS 核心模式缺失）虽然标记为 High，但如果不补上 RESOURCE_REGISTRY 和 drift detection，CLI 的 `ck update` 将无法可靠工作——这实质上是 Critical 级别的设计债务。

**好消息**: 这 3 个 Critical 问题都不是需要推翻重来的——都是"设计补充"级别的修复。skill 本体中已经有的内容（格式路由表、操作速查表）可以直接复用，不需要重新设计。
