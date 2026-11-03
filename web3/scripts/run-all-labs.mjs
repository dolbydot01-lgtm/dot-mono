// 运行课程中所有可离线执行的 JS 实验。
// 用法：
//   node scripts/run-all-labs.mjs            # 只跑离线实验
//   node scripts/run-all-labs.mjs --online   # 连需要联网的实验一起跑
//   node scripts/run-all-labs.mjs --filter m9  # 只跑路径包含 m9 的实验
//
// 约定：需要联网的脚本在文件前 2KB 内写 `// REQUIRES_NETWORK`，默认跳过。

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const online = args.includes('--online');
const filterIdx = args.indexOf('--filter');
const filter = filterIdx >= 0 ? args[filterIdx + 1]?.toLowerCase() : null;

// 明确需要联网/外部服务的脚本（即使没有标记也跳过）
const ALWAYS_SKIP = [
  'modules/M00-intro/labs/trace-tx.mjs',
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p));
    else if (entry.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      stderr += '\n[runner] 超时（120s），已终止';
    }, 120_000);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

const all = (await walk(join(root, 'modules'))).sort();
const selected = [];
for (const file of all) {
  const rel = relative(root, file);
  if (basename(file).startsWith('_')) continue;
  if (ALWAYS_SKIP.includes(rel)) continue;
  if (filter && !rel.toLowerCase().includes(filter)) continue;

  const head = (await readFile(file, 'utf8')).slice(0, 2048);
  const needsNetwork = head.includes('REQUIRES_NETWORK');
  if (needsNetwork && !online) {
    console.log(`⏭  跳过（需联网） ${rel}`);
    continue;
  }
  selected.push({ file, rel });
}

console.log(`\n共找到 ${selected.length} 个待运行实验${online ? '（含联网）' : '（离线）'}\n`);

let passed = 0;
const failures = [];
for (const { file, rel } of selected) {
  process.stdout.write(`▶ ${rel} ... `);
  const started = Date.now();
  const { code, stdout, stderr } = await run(file);
  const ms = Date.now() - started;
  if (code === 0) {
    passed++;
    console.log(`✅ ${ms}ms`);
  } else {
    console.log(`❌ exit=${code} ${ms}ms`);
    failures.push({ rel, stdout, stderr });
  }
}

console.log(`\n结果：${passed}/${selected.length} 通过`);
if (failures.length) {
  console.log('\n失败详情：');
  for (const f of failures) {
    console.log(`\n===== ${f.rel} =====`);
    if (f.stdout.trim()) console.log('--- stdout ---\n' + f.stdout.trim().slice(0, 4000));
    if (f.stderr.trim()) console.log('--- stderr ---\n' + f.stderr.trim().slice(0, 4000));
  }
  process.exit(1);
}
