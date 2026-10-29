import { imageMetadata } from 'astro/assets/utils';

const cache = new Map();

/** 只读取图片头获取尺寸；离线、超时或损坏的图片保留外链，不阻塞整个构建。 */
export function getRemoteImageSize(url) {
  const key = url.startsWith('//') ? `https:${url}` : url;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const entry = { expires: Infinity, promise: null };
  entry.promise = probe(key).catch(() => {
    // 短暂合并失败请求，但网络恢复后允许本地预览重新尝试。
    entry.expires = Date.now() + 10_000;
    console.warn(`[图片优化跳过] 读取不到远程图片：${key}，先直接引用原图`);
    return null;
  });
  cache.set(key, entry);
  return entry.promise;
}

async function probe(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => {});
    throw new Error('Image unavailable');
  }
  const reader = response.body.getReader();
  let bytes = new Uint8Array();
  try {
    while (bytes.length < 1024 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      const next = new Uint8Array(bytes.length + value.length);
      next.set(bytes);
      next.set(value, bytes.length);
      bytes = next;
      try {
        const metadata = await imageMetadata(bytes, url);
        if (metadata.width > 0 && metadata.height > 0) return metadata;
      } catch {
        // 有些格式需要再读取一段头信息。
      }
    }
    throw new Error('Image dimensions unavailable');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
