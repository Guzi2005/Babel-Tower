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
      pieces.forEach(p => out.push({ x1: p[0], x2: p[1], y: s.y, key: s.key, sup: s, z: s.z, z1: s.z1, z2: s.z2, i: out.length }));
    }
    return out;
  };

  function surfaceAt(surfs, key, x, y) {
    let best = null, bd = 1e9;
    for (const s of surfs) {
      if (s.key !== key) continue;
      const d = x < s.x1 ? s.x1 - x : x > s.x2 ? x - s.x2 : 0;
      if (d < bd) { bd = d; best = s; }
    }
    if (bd < 0.85) return best;
    if (y !== undefined) {
      for (const s of surfs) {
        if (Math.abs(s.y - y) > 0.28) continue;
        const d = x < s.x1 ? s.x1 - x : x > s.x2 ? x - s.x2 : 0;
        if (d < bd) { bd = d; best = s; }
      }
    }
    return bd < 1.2 ? best : null;
  }
  NAV.surfaceAt = surfaceAt;

  // 找到点击/目标点所在的表面
  NAV.findTarget = function (surfs, x, y, maxDown = 7) {
    let best = null, bd = Infinity;
    for (const s of surfs) {
      const dx = x < s.x1 ? s.x1 - x : (x > s.x2 ? x - s.x2 : 0);
      // 允许选择梯洞两侧或平台边缘的落脚点，兼容点击平台正面/侧面厚板 (s.y <= y + 0.95)
      if (dx > 1.35) continue;
      if (s.y > y + 0.95) continue;
      if (y - s.y > maxDown) continue;
      const score = Math.abs(s.y - y) * 4 + dx * 2;
      if (score < bd) { bd = score; best = s; }
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

    // 梯子连接真实的洞口两侧落脚点，不把梯顶映射到仍被封住的楼板中心。
    for (const ld of ctx.ladders) {
      const ySet = new Set([ld.y0, ld.y1]);
      for (const s of surfs) {
        if (s.y > ld.y0 + 0.45 && s.y < ld.y1 - 0.45 && ld.x >= s.x1 - 1.1 && ld.x <= s.x2 + 1.1) {
          ySet.add(s.y);
        }
      }
      const ys = Array.from(ySet).sort((a, b) => a - b);
      const atHeight = y => surfs.filter(s => Math.abs(s.y - y) < 0.28 && (ld.x >= s.x1 - 1.25 && ld.x <= s.x2 + 1.25));
      for (let i = 0; i < ys.length; i++) {
        for (let j = i + 1; j < ys.length; j++) {
          if (ys[j] - ys[i] < 0.5) continue;
          for (const A of atHeight(ys[i])) for (const B of atHeight(ys[j])) {
            const safeExitOn = (surf, ladderX) => {
              if (surf.x2 - ladderX >= 0.75) return Math.min(surf.x2 - 0.25, ladderX + 0.65);
              if (ladderX - surf.x1 >= 0.75) return Math.max(surf.x1 + 0.25, ladderX - 0.65);
              return Math.max(surf.x1 + 0.15, Math.min(surf.x2 - 0.15, ladderX));
            };
            const ax = Math.max(A.x1 + 0.12, Math.min(A.x2 - 0.12, ld.x));
            const bx = Math.max(B.x1 + 0.12, Math.min(B.x2 - 0.12, ld.x));
            const exitOnB = safeExitOn(B, ld.x);
            const exitOnA = safeExitOn(A, ld.x);
            const a = P(A, ax), b = P(B, bx), c = 3 + (ys[j] - ys[i]) * 1.65;
            E(a, b, 'climb', c, { x: ld.x, fromX: ax, exitX: exitOnB });
            E(b, a, 'climb', c, { x: ld.x, fromX: bx, exitX: exitOnA });
          }
        }
      }
    }

    // 未修筑木板路 (builds)：允许全队跨断崖规划寻路，自动在断口边缘触发铺路机制
    if (ctx.builds) {
      for (const b of ctx.builds) {
        if (b.done) continue;
        const surfsAtH = surfs.filter(s => Math.abs(s.y - b.y) < 0.85);
        let leftSurf = null, rightSurf = null;
        let minLeftDist = Infinity, minRightDist = Infinity;
        for (const s of surfsAtH) {
          if (s.x2 <= b.x1 + 0.75) {
            const d = Math.abs(b.x1 - s.x2);
            if (d < minLeftDist) { minLeftDist = d; leftSurf = s; }
          }
          if (s.x1 >= b.x2 - 0.75) {
            const d = Math.abs(s.x1 - b.x2);
            if (d < minRightDist) { minRightDist = d; rightSurf = s; }
          }
        }
        if (leftSurf && rightSurf && minLeftDist < 2.0 && minRightDist < 2.0) {
          const ax = Math.max(leftSurf.x1 + 0.45, Math.min(leftSurf.x2 - 0.55, b.x1 - 0.75));
          const bx = Math.max(rightSurf.x1 + 0.55, Math.min(rightSurf.x2 - 0.45, b.x2 + 0.75));
          const a = P(leftSurf, ax), ptB = P(rightSurf, bx);
          const cost = 12 + (b.cost || 2) * 3;
          E(a, ptB, 'auto_build', cost, { build: b, dir: 1, stopX: ax, acrossX: bx, y: b.y });
          E(ptB, a, 'auto_build', cost, { build: b, dir: -1, stopX: bx, acrossX: ax, y: b.y });
        }
      }
    }

    // 跳跃 / 坠落 / 同高表面间平滑行走
    for (const A of surfs) {
      for (const B of surfs) {
        if (A === B) continue;
        const dy = B.y - A.y;

        // 同高度（或微小高差）的重叠或相邻表面（如升降台与地面/平台接壤处）
        if (Math.abs(dy) < 0.2) {
          const overlapX1 = Math.max(A.x1, B.x1);
          const overlapX2 = Math.min(A.x2, B.x2);
          if (overlapX2 >= overlapX1 - 0.35) {
            if (B.x1 <= A.x1 + 0.35 && B.x2 >= A.x1 - 0.35) {
              const a = P(A, Math.min(A.x2 - 0.05, A.x1 + 0.2));
              const b = P(B, Math.max(B.x1 + 0.05, A.x1 - 0.2));
              E(a, b, 'walk', 0.4);
            }
            if (B.x1 <= A.x2 + 0.35 && B.x2 >= A.x2 - 0.35) {
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
        // 重叠或阶梯相邻：从下方跳上更高处的平台、台阶或木箱
        if (dy > 0.18 && dy <= rise) {
          const isCrate = B.sup.kind === 'crate';
          const edgeCost = isCrate ? 8.0 + dy : 1.8 + dy;
          if (B.x1 >= A.x1 - 0.25 && B.x1 <= A.x2 + 0.05) {
            const fx = Math.max(A.x1 + 0.1, Math.min(A.x2 - 0.1, B.x1 - 0.45));
            const tx = Math.min(B.x2 - 0.1, B.x1 + 0.45);
            if (!blockedBy(solids, fx, tx, A.y + 0.3, B.y + 1.4)) { const a = P(A, fx), b = P(B, tx); E(a, b, 'jump', edgeCost); }
          }
          if (B.x2 <= A.x2 + 0.25 && B.x2 >= A.x1 - 0.05) {
            const fx = Math.min(A.x2 - 0.1, Math.max(A.x1 + 0.1, B.x2 + 0.45));
            const tx = Math.max(B.x1 + 0.1, B.x2 - 0.45);
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
      // 不可达时只停在真实存在且已经可达的图节点，绝不把目标坐标硬投影到另一层。
      let best = -1, bscore = Infinity;
      pts.forEach((p, i) => {
        if (dist[i] === Infinity) return;
        const score = Math.hypot(p.x - goal.x, p.s.y - goal.y) * 10 + dist[i] * 0.08;
        if (score < bscore) { bscore = score; best = i; }
      });
      if (best < 0) return { actions: [], reachable: false, approximate: true };
      target = best;
    }

    const chain = [];
    for (let v = target; v !== start && v >= 0; v = prev[v]) chain.unshift({ p: pts[v], e: pe[v] });
    const actions = [];
    for (const c of chain) {
      const a = { type: c.e.type, x: c.p.x, y: c.p.s.y, key: c.p.s.key, surf: c.p.s.i };
      if (c.e.extra) Object.assign(a, c.e.extra);
      const last = actions[actions.length - 1];
      if (a.type === 'walk' && last && last.type === 'walk' && last.surf === a.surf) { last.x = a.x; continue; }
      actions.push(a);
    }
    return { actions, reachable, approximate: !reachable, goalSurf };
  };

  window.NAV = NAV;
})();
