import { handleApi, handleOptions } from './src/index.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return handleOptions();
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 兼容简写 q=uhd（在入口把它归一到 quality），同时保留 quality 原参数。
    if (url.searchParams.has('q') && !url.searchParams.has('quality')) {
      url.searchParams.set('quality', url.searchParams.get('q'));
    }

    // 根路径与 /api 等价，都返回 JSON。
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/api') {
      return handleApi(url.searchParams);
    }

    return new Response('Not Found', { status: 404 });
  },
};
