/**
 * Cloudflare Worker（静态前端 + 同源反向代理）。
 *
 * 该 Worker 不处理业务逻辑，只做两件事：
 * 1. 命中静态资源（frontend/dist 里的文件）时由 Cloudflare 直接返回；
 * 2. /api、/uploads、/feed.xml 这些请求代理到 Render 后端。
 *
 * 为什么用 Worker 代理而不是让前端直连后端：
 * 本站认证用 HttpOnly Cookie + SameSite=Lax，前端在 pages.dev/workers.dev、
 * API 在 onrender.com 属于跨域，Cookie 不会带，会出现「登录成功但马上掉线」。
 * 代理后浏览器全程只认自己的域名，Cookie 正常。
 *
 * BACKEND_URL 通过 `wrangler secret put BACKEND_URL` 配置，不写死在代码里，
 * 这样换后端地址无需重新构建前端。
 */

interface Env {
  ASSETS: Fetcher;
  BACKEND_URL: string;
}

/** 需要转发到后端的路径前缀（精确 /feed.xml 单独处理） */
const PROXY_PREFIXES = ['/api', '/uploads/'];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isProxyRoute =
      PROXY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
      url.pathname === '/feed.xml';

    if (isProxyRoute) {
      const backend = (env.BACKEND_URL || '').replace(/\/+$/, '');
      if (!backend) {
        return new Response('BACKEND_URL is not configured', { status: 500 });
      }

      const target = new URL(url.pathname + url.search, backend);
      const proxyRequest = new Request(target.toString(), request);
      // Host 头必须是后端域名，否则 Render 无法路由到正确的服务
      proxyRequest.headers.set('Host', new URL(backend).host);

      try {
        return await fetch(proxyRequest);
      } catch {
        return new Response('Backend unavailable', { status: 502 });
      }
    }

    // 其余请求交给静态资源（SPA 路由：未命中文件时返回 index.html）
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
