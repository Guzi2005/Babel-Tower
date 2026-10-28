// 平台寻路：把所有可站立面切分成「表面」，在表面之间建立 走/爬梯/跳跃/坠落/升降台 边，再做 Dijkstra
(function () {
  const NAV = {};

  NAV.buildSurfaces = function (supports, solids) {
    const out = [];
    for (const s of supports) {
      let pieces = [[s.x1, s.x2]];
      for (const b of solids) {
        if (b.y1 < s.y + 1.3 && b.y2 > s.y + 0.05) {
          pieces = pieces.flatMap(([a, c]) => {
            if (b.x2 <= a || b.x1 >= c) return [[a, c]];
            const r = [];
            if (b.x1 - a > 0.3) r.push([a, b.x1]);
            if (c - b.x2 > 0.3) r.push([b.x2, c]);
            return r;
          });
        }
      }
      pieces.forEach(p => out.push({ x1: p[0], x2: p[1], y: s.y, key: s.key, sup: s, i: out.length }));
    }
    return out;
  };

  function surfaceAt(surfs, key, x) {
    let best = null, bd = 1e9;
    for (const s of surfs) {
      if (s.key !== key) continue;
      const d = x < s.x1 ? s.x1 - x : x > s.x2 ? x - s.x2 : 0;
      if (d < bd) { bd = d; best = s; }
    }
    return bd < 0.6 ? best : null;
  }
  NAV.surfaceAt = surfaceAt;

  // 找到点击/目标点所在的表面
  NAV.findTarget = function (surfs, x, y, maxDown = 7) {
    let best = null, bd = Infinity;
    for (const s of surfs) {
      if (x < s.x1 - 0.35 || x > s.x2 + 0.35) continue;
      // 允许点击处在表面上方时落到下方表面，但绝不应点击地面却选到上方高处的箱顶/平台
      if (s.y > y + 0.25) continue;
      if (y - s.y > maxDown) continue;
      const dy = Math.abs(s.y - y);
      if (dy < bd) { bd = dy; best = s; }
    }
    return best;
  };

  function blockedBy(solids, x1, x2, y1, y2) {
    const a = Math.min(x1, x2), b = Math.max(x1, x2);
    for (const s of solids) if (s.x1 < b && s.x2 > a && s.y1 < y2 && s.y2 > y1) return true;
    return false;
  }
  function insideSolid(solids, x, y) {
    for (const s of solids) if (x > s.x1 && x < s.x2 && y > s.y1 + 0.05 && y < s.y2 - 0.05) return true;
    return false;
  }

  // ctx: {surfs, solids, ladders(active), lifts(powered list)}
  NAV.plan = function (ctx, unit, startSurf, goal) {
    const { surfs, solids } = ctx;
    const rise = unit.maxRise();
    const pts = [], adj = [];
    const P = (s, x) => { pts.push({ s, x: Math.max(s.x1 + 0.05, Math.min(s.x2 - 0.05, x)) }); adj.push([]); return pts.length - 1; };
    const E = (a, b, type, cost, extra) => adj[a].push({ to: b, type, cost, extra });

    const start = P(startSurf, unit.x);
    let goalSurf = NAV.findTarget(surfs, goal.x, goal.y);
    const goalIdx = goalSurf ? P(goalSurf, goal.x) : -1;

    // 梯子
    for (const ld of ctx.ladders) {
      const on = surfs.filter(s => ld.x >= s.x1 - 0.1 && ld.x <= s.x2 + 0.1 && s.y >= ld.y0 - 0.2 && s.y <= ld.y1 + 0.2).sort((a, b) => a.y - b.y);
      for (let i = 0; i + 1 < on.length; i++) {
        if (on[i + 1].y - on[i].y < 0.5) continue;
        const a = P(on[i], ld.x), b = P(on[i + 1], ld.x);
        const c = (on[i + 1].y - on[i].y) * 1.4;
        E(a, b, 'climb', c, { x: ld.x }); E(b, a, 'climb', c, { x: ld.x });
      }
    }

    // 跳跃 / 坠落
    // 跳跃 / 坠落 / 同高表面间平滑行走
    for (const A of surfs) {
      for (const B of surfs) {
        if (A === B) continue;
        const dy = B.y - A.y;

        // 同高度（或微小高差）的重叠或相邻表面（如升降台与地面/平台接壤处）
        if (Math.abs(dy) < 0.2) {
          const overlapX1 = Math.max(A.x1, B.x1);
          const overlapX2 = Math.min(A.x2, B.x2);
          if (overlapX2 >= overlapX1 - 0.25) {
            // 左侧边缘过渡
            if (B.x1 <= A.x1 + 0.25 && B.x2 >= A.x1 - 0.25) {
              const a = P(A, Math.min(A.x2 - 0.05, A.x1 + 0.2));
              const b = P(B, Math.max(B.x1 + 0.05, A.x1 - 0.2));
              E(a, b, 'walk', 0.4);
            }
            // 右侧边缘过渡
            if (B.x1 <= A.x2 + 0.25 && B.x2 >= A.x2 - 0.25) {
              const a = P(A, Math.max(A.x1 + 0.05, A.x2 - 0.2));
              const b = P(B, Math.min(B.x2 - 0.05, A.x2 + 0.2));
              E(a, b, 'walk', 0.4);
            }
          }
        }

        // 水平间隙
        let fromX = null, toX = null, gap = null;
        if (B.x1 >= A.x2 - 0.01) { gap = B.x1 - A.x2; fromX = A.x2 - 0.15; toX = B.x1 + 0.35; }
        else if (B.x2 <= A.x1 + 0.01) { gap = A.x1 - B.x2; fromX = A.x1 + 0.15; toX = B.x2 - 0.35; }
        if (gap !== null) {
          if (gap < 0.5 && Math.abs(dy) < 0.15) {
            const a = P(A, fromX), b = P(B, toX); E(a, b, 'walk', gap + 0.2);
            continue;
          }
          const reach = 2.6 + (dy < 0 ? Math.min(2.5, -dy * 0.35) : 0);
          if (dy <= rise && gap <= reach && dy > -9) {
            if (!blockedBy(solids, fromX, toX, Math.min(A.y, B.y) + 0.3, Math.max(A.y, B.y) + 1.4)) {
              const a = P(A, fromX), b = P(B, toX); E(a, b, 'jump', 2 + gap + Math.abs(dy));
            }
          }
          continue;
        }
        // 重叠：从下方跳上更高处的边缘（平台或木箱）
        if (dy > 0.2 && dy <= rise && B.sup.kind !== 'solid') {
          const isCrate = B.sup.kind === 'crate';
          const edgeCost = isCrate ? 8.0 + dy : 2.0 + dy;
          if (B.x1 > A.x1 + 0.3 && B.x1 < A.x2) {
            const fx = B.x1 - 0.55, tx = Math.min(B.x2 - 0.1, B.x1 + 0.4);
            if (!blockedBy(solids, fx, tx, A.y + 0.3, B.y + 1.4)) { const a = P(A, fx), b = P(B, tx); E(a, b, 'jump', edgeCost); }
          }
          if (B.x2 < A.x2 - 0.3 && B.x2 > A.x1) {
            const fx = B.x2 + 0.55, tx = Math.max(B.x1 + 0.1, B.x2 - 0.4);
            if (!blockedBy(solids, fx, tx, A.y + 0.3, B.y + 1.4)) { const a = P(A, fx), b = P(B, tx); E(a, b, 'jump', edgeCost); }
          }
        }
      }
      // 走下边缘（限制安全高度 <= 4.5 米，防止高空平台直接跳崖坠楼）
      for (const side of [-1, 1]) {
        const ex = side < 0 ? A.x1 : A.x2;
        const lx = ex + side * 0.55;
        if (insideSolid(solids, lx, A.y + 0.5)) continue;
        let land = null;
        for (const B of surfs) {
          if (B === A || B.y >= A.y - 0.2) continue;
          if (A.y - B.y > 4.5) continue; // 超过 4.5 米不可走下，应使用升降梯或木梯
          if (lx < B.x1 - 0.1 || lx > B.x2 + 0.1) continue;
          if (!land || B.y > land.y) land = B;
        }
        if (land && !blockedBy(solids, lx - 0.25, lx + 0.25, land.y + 0.2, A.y - 0.1)) {
          const a = P(A, ex - side * 0.1), b = P(land, lx);
          E(a, b, 'drop', 1 + (A.y - land.y) * 0.25);
        }
      }
    }

    // 升降台
    for (const lf of ctx.lifts) {
      const cx = (lf.x1 + lf.x2) / 2;
      const near = (y) => surfs.filter(s => Math.abs(s.y - y) < 0.15 && s.key !== 'L' + lf.id && s.x2 >= lf.x1 - 0.5 && s.x1 <= lf.x2 + 0.5);
      const bots = near(lf.y0), tops = near(lf.y1);
      const own = surfs.filter(s => s.key === 'L' + lf.id);
      const link = (froms, tos, fromY, toY) => {
        for (const f of froms) for (const t of tos) {
          const a = P(f, cx), b = P(t, cx);
          E(a, b, 'lift', 3 + Math.abs(lf.y1 - lf.y0) * 0.3, { lift: lf, fromY, toY });
        }
      };
      link(bots, tops, lf.y0, lf.y1); link(tops, bots, lf.y1, lf.y0);
      // 已在台上
      for (const o of own) {
        if (Math.abs(lf.y - lf.y0) < 0.05) link([o], tops, lf.y0, lf.y1);
        else if (Math.abs(lf.y - lf.y1) < 0.05) link([o], bots, lf.y1, lf.y0);
        else link([o], Math.abs(lf.target - lf.y1) < 0.05 ? tops : bots, lf.y, lf.target);
      }
    }

    // 同一表面内行走
    const bySurf = new Map();
    pts.forEach((p, i) => { if (!bySurf.has(p.s)) bySurf.set(p.s, []); bySurf.get(p.s).push(i); });
    bySurf.forEach(list => {
      list.sort((a, b) => pts[a].x - pts[b].x);
      for (let k = 0; k + 1 < list.length; k++) {
        const a = list[k], b = list[k + 1], c = pts[b].x - pts[a].x;
        E(a, b, 'walk', c); E(b, a, 'walk', c);
      }
    });

    // Dijkstra
    const n = pts.length, dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), pe = new Array(n).fill(null), done = new Array(n).fill(false);
    dist[start] = 0;
    for (;;) {
      let u = -1, bd = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; }
      if (u < 0) break;
      done[u] = true;
      for (const e of adj[u]) { const nd = dist[u] + e.cost; if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; pe[e.to] = e; } }
    }

    let target = goalIdx, reachable = goalIdx >= 0 && dist[goalIdx] < Infinity;
    if (!reachable) {
      // 走到最接近目标的可达位置
      let best = -1, bscore = Infinity;
      bySurf.forEach((list, s) => {
        let bestPt = -1, bd2 = Infinity;
        for (const i of list) if (dist[i] < bd2) { bd2 = dist[i]; bestPt = i; }
        if (bestPt < 0 || bd2 === Infinity) return;
        const x = Math.max(s.x1 + 0.1, Math.min(s.x2 - 0.1, goal.x));
        const score = Math.hypot(x - goal.x, s.y - goal.y) * 10 + bd2 * 0.1;
        if (score < bscore) { bscore = score; best = { s, x, from: bestPt }; }
      });
      if (!best) return { actions: [], reachable: false };
      const t = P(best.s, best.x); adj[best.from].push({ to: t, type: 'walk', cost: 0 });
      dist[t] = dist[best.from] + Math.abs(pts[best.from].x - best.x); prev[t] = best.from; pe[t] = { type: 'walk' };
      target = t;
    }

    const chain = [];
    for (let v = target; v !== start && v >= 0; v = prev[v]) chain.unshift({ p: pts[v], e: pe[v] });
    const actions = [];
    for (const c of chain) {
      const a = { type: c.e.type, x: c.p.x, y: c.p.s.y, key: c.p.s.key };
      if (c.e.extra) Object.assign(a, c.e.extra);
      const last = actions[actions.length - 1];
      if (a.type === 'walk' && last && last.type === 'walk' && last.key === a.key) { last.x = a.x; continue; }
      actions.push(a);
    }
    return { actions, reachable, goalSurf };
  };

  window.NAV = NAV;
})();
