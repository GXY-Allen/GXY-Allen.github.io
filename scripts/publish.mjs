#!/usr/bin/env node
/**
 * 一键发布：检查构建 → 自动生成提交说明 → 提交 → 推送
 *   npm run publish
 *   npm run publish -- --skip-build   跳过本地构建检查
 *   npm run publish -- -m "自定义说明"
 */
import { execSync, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const mIdx = args.indexOf('-m');
const customMsg = mIdx >= 0 ? args[mIdx + 1] : '';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const run = (cmd, cmdArgs) => spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32' }).status === 0;
const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

try {
  sh('git rev-parse --is-inside-work-tree');
} catch {
  fail('当前目录不是 git 仓库');
}

const status = sh('git -c core.quotepath=off status --porcelain -uall');
if (!status) {
  console.log('✓ 没有需要发布的改动');
  process.exit(0);
}

/* ---------- 生成提交说明 ---------- */
const POSTS = 'src/content/posts/';
const added = new Set();
const changed = new Set();
const removed = new Set();
let images = 0;
let others = 0;

const postName = (file) => {
  const rel = file.slice(POSTS.length).replace(/\.md$/i, '');
  const parts = rel.split('/');
  if (parts[parts.length - 1].toLowerCase() === 'index') parts.pop();
  return parts[parts.length - 1];
};

for (const line of status.split('\n')) {
  const code = line.slice(0, 2);
  let file = line.slice(3).trim();
  if (file.includes(' -> ')) file = file.split(' -> ')[1];
  file = file.replace(/^"|"$/g, '');
  if (file.startsWith(POSTS) && /\.md$/i.test(file) && !/\/_/.test(file)) {
    const name = postName(file);
    if (code.includes('?') || code.includes('A')) added.add(name);
    else if (code.includes('D')) removed.add(name);
    else changed.add(name);
  } else if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(file)) images++;
  else others++;
}

const parts = [];
if (added.size) parts.push(`新增文章：${[...added].join('、')}`);
if (changed.size) parts.push(`更新文章：${[...changed].join('、')}`);
if (removed.size) parts.push(`删除文章：${[...removed].join('、')}`);
if (images && !parts.length) parts.push(`更新 ${images} 张图片`);
else if (images) parts.push(`${images} 张图片`);
if (others && !parts.length) parts.push('更新站点');
const message = customMsg || parts.join('；');

console.log('\n将要发布的改动：');
console.log(status.split('\n').map((l) => '  ' + l).join('\n'));
console.log(`\n提交说明：${message}\n`);

/* ---------- 构建检查 ---------- */
if (!skipBuild) {
  console.log('▶ 正在本地构建检查（大约十几秒）…');
  if (!run('npm', ['run', 'build'])) fail('构建失败，请根据上面的错误信息修改后再发布（文章没有被提交）');
  console.log('✓ 构建通过\n');
}

/* ---------- 提交并推送 ---------- */
if (!run('git', ['add', '-A'])) fail('git add 失败');
if (!run('git', ['commit', '-m', message])) fail('git commit 失败');

console.log('▶ 同步远程仓库…');
if (!run('git', ['pull', '--rebase', '--autostash'])) fail('拉取远程更新失败，可能有冲突，请手动处理');
console.log('▶ 推送到 GitHub…');
if (!run('git', ['push'])) fail('推送失败，请检查网络或 GitHub 登录状态');

let repo = '';
try {
  repo = sh('git remote get-url origin').replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '');
} catch {}
console.log('\n✓ 发布成功！GitHub 正在自动部署，一两分钟后刷新网站即可看到。');
if (repo) console.log(`  部署进度：${repo}/actions`);
