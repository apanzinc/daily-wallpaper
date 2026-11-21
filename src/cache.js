// 上游响应缓存。
//
// 用 Cloudflare Cache API 把必应接口的返回存在边缘缓存里，相同 idx/n/mkt 的
// 高频请求不会重复打上游。cache key 用自己构造的规范 URL，而不是上游地址，
// 这样不依赖第三方域名的 zone 归属，也便于把 quality/redirect 等本地变换
// 排除在 key 之外（它们共用同一份上游数据）。
//
// 非 Workers 环境（本地 Node、测试）没有 caches.default，自动降级为直接请求，
// 保证同一份代码本地可跑、线上生效。

const DEFAULT_TTL = 3600; // 秒，与对外 Cache-Control 保持一致

function getCache() {
  try {
    return typeof caches !== 'undefined' && caches.default ? caches.default : null;
  } catch {
    return null;
  }
}

/**
 * 带边缘缓存的 JSON GET。
 * @param {string|URL} url 实际请求的上游地址
 * @param {object} opts
 * @param {string|URL} opts.keyUrl 用作缓存 key 的规范地址
 * @param {number} opts.ttl 缓存有效期（秒）
 * @param {object} opts.headers 上游请求头
 * @returns {Promise<{ data: unknown, status: 'HIT'|'MISS'|'BYPASS' }>}
 */
export async function cachedJson(url, { keyUrl, ttl = DEFAULT_TTL, headers = {} } = {}) {
  const cache = getCache();
  const key = new Request((keyUrl ?? url).toString(), { method: 'GET' });

  if (cache) {
    let hit;
    try {
      hit = await cache.match(key);
    } catch {
      hit = undefined;
    }
    if (hit) {
      try {
        return { data: await hit.json(), status: 'HIT' };
      } catch {
        // 缓存内容不可解析，按未命中继续回源
      }
    }
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`upstream responded ${res.status}`);
  }
  const data = await res.json();

  if (cache) {
    // 只缓存确实带回内容的响应。上游偶发 200 但 images 为空时如果也写缓存，
    // 会把 NO_RESULT 钉死到 TTL 结束；宁可让空结果下次重新回源自愈。
    const hasContent = Array.isArray(data?.images) && data.images.length > 0;
    if (hasContent) {
      // Cache API 依据存续响应上的 Cache-Control 判断 TTL；只存 200 的纯 JSON，
      // 不存重定向、不存带 Set-Cookie 的响应。
      const toStore = new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': `public, s-maxage=${ttl}, max-age=${ttl}`,
        },
      });
      try {
        await cache.put(key, toStore);
      } catch {
        // 写缓存失败不影响主流程，下次请求重新回源即可
      }
    }
    return { data, status: 'MISS' };
  }

  return { data, status: 'BYPASS' };
}
