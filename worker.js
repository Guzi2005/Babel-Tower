export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Root (and /index.html) serves the flagship 3D Babel Tower build by default,
    // while ?mode=story or ?mode=2d loads the narrative adventure version.
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const mode = url.searchParams.get('mode');
      const target = (mode === 'story' || mode === '2d')
        ? '/index.html'
        : '/legacy_gemini4/index.html';
      return env.ASSETS.fetch(new URL(target, url.origin));
    }

    return env.ASSETS.fetch(request);
  }
};