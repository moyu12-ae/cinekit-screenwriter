# CineKit 编剧大师

全格式影视编剧 Skill — 覆盖 1 分钟概念片到 90 分钟长片到多集剧集，内置 CineKit 持久化工作流，跨会话不丢失创作进度。

## CineKit 持久化系统

每步产出自动写入 `.cinekit/v1/` 文档，PROGRESS.md 追踪进度。下次打开 Claude Code 说"继续写剧本"即可从上次中断处继续。

### 快速开始

```bash
# 1. 在项目中初始化 CineKit
node .claude/skills/cinekit-screenwriter/scripts/init.js

# 2. 在 Claude Code 中说
"我要写剧本"
```

Skill 会自动读取 PROGRESS.md，判断当前步骤，加载对应方法论。

## 核心能力

**全格式覆盖**
- 概念超短片（1-3 分钟）：What-If / How-To-Tell 两大方向
- 叙事短片（5-10 分钟）：四段式结构，适配短视频
- 长片（90 分钟电影）：商业片 / 文艺片双轨，Story Circle / Save the Cat / McKee 三选一
- 剧集（多集）：季度规划 + 分集大纲 + 弧光预算 + 连续性管理

**全流程编剧服务**
- 破题与核心动作：冲突定位、鸿沟分析、代价锚定
- 主题论点：判断句 + 正反立场 + 论证约束
- 人物设计：Ghost / Lie / Flaw / Want vs Need / 人物四维 / 三P生活
- 前史与世界观：横截面原则 + 信息释放计划
- 结构大纲：开场钩子 + 不归点 + 价值链条 + 双轴叙事
- 场景拆解：分镜级场景规划
- 场景写作：视觉写作 + 潜台词 + 对白三级进化
- 剧本医生：六阶段自检 + 写作红线诊断

## 文件说明

```
cinekit-screenwriter/
  SKILL.md                  # Skill 定义、格式路由、八步工作流、持久化指令
  core-methodology.md       # 核心编剧方法论（1870 行，十一节完整体系）
  format-ultrashort.md      # 概念超短片格式指南
  format-short.md           # 叙事短片格式指南
  format-feature.md         # 长片格式指南
  format-series.md          # 剧集格式指南
  scripts/
    init.js                 # CineKit 项目初始化脚本（零依赖）
  templates/                # 产出文档模板（11 个）
    PROGRESS.md, 00_MANIFEST.md, 01_BRIEF.md,
    02_CONCEPT.md, 03_CHARACTERS.md, 04_WORLD.md,
    05_OUTLINE.md, 06_SCENES.md, 07_SCRIPT.md,
    08_DOCTOR.md, CHANGELOG.md
  test/
    init.test.js            # init.js 测试（46 条断言）
  README.md
  LICENSE
```

## 使用方法

**触发词**：编剧、写剧本、人物设计、故事结构、场景拆解、剧本医生、写对白

直接输入自然语言即可触发。Skill 会自动判断创作格式，加载对应方法论，按八步工作流引导创作。

**进阶定制**：可主动补充受众、风格标签、平台适配等细节提升精准度。

## 兼容性

遵循 Agent Skills 标准，兼容 Claude Code、Codex、Cursor 等支持该标准的 AI 工具。

## 许可证

MIT License。详见 [LICENSE](LICENSE)。

---

*本 Skill 的编剧方法论核心内容（core-methodology.md、format-*.md）基于 @山音 的「山音超级编剧大师」创作。*
