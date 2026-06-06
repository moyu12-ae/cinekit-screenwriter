/**
 * CineKit init — 项目初始化脚本
 *
 * 在当前工作目录中创建 .cinekit/ 项目结构。
 * 从 templates/ 目录复制所有模板文件，替换占位符。
 *
 * 用法:
 *   node scripts/init.js              # 在当前目录初始化
 *   node scripts/init.js /path/to/proj # 在指定目录初始化
 *
 * 零依赖，仅使用 Node.js 内置 fs/path。
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ─── 配置 ────────────────────────────────────────────────────────
const VERSION = '1.0.0';
const DATE = new Date().toISOString().split('T')[0];
const DATETIME = new Date().toISOString();

const TARGET_DIR = process.argv[2] || process.cwd();
const SCRIPT_DIR = __dirname;
const SKILL_DIR = path.dirname(SCRIPT_DIR);
const TEMPLATE_DIR = path.join(SKILL_DIR, 'templates');

const CINEKIT_DIR = path.join(TARGET_DIR, '.cinekit');
const V1_DIR = path.join(CINEKIT_DIR, 'v1');

// ─── 工具函数 ────────────────────────────────────────────────────
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest, replacements = {}) {
  let content = fs.readFileSync(src, 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(key, 'g'), value);
  }
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, content, 'utf8');
}

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

// ─── 模板文件映射 ────────────────────────────────────────────────
// 注意: 这些 matched files（commands/skills）当前仅记录在 lock 中
// 因为 CineKit 的 command 和 skill 是同一个 skill 目录本身
// 未来扩展其他 skill 时在此添加
const TEMPLATE_FILES = [
  'PROGRESS.md',
  '00_MANIFEST.md',
  '01_BRIEF.md',
  '02_CONCEPT.md',
  '03_CHARACTERS.md',
  '04_WORLD.md',
  '05_OUTLINE.md',
  '06_SCENES.md',
  '07_SCRIPT.md',
  '08_DOCTOR.md',
  'CHANGELOG.md',
];

// ─── 主流程 ──────────────────────────────────────────────────────
function main() {
  console.log(`\n🎬 CineKit v${VERSION} — 项目初始化\n`);

  // 检查 templates/ 目录
  if (!fileExists(TEMPLATE_DIR)) {
    console.error('❌ 错误: 找不到 templates/ 目录');
    console.error(`   期望路径: ${TEMPLATE_DIR}`);
    process.exit(1);
  }

  // 检查是否已初始化
  const lockPath = path.join(CINEKIT_DIR, 'install-lock.json');
  const isReinit = fileExists(lockPath);

  if (isReinit) {
    console.log('⚠️  .cinekit/ 已存在，将仅更新管理文件（保留用户产出文档）.\n');
  }

  // 创建目录
  ensureDir(V1_DIR);
  console.log(`📁 ${path.relative(TARGET_DIR, CINEKIT_DIR)}/`);

  // 复制模板文件
  const written = [];
  const skipped = [];
  const replacements = { '\\{DATE\\}': DATE, '\\{DATETIME\\}': DATETIME };

  for (const file of TEMPLATE_FILES) {
    const src = path.join(TEMPLATE_DIR, file);
    const dest = file === 'PROGRESS.md'
      ? path.join(CINEKIT_DIR, file)
      : path.join(V1_DIR, file);

    if (!fileExists(src)) {
      console.log(`  ⚠️  模板缺失: ${file}`);
      skipped.push(file);
      continue;
    }

    // 用户产出文档已存在时跳过（保护用户数据）
    if (isReinit && file !== 'PROGRESS.md' && file !== '00_MANIFEST.md' && file !== 'CHANGELOG.md') {
      if (fileExists(dest)) {
        skipped.push(file);
        continue;
      }
    }

    copyFile(src, dest, replacements);
    const relPath = path.relative(TARGET_DIR, dest);
    console.log(`  ✓ ${relPath}`);
    written.push(relPath);
  }

  // 写入 install-lock.json
  const lock = {
    schemaVersion: 1,
    cliVersion: VERSION,
    generatedAt: DATETIME,
    targets: [{
      targetId: 'claude',
      targetLabel: 'Claude Code',
      installedVersion: VERSION,
      managedFiles: TEMPLATE_FILES.map(f =>
        f === 'PROGRESS.md'
          ? '.cinekit/PROGRESS.md'
          : `.cinekit/v1/${f}`
      ),
    }],
    lastUpdateSummary: {
      successfulTargets: ['claude'],
      failedTargets: [],
      updatedAt: DATETIME,
    },
  };
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  const lockRel = path.relative(TARGET_DIR, lockPath);
  console.log(`  ✓ ${lockRel}`);

  // ─── 输出摘要 ──────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`\n✅ CineKit 项目已${isReinit ? '更新' : '创建'}！`);
  console.log(`   项目路径: ${TARGET_DIR}`);
  console.log(`   已写入: ${written.length} 个文件`);
  if (skipped.length > 0) {
    console.log(`   已跳过（保护已有数据）: ${skipped.length} 个文件`);
  }
  console.log(`\n下一步: 在 Claude Code 中说"我要写剧本"来开始创作。`);
  console.log(`进度追踪: .cinekit/PROGRESS.md\n`);
}

main();
