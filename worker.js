export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // If root '/' or '/index.html' is requested:
    // Route to the flagship 3D crowd spiral tower experience by default,
    // while allowing ?mode=story or ?mode=2d to load the narrative adventure.
    if (url.pathname === '/' || url.pathname === '/index.html') {
      if (url.searchParams.get('mode') === 'story' || url.searchParams.get('mode') === '2d') {
        const storyReq = new Request(new URL('/index.html', request.url), request);
        return env.ASSETS.fetch(storyReq);
      }
      const towerReq = new Request(new URL('/legacy_gemini4/index.html', request.url), request);
      return env.ASSETS.fetch(towerReq);
    }

    return env.ASSETS.fetch(request);
  }
};
