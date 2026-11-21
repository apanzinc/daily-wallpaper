// 必应每日一图支持的常见市场（mkt）与中文名映射。
// 别名用于 ?mkt=中文 或常见写法，统一归一到官方 mkt 码。

export const REGIONS = {
  'zh-CN': '中国大陆',
  'zh-TW': '中国台湾',
  'zh-HK': '中国香港',
  'en-US': '美国',
  'en-GB': '英国',
  'en-CA': '加拿大',
  'en-AU': '澳大利亚',
  'ja-JP': '日本',
  'ko-KR': '韩国',
  'fr-FR': '法国',
  'de-DE': '德国',
  'es-ES': '西班牙',
  'it-IT': '意大利',
  'ru-RU': '俄罗斯',
};

// 用户友好别名 -> 官方 mkt
const ALIASES = {
  'cn': 'zh-CN',
  'china': 'zh-CN',
  '中国': 'zh-CN',
  '大陆': 'zh-CN',
  '简体': 'zh-CN',
  'tw': 'zh-TW',
  '台湾': 'zh-TW',
  'hk': 'zh-HK',
  '香港': 'zh-HK',
  'us': 'en-US',
  '美国': 'en-US',
  'uk': 'en-GB',
  '英国': 'en-GB',
  'jp': 'ja-JP',
  '日本': 'ja-JP',
  'kr': 'ko-KR',
  '韩国': 'ko-KR',
};

// 把任意写法归一成官方 mkt 码；不认识的原样返回交给上游处理。
export function normalizeRegion(input) {
  if (!input) return 'zh-CN';
  const raw = String(input).trim();
  const alias = ALIASES[raw.toLowerCase()] ?? ALIASES[raw];
  if (alias) return alias;
  // 大小写不敏感的官方码匹配（zh-cn -> zh-CN）
  const hit = Object.keys(REGIONS).find(
    (k) => k.toLowerCase() === raw.toLowerCase(),
  );
  return hit ?? raw;
}

export function regionName(mkt) {
  return REGIONS[mkt] ?? mkt;
}

export function isValidRegion(mkt) {
  return Boolean(REGIONS[mkt]);
}
