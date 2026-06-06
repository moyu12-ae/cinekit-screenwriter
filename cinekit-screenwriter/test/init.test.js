/**
 * CineKit init.js 测试
 * 验证 scripts/init.js 是否正确创建 .cinekit/ 项目结构
 *
 * 用法: node test/init.test.js
 */
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinekit-test-'));
const initScript = path.join(__dirname, '..', 'scripts', 'init.js');

let passed = 0;
let failed = 0;

function check(description, condition) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.log(`  ✗ ${description}`);
    failed++;
  }
}

try {
  console.log(`\n📁 测试目录: ${tmpDir}\n`);

  // ─── RED: 运行 init ────────────────────────────────────────────
  console.log('1. 运行 init.js...');
  try {
    execSync(`node "${initScript}"`, { cwd: tmpDir, stdio: 'pipe' });
    console.log('  ✓ init.js 执行成功\n');
    passed++;
  } catch (e) {
    console.log(`  ✗ init.js 执行失败: ${e.message}\n`);
    failed++;
    process.exit(1);
  }

  // ─── 验证目录结构 ──────────────────────────────────────────────
  console.log('2. 验证目录结构...');
  const expectedPaths = [
    '.cinekit/',
    '.cinekit/v1/',
    '.cinekit/install-lock.json',
    '.cinekit/PROGRESS.md',
    '.cinekit/v1/00_MANIFEST.md',
    '.cinekit/v1/01_BRIEF.md',
    '.cinekit/v1/02_CONCEPT.md',
    '.cinekit/v1/03_CHARACTERS.md',
    '.cinekit/v1/04_WORLD.md',
    '.cinekit/v1/05_OUTLINE.md',
    '.cinekit/v1/06_SCENES.md',
    '.cinekit/v1/07_SCRIPT.md',
    '.cinekit/v1/08_DOCTOR.md',
    '.cinekit/v1/CHANGELOG.md',
  ];

  for (const rel of expectedPaths) {
    const abs = path.join(tmpDir, rel);
    check(rel, fs.existsSync(abs));
  }

  // ─── 验证 PROGRESS.md 内容 ─────────────────────────────────────
  console.log('\n3. 验证 PROGRESS.md 内容...');
  const progressPath = path.join(tmpDir, '.cinekit', 'PROGRESS.md');
  const progressContent = fs.readFileSync(progressPath, 'utf8');

  check('包含 CINEKIT:HEADER 标记', progressContent.includes('CINEKIT:HEADER'));
  check('包含 /CINEKIT:HEADER 闭合标记', progressContent.includes('/CINEKIT:HEADER'));
  check('包含"已完成进度"章节', progressContent.includes('已完成进度'));
  check('包含 8 步任务清单', (progressContent.match(/\[ \] Step/g) || []).length >= 8);
  check('包含"故事核心"章节', progressContent.includes('故事核心'));
  check('包含"伏笔状态"章节', progressContent.includes('伏笔状态'));

  // ─── 验证 install-lock.json ────────────────────────────────────
  console.log('\n4. 验证 install-lock.json...');
  const lockPath = path.join(tmpDir, '.cinekit', 'install-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

  check('schemaVersion 为 1', lock.schemaVersion === 1);
  check('targets 是数组', Array.isArray(lock.targets));
  check('targets 包含 claude', lock.targets.some(t => t.targetId === 'claude'));
  check('generatedAt 是 ISO 日期', !isNaN(Date.parse(lock.generatedAt)));

  // ─── 验证模板文件非空 ──────────────────────────────────────────
  console.log('\n5. 验证模板文件非空...');
  const v1Dir = path.join(tmpDir, '.cinekit', 'v1');
  const v1Files = fs.readdirSync(v1Dir).filter(f => f.endsWith('.md'));
  for (const f of v1Files) {
    const content = fs.readFileSync(path.join(v1Dir, f), 'utf8');
    check(`${f} 非空`, content.trim().length > 0);
    check(`${f} 包含标题`, content.startsWith('# '));
  }

  // ─── 验证不会覆盖已有文件 ──────────────────────────────────────
  console.log('\n6. 验证幂等性（再次 init 不破坏已有文件）...');
  const progressBefore = fs.readFileSync(progressPath, 'utf8');
  execSync(`node "${initScript}"`, { cwd: tmpDir, stdio: 'pipe' });
  const progressAfter = fs.readFileSync(progressPath, 'utf8');
  check('PROGRESS.md 内容不变', progressBefore === progressAfter);

  // ─── 结果 ──────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
  console.log(`${failed === 0 ? '✅ 全部通过' : '❌ 有测试失败'}\n`);

} finally {
  // 清理临时目录
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

process.exit(failed > 0 ? 1 : 0);
