import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';

interface FileDates {
  created: Date;
  updated: Date;
}

let cache: Map<string, FileDates> | null = null;

/** 一次性读取 posts 目录下所有文件的首次/最后提交时间 */
function load(): Map<string, FileDates> {
  if (cache) return cache;
  cache = new Map();
  try {
    const out = execSync('git -c core.quotepath=off log --format=@@%aI --name-only -- src/content/posts', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
    let current: Date | null = null;
    // git log 从新到旧：第一次见到的是最后修改时间，最后一次见到的是创建时间
    for (const line of out.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      if (l.startsWith('@@')) {
        current = new Date(l.slice(2));
        continue;
      }
      if (!current) continue;
      const prev = cache.get(l);
      if (prev) prev.created = current;
      else cache.set(l, { created: current, updated: current });
    }
  } catch {
    // 不是 git 仓库或没装 git：退回文件时间
  }
  return cache;
}

/** filePath 形如 src/content/posts/技术/xx.md */
export function getFileDates(filePath: string): FileDates {
  const key = filePath.replace(/\\/g, '/');
  const hit = load().get(key);
  if (hit) return hit;
  try {
    const s = statSync(filePath);
    const created = s.birthtimeMs > 0 ? s.birthtime : s.mtime;
    return { created, updated: s.mtime };
  } catch {
    const now = new Date();
    return { created: now, updated: now };
  }
}
