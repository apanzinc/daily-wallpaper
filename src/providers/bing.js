import { normalizeRegion, regionName } from '../regions.js';
import { cachedJson } from '../cache.js';

const BING_API = 'https://www.bing.com/HPImageArchive.aspx';
const BING_ORIGIN = 'https://www.bing.com';
const CACHE_KEY_BASE = 'https://upstream.cache.internal/bing';

// 质量档位：uhd 为 4K 超清，hd 为 1920x1080，原始即上游默认。
function applyQuality(url, quality) {
  const u = new URL(url, BING_ORIGIN);
  if (quality === 'uhd') {
    u.searchParams.set(
      'id',
      u.searchParams.get('id')?.replace(/_1920x1080\.jpg$/i, '_UHD.jpg') ?? '',
    );
  } else if (quality === 'hd') {
    u.searchParams.set(
      'id',
      u.searchParams.get('id')?.replace(/_UHD\.jpg$/i, '_1920x1080.jpg') ?? '',
    );
  }
  return u.toString();
}

function normalizeImage(raw, { quality, mkt }) {
  const url = applyQuality(raw.url ?? '', quality);
  return {
    date: raw.enddate ?? raw.startdate ?? '',
    title: raw.title ?? '',
    copyright: raw.copyright ?? '',
    copyrightLink: raw.copyrightlink ?? '',
    description: raw.copyright ?? '',
    url,
    urlBase: raw.urlbase ? `${BING_ORIGIN}${raw.urlbase}` : '',
    market: mkt,
    marketName: regionName(mkt),
    provider: 'bing',
  };
}

/**
 * 拉取必应每日一图。上游结果按 idx/n/mkt 走边缘缓存，quality 只影响本地
 * URL 变换，不参与缓存 key，因此不同清晰度共用同一份上游数据。
 * @param {object} opts
 * @param {number} opts.idx     今天往前第几天，0-7
 * @param {number} opts.n       张数，1-8
 * @param {string} opts.mkt     市场码
 * @param {string} opts.quality uhd | hd | original
 * @param {object} opts.meta    回写缓存状态，供入口层输出 X-Upstream-Cache
 */
export async function fetchBing({
  idx = 0,
  n = 1,
  mkt = 'zh-CN',
  quality = 'hd',
  meta,
  cacheKeyBase,
} = {}) {
  const region = normalizeRegion(mkt);
  const url = new URL(BING_API);
  url.searchParams.set('format', 'js');
  url.searchParams.set('idx', String(idx));
  url.searchParams.set('n', String(n));
  url.searchParams.set('mkt', region);

  // 规范化的缓存 key：同一地区 + 同一批历史 + 同一张数只回源一次。
  // 优先用请求自身 origin（属于当前 zone），本地无 origin 时退回内部常量。
  const keyUrl = new URL(cacheKeyBase ?? CACHE_KEY_BASE);
  keyUrl.searchParams.set('provider', 'bing');
  keyUrl.searchParams.set('idx', String(idx));
  keyUrl.searchParams.set('n', String(n));
  keyUrl.searchParams.set('mkt', region);

  const { data, status } = await cachedJson(url, {
    keyUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DailyWallpaper/1.0)',
      Accept: 'application/json, */*',
    },
  });
  if (meta) meta.upstreamCache = status;

  const images = Array.isArray(data?.images) ? data.images : [];
  if (images.length === 0) {
    return [];
  }
  return images.map((img) => normalizeImage(img, { quality, mkt: region }));
}

export const meta = {
  name: 'bing',
  label: '必应每日一图',
  maxIdx: 7,
  maxN: 8,
};
