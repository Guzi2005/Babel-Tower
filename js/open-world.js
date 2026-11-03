// 连续城区与巴别塔：真实 XZ 行走、建筑占地、街区寻路与统一塔体
// 主运行时扩展；legacy_gemini4 不加载本文件。
(function () {
  'use strict';

  const OW = {
    active: false,
    preparing: false,
    bounds: { x1: -110, x2: 122, z1: -88, z2: 32 },
    spawnZ: 8,
    obstacles: [],
    interiors: [],
    roads: [],
    root: null,
    game: null,
    cell: 0.8,
    grid: null,
    tower: { x: 67, z: -28, radius: 30, tiers: 12 },
    stats: { buildings: 0, towerTiers: 12, instances: 0 }
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function canvasTexture(canvas, rx = 1, ry = 1) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rx, ry);
    tex.anisotropy = 4;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  // 统一纹素密度的颜色／高度贴图。高度图用于 bump，不伪装成法线贴图。
  function surfaceCanvases(kind, base, mortar, seed) {
    const random = rng(seed);
    const color = PX.canvas(128, 128);
    const height = PX.canvas(128, 128);
    const c = color.getContext('2d'), h = height.getContext('2d');
    c.fillStyle = base; c.fillRect(0, 0, 128, 128);
    h.fillStyle = '#888'; h.fillRect(0, 0, 128, 128);
    if (kind === 'brick' || kind === 'ashlar' || kind === 'cobble') {
      const rowH = kind === 'cobble' ? 16 : (kind === 'ashlar' ? 24 : 20);
      for (let y = 0, row = 0; y < 128; y += rowH, row++) {
        const bw = kind === 'cobble' ? 22 : (kind === 'ashlar' ? 48 : 36);
        const offset = (row % 2) * bw * 0.5;
        for (let x = -bw; x < 128 + bw; x += bw) {
          const x0 = x + offset;
          c.strokeStyle = mortar; c.lineWidth = kind === 'ashlar' ? 2 : 1.4;
          c.strokeRect(x0 + 0.7, y + 0.7, bw - 1.4, rowH - 1.4);
          h.strokeStyle = '#333'; h.lineWidth = 2;
          h.strokeRect(x0 + 1, y + 1, bw - 2, rowH - 2);
          c.fillStyle = `rgba(255,240,205,${0.025 + random() * 0.055})`;
          c.fillRect(x0 + 2, y + 2, bw - 4, rowH * 0.35);
        }
      }
    }
    for (let i = 0; i < 1900; i++) {
      const x = random() * 128, y = random() * 128;
      const dark = random() > 0.48;
      c.fillStyle = dark ? `rgba(55,35,20,${random() * 0.09})` : `rgba(255,246,220,${random() * 0.11})`;
      c.fillRect(x, y, 0.6 + random() * 1.8, 0.6 + random() * 1.4);
      const v = Math.floor(105 + random() * 55);
      h.fillStyle = `rgb(${v},${v},${v})`; h.fillRect(x, y, 1, 1);
    }
    return { color, height };
  }

  function pbr(kind, base, mortar, seed, rx = 2, ry = 2, extra = {}) {
    const canvases = surfaceCanvases(kind, base, mortar, seed);
    const map = canvasTexture(canvases.color, rx, ry);
    const bumpMap = canvasTexture(canvases.height, rx, ry);
    return new THREE.MeshStandardMaterial({
      map, bumpMap, bumpScale: kind === 'ashlar' ? 0.11 : 0.075,
      roughness: 0.88, metalness: 0, ...extra
    });
  }

  class Batches {
    constructor(root) {
      this.root = root;
      this.entries = new Map();
      this.geometry = {
        box: new THREE.BoxGeometry(1, 1, 1),
        cylinder: new THREE.CylinderGeometry(1, 1, 1, 32),
        column: new THREE.CylinderGeometry(0.78, 1, 1, 16),
        tapered: new THREE.CylinderGeometry(0.72, 1, 1, 4),
        cone: new THREE.ConeGeometry(1, 1, 12),
        dome: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        arch: new THREE.TorusGeometry(1, 0.16, 8, 24, Math.PI)
      };
      this.geometry.tapered.rotateY(Math.PI / 4);
    }
    add(shape, mat, x, y, z, sx, sy, sz, ry = 0, data = null) {
      const geo = this.geometry[shape];
      const dataKey = data ? Object.keys(data).sort().map(k => k + '=' + String(data[k])).join(',') : '';
      const key = shape + ':' + mat.uuid + ':' + (data && data.noShadow ? 'n' : 's') + ':' + dataKey;
      if (!this.entries.has(key)) this.entries.set(key, { geo, mat, items: [], data });
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)
      );
      this.entries.get(key).items.push(m);
    }
    finish() {
      let total = 0;
      this.entries.forEach(entry => {
        const mesh = new THREE.InstancedMesh(entry.geo, entry.mat, entry.items.length);
        entry.items.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = !(entry.data && entry.data.noShadow);
        mesh.receiveShadow = true;
        if (entry.data) Object.assign(mesh.userData, entry.data);
        this.root.add(mesh); total += entry.items.length;
      });
      return total;
    }
  }

  function addObstacle(x, z, w, d, tag = 'building') {
    OW.obstacles.push({ kind: 'box', x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, tag });
  }

  function addCircleObstacle(x, z, r, tag = 'column') {
    OW.obstacles.push({ kind: 'circle', x, z, r, tag });
  }

  function collides(x, z, radius = 0.34, includeCrates = false) {
    if (x < OW.bounds.x1 + radius || x > OW.bounds.x2 - radius || z < OW.bounds.z1 + radius || z > OW.bounds.z2 - radius) return true;
    if (includeCrates && OW.game && OW.game.crates) {
      for (const c of OW.game.crates) {
        if (Math.abs(c.y) > 1.2) continue;
        const nx = clamp(x, c.x - 0.55, c.x + 0.55), nz = clamp(z, -0.75, 0.75);
        if (dist2(x, z, nx, nz) < radius) return true;
      }
    }
    for (const o of OW.obstacles) {
      if (o.kind === 'circle') {
        if (dist2(x, z, o.x, o.z) < o.r + radius) return true;
      } else {
        const nx = clamp(x, o.x1, o.x2), nz = clamp(z, o.z1, o.z2);
        if (dist2(x, z, nx, nz) < radius) return true;
      }
    }
    return false;
  }

  function segmentClear(ax, az, bx, bz, radius = 0.35) {
    const length = dist2(ax, az, bx, bz);
    const steps = Math.max(1, Math.ceil(length / 0.35));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (collides(ax + (bx - ax) * t, az + (bz - az) * t, radius, true)) return false;
    }
    return true;
  }

  function detectInteriorAt(x, z) {
    for (const r of OW.interiors) {
      if (r.id === 'tower_vestibule') {
        if (dist2(x, z, r.x, r.z) < 21.5) return r;
      } else if (Math.abs(x - r.x) < r.w / 2 - 0.12 && Math.abs(z - r.z) < r.d / 2 - 0.12) {
        return r;
      }
    }
    return null;
  }

  function constrainUnit(u, oldX, oldZ) {
    if (!OW.active || !u || u.state === 'climb' || u.state === 'coop' || u.y > 1.35) return;
    let x = clamp(u.x, OW.bounds.x1 + 0.35, OW.bounds.x2 - 0.35);
    let z = clamp(u.targetZ || 0, OW.bounds.z1 + 0.35, OW.bounds.z2 - 0.35);
    const radius = 0.32;
    if (collides(oldX, oldZ, radius)) {
      // 仅旧存档或调试传送已经嵌入障碍时执行恢复；正常贴墙绝不侧弹。
      let found = null;
      for (let ring = 0.4; ring <= 4 && !found; ring += 0.4) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          const px = oldX + Math.cos(a) * ring, pz = oldZ + Math.sin(a) * ring;
          if (!collides(px, pz, radius)) { found = { x: px, z: pz }; break; }
        }
      }
      if (found) { oldX = found.x; oldZ = found.z; x = oldX; z = oldZ; }
    }
    if (collides(x, oldZ, radius)) x = oldX;
    if (collides(x, z, radius)) z = oldZ;
    u.x = x; u.targetZ = z; u.z = z;
    u.openMoving = dist2(oldX, oldZ, x, z) > 0.0005;
    if (collides(u.x + u.vx * 0.02, z, radius)) u.vx = 0;

    // 实时感知进出可步入室内空间（无需传送即可自然走入走出）
    const room = detectInteriorAt(x, z);
    const prevId = u.interiorId || null;
    const nextId = room ? room.id : null;
    u.inInterior = !!room;
    u.interiorId = nextId;
    if (OW.game && u === OW.game.leader && prevId !== nextId) {
      OW.game.camOffsetZ = room ? 17 : 24;
      if (room) {
        OW.game.hud.banner(`步入【${room.name}】 · 可直接走出或按 E 互动`, 'story');
      }
    }
  }

  // ── 精细网格 A*（0.8m 格）：支持直接穿门入室、绕柱与街巷平滑寻路 ──
  function buildGrid() {
    const cell = OW.cell, b = OW.bounds;
    const cols = Math.floor((b.x2 - b.x1) / cell) + 1;
    const rows = Math.floor((b.z2 - b.z1) / cell) + 1;
    const walkable = new Uint8Array(cols * rows);
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const wx = b.x1 + x * cell, wz = b.z1 + z * cell;
        walkable[z * cols + x] = collides(wx, wz, 0.34) ? 0 : 1;
      }
    }
    OW.grid = { cell, cols, rows, walkable };
  }

  function nearestCell(x, z) {
    const g = OW.grid;
    const cx = clamp(Math.round((x - OW.bounds.x1) / g.cell), 0, g.cols - 1);
    const cz = clamp(Math.round((z - OW.bounds.z1) / g.cell), 0, g.rows - 1);
    const at = (xx, zz) => zz * g.cols + xx;
    if (g.walkable[at(cx, cz)]) return { x: cx, z: cz };
    for (let r = 1; r <= 14; r++) {
      let best = null, bestD = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const nx = cx + dx, nz = cz + dz;
          if (nx >= 0 && nx < g.cols && nz >= 0 && nz < g.rows && g.walkable[at(nx, nz)]) {
            const p = cellWorld({ x: nx, z: nz });
            const d = dist2(x, z, p.x, p.z);
            if (d < bestD) { bestD = d; best = { x: nx, z: nz }; }
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function cellWorld(c) {
    return { x: OW.bounds.x1 + c.x * OW.grid.cell, z: OW.bounds.z1 + c.z * OW.grid.cell };
  }

  function smoothPath(points) {
    if (points.length < 3) return points;
    const result = [points[0]];
    let anchor = 0;
    while (anchor < points.length - 1) {
      let next = points.length - 1;
      while (next > anchor + 1 && !segmentClear(points[anchor].x, points[anchor].z, points[next].x, points[next].z, 0.34)) next--;
      result.push(points[next]); anchor = next;
    }
    return result;
  }

  function plan(ax, az, bx, bz) {
    if (!OW.grid) buildGrid();
    if (!collides(bx, bz, 0.34, true) && segmentClear(ax, az, bx, bz, 0.34)) {
      return [{ x: bx, z: bz }];
    }
    const g = OW.grid, start = nearestCell(ax, az), goal = nearestCell(bx, bz);
    if (!start || !goal) return null;
    const cols = g.cols, rows = g.rows;
    const idx = (x, z) => z * cols + x;
    const startIdx = idx(start.x, start.z), goalIdx = idx(goal.x, goal.z);
    const dynamicBlocked = new Set();
    if (OW.game && OW.game.crates) {
      OW.game.crates.filter(c => Math.abs(c.y) <= 1.2).forEach(c => {
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const cell = nearestCell(c.x + dx * g.cell * 0.55, (dz * g.cell * 0.55));
          if (cell && dist2(cellWorld(cell).x, cellWorld(cell).z, c.x, 0) < 1.1) dynamicBlocked.add(idx(cell.x, cell.z));
        }
      });
    }
    if (startIdx === goalIdx) {
      const gp = cellWorld(goal);
      return [ !collides(bx, bz, 0.34, true) ? { x: bx, z: bz } : gp ];
    }
    const total = cols * rows;
    const cost = new Float32Array(total); cost.fill(Infinity);
    const parent = new Int32Array(total); parent.fill(-1);
    const closed = new Uint8Array(total);
    const heap = [];
    const push = node => {
      heap.push(node); let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p].f <= node.f) break;
        heap[i] = heap[p]; i = p;
      }
      heap[i] = node;
    };
    const pop = () => {
      const first = heap[0], last = heap.pop();
      if (heap.length && last) {
        let i = 0;
        while (true) {
          let child = i * 2 + 1;
          if (child >= heap.length) break;
          if (child + 1 < heap.length && heap[child + 1].f < heap[child].f) child++;
          if (heap[child].f >= last.f) break;
          heap[i] = heap[child]; i = child;
        }
        heap[i] = last;
      }
      return first;
    };
    cost[startIdx] = 0;
    push({ i: startIdx, x: start.x, z: start.z, f: 0 });
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let iterations = 0, found = false, bestIdx = startIdx, bestH = Math.hypot(goal.x - start.x, goal.z - start.z);
    while (heap.length && iterations++ < total * 2) {
      const cur = pop();
      if (!cur || closed[cur.i]) continue;
      if (cur.i === goalIdx) { found = true; bestIdx = goalIdx; break; }
      closed[cur.i] = 1;
      const hCur = Math.hypot(goal.x - cur.x, goal.z - cur.z);
      if (hCur < bestH) { bestH = hCur; bestIdx = cur.i; }
      for (const [dx, dz, step] of dirs) {
        const nx = cur.x + dx, nz = cur.z + dz;
        if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue;
        const ni = idx(nx, nz);
        if (!g.walkable[ni] || closed[ni] || (dynamicBlocked.has(ni) && ni !== startIdx && ni !== goalIdx)) continue;
        if (dx && dz && (!g.walkable[idx(cur.x + dx, cur.z)] || !g.walkable[idx(cur.x, cur.z + dz)])) continue;
        const nc = cost[cur.i] + step;
        if (nc >= cost[ni]) continue;
        cost[ni] = nc; parent[ni] = cur.i;
        const heuristic = Math.hypot(goal.x - nx, goal.z - nz);
        push({ i: ni, x: nx, z: nz, f: nc + heuristic });
      }
    }
    const endIdx = found ? goalIdx : bestIdx;
    if (endIdx === startIdx && !found) return null;
    const cells = [];
    let at = endIdx;
    while (at !== -1) {
      const x = at % cols, z = Math.floor(at / cols);
      cells.push({ x, z }); at = parent[at];
    }
    cells.reverse();
    const points = cells.map(cellWorld);
    points[0] = { x: ax, z: az };
    if (found && !collides(bx, bz, 0.34, true)) points[points.length - 1] = { x: bx, z: bz };
    return smoothPath(points);
  }

  function commandMove(game, units, x, z) {
    if (collides(x, z, 0.34)) {
      const cell = nearestCell(x, z);
      if (!cell) { game.hud.banner('这处建筑占地无法停留，请点击街道或广场', 'info'); return; }
      const p = cellWorld(cell); x = p.x; z = p.z;
    }
    let accepted = 0;
    const isPartialSquad = units.length < game.available().length;
    units.forEach((u, i) => {
      const offset = (i - (units.length - 1) / 2) * 0.65;
      let tx = x + offset, tz = z + (i % 2) * 0.38;
      // 确保编队偏移点不落入墙体另一侧或障碍内
      if (collides(tx, tz, 0.34) || !segmentClear(x, z, tx, tz, 0.32)) {
        tx = x; tz = z;
      }
      const path = plan(u.x, u.targetZ || 0, tx, tz);
      if (!path) return;
      u.openPath = null;
      u.holdPos = isPartialSquad;
      game.deliver(u, { type: 'open_move', goal: { x: tx, y: 0, z: tz }, pathXZ: path, pathIndex: 0, act: 'move' });
      accepted++;
    });
    if (!accepted) game.hud.banner('目标与当前区域之间没有连通街道', 'warn');
  }

  function updateUnitOrder(u, dt) {
    const order = u.order;
    if (!order || order.type !== 'open_move') return;
    if (!u.grounded || u.y > 1.2) { u.vx = 0; return; }
    const path = order.pathXZ || [];
    let index = order.pathIndex || 0;
    if (index >= path.length) { u.openMoving = false; return u.arrive(); }
    let p = path[index];
    let dx = p.x - u.x, dz = p.z - (u.targetZ || 0), distance = Math.hypot(dx, dz);
    if (distance < 0.28) {
      order.pathIndex = ++index;
      if (index >= path.length) {
        u.x = p.x; u.targetZ = p.z; u.z = p.z;
        u.vx = 0; u.openMoving = false;
        return u.arrive();
      }
      p = path[index]; dx = p.x - u.x; dz = p.z - (u.targetZ || 0); distance = Math.hypot(dx, dz);
    }
    // 拐角或木箱卡住时自动重算路径
    const prevX = u._lastOpenX !== undefined ? u._lastOpenX : u.x;
    const prevZ = u._lastOpenZ !== undefined ? u._lastOpenZ : (u.targetZ || 0);
    u._lastOpenX = u.x; u._lastOpenZ = u.targetZ || 0;
    if (Math.hypot(u.x - prevX, (u.targetZ || 0) - prevZ) < 0.003) {
      u._openStuckT = (u._openStuckT || 0) + dt;
      if (u._openStuckT > 0.55 && order.goal) {
        u._openStuckT = 0;
        const replanned = plan(u.x, u.targetZ || 0, order.goal.x, order.goal.z || 0);
        if (replanned && replanned.length) {
          order.pathXZ = replanned;
          order.pathIndex = 0;
          p = replanned[0];
          dx = p.x - u.x; dz = p.z - (u.targetZ || 0); distance = Math.hypot(dx, dz);
        }
      }
    } else {
      u._openStuckT = 0;
    }
    const speed = u.speed() * Math.min(1, Math.max(0.55, distance));
    u.vx = distance > 0.001 ? dx / distance * speed : 0;
    u.targetZ = (u.targetZ || 0) + (distance > 0.001 ? dz / distance * speed * dt : 0);
    u.facing = Math.abs(dx) > 0.05 ? Math.sign(dx) : u.facing;
    u.state = 'walk'; u.openMoving = true;
  }

  function updateFollower(u, leader, index, dt) {
    if (!u.grounded || u.y > 1.2 || leader.y > 1.2 || u.detached || u.holdPos) return false;
    const side = index % 2 ? 1 : -1;
    const back = 0.95 + Math.floor(index / 2) * 0.75;
    const dir = leader.vx !== 0 ? Math.sign(leader.vx) : (leader.facing || 1);
    let tx = leader.x - dir * back + side * 0.35;
    let tz = (leader.targetZ || 0) + side * (0.65 + Math.floor(index / 2) * 0.32);
    if (collides(tx, tz, 0.34) || !segmentClear(leader.x, leader.targetZ || 0, tx, tz, 0.32)) {
      tx = leader.x - dir * 0.65;
      tz = leader.targetZ || 0;
    }
    const distToSlot = dist2(u.x, u.targetZ || 0, tx, tz);
    if (distToSlot < 0.85) {
      u.vx = 0; u.openMoving = false; u.openPath = null; return true;
    }
    // 视线畅通时直接平滑跟随，免除频繁网格抖动；仅受阻时启用 A* 绕障
    if (segmentClear(u.x, u.targetZ || 0, tx, tz, 0.32)) {
      u.openPath = null;
      const speed = u.speed() * (distToSlot > 2.8 ? 1.05 : 0.92);
      const dx = tx - u.x, dz = tz - (u.targetZ || 0);
      u.vx = dx / distToSlot * speed;
      u.targetZ = (u.targetZ || 0) + (dz / distToSlot * speed * dt);
      u.facing = Math.abs(dx) > 0.05 ? Math.sign(dx) : u.facing;
      u.state = 'walk'; u.openMoving = true;
      return true;
    }
    u.followPlanT = (u.followPlanT || 0) - dt;
    if (!u.openPath || u.followPlanT <= 0) {
      u.openPath = plan(u.x, u.targetZ || 0, tx, tz);
      u.followPlanT = 0.65 + index * 0.12; u.openPathIndex = 0;
    }
    const path = u.openPath;
    if (!path || !path.length) { u.vx = 0; u.openMoving = false; return true; }
    let pi = Math.min(u.openPathIndex || 0, path.length - 1), p = path[pi];
    let dx = p.x - u.x, dz = p.z - (u.targetZ || 0), d = Math.hypot(dx, dz);
    if (d < 0.35 && pi < path.length - 1) {
      u.openPathIndex = ++pi; p = path[pi]; dx = p.x - u.x; dz = p.z - (u.targetZ || 0); d = Math.hypot(dx, dz);
    }
    const speed = u.speed() * (distToSlot > 3.5 ? 1.05 : 0.92);
    u.vx = d > 0.04 ? dx / d * speed : 0;
    u.targetZ = (u.targetZ || 0) + (d > 0.04 ? dz / d * speed * dt : 0);
    u.facing = Math.abs(dx) > 0.05 ? Math.sign(dx) : u.facing;
    u.state = 'walk'; u.openMoving = true;
    return true;
  }

  // ── 场景：道路、城市、远景和唯一塔体 ──
  function makeMaterials() {
    const mats = {
      sand: pbr('sand', '#cba66f', '#9a744d', 101, 70, 52, { bumpScale: 0.16 }),
      road: pbr('cobble', '#bda77e', '#786b55', 102, 5, 2),
      curb: pbr('ashlar', '#d4c39e', '#968468', 103, 4, 1),
      adobe: pbr('brick', '#d6b382', '#9c7d58', 104, 2, 2),
      adobeLight: pbr('brick', '#e2c89b', '#aa8c64', 105, 2, 2),
      firedBrick: pbr('brick', '#a96747', '#684b3b', 114, 2, 2, { roughness: 0.8 }),
      plaster: pbr('sand', '#dfcfad', '#b49a76', 115, 2, 2, { bumpScale: 0.045 }),
      stone: pbr('ashlar', '#c8b48d', '#82725b', 106, 3, 2),
      stoneDark: pbr('ashlar', '#8a755a', '#544638', 107, 3, 2),
      basalt: pbr('ashlar', '#4d5355', '#292e31', 116, 3, 2, { roughness: 0.76 }),
      marble: pbr('ashlar', '#ded3b8', '#a89c85', 108, 2, 2, { roughness: 0.58 }),
      alabaster: pbr('ashlar', '#f0e5c9', '#c4b797', 117, 2, 2, { roughness: 0.42, emissive: 0x312711, emissiveIntensity: 0.05 }),
      wood: pbr('wood', '#684325', '#35271b', 109, 2, 2),
      cedar: pbr('wood', '#875334', '#412b20', 118, 2, 2, { roughness: 0.72 }),
      bronze: new THREE.MeshStandardMaterial({ color: 0x8f6b35, roughness: 0.36, metalness: 0.68 }),
      porphyry: pbr('ashlar', '#76545b', '#49373e', 119, 2, 2, { roughness: 0.5 }),
      lapis: new THREE.MeshStandardMaterial({ color: 0x195c78, roughness: 0.48, metalness: 0.08 }),
      turquoise: new THREE.MeshStandardMaterial({ color: 0x2b8b8d, roughness: 0.32, metalness: 0.12 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xc99b3f, roughness: 0.42, metalness: 0.42 }),
      sacredGold: new THREE.MeshStandardMaterial({ color: 0xd9ae4e, roughness: 0.34, metalness: 0.65, emissive: 0x4a3008, emissiveIntensity: 0.12 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 0.95 }),
      cloth: new THREE.MeshStandardMaterial({ color: 0x9d3c2c, roughness: 0.95, side: THREE.DoubleSide }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x4d6f3b, roughness: 0.95, side: THREE.DoubleSide }),
      water: new THREE.MeshStandardMaterial({ color: 0x3c8c96, roughness: 0.25, metalness: 0.08, transparent: true, opacity: 0.88 })
    };
    return mats;
  }

  function plane(root, w, d, mat, x, y, z, data) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    if (data) Object.assign(mesh.userData, data);
    root.add(mesh); return mesh;
  }

  function scaledPlaneMaterial(source, w, d, metersPerTile = 4) {
    const mat = source.clone();
    if (source.map) { mat.map = source.map.clone(); mat.map.repeat.set(Math.max(1, w / metersPerTile), Math.max(1, d / metersPerTile)); }
    if (source.bumpMap) { mat.bumpMap = source.bumpMap.clone(); mat.bumpMap.repeat.copy(mat.map.repeat); }
    return mat;
  }

  function buildRoads(root, mats) {
    plane(root, 720, 560, mats.sand, 0, -0.12, -150, { isGround: true, isWalkway: true });
    const roads = [
      { axis: 'x', a: -108, b: 86, c: 8, w: 6, name: '两河主街' },
      { axis: 'x', a: -100, b: 40, c: -12, w: 5, name: '市集街' },
      { axis: 'x', a: -100, b: 40, c: -36, w: 5, name: '工匠街' },
      { axis: 'x', a: -100, b: 36, c: -60, w: 4.5, name: '北环路' },
      { axis: 'x', a: -100, b: 32, c: -80, w: 4, name: '河岸路' },
      { axis: 'z', a: -82, b: 22, c: -102, w: 4.5, name: '西外巷' },
      { axis: 'z', a: -82, b: 22, c: -82, w: 4.5, name: '西环巷' },
      { axis: 'z', a: -82, b: 22, c: -58, w: 4.5, name: '农夫巷' },
      { axis: 'z', a: -82, b: 22, c: -34, w: 4.5, name: '织工巷' },
      // 村落与采石场、塔区北侧的纵向街巷止于 z=-12（市集街），绝不穿过西台地、议事长屋或采石场断崖
      { axis: 'z', a: -82, b: -12, c: -10, w: 4.5, name: '古井北巷' },
      { axis: 'z', a: -82, b: -12, c: 14, w: 4.5, name: '文书北巷' },
      { axis: 'z', a: -60, b: -12, c: 38, w: 5, name: '塔西北道' }
    ];
    OW.roads = roads;
    roads.forEach(r => {
      const length = r.b - r.a, mid = (r.a + r.b) / 2;
      const w = r.axis === 'x' ? length : r.w, d = r.axis === 'x' ? r.w : length;
      const x = r.axis === 'x' ? mid : r.c, z = r.axis === 'x' ? r.c : mid;
      plane(root, w + 0.8, d + 0.8, scaledPlaneMaterial(mats.curb, w + 0.8, d + 0.8), x, -0.032, z, { isGround: true, isWalkway: true });
      plane(root, w, d, scaledPlaneMaterial(mats.road, w, d, 5), x, -0.018, z, { isGround: true, isWalkway: true, roadName: r.name });
    });
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 0.08, 64), mats.road);
    plaza.position.set(67, -0.045, 8); plaza.receiveShadow = true;
    plaza.userData.isGround = plaza.userData.isWalkway = true; root.add(plaza);
    const plazaRing = new THREE.Mesh(new THREE.RingGeometry(15.8, 16.35, 64), mats.lapis);
    plazaRing.rotation.x = -Math.PI / 2; plazaRing.position.set(67, 0.012, 8); root.add(plazaRing);
  }

  function addBuilding(batch, mats, spec, random) {
    const { x, z, w, d, h, style, enterable } = spec;
    const wall = spec.wall || (random() > 0.45 ? mats.adobe : mats.adobeLight);
    const roomId = 'house_' + OW.interiors.length;
    const shellData = { isFrontOccluder: true, interiorId: enterable ? roomId : '' };
    batch.add('box', mats.stone, x, enterable ? 0.04 : 0.25, z, w + 0.25, enterable ? 0.08 : 0.5, d + 0.25, 0, { isGround: !!enterable, isWalkway: !!enterable });
    if (enterable) {
      // 可进入建筑由四面真实墙体组成；南侧中央保留 1.7m 门洞，不用整栋实心盒体。
      const t = 0.34, doorW = 1.7, sideW = (w - doorW) / 2, frontZ = z + d / 2;
      batch.add('box', wall, x, h / 2 + 0.08, z - d / 2, w, h, t, 0, shellData);
      for (const side of [-1, 1]) {
        batch.add('box', wall, x + side * w / 2, h / 2 + 0.08, z, t, h, d, 0, shellData);
        batch.add('box', wall, x + side * (doorW / 2 + sideW / 2), h / 2 + 0.08, frontZ, sideW, h, t, 0, shellData);
        addObstacle(x + side * w / 2, z, t, d, 'interior_side');
        addObstacle(x + side * (doorW / 2 + sideW / 2), frontZ, sideW, t, 'interior_front');
      }
      batch.add('box', mats.cedar, x, 3.02, frontZ, doorW + 0.35, 0.28, 0.48, 0, shellData);
      addObstacle(x, z - d / 2, w, t, 'interior_back');
      // 地毯、低桌、靠垫、陶罐与后墙木架；家具位置避开门洞中轴。
      const rug = (OW.interiors.length % 3 === 0) ? mats.turquoise : ((OW.interiors.length % 3 === 1) ? mats.cloth : mats.porphyry);
      batch.add('box', rug, x, 0.095, z + 0.3, Math.max(2.2, w * 0.52), 0.035, Math.max(2.0, d * 0.46), 0, { noShadow: true, isGround: true });
      const tableX = x + w * 0.23, tableZ = z - d * 0.08;
      batch.add('box', mats.cedar, tableX, 0.68, tableZ, 1.65, 0.16, 1.05);
      for (const sx of [-0.62, 0.62]) for (const sz of [-0.34, 0.34]) batch.add('box', mats.wood, tableX + sx, 0.35, tableZ + sz, 0.13, 0.65, 0.13);
      addObstacle(tableX, tableZ, 1.7, 1.1, 'interior_table');
      batch.add('box', mats.cedar, x - w * 0.23, 1.25, z - d / 2 + 0.48, Math.min(2.5, w * 0.34), 2.1, 0.34);
      for (let i = 0; i < 4; i++) batch.add('cylinder', i % 2 ? mats.firedBrick : mats.turquoise, x - w * 0.34 + i * 0.42, 0.42, z - d / 2 + 0.95, 0.18, 0.7 + (i % 2) * 0.25, 0.18);
      for (const side of [-1, 1]) batch.add('box', mats.cloth, x + side * Math.min(1.5, w * 0.2), 0.28, z + d * 0.22, 0.9, 0.35, 0.75);
      // 油灯以暖色小发光体表现，不为每间屋增加动态灯。
      batch.add('cylinder', mats.sacredGold, x - w * 0.28, 1.0, z + d * 0.12, 0.11, 0.32, 0.11, 0, { noShadow: true });
      OW.interiors.push({ id: roomId, name: spec.name || '两河民居', x, z, w, d, outside: { x, z: frontZ + 1.05 }, inside: { x, z: frontZ - 1.3 } });
    } else {
      batch.add('box', wall, x, h / 2 + 0.45, z, w, h, d, 0, shellData);
      addObstacle(x, z, w + 0.15, d + 0.15, style || 'city_house');
    }
    batch.add('box', mats.cedar, x, h + 0.55, z, w + 0.35, 0.22, d + 0.35, 0, { isRoof: true, isFrontOccluder: true, interiorId: enterable ? roomId : '' });
    batch.add('box', mats.stone, x, h + 0.72, z, w + 0.5, 0.16, d + 0.5, 0, { isRoof: true, isFrontOccluder: true, interiorId: enterable ? roomId : '' });
    // 平顶女儿墙与挑椽，保持两河城市轮廓。
    batch.add('box', wall, x, h + 1.0, z - d / 2, w + 0.35, 0.55, 0.25);
    batch.add('box', wall, x, h + 1.0, z + d / 2, w + 0.35, 0.55, 0.25);
    batch.add('box', wall, x - w / 2, h + 1.0, z, 0.25, 0.55, d);
    batch.add('box', wall, x + w / 2, h + 1.0, z, 0.25, 0.55, d);
    for (let vx = -w / 2 + 0.55; vx < w / 2; vx += 1.15) batch.add('box', mats.cedar, x + vx, h + 0.35, z + d / 2 + 0.32, 0.16, 0.16, 0.85);
    if (!enterable) batch.add('box', mats.dark, x, 1.55, z + d / 2 + 0.012, 1.25, 2.6, 0.08, 0, { noShadow: true });
    batch.add('box', mats.cedar, x, 2.95, z + d / 2 + 0.10, 1.65, 0.22, 0.28);
    for (const side of [-1, 1]) {
      batch.add('box', mats.dark, x + side * w * 0.27, h * 0.62, z + d / 2 + 0.018, 0.75, 0.85, 0.07, 0, { noShadow: true });
      batch.add('box', mats.dark, x + side * w * 0.27, h * 0.62, z - d / 2 - 0.018, 0.75, 0.85, 0.07, 0, { noShadow: true });
      batch.add('box', mats.dark, x + w / 2 + 0.018, h * 0.62, z + side * d * 0.23, 0.07, 0.85, 0.75, 0, { noShadow: true });
      batch.add('box', mats.dark, x - w / 2 - 0.018, h * 0.62, z + side * d * 0.23, 0.07, 0.85, 0.75, 0, { noShadow: true });
    }
    if (style === 'portico') {
      for (let i = -2; i <= 2; i++) {
        const cx = x + i * (w / 5.5), cz = z + d / 2 + 1.4;
        batch.add('column', mats.marble, cx, 2.15, cz, 0.32, 3.8, 0.32);
        batch.add('box', mats.marble, cx, 0.28, cz, 0.85, 0.22, 0.85);
        batch.add('box', mats.marble, cx, 4.1, cz, 0.82, 0.24, 0.82);
        addCircleObstacle(cx, cz, 0.35, 'portico_column');
      }
      batch.add('box', mats.marble, x, 4.35, z + d / 2 + 1.4, w + 0.6, 0.35, 1.0);
    }
    if (style === 'dome') {
      batch.add('dome', mats.stone, x, h + 0.8, z, Math.min(w, d) * 0.34, 2.4, Math.min(w, d) * 0.34);
      batch.add('cylinder', mats.gold, x, h + 3.35, z, 0.16, 0.7, 0.16);
    }
    OW.stats.buildings++;
  }

  function buildCity(root, batch, mats) {
    const random = rng(20261102);
    let houseIndex = 0;
    const districtWalls = [mats.adobe, mats.adobeLight, mats.firedBrick, mats.plaster];
    const xs = [-102, -82, -58, -34, -10, 14, 38];
    // 不在 z > 8 的前景镜头侧生成高大民居，保持前景视野通透且不遮挡主街与枯井
    const zs = [-80, -60, -36, -12, 8];
    for (let xi = 0; xi < xs.length - 1; xi++) {
      for (let zi = 0; zi < zs.length - 1; zi++) {
        const x1 = xs[xi], x2 = xs[xi + 1], z1 = zs[zi], z2 = zs[zi + 1];
        const availW = x2 - x1 - 8, availD = z2 - z1 - 8;
        if (availW < 6 || availD < 6) continue;
        const count = availW > 13 ? 2 : 1;
        for (let n = 0; n < count; n++) {
          const cellW = availW / count;
          const w = clamp(cellW - 2.1, 5.2, 9.2), d = clamp(availD - 2.0, 5.0, 10.5);
          const x = x1 + 4 + cellW * (n + 0.5) + (random() - 0.5) * 0.5;
          const z = (z1 + z2) / 2 + (random() - 0.5) * 0.5;
          // 完整保护西侧梯田台地、旧村落三屋、水渠、枯井、采石场与巴别塔本体区域，杜绝任何建筑穿模
          if (x + w / 2 > -24 && x - w / 2 < 96 && z + d / 2 > -11.5 && z - d / 2 < 10) continue;
          if (dist2(x, z, 67, -18) < 38 + Math.max(w, d) * 0.4) continue;
          const civic = (xi === 2 && zi === 2 && n === 0) ? 'portico' : ((xi === 1 && zi === 1 && n === 0) ? 'dome' : 'house');
          const enterable = (houseIndex++ % 4 === 0) || civic !== 'house';
          const wall = civic === 'portico' ? mats.plaster : districtWalls[(xi + zi * 2 + n) % districtWalls.length];
          addBuilding(batch, mats, { x, z, w, d, h: 3.8 + random() * 3.8, style: civic, enterable, wall, name: civic === 'portico' ? '希腊柱式文书馆' : (civic === 'dome' ? '穹顶浴场与粮仓' : '两河民居') }, random);
        }
      }
    }
    // 旧村庄三栋可进入建筑：侧墙、后墙和门前两段参与碰撞，中央门洞保持畅通。
    const level = OW.game.level;
    (level.decor || []).filter(d => d.t === 'building').forEach((d, idx) => {
      const w = d.w || 6.8, dep = d.d || 5.2, x = d.x, z = -(dep / 2) - 0.35;
      addObstacle(x - w / 2, z, 0.36, dep - 0.5, 'legacy_side');
      addObstacle(x + w / 2, z, 0.36, dep - 0.5, 'legacy_side');
      addObstacle(x, -dep, w, 0.36, 'legacy_back');
      const sideW = Math.max(0.6, (w - 2.2) / 2);
      addObstacle(x - 1.1 - sideW / 2, -0.58, sideW, 0.24, 'legacy_front');
      addObstacle(x + 1.1 + sideW / 2, -0.58, sideW, 0.24, 'legacy_front');
      const doorInfo = (level.doorways || []).find(dw => Math.abs(dw.x - x) < 2.2);
      OW.interiors.push({
        id: 'legacy_house_' + (d.id || idx),
        name: (doorInfo && doorInfo.name) || d.name || '村落民居',
        x, z: -(dep / 2), w, d: dep,
        outside: { x, z: 0.85 },
        inside: { x, z: -2.1 }
      });
    });
  }

  function makeHelix(cx, cz) {
    const positions = [], indices = [];
    const segments = 320, turns = 3.2, width = 2.4, thick = 0.52;
    let prevValid = false, vertCount = 0;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments, a = t * Math.PI * 2 * turns + 0.55;
      const r = 36.0 - t * 24.0, y = 12.0 + t * 74.0;
      const ca = Math.cos(a), sa = Math.sin(a);
      const zMid = cz + ca * r;
      // 螺旋坡道仅环绕塔体北翼与东西侧翼（z <= -2.8），在南侧（z > -2.8）自然交汇于各层可玩平台，绝不穿过 z=0 的平台或人物
      if (zMid > -2.8) {
        prevValid = false;
        continue;
      }
      const points = [
        [cx + sa * (r - width / 2), y, cz + ca * (r - width / 2)],
        [cx + sa * (r + width / 2), y, cz + ca * (r + width / 2)],
        [cx + sa * (r - width / 2), y - thick, cz + ca * (r - width / 2)],
        [cx + sa * (r + width / 2), y - thick, cz + ca * (r + width / 2)]
      ];
      points.forEach(p => positions.push(...p));
      if (prevValid) {
        const k = (vertCount - 1) * 4, n = vertCount * 4;
        indices.push(k, n, k + 1, k + 1, n, n + 1);
        indices.push(k + 2, k + 3, n + 2, k + 3, n + 3, n + 2);
        indices.push(k, k + 2, n, k + 2, n + 2, n);
        indices.push(k + 1, n + 1, k + 3, k + 3, n + 1, n + 3);
      }
      prevValid = true;
      vertCount++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices); geo.computeVertexNormals();
    return geo;
  }

  function buildTower(root, batch, mats) {
    const cx = 67, cz = -20;
    OW.tower.x = cx; OW.tower.z = cz;
    // ── 巴别塔即地图本体：五层同轴巨构（从地面门厅 y=0 直达天穹圣坛 y=86.0，基底半径 36m） ──
    // 塔体后座半圆鼓座与背墙统一位于 z <= -2.55，南侧（z = -1.65..+0.85）直接承载可玩回廊平台、爬梯与吊机，彻底消除穿模！
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(36.0, 36.0, 0.14, 64), mats.marble);
    floor.position.set(cx, -0.03, -15); floor.receiveShadow = true;
    floor.userData.isGround = floor.userData.isWalkway = true; root.add(floor);
    const inlay = new THREE.Mesh(new THREE.RingGeometry(12.0, 13.2, 64), mats.lapis);
    inlay.rotation.x = -Math.PI / 2; inlay.position.set(cx, 0.045, -15); root.add(inlay);
    for (const r of [18.0, 26.0, 32.0]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.35, 64), r === 26.0 ? mats.turquoise : mats.porphyry);
      ring.rotation.x = -Math.PI / 2; ring.position.set(cx, 0.05, -15); ring.receiveShadow = true; root.add(ring);
    }
    OW.interiors.push({ id: 'tower_vestibule', name: '巴别塔 · 万门门厅', x: cx, z: -14, w: 48, d: 32, outside: { x: cx, z: 3.5 }, inside: { x: cx, z: -9.5 } });

    // 门厅列柱与圣火盆（全部位于 z <= -4.5 或南广场两侧，绝不挡住 z=0 的攀爬动线）
    for (const side of [-1, 1]) for (const bz of [-6.5, -13.5]) {
      const bx = cx + side * 14.5;
      batch.add('cylinder', mats.basalt, bx, 0.55, bz, 0.85, 1.0, 0.85);
      batch.add('cylinder', mats.bronze, bx, 1.18, bz, 1.05, 0.28, 1.05);
      batch.add('cone', mats.sacredGold, bx, 1.75, bz, 0.48, 0.95, 0.48, 0, { noShadow: true });
      addCircleObstacle(bx, bz, 0.85, 'temple_brazier');
    }

    // 五大可玩章节对应的同轴退台塔身（从 y=0 直通 y=86.0，宏伟巨构）：
    // 每个退台的圆心位于 tierCz = -2.55 - r，使圆柱最南端切线精确落在 z = -2.55（紧贴可玩平台北侧背后）！
    const towerChapters = [
      { y0: 0.0,  y1: 12.0, r: 36.0, mat: mats.stone,      trim: mats.lapis,      name: '塔基门厅层' },
      { y0: 12.0, y1: 18.0, r: 33.5, mat: mats.adobeLight, trim: mats.marble,     name: '内部螺旋回廊下层' },
      { y0: 18.0, y1: 25.0, r: 31.5, mat: mats.stone,      trim: mats.lapis,      name: '内部螺旋回廊中层' },
      { y0: 25.0, y1: 32.0, r: 29.5, mat: mats.adobeLight, trim: mats.turquoise,  name: '内部螺旋回廊上层' },
      { y0: 32.0, y1: 38.0, r: 27.0, mat: mats.stone,      trim: mats.marble,     name: '云之回廊下层' },
      { y0: 38.0, y1: 44.0, r: 25.0, mat: mats.adobeLight, trim: mats.lapis,      name: '云之回廊中层' },
      { y0: 44.0, y1: 50.0, r: 23.5, mat: mats.stone,      trim: mats.porphyry,   name: '云之回廊绝壁' },
      { y0: 50.0, y1: 58.0, r: 21.0, mat: mats.adobeLight, trim: mats.lapis,      name: '圣书大图书馆下层' },
      { y0: 58.0, y1: 68.0, r: 19.0, mat: mats.stone,      trim: mats.turquoise,  name: '秘卷冷库拱廊' },
      { y0: 68.0, y1: 74.0, r: 16.5, mat: mats.marble,     trim: mats.sacredGold, name: '天穹圣殿基座' },
      { y0: 74.0, y1: 80.0, r: 13.0, mat: mats.alabaster,  trim: mats.sacredGold, name: '天穹中层圣殿' },
      { y0: 80.0, y1: 86.0, r: 9.5,  mat: mats.alabaster,  trim: mats.sacredGold, name: '天穹光冕金坛' }
    ];

    towerChapters.forEach((t) => {
      const h = t.y1 - t.y0, midY = (t.y0 + t.y1) / 2;
      const tierCz = -2.55 - t.r;
      batch.add('cylinder', t.mat, cx, midY, tierCz, t.r, h, t.r, 0, { isTowerShell: true });
      batch.add('cylinder', mats.stoneDark, cx, t.y0 + 0.22, tierCz, t.r + 0.42, 0.42, t.r + 0.42, 0, { isTowerShell: true });
      batch.add('cylinder', t.trim, cx, t.y1 - 0.22, tierCz, t.r + 0.55, 0.44, t.r + 0.55, 0, { isTowerShell: true });

      const windows = Math.max(12, Math.floor(t.r * 0.75));
      for (let j = 0; j < windows; j++) {
        const a = (j / windows - 0.5) * Math.PI * 1.35;
        const wx = cx + Math.sin(a) * (t.r + 0.04), wz = tierCz + Math.cos(a) * (t.r + 0.04);
        if (wz > -2.35) continue;
        batch.add('box', mats.dark, wx, t.y0 + h * 0.55, wz, 1.15, Math.min(2.4, h * 0.45), 0.16, a, { noShadow: true, isTowerShell: true });
        if (j % 2 === 0) {
          batch.add('box', mats.stoneDark, cx + Math.sin(a) * (t.r + 0.32), midY, tierCz + Math.cos(a) * (t.r + 0.32), 0.62, h * 0.88, 0.62, a, { isTowerShell: true });
        }
      }
    });

    // 塔下门厅环柱（位于 z <= -3.2，不阻挡南侧门前通行）
    addCircleObstacle(cx, -16, 7.5, 'tower_core');
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2;
      const x = cx + Math.sin(a) * 28.0, z = -16.0 + Math.cos(a) * 16.5;
      if (z > -3.2) continue;
      batch.add('column', mats.marble, x, 5.6, z, 0.72, 11.2, 0.72, 0, { isTowerShell: true });
      batch.add('box', mats.marble, x, 0.35, z, 1.75, 0.5, 1.75, a, { isTowerShell: true });
      batch.add('box', mats.marble, x, 11.4, z, 1.75, 0.45, 1.75, a, { isTowerShell: true });
      addCircleObstacle(x, z, 0.78, 'tower_column');
    }

    // 螺旋外环扶壁坡道（包裹塔身北侧与东西两侧）
    const helix = new THREE.Mesh(makeHelix(cx, -18), mats.stone);
    helix.castShadow = helix.receiveShadow = true;
    helix.userData.isTowerShell = true;
    root.add(helix);

    // 埃及式神圣双塔门与方尖碑：置于南广场入口大道（z = +13.5），作为巴别塔南向正门礼仪入口，完全不与 y=12.0 平台冲突
    for (const side of [-1, 1]) {
      const px = cx + side * 10.2, pz = 13.5;
      batch.add('tapered', mats.stone, px, 6.0, pz, 5.2, 12.0, 4.2, 0, { isTowerShell: true, isFrontOccluder: true });
      batch.add('box', mats.lapis, px, 9.8, pz + 2.12, 4.2, 0.62, 0.15, 0, { isTowerShell: true, isFrontOccluder: true });
      batch.add('box', mats.gold, px, 11.8, pz, 4.1, 0.35, 3.5, 0, { isTowerShell: true, isFrontOccluder: true });
      addObstacle(px, pz, 4.6, 4.0, 'egyptian_pylon');
      const ox = cx + side * 16.5, oz = 15.2;
      batch.add('tapered', mats.marble, ox, 4.8, oz, 1.25, 9.2, 1.25, 0, { isFrontOccluder: true });
      batch.add('cone', mats.gold, ox, 10.2, oz, 0.92, 1.6, 0.92, Math.PI / 4, { isFrontOccluder: true });
      addObstacle(ox, oz, 1.35, 1.35, 'obelisk');
    }

    // 所有塔身可玩平台（y = 12.0 .. 68.0）的背壁拱廊、青金石腰线与柱廊（全部精确对齐在 z = -2.25 .. -2.85，作为平台后景壁龛）
    (OW.game.level.plats || []).filter(p => p[2] >= 11.5 && p[2] <= 68.0 && p[0] >= 40).forEach(p => {
      const [x1, x2, y] = p, mid = (x1 + x2) / 2, width = x2 - x1;
      if (width < 4.5) return;
      const archH = y >= 50.0 ? 5.2 : (y >= 32.0 ? 4.4 : 4.6);
      const isInterior = (y < 32.0 || (y >= 50.0 && y < 68.0));
      const wallMat = isInterior ? mats.adobeLight : mats.stoneDark;
      const trimMat = isInterior ? (y >= 50.0 ? mats.lapis : mats.turquoise) : mats.marble;
      batch.add('box', wallMat, mid, y + archH / 2, -2.65, width, archH, 0.42, 0, { isTowerShell: true });
      batch.add('box', trimMat, mid, y + archH - 0.45, -2.40, width, 0.30, 0.18, 0, { isTowerShell: true });
      for (let x = x1 + 1.2; x <= x2 - 1.0; x += 4.6) {
        batch.add('column', mats.marble, x, y + (archH - 0.5) / 2, -2.22, 0.28, archH - 0.5, 0.28, 0, { isTowerShell: true });
        if (x + 2.3 <= x2 - 0.8) {
          batch.add('arch', mats.stone, x + 2.3, y + archH - 0.85, -2.22, 1.35, 1.05, 0.52, 0, { isTowerShell: true });
        }
      }
    });
  }

  function buildSacredPrecinct(root, batch, mats) {
    const cx = 67;
    // ── 终章：巴别塔之巅 · 天穹圣殿（y = 68.0 .. 86.0，同轴正居塔顶 cx = 67） ──
    const terraces = [
      { x1: 45, x2: 57, y: 74.0, accent: mats.sacredGold },
      { x1: 77, x2: 89, y: 74.0, accent: mats.turquoise },
      { x1: 58, x2: 76, y: 80.0, accent: mats.porphyry },
      { x1: 61, x2: 73, y: 86.0, accent: mats.alabaster }
    ];
    terraces.forEach((p, idx) => {
      for (const x of [p.x1 + 0.65, p.x2 - 0.65]) {
        batch.add('box', mats.alabaster, x, p.y + 0.18, -2.15, 1.05, 0.36, 1.05, 0, { isTowerShell: true });
        batch.add('column', mats.alabaster, x, p.y + 2.25, -2.15, 0.32, 4.2, 0.32, 0, { isTowerShell: true });
        batch.add('box', mats.sacredGold, x, p.y + 4.45, -2.15, 0.86, 0.22, 0.86, 0, { isTowerShell: true });
      }
      batch.add('box', p.accent, (p.x1 + p.x2) / 2, p.y + 4.7, -2.15, p.x2 - p.x1 + 0.3, 0.32, 0.7, 0, { isTowerShell: true });
      batch.add('arch', mats.sacredGold, (p.x1 + p.x2) / 2, p.y + 4.75, -2.12, Math.min(2.4, (p.x2 - p.x1) * 0.24), 1.5, 0.7, 0, { isTowerShell: true });
      for (let x = p.x1 + 2; x < p.x2 - 1; x += 2.5) batch.add('box', idx % 2 ? mats.lapis : mats.turquoise, x, p.y + 0.035, 0.95, 1.1, 0.045, 0.22, 0, { noShadow: true, isGround: true });
    });
    // 圣所中轴（cx = 67）的浅反射池、阶梯祭坛与四角圣火，避开五语踏板和梯井
    batch.add('box', mats.lapis, cx, 68.055, -1.3, 7.2, 0.07, 2.1, 0, { noShadow: true, isGround: true });
    batch.add('box', mats.water, cx, 68.10, -1.3, 6.65, 0.035, 1.65, 0, { noShadow: true, isGround: true });
    for (let i = 0; i < 3; i++) batch.add('box', i === 2 ? mats.sacredGold : mats.alabaster, cx, 86.35 + i * 0.24, -1.55, 4.4 - i * 0.8, 0.24, 2.2 - i * 0.36, 0, { isTowerShell: true });
    for (const side of [-1, 1]) {
      batch.add('tapered', mats.alabaster, cx + side * 1.8, 87.65, -1.55, 0.42, 2.0, 0.42, 0, { isTowerShell: true });
      batch.add('cone', mats.sacredGold, cx + side * 1.8, 88.85, -1.55, 0.38, 0.9, 0.38, 0, { noShadow: true });
      batch.add('cylinder', mats.bronze, cx + side * 4.7, 86.85, -1.5, 0.5, 1.2, 0.5, 0, { isTowerShell: true });
      batch.add('cone', mats.sacredGold, cx + side * 4.7, 87.75, -1.5, 0.35, 0.85, 0.35, 0, { noShadow: true });
    }
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe7a0, transparent: true, opacity: 0.055, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.6, 26, 32, 1, true), beamMat);
    beam.position.set(cx, 98, -1.8); beam.userData.noOcclusion = true; root.add(beam);
    // 深蓝星盘与旋转天球仪正居巴别塔顶（cx = 67, y = 92.0）
    const starDisc = new THREE.Mesh(new THREE.CircleGeometry(5.2, 64), new THREE.MeshBasicMaterial({ color: 0x07162e, transparent: true, opacity: 0.88, depthWrite: false }));
    starDisc.position.set(cx, 92.0, -2.55); starDisc.userData.noOcclusion = true; root.add(starDisc);
    const starRandom = rng(1204), starPositions = [];
    for (let i = 0; i < 96; i++) {
      const a = starRandom() * Math.PI * 2, r = Math.sqrt(starRandom()) * 4.85;
      starPositions.push(cx + Math.cos(a) * r, 92.0 + Math.sin(a) * r, -2.48);
    }
    const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffe8ae, size: 0.085, transparent: true, opacity: 0.9, depthWrite: false }));
    stars.userData.noOcclusion = true; root.add(stars);
    const rings = new THREE.Group(); rings.position.set(cx, 92.0, -2.1); rings.userData.noOcclusion = true;
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95 + i * 0.55, 0.045 + i * 0.012, 8, 64), i === 1 ? mats.turquoise : mats.sacredGold);
      ring.rotation.set(i * 0.65, i * 0.45, i * 0.8); rings.add(ring);
    }
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 12), mats.sacredGold); rings.add(sun); root.add(rings);
    if (OW.game && OW.game.anim) OW.game.anim.push({ update: dt => { rings.rotation.y += dt * 0.12; rings.children[0].rotation.z += dt * 0.16; beam.material.opacity = 0.05 + Math.sin(OW.game.time * 1.3) * 0.012; } });
    const sanctus = new THREE.PointLight(0xffd98a, 0.85, 36, 2); sanctus.position.set(cx, 90, 4); root.add(sanctus);
  }

  function buildFar(root, batch, mats) {
    // 北侧边界就是河岸，东南西边界由沙丘与碎石坡收束；碰撞边界与可见地貌一致。
    plane(root, 520, 18, mats.water, -20, -0.035, -96);
    plane(root, 520, 3.2, mats.curb, -20, -0.02, -87.8);
    for (let i = 0; i < 42; i++) {
      const x = -120 + i * 6.0, z = 35.5 + (i % 3) * 1.2, h = 3.5 + (i % 5) * 0.65;
      batch.add('cone', i % 4 ? mats.sand : mats.stone, x, h / 2 - 0.35, z, 5.2, h, 4.5, i * 0.37, { noShadow: true });
    }
    for (const side of [-1, 1]) for (let i = 0; i < 21; i++) {
      const x = side < 0 ? -113 : 125, z = -82 + i * 5.7, h = 3 + (i % 4);
      batch.add('cone', i % 3 ? mats.sand : mats.stoneDark, x, h / 2 - 0.3, z, 4.4, h, 5.0, i * 0.51, { noShadow: true });
    }
    for (let i = 0; i < 52; i++) {
      const x = -112 + i * 4.5;
      batch.add('cylinder', mats.wood, x, 0.65, -87.0, 0.045, 1.3, 0.045, 0, { noShadow: true });
      batch.add('box', mats.leaf, x + 0.18, 1.15, -87.0, 0.42, 0.06, 0.12, 0.5, { noShadow: true });
    }
    const random = rng(711);
    for (let i = 0; i < 22; i++) {
      const x = -220 + i * 21 + random() * 8, z = -175 - random() * 80;
      const r = 14 + random() * 24, h = 10 + random() * 24;
      batch.add('cone', i % 2 ? mats.sand : mats.stone, x, h / 2 - 1, z, r, h, r * 0.75, random(), { noShadow: true });
    }
    for (let i = 0; i < 70; i++) {
      const x = -170 + random() * 330, z = -96 - random() * 16;
      const h = 2 + random() * 5, w = 2 + random() * 4;
      batch.add('box', i % 3 ? mats.adobe : mats.stone, x, h / 2, z, w, h, w * 0.8, 0, { noShadow: true });
    }
    // 河岸棕榈：共享几何体实例化，不向每株树分配材质。
    for (let i = 0; i < 34; i++) {
      const x = -125 + i * 7.3 + random() * 2, z = -91 - random() * 6, h = 4.5 + random() * 2;
      batch.add('cylinder', mats.wood, x, h / 2, z, 0.18, h, 0.18, 0, { noShadow: true });
      for (let j = 0; j < 7; j++) {
        const a = j / 7 * Math.PI * 2;
        batch.add('box', mats.leaf, x + Math.sin(a) * 1.1, h, z + Math.cos(a) * 1.1, 0.34, 0.08, 2.8, a, { noShadow: true });
      }
    }
  }

  function buildStreetDetails(batch, mats) {
    // 市集摊位沿市集街北侧排布（z = -15.5），绝不遮挡前景枯井或主街视野
    for (let i = 0; i < 6; i++) {
      const x = -28 + i * 3.4, z = -15.5;
      batch.add('box', mats.wood, x, 1.25, z, 2.5, 0.15, 1.6);
      batch.add('box', i % 2 ? mats.cloth : mats.lapis, x, 2.55, z, 2.8, 0.10, 2.0);
      for (const side of [-1, 1]) batch.add('box', mats.wood, x + side * 1.1, 1.25, z, 0.12, 2.5, 0.12);
      addObstacle(x, z, 2.6, 1.7, 'market_stall');
    }
    // 三条有名称的路线在交接处留下低矮石柱，不用空气墙引导。
    const markers = [[14, -15], [38, -15], [58, 5], [-34, -9]];
    markers.forEach(([x, z], i) => {
      batch.add('box', mats.stoneDark, x, 0.65, z, 0.55, 1.3, 0.55);
      batch.add('box', i % 2 ? mats.gold : mats.lapis, x, 1.35, z, 0.7, 0.16, 0.7);
    });
  }

  function interactDoor(sel) {
    if (!OW.active || !sel || !sel.length) return false;
    const leader = sel[0], z = leader.targetZ || 0;
    let room = null, entering = false, best = 2.8;
    for (const r of OW.interiors) {
      if (leader.inInterior && leader.interiorId === r.id) { room = r; entering = false; best = 99; break; }
      const d = dist2(leader.x, z, r.outside.x, r.outside.z);
      if (!leader.inInterior && d < best) { room = r; entering = true; best = d; }
    }
    if (!room && leader.inInterior) {
      const r = OW.interiors.find(q => q.id === leader.interiorId);
      if (r) { room = r; entering = false; }
    }
    if (!room) return false;
    const target = entering ? room.inside : room.outside;
    // 平滑步入/步出门洞，避免瞬移闪烁
    commandMove(OW.game, sel, target.x, target.z);
    OW.game.camOffsetZ = entering ? 17 : 24;
    OW.game.hud.banner(`${entering ? '步入' : '走出'}【${room.name}】`, entering ? 'story' : 'info');
    if (window.SFX) { if (entering) SFX.playGateClose(); else SFX.playGateOpen(); }
    return true;
  }

  function enhance(game, level, world) {
    OW.game = game; OW.active = true; OW.obstacles = []; OW.interiors = []; OW.stats.buildings = 0;
    const root = new THREE.Group(); root.name = 'ContinuousCityAndBabel';
    world.root.add(root); OW.root = root;
    // 旧内筒和远塔全部退场，保留原平台、交互与机制。
    world.root.traverse(o => { if (o.userData && o.userData.isTowerShell) o.visible = false; });
    const mats = makeMaterials(), batch = new Batches(root);
    buildRoads(root, mats);
    buildCity(root, batch, mats);
    buildTower(root, batch, mats);
    buildSacredPrecinct(root, batch, mats);
    buildFar(root, batch, mats);
    buildStreetDetails(batch, mats);
    OW.stats.instances = batch.finish();
    world.frontOccluders.length = 0;
    world.root.traverse(o => {
      if (o.visible && o.isMesh && !o.isInstancedMesh && !o.userData.futureWalkway &&
          (o.userData.isFrontOccluder || o.userData.isTowerShell)) world.frontOccluders.push(o);
    });
    game.scene.fog = new THREE.Fog(level.theme.fog, 95, 360);
    game.camera.far = 850; game.camera.updateProjectionMatrix();
    buildGrid();
  }

  const legacyBuild = WORLD.build;
  WORLD.build = function (game, level) {
    OW.preparing = !!(level && level.zones);
    OW.active = OW.preparing;
    const world = legacyBuild.call(WORLD, game, level);
    if (OW.preparing) enhance(game, level, world);
    else OW.reset();
    OW.preparing = false;
    return world;
  };

  OW.reset = function () {
    OW.active = false; OW.preparing = false; OW.game = null; OW.root = null;
    OW.obstacles = []; OW.interiors = []; OW.roads = []; OW.grid = null;
  };
  OW.constrainUnit = constrainUnit;
  OW.commandMove = commandMove;
  OW.updateUnitOrder = updateUnitOrder;
  OW.updateFollower = updateFollower;
  OW.interactDoor = interactDoor;
  OW.plan = plan;
  OW.isWalkable = (x, z) => !collides(x, z, 0.35);
  OW.getState = () => ({
    active: OW.active, bounds: { ...OW.bounds }, buildings: OW.stats.buildings,
    instances: OW.stats.instances, obstacles: OW.obstacles.length,
    tower: { ...OW.tower }, roads: OW.roads.map(r => r.name)
  });
  window.OPEN_WORLD = OW;
})();
