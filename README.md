# Daily Wallpaper API

免费、无需鉴权的每日壁纸接口，运行在 Cloudflare Workers。目前接入必应每日一图，架构上可持续扩展更多图源。

**线上地址：** https://wallpaper.apanzinc.top/api

试试：https://wallpaper.apanzinc.top/api?mkt=zh-CN&q=uhd

## 特点

- 无需 API Key，开箱即用
- 纯后端接口，根路径与 `/api` 都直接返回 JSON
- 支持地区（mkt）、历史日期（idx）、多张（n）、高清档位（uhd/hd）
- 支持 302 图片直链跳转，可直接当图片地址用
- CORS 全开，前端可跨域调用
- 1 小时缓存，减少上游压力

## API

### 地址

```
https://<你的域名>/api
```

根路径 `/` 等价于 `/api`。

### 参数

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `provider` | `bing` | 图源，目前仅 `bing` |
| `mkt` / `region` | `zh-CN` | 地区码，见下表 |
| `idx` | `0` | 今天往前第几天，0-7（超范围自动收敛） |
| `n` | `1` | 返回张数，1-8（超范围自动收敛） |
| `quality` / `q` | `hd` | 图片档位：`uhd`（4K）、`hd`（1920x1080）、`original` |
| `redirect` | `0` | 设为 `1` 时 302 跳转到第一张图片直链 |

### 地区码

支持官方 mkt 码及中文别名：

| 写法 | 归一到 | 中文名 |
| --- | --- | --- |
| `zh-CN` / `cn` / `中国` / `大陆` | `zh-CN` | 中国大陆 |
| `zh-TW` / `tw` / `台湾` | `zh-TW` | 中国台湾 |
| `zh-HK` / `hk` / `香港` | `zh-HK` | 中国香港 |
| `en-US` / `us` / `美国` | `en-US` | 美国 |
| `en-GB` / `uk` / `英国` | `en-GB` | 英国 |
| `ja-JP` / `jp` / `日本` | `ja-JP` | 日本 |
| `ko-KR` / `kr` / `韩国` | `ko-KR` | 韩国 |
| `fr-FR` / `de-DE` / `es-ES` / `it-IT` / `ru-RU` | 对应码 | — |

其他必应支持的 mkt 码也可直接传入。

### 示例

```bash
# 今日中国大陆壁纸
curl "https://<你的域名>/api"

# 日本区、4K 超清
curl "https://<你的域名>/api?mkt=日本&q=uhd"

# 昨天起 3 张
curl "https://<你的域名>/api?idx=1&n=3"

# 直接当图片地址用（302 跳转）
curl -L "https://<你的域名>/api?redirect=1&q=uhd" -o wallpaper.jpg
```

### 返回示例

```json
{
  "provider": "bing",
  "providerName": "必应每日一图",
  "market": "zh-CN",
  "marketName": "中国大陆",
  "quality": "hd",
  "count": 1,
  "images": [
    {
      "date": "20261121",
      "title": "陶瓦屋顶下的梦",
      "copyright": "法国普罗旺斯-阿尔卑斯-蔚蓝海岸大区尼斯 (© Siripong Kaewla-iad/Getty Images)",
      "copyrightLink": "https://www.bing.com/search?q=...",
      "description": "同 copyright",
      "url": "https://www.bing.com/th?id=..._1920x1080.jpg&...",
      "urlBase": "https://www.bing.com/th?id=...",
      "market": "zh-CN",
      "marketName": "中国大陆",
      "provider": "bing"
    }
  ]
}
```

### 错误码

| code | 含义 | HTTP |
| --- | --- | --- |
| `UNKNOWN_PROVIDER` | 未知图源 | 400 |
| `UNKNOWN_REGION` | 未知地区 | 400 |
| `INVALID_IDX` / `INVALID_N` | 参数非整数 | 400 |
| `NO_RESULT` | 无结果 | 404 |
| `UPSTREAM_ERROR` | 上游请求失败 | 502 |

## 部署

项目是标准 Cloudflare Worker。两种方式：

### 方式一：Wrangler 命令行

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

本地调试：

```bash
wrangler dev
```

### 方式二：Workers Builds 连接 GitHub

在 Cloudflare 控制台创建 Worker 时选择「从 GitHub 部署」，选中本仓库，构建命令留空，部署命令填 `npx wrangler deploy`。之后 push 到 main 会自动重新部署。

默认会分配 `https://daily-wallpaper.<子域>.workers.dev`。国内访问建议绑定自定义域名，在 Worker 的「设置 → 域」里添加即可。

## 扩展新图源

1. 在 `src/providers/` 增加一个 provider 文件，导出 `fetch` 方法和 `meta`
2. 在 `src/index.js` 的 `PROVIDERS` 注册表里登记

路由、参数校验、CORS、缓存等公共逻辑无需改动。

## 许可

MIT
