export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // If explicitly requesting legacy 3D mode on root:
    if ((url.pathname === '/' || url.pathname === '/index.html') && url.searchParams.get('mode') === '3d_legacy') {
      return env.ASSETS.fetch(new Request(new URL('/legacy_gemini4/', request.url), request));
    }

    // If requesting '/index.html', fetch root '/' asset directly to avoid Cloudflare Assets 307 canonical redirect loop
    if (url.pathname === '/index.html') {
      const rootUrl = new URL('/', request.url);
      rootUrl.search = url.search;
      return env.ASSETS.fetch(new Request(rootUrl, request));
    }

    // Default: pass-through to Cloudflare Assets.
    // Cloudflare Assets automatically serves the root 'index.html' on '/' with 200 OK.
    return env.ASSETS.fetch(request);
  }
};
