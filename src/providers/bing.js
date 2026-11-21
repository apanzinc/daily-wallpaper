import { normalizeRegion, regionName } from '../regions.js';

const BING_API = 'https://www.bing.com/HPImageArchive.aspx';
const BING_ORIGIN = 'https://www.bing.com';

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
 * 拉取必应每日一图。
 * @param {object} opts
 * @param {number} opts.idx   今天往前第几天，0-7
 * @param {number} opts.n     张数，1-8
 * @param {string} opts.mkt   市场码
 * @param {string} opts.quality uhd | hd | original
 */
export async function fetchBing({ idx = 0, n = 1, mkt = 'zh-CN', quality = 'hd' } = {}) {
  const region = normalizeRegion(mkt);
  const url = new URL(BING_API);
  url.searchParams.set('format', 'js');
  url.searchParams.set('idx', String(idx));
  url.searchParams.set('n', String(n));
  url.searchParams.set('mkt', region);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DailyWallpaper/1.0)',
      Accept: 'application/json, */*',
    },
  });
  if (!res.ok) {
    throw new Error(`upstream responded ${res.status}`);
  }

  const data = await res.json();
  const images = Array.isArray(data.images) ? data.images : [];
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
