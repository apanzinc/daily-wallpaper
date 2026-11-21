import { fetchBing, meta as bingMeta } from './providers/bing.js';
import { normalizeRegion, isValidRegion, regionName } from './regions.js';

// provider 注册表：以后加新源只需在这里登记 + 增加一个 provider 文件。
const PROVIDERS = {
  bing: { meta: bingMeta, fetch: fetchBing },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      ...CORS,
      ...extra,
    },
  });
}

function error(code, message, status = 400) {
  return json({ error: { code, message } }, status, {
    'Cache-Control': 'no-store',
  });
}

function clampInt(value, fallback, min, max) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/**
 * 处理 /api 请求。
 */
export async function handleApi(searchParams) {
  const providerKey = (searchParams.get('provider') ?? 'bing').trim().toLowerCase();
  const provider = PROVIDERS[providerKey];
  if (!provider) {
    return error(
      'UNKNOWN_PROVIDER',
      `Unknown provider "${providerKey}". Available: ${Object.keys(PROVIDERS).join(', ')}`,
    );
  }

  const idxRaw = searchParams.get('idx');
  const nRaw = searchParams.get('n');
  const idx = clampInt(idxRaw, 0, 0, provider.meta.maxIdx);
  const n = clampInt(nRaw, 1, 1, provider.meta.maxN);
  if (Number.isNaN(idx)) return error('INVALID_IDX', 'idx must be an integer');
  if (Number.isNaN(n)) return error('INVALID_N', 'n must be an integer');

  const mktRaw = searchParams.get('mkt') ?? searchParams.get('region') ?? 'zh-CN';
  const mkt = normalizeRegion(mktRaw);
  if (!isValidRegion(mkt)) {
    return error(
      'UNKNOWN_REGION',
      `Unknown region "${mktRaw}". Use a code like zh-CN, en-US, ja-JP.`,
    );
  }

  const qualityRaw = (searchParams.get('quality') ?? 'hd').trim().toLowerCase();
  const quality = ['uhd', 'hd', 'original'].includes(qualityRaw) ? qualityRaw : 'hd';

  let images;
  try {
    images = await provider.fetch({ idx, n, mkt, quality });
  } catch (e) {
    return error('UPSTREAM_ERROR', e.message ?? 'upstream request failed', 502);
  }

  if (images.length === 0) {
    return error('NO_RESULT', 'No image available for the given parameters', 404);
  }

  const redirect = searchParams.get('redirect') === '1';
  if (redirect) {
    const target = images[0].url;
    return new Response(null, {
      status: 302,
      headers: { Location: target, 'Cache-Control': 'public, max-age=3600', ...CORS },
    });
  }

  return json({
    provider: providerKey,
    providerName: provider.meta.label,
    market: mkt,
    marketName: regionName(mkt),
    quality,
    count: images.length,
    images,
  });
}

export function handleOptions() {
  return new Response(null, { status: 204, headers: CORS });
}
