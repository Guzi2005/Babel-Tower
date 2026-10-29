export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // The flagship 2D main stem (Babel: The Lost Appositive) is the definitive experience.
    // Root '/' and '/index.html' serve the 2D unified game directly.
    if (url.pathname === '/' || url.pathname === '/index.html') {
      if (url.searchParams.get('mode') === '3d_legacy') {
        return env.ASSETS.fetch(new Request(new URL('/legacy_gemini4/index.html', request.url), request));
      }
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    }

    return env.ASSETS.fetch(request);
  }
};
