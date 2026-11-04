// 连续城区与巴别塔：真实 XZ 行走、建筑占地、街区寻路与统一塔体
// 主运行时扩展；legacy_gemini4 不加载本文件。
(function () {
  'use strict';

  const OW = {
    active: false,
    preparing: false,
    bounds: { x1: -160, x2: 122, z1: -88, z2: 32 },
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

  function detectInteriorAt(x, z, y = 0) {
    for (const r of OW.interiors) {
      if (r.y !== undefined && Math.abs((r.y || 0) - y) > 5.5) continue;
      if (r.isCircle) {
        if (Math.hypot(x - r.x, z - r.z) <= (r.r || 10.0)) return r;
      } else if (r.id === 'tower_vestibule') {
        if (y < 12.0 && Math.hypot(x - r.x, z - r.z) <= 26.0) return r;
      } else if (Math.abs(x - r.x) < r.w / 2 - 0.12 && Math.abs(z - r.z) < r.d / 2 - 0.12) {
        return r;
      }
    }
    return null;
  }

  function constrainUnit(u, oldX, oldZ) {
    if (!OW.active || !u || u.state === 'climb' || u.state === 'coop') return;

    if (u.y > 1.35) {
      // 巨塔各层大厦室内空间：支持同心圆巨构径向严格边界与矩形平台支撑面
      const g = u.grounded;
      if (g) {
        if (g.isCircle) {
          const maxR = g.r - 0.45;
          const curZ = u.targetZ !== undefined ? u.targetZ : 0;
          const dist = Math.hypot(u.x - g.cx, curZ - g.cz);
          if (dist > maxR && maxR > 0) {
            const angle = Math.atan2(curZ - g.cz, u.x - g.cx);
            u.x = g.cx + Math.cos(angle) * maxR;
            const newZ = g.cz + Math.sin(angle) * maxR;
            u.targetZ = newZ; u.z = newZ;
          }
        } else {
          const minX = g.x1 !== undefined ? g.x1 + 0.35 : OW.bounds.x1;
          const maxX = g.x2 !== undefined ? g.x2 - 0.35 : OW.bounds.x2;
          const minZ = g.z1 !== undefined ? g.z1 + 0.35 : -18.0;
          const maxZ = g.z2 !== undefined ? g.z2 - 0.35 : 3.5;
          u.x = clamp(u.x, minX, maxX);
          const z = clamp(u.targetZ || 0, minZ, maxZ);
          u.targetZ = z; u.z = z;
        }
      }
      const room = detectInteriorAt(u.x, u.targetZ || 0, u.y);
      const prevId = u.interiorId || null;
      const nextId = room ? room.id : null;
      u.inInterior = !!room;
      u.interiorId = nextId;
      if (OW.game && u === OW.game.leader && prevId !== nextId && room) {
        OW.game.hud.banner(`步入【${room.name}】`, 'story');
      }
      return;
    }

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
    // 平滑障碍贴墙滑移（Wall Sliding）：单轴阻挡时不强行刹停全速，允许沿墙面顺畅滑行！
    if (collides(x, oldZ, radius)) x = oldX;
    if (collides(x, z, radius)) z = oldZ;
    u.x = x; u.targetZ = z; u.z = z;
    u.openMoving = dist2(oldX, oldZ, x, z) > 0.0005;
    if (x === oldX && Math.abs(u.vx) > 0.05) u.vx = 0;

    // 实时感知进出可步入室内空间（无需传送即可自然走入走出）
    const room = detectInteriorAt(x, z, u.y);
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
      // 性能优化：限制单次向前探视步长至 8 步，避免高密度网格下 O(N^2) 级碰撞重算造成帧率冻结
      let next = Math.min(points.length - 1, anchor + 8);
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
    // 性能优化：全局复用 TypedArray 缓存与代际标记，彻底消除每秒数万次数组分配与垃圾回收造成的卡顿
    if (!OW._planBuffers || OW._planBuffers.cost.length < total) {
      OW._planBuffers = {
        cost: new Float32Array(total),
        parent: new Int32Array(total),
        visited: new Int32Array(total)
      };
      OW._planRunId = 0;
    }
    const runId = (++OW._planRunId) % 2147483647 || 1;
    const cost = OW._planBuffers.cost;
    const parent = OW._planBuffers.parent;
    const visited = OW._planBuffers.visited;

    // 局部搜索边界约束：仅搜索起止点周围活跃区域，大幅裁剪无意义远端网格遍历
    const margin = 14;
    const minCX = Math.max(0, Math.min(start.x, goal.x) - margin);
    const maxCX = Math.min(cols - 1, Math.max(start.x, goal.x) + margin);
    const minCZ = Math.max(0, Math.min(start.z, goal.z) - margin);
    const maxCZ = Math.min(rows - 1, Math.max(start.z, goal.z) + margin);

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
    visited[startIdx] = runId;
    parent[startIdx] = -1;
    push({ i: startIdx, x: start.x, z: start.z, f: 0 });
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let iterations = 0, found = false, bestIdx = startIdx, bestH = Math.hypot(goal.x - start.x, goal.z - start.z);
    const maxIter = Math.min(650, (maxCX - minCX + 1) * (maxCZ - minCZ + 1));

    while (heap.length && iterations++ < maxIter) {
      const cur = pop();
      if (!cur) continue;
      if (cur.i === goalIdx) { found = true; bestIdx = goalIdx; break; }
      const hCur = Math.hypot(goal.x - cur.x, goal.z - cur.z);
      if (hCur < bestH) { bestH = hCur; bestIdx = cur.i; }
      for (const [dx, dz, step] of dirs) {
        const nx = cur.x + dx, nz = cur.z + dz;
        if (nx < minCX || nx > maxCX || nz < minCZ || nz > maxCZ) continue;
        const ni = idx(nx, nz);
        if (!g.walkable[ni] || (dynamicBlocked.has(ni) && ni !== startIdx && ni !== goalIdx)) continue;
        if (dx && dz && (!g.walkable[idx(cur.x + dx, cur.z)] || !g.walkable[idx(cur.x, cur.z + dz)])) continue;
        const nc = cost[cur.i] + step;
        if (visited[ni] === runId && nc >= cost[ni]) continue;
        cost[ni] = nc; parent[ni] = cur.i; visited[ni] = runId;
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
      if (cell) {
        const p = cellWorld(cell);
        x = p.x; z = p.z;
      }
    }
    let accepted = 0;
    const isPartialSquad = units.length < game.available().length;
    units.forEach((u, i) => {
      const offset = (i - (units.length - 1) / 2) * 0.65;
      let tx = x + offset, tz = z + (i % 2) * 0.38;
      if (collides(tx, tz, 0.34) || !segmentClear(x, z, tx, tz, 0.32)) {
        tx = x; tz = z;
      }
      let path = plan(u.x, u.targetZ || 0, tx, tz);
      // 开放荒原或长距离直达保底：若 A* 网格过密超限或在开阔沙海，直接生成平滑直达路径，绝不拒绝指令
      if (!path || !path.length) {
        if (!collides(tx, tz, 0.34)) {
          path = [{ x: tx, z: tz }];
        }
      }
      if (!path || !path.length) return;
      u.openPath = null;
      u.holdPos = isPartialSquad;
      game.deliver(u, { type: 'open_move', goal: { x: tx, y: 0, z: tz }, pathXZ: path, pathIndex: 0, act: 'move' });
      accepted++;
    });
    if (!accepted) game.hud.banner('目标占地无法停留，请点击开阔地面或街道', 'info');
  }

  function updateUnitOrder(u, dt) {
    const order = u.order;
    if (!order || order.type !== 'open_move') return;
    if (!u.grounded || u.y > 3.8) {
      if (u.y > 3.8) {
        u.openMoving = false;
        return u.arrive();
      }
      return;
    }
    // 指令看门狗：如果执行超过 18 秒或原地卡滞超过 2.8 秒，自动完成并释放指令，彻底根治角色冻结
    order._watchdog = (order._watchdog || 0) + dt;
    if (order._watchdog > 18.0 || (u._openStuckT && u._openStuckT > 2.8)) {
      u.openMoving = false;
      return u.arrive();
    }
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
    if (!u.grounded || u.detached || u.holdPos) return false;
    // 高度差过大（例如在塔内不同楼层），交由跨层寻路逻辑接管
    const yDiff = leader.y - u.y;
    if (Math.abs(yDiff) > 2.8) return false;

    const side = index % 2 ? 1 : -1;
    const back = 1.1 + Math.floor(index / 2) * 0.85;
    const dir = (leader.vx !== 0) ? Math.sign(leader.vx) : (leader.facing || 1);
    let tx = leader.x - dir * back + side * 0.45;
    let tz = (leader.targetZ || 0) + side * (0.75 + Math.floor(index / 2) * 0.4);

    // 枯井深孔防护：若木桥未修好，跟随目标点严禁置于枯井垂直深穴内（x: 29.2~33.8, |z| < 2.4）
    const bWell = (OW.game && OW.game.builds) ? OW.game.builds.find(b => b.id === 'b_well') : null;
    if (bWell && !bWell.done && tx >= 29.0 && tx <= 34.0 && Math.abs(tz) < 2.5) {
      tx = tx < 31.5 ? 28.5 : 34.5;
    }

    if (collides(tx, tz, 0.32) || !segmentClear(leader.x, leader.targetZ || 0, tx, tz, 0.30)) {
      tx = leader.x - dir * 0.75;
      tz = leader.targetZ || 0;
    }

    const curZ = u.targetZ || 0;
    const dx = tx - u.x, dz = tz - curZ;
    const distToSlot = Math.hypot(dx, dz);

    if (distToSlot < 0.65) {
      u.vx = 0;
      u.openMoving = false;
      u.openPath = null;
      if (u.grounded) u.state = 'idle';
      return true;
    }

    const speed = u.speed() * (distToSlot > 3.2 ? 1.15 : (distToSlot > 1.8 ? 1.02 : 0.94));

    // 1. 直线视线畅通时直接平滑跟随
    if (segmentClear(u.x, curZ, tx, tz, 0.30)) {
      u.openPath = null;
      u.vx = (dx / distToSlot) * speed;
      u.targetZ = curZ + (dz / distToSlot) * speed * dt;
      u.facing = Math.abs(dx) > 0.05 ? Math.sign(dx) : u.facing;
      u.state = 'walk';
      u.openMoving = true;
      return true;
    }

    // 2. 遇障反应式绕障转向（Reactive Steering Avoidance），绝不原地卡死！
    const directAngle = Math.atan2(dz, dx);
    const probeOffsets = [0.45, -0.45, 0.85, -0.85, 1.25, -1.25, 1.57, -1.57];
    let bestAngle = null;

    for (const off of probeOffsets) {
      const probeA = directAngle + off;
      const testDist = Math.min(distToSlot, 1.8);
      const px = u.x + Math.cos(probeA) * testDist;
      const pz = curZ + Math.sin(probeA) * testDist;
      if (!collides(px, pz, 0.30) && segmentClear(u.x, curZ, px, pz, 0.28)) {
        bestAngle = probeA;
        break;
      }
    }

    if (bestAngle !== null) {
      const moveVx = Math.cos(bestAngle) * speed;
      const moveVz = Math.sin(bestAngle) * speed;
      u.vx = moveVx;
      u.targetZ = curZ + moveVz * dt;
      u.facing = Math.abs(moveVx) > 0.05 ? Math.sign(moveVx) : u.facing;
      u.state = 'walk';
      u.openMoving = true;
      return true;
    }

    // 3. 若近身完全被挤在角落，尝试 A* 寻路或直接向领队安全微退
    u.followPlanT = (u.followPlanT || 0) - dt;
    if (!u.openPath || u.followPlanT <= 0) {
      u.openPath = plan(u.x, curZ, tx, tz);
      u.followPlanT = 0.85 + index * 0.15;
      u.openPathIndex = 0;
    }

    const path = u.openPath;
    if (path && path.length > 0) {
      let pi = Math.min(u.openPathIndex || 0, path.length - 1);
      let p = path[pi];
      let pdx = p.x - u.x, pdz = p.z - curZ, pd = Math.hypot(pdx, pdz);
      if (pd < 0.35 && pi < path.length - 1) {
        u.openPathIndex = ++pi;
        p = path[pi];
        pdx = p.x - u.x; pdz = p.z - curZ; pd = Math.hypot(pdx, pdz);
      }
      u.vx = pd > 0.04 ? (pdx / pd) * speed : 0;
      u.targetZ = curZ + (pd > 0.04 ? (pdz / pd) * speed * dt : 0);
      u.facing = Math.abs(pdx) > 0.05 ? Math.sign(pdx) : u.facing;
      u.state = 'walk';
      u.openMoving = true;
      return true;
    }

    // 终极保护：即使所有算法均未找到路径，保持面向领队缓慢靠拢，绝不进入死锁状态
    const fallbackDir = Math.sign(dx) || u.facing || 1;
    if (!collides(u.x + fallbackDir * 0.1, curZ, 0.28)) {
      u.vx = fallbackDir * speed * 0.5;
      u.state = 'walk';
    } else {
      u.vx = 0;
      u.state = 'idle';
    }
    u.openMoving = false;
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
      { axis: 'x', a: -155, b: 86, c: 8, w: 6, name: '绿洲主街' },
      { axis: 'x', a: -155, b: 0, c: 8, w: 5, name: '沙海朝圣古道' },
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
      OW.interiors.push({ id: roomId, name: spec.name || '荒原民居', x, z, w, d, outside: { x, z: frontZ + 1.05 }, inside: { x, z: frontZ - 1.3 } });
    } else {
      batch.add('box', wall, x, h / 2 + 0.45, z, w, h, d, 0, shellData);
      addObstacle(x, z, w + 0.15, d + 0.15, style || 'city_house');
    }
    batch.add('box', mats.cedar, x, h + 0.55, z, w + 0.35, 0.22, d + 0.35, 0, { isRoof: true, isFrontOccluder: true, interiorId: enterable ? roomId : '' });
    batch.add('box', mats.stone, x, h + 0.72, z, w + 0.5, 0.16, d + 0.5, 0, { isRoof: true, isFrontOccluder: true, interiorId: enterable ? roomId : '' });
    // 平顶女儿墙与挑椽，保持古典荒原城市轮廓。
    batch.add('box', wall, x, h + 1.0, z - d / 2, w + 0.35, 0.55, 0.25);
    batch.add('box', wall, x, h + 1.0, z + d / 2, w + 0.35, 0.55, 0.25);
    batch.add('box', wall, x - w / 2, h + 1.0, z, 0.25, 0.55, d);
    batch.add('box', wall, x + w / 2, h + 1.0, z, 0.25, 0.55, d);
    for (let vx = -w / 2 + 0.55; vx < w / 2; vx += 1.15) batch.add('box', mats.cedar, x + vx, h + 0.35, z + d / 2 + 0.32, 0.16, 0.16, 0.85);
    if (!enterable) batch.add('box', mats.dark, x, 1.55, z + d / 2 + 0.012, 1.25, 2.6, 0.08, 0, { noShadow: true });
    batch.add('box', mats.cedar, x, 2.95, z + d / 2 + 0.10, 1.65, 0.22, 0.28);
    // 门前遮阳织锦天幕与木质支架 (Doorway Canopy Awning)
    const canopyMat = (OW.interiors.length % 2 === 0) ? mats.cloth : mats.turquoise;
    batch.add('box', canopyMat, x, 3.12, z + d / 2 + 0.65, 1.85, 0.08, 1.15, -0.18);
    for (const side of [-1, 1]) {
      batch.add('column', mats.cedar, x + side * 0.88, 1.55, z + d / 2 + 1.15, 0.09, 3.1, 0.09);
    }
    // 门旁古典泥土烤炉 (Tandoor Oven)、柴堆与储水双耳陶瓮
    const ovenX = x + Math.min(w * 0.38, w / 2 - 0.75), ovenZ = z + d / 2 + 0.65;
    batch.add('dome', mats.firedBrick, ovenX, 0.55, ovenZ, 0.48, 0.65, 0.48);
    batch.add('cylinder', mats.dark, ovenX, 0.95, ovenZ, 0.16, 0.18, 0.16);
    batch.add('box', mats.cedar, ovenX - 0.55, 0.22, ovenZ, 0.45, 0.35, 0.65, 0.35);
    batch.add('cylinder', mats.porphyry, ovenX + 0.55, 0.45, ovenZ, 0.22, 0.75, 0.22);
    batch.add('cylinder', mats.turquoise, ovenX + 0.55, 0.85, ovenZ, 0.12, 0.15, 0.12);

    // 屋顶精装：晒谷苇席、遮阳棚架与屋顶陶罐 (Rooftop Living Terraces)
    const roofY = h + 0.88;
    const rackX = x - w * 0.18, rackZ = z - d * 0.15;
    batch.add('box', mats.gold, rackX, roofY + 0.02, rackZ, Math.min(2.8, w * 0.45), 0.04, Math.min(2.6, d * 0.45), 0.2);
    // 遮阳凉棚木架
    for (const sx of [-0.95, 0.95]) {
      for (const sz of [-0.85, 0.85]) {
        batch.add('column', mats.cedar, rackX + sx, roofY + 0.95, rackZ + sz, 0.08, 1.9, 0.08);
      }
    }
    batch.add('box', canopyMat, rackX, roofY + 1.92, rackZ, 2.1, 0.06, 1.9, 0.08);
    batch.add('cylinder', mats.firedBrick, x + w * 0.28, roofY + 0.35, z + d * 0.2, 0.22, 0.65, 0.22);
    batch.add('cylinder', mats.firedBrick, x + w * 0.28 + 0.35, roofY + 0.28, z + d * 0.2 + 0.22, 0.18, 0.52, 0.18);

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
          addBuilding(batch, mats, { x, z, w, d, h: 3.8 + random() * 3.8, style: civic, enterable, wall, name: civic === 'portico' ? '希腊柱式文书馆' : (civic === 'dome' ? '穹顶浴场与粮仓' : '荒原民居') }, random);
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
    const cx = 67, cz = -10;
    OW.tower.x = cx; OW.tower.z = cz;
    // ── 巴别塔即地图本体：五层同轴同心圆巨构（从地面门厅 y=0 直达天穹圣坛 y=86.0，基底半径 36m） ──
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(36.0, 36.0, 0.14, 64), mats.marble);
    floor.position.set(cx, -0.03, cz); floor.receiveShadow = true;
    floor.userData.isGround = floor.userData.isWalkway = true; root.add(floor);
    const inlay = new THREE.Mesh(new THREE.RingGeometry(12.0, 13.2, 64), mats.lapis);
    inlay.rotation.x = -Math.PI / 2; inlay.position.set(cx, 0.045, cz); root.add(inlay);
    for (const r of [18.0, 26.0, 32.0]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.35, 64), r === 26.0 ? mats.turquoise : mats.porphyry);
      ring.rotation.x = -Math.PI / 2; ring.position.set(cx, 0.05, cz); ring.receiveShadow = true; root.add(ring);
    }
    OW.interiors.push(
      { id: 'tower_vestibule', name: '巴别巨厦 · 万门前厅与礼仪大道', x: cx, z: cz, y: 0, isCircle: true, r: 28.0 },
      { id: 'tower_t1_gears', name: '巴别巨厦一层 · 水力动力齿轮机房', x: 50.5, z: -16, y: 12.0, w: 18, d: 20 },
      { id: 'tower_t1_atrium', name: '巴别巨厦一层 · 万门列柱大中庭', x: 67.0, z: -10, y: 12.0, w: 18, d: 24 },
      { id: 'tower_t1_scriptoria', name: '巴别巨厦一层 · 掌印铭文书斋与官印库', x: 82.5, z: -16, y: 12.0, w: 18, d: 20 },
      { id: 'tower_t2_gallery', name: '巴别巨厦二层 · 螺旋同心圆大回廊', x: 67.0, z: -10, y: 18.0, isCircle: true, r: 23.5 },
      { id: 'tower_t2_oracle', name: '巴别巨厦二层 · 神谕二门与天阶议事厅', x: 67.0, z: -10, y: 32.0, isCircle: true, r: 18.5 },
      { id: 'tower_t3_cloud', name: '巴别巨厦三层 · 云之回廊与绝壁工程', x: 67.0, z: -10, y: 38.0, isCircle: true, r: 16.5 },
      { id: 'tower_t4_library', name: '巴别巨厦四层 · 圣书大图书馆 (万卷藏书阁)', x: 67.0, z: -10, y: 50.0, isCircle: true, r: 13.5 },
      { id: 'tower_t4_coldvault', name: '巴别巨厦四层 · 秘卷冷库与古星图密阁', x: 67.0, z: -10, y: 58.0, isCircle: true, r: 11.5 },
      { id: 'tower_t5_sanctuary', name: '巴别巨厦之巅 · 天穹圣殿与破晓金坛', x: 67.0, z: -10, y: 68.0, isCircle: true, r: 9.0 }
    );

    // 门厅列柱与圣火盆（位于万门前厅礼仪两侧）
    for (const side of [-1, 1]) for (const bz of [-4.5, -15.5]) {
      const bx = cx + side * 14.5;
      batch.add('cylinder', mats.basalt, bx, 0.55, bz, 0.85, 1.0, 0.85);
      batch.add('cylinder', mats.bronze, bx, 1.18, bz, 1.05, 0.28, 1.05);
      batch.add('cone', mats.sacredGold, bx, 1.75, bz, 0.48, 0.95, 0.48, 0, { noShadow: true });
      addCircleObstacle(bx, bz, 0.85, 'temple_brazier');
    }

    // 塔下门厅环柱（围绕塔心同心圆分布）
    addCircleObstacle(cx, cz, 7.5, 'tower_core');
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2;
      const x = cx + Math.sin(a) * 28.0, z = cz + Math.cos(a) * 22.0;
      if (z > 4.5) continue;
      batch.add('column', mats.marble, x, 5.6, z, 0.72, 11.2, 0.72, 0, { isTowerShell: true });
      batch.add('box', mats.marble, x, 0.35, z, 1.75, 0.5, 1.75, a, { isTowerShell: true });
      batch.add('box', mats.marble, x, 11.4, z, 1.75, 0.45, 1.75, a, { isTowerShell: true });
      addCircleObstacle(x, z, 0.78, 'tower_column');
    }

    // 埃及式神圣双塔门与方尖碑：置于南广场入口大道（z = +13.5）
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

    // ── 巴别巨构内部真实大厦空间：同心圆筒体、放射状隔墙、透视列柱与全套室内家具陈设 ──
    const buildInteriorChambers = () => {
      // 辅助：沿圆周同心圆弧放置弧段后壁与挑檐压顶
      const addRotundaWallArc = (tierR, y0, y1, phiStart, phiEnd, stepDeg = 10, mat = mats.stoneDark) => {
        const floorH = y1 - y0, midY = (y0 + y1) / 2;
        const startRad = phiStart * Math.PI / 180;
        const endRad = phiEnd * Math.PI / 180;
        const steps = Math.max(1, Math.round((endRad - startRad) / (stepDeg * Math.PI / 180)));
        const dt = (endRad - startRad) / steps;
        for (let i = 0; i < steps; i++) {
          const aMid = startRad + (i + 0.5) * dt;
          const chord = 2 * tierR * Math.sin(dt / 2);
          const wx = cx + tierR * Math.sin(aMid);
          const wz = cz - tierR * Math.cos(aMid);
          batch.add('box', mat, wx, midY, wz, chord * 1.04, floorH, 0.95, -aMid, { isTowerShell: true });
          batch.add('box', mats.adobeLight, wx, y1 - 0.22, wz, chord * 1.08, 0.44, 1.25, -aMid, { isTowerShell: true });
        }
      };

      // 辅助：沿南向开敞圆弧放置同心圆列柱、石砌透空镂空雕花护栏与挑空垛口
      const addRotundaColonnadeArc = (tierR, y0, y1, phiStart, phiEnd, stepDeg = 15) => {
        const floorH = y1 - y0, midY = (y0 + y1) / 2;
        const startRad = phiStart * Math.PI / 180;
        const endRad = phiEnd * Math.PI / 180;
        const count = Math.max(2, Math.round((endRad - startRad) / (stepDeg * Math.PI / 180)));
        const dt = (endRad - startRad) / (count - 1);
        let prevCol = null;
        for (let i = 0; i < count; i++) {
          const a = startRad + i * dt;
          const colX = cx + tierR * Math.sin(a);
          const colZ = cz - tierR * Math.cos(a);
          batch.add('column', mats.marble, colX, midY, colZ, 0.65, floorH, 0.65, 0, { isTowerShell: true });
          batch.add('box', mats.marble, colX, y0 + 0.25, colZ, 1.45, 0.5, 1.45, 0, { isTowerShell: true });
          batch.add('box', mats.marble, colX, y1 - 0.25, colZ, 1.45, 0.5, 1.45, 0, { isTowerShell: true });
          if (prevCol) {
            const midX = (prevCol.x + colX) / 2, midZ = (prevCol.z + colZ) / 2;
            const dist = Math.hypot(colX - prevCol.x, colZ - prevCol.z);
            const ang = Math.atan2(colZ - prevCol.z, colX - prevCol.x);
            // 实体基座矮护栏 (h=0.45m)
            batch.add('box', mats.stone, midX, y0 + 0.22, midZ, dist, 0.45, 0.28, -ang, { isTowerShell: true });
            // 上部巴比伦几何镂空雕花窗格 (Openwork Lattice Jali Screen, h=0.6m)
            const openworkH = 0.55;
            const openworkY = y0 + 0.45 + openworkH / 2;
            batch.add('box', mats.adobeLight, midX, openworkY + openworkH * 0.45, midZ, dist, 0.08, 0.16, -ang, { isTowerShell: true });
            batch.add('box', mats.adobeLight, midX, openworkY, midZ, dist * 0.95, 0.06, 0.12, -ang + 0.52, { isTowerShell: true });
            batch.add('box', mats.adobeLight, midX, openworkY, midZ, dist * 0.95, 0.06, 0.12, -ang - 0.52, { isTowerShell: true });
            // 上方挑空拱券与垂落绿植爬藤
            batch.add('arch', mats.adobeLight, midX, y1 - 0.95, midZ, dist * 0.48, 1.8, 0.65, -ang, { isTowerShell: true });
            addHangingIvy(midX, y1 - 1.15, midZ, 1.8, dist * 0.4);
            // 镂空垛口檐牙 (Pierced Battlements)
            batch.add('box', mats.stoneDark, midX, y1 + 0.18, midZ, dist * 0.45, 0.36, 0.35, -ang, { isTowerShell: true });
          }
          prevCol = { x: colX, z: colZ };
        }
      };

      // 辅助：自中心向外发散的放射状隔断墙 (Radial Spoke Partition) 带中央拱门
      const addRadialSpokeWall = (y0, y1, phiDeg, rInner, rOuter, doorR1 = 11.5, doorR2 = 16.0, mat = mats.stoneDark) => {
        const floorH = y1 - y0, midY = (y0 + y1) / 2;
        const phi = phiDeg * Math.PI / 180;
        const dirX = Math.sin(phi), dirZ = -Math.cos(phi);
        const ang = -phi + Math.PI / 2;

        if (doorR1 > rInner) {
          const midR = (rInner + doorR1) / 2, len = doorR1 - rInner;
          batch.add('box', mat, cx + dirX * midR, midY, cz + dirZ * midR, len, floorH, 0.85, ang, { isTowerShell: true });
        }
        if (rOuter > doorR2) {
          const midR = (doorR2 + rOuter) / 2, len = rOuter - doorR2;
          batch.add('box', mat, cx + dirX * midR, midY, cz + dirZ * midR, len, floorH, 0.85, ang, { isTowerShell: true });
        }
        const doorMidR = (doorR1 + doorR2) / 2, doorW = doorR2 - doorR1;
        batch.add('arch', mats.adobeLight, cx + dirX * doorMidR, y1 - 1.0, cz + dirZ * doorMidR, doorW * 0.48, 1.8, 0.95, ang, { isTowerShell: true });
        batch.add('box', mat, cx + dirX * doorMidR, y1 - 0.35, cz + dirZ * doorMidR, doorW, 0.7, 0.85, ang, { isTowerShell: true });
      };

      // ── 雕塑系统：巴比伦双翼人面牛神 (Lamassu)、星象学者巨像与守门神狮 ──
      const addLamassuSculpture = (lx, ly, lz, ry, scale = 1.0) => {
        const s = scale;
        batch.add('box', mats.basalt, lx, ly + 0.25 * s, lz, 1.35 * s, 0.5 * s, 1.8 * s, ry, { isTowerShell: true });
        batch.add('box', mats.alabaster, lx, ly + 1.15 * s, lz, 0.95 * s, 1.3 * s, 1.4 * s, ry, { isTowerShell: true });
        for (const dx of [-0.35, 0.35]) {
          for (const dz of [-0.45, 0.45]) {
            const rx = lx + (dx * Math.cos(ry) - dz * Math.sin(ry)) * s;
            const rz = lz + (dx * Math.sin(ry) + dz * Math.cos(ry)) * s;
            batch.add('column', mats.stoneDark, rx, ly + 0.6 * s, rz, 0.22 * s, 0.7 * s, 0.22 * s, ry, { isTowerShell: true });
          }
        }
        const wingX = lx + 0.45 * Math.sin(ry) * s, wingZ = lz - 0.45 * Math.cos(ry) * s;
        batch.add('box', mats.sacredGold, wingX, ly + 2.1 * s, wingZ, 0.18 * s, 1.6 * s, 0.95 * s, ry + 0.2, { isTowerShell: true });
        const headX = lx + 0.48 * Math.cos(ry) * s, headZ = lz + 0.48 * Math.sin(ry) * s;
        batch.add('box', mats.alabaster, headX, ly + 2.1 * s, headZ, 0.6 * s, 0.65 * s, 0.6 * s, ry, { isTowerShell: true });
        batch.add('box', mats.stoneDark, headX, ly + 1.65 * s, headZ, 0.35 * s, 0.55 * s, 0.3 * s, ry, { isTowerShell: true });
        batch.add('cylinder', mats.sacredGold, headX, ly + 2.55 * s, headZ, 0.32 * s, 0.4 * s, 0.32 * s, ry, { isTowerShell: true });
      };

      const addScribeStatue = (sx, sy, sz, ry, isAstrologer = false) => {
        batch.add('cylinder', mats.basalt, sx, sy + 0.35, sz, 0.75, 0.7, 0.75, ry, { isTowerShell: true });
        batch.add('cylinder', mats.alabaster, sx, sy + 1.45, sz, 0.55, 1.5, 0.55, ry, { isTowerShell: true });
        const itemX = sx + 0.35 * Math.sin(ry), itemZ = sz + 0.35 * Math.cos(ry);
        if (isAstrologer) {
          batch.add('cylinder', mats.bronze, itemX, sy + 1.55, itemZ, 0.32, 0.08, 0.32, Math.PI / 4, { isTowerShell: true });
          batch.add('cylinder', mats.sacredGold, itemX, sy + 1.7, itemZ, 0.22, 0.22, 0.22, 0, { noShadow: true });
        } else {
          batch.add('box', mats.sacredGold, itemX, sy + 1.55, itemZ, 0.38, 0.12, 0.48, ry, { isTowerShell: true });
        }
        batch.add('box', mats.alabaster, sx, sy + 2.4, sz, 0.45, 0.5, 0.45, ry, { isTowerShell: true });
        batch.add('cone', mats.porphyry, sx, sy + 2.8, sz, 0.35, 0.45, 0.35, ry, { isTowerShell: true });
      };

      const addGuardianLion = (lx, ly, lz, ry) => {
        batch.add('box', mats.stoneDark, lx, ly + 0.3, lz, 0.85, 0.6, 1.5, ry, { isTowerShell: true });
        batch.add('box', mats.sacredGold, lx, ly + 0.95, lz, 0.65, 0.75, 1.1, ry, { isTowerShell: true });
        batch.add('box', mats.sacredGold, lx, ly + 1.5, lz + 0.35 * Math.cos(ry), 0.5, 0.6, 0.55, ry, { isTowerShell: true });
        batch.add('box', mats.stoneDark, lx, ly + 1.35, lz + 0.35 * Math.cos(ry), 0.6, 0.65, 0.4, ry, { isTowerShell: true });
      };

      // ── 喷泉系统：万门列柱大中庭 · 同心圆三级叠水喷泉 (Concentric Tiered Cascade Fountain) ──
      const addGrandFountain = (fx, fy, fz) => {
        // 第一级底层水池 (r = 4.2m)
        batch.add('cylinder', mats.marble, fx, fy + 0.32, fz, 4.4, 0.65, 4.4, 0, { isTowerShell: true });
        batch.add('cylinder', mats.water, fx, fy + 0.6, fz, 4.0, 0.08, 4.0, 0, { noShadow: true });
        batch.add('cylinder', mats.turquoise, fx, fy + 0.62, fz, 4.3, 0.08, 4.3, 0, { isTowerShell: true });
        // 第二级中层承水盘 (r = 2.6m)
        batch.add('cylinder', mats.porphyry, fx, fy + 1.1, fz, 0.95, 1.1, 0.95, 0, { isTowerShell: true });
        batch.add('cylinder', mats.marble, fx, fy + 1.6, fz, 2.7, 0.45, 2.7, 0, { isTowerShell: true });
        batch.add('cylinder', mats.water, fx, fy + 1.82, fz, 2.4, 0.06, 2.4, 0, { noShadow: true });
        // 第三级顶层金盘 (r = 1.3m)
        batch.add('cylinder', mats.bronze, fx, fy + 2.2, fz, 0.55, 1.0, 0.55, 0, { isTowerShell: true });
        batch.add('cylinder', mats.sacredGold, fx, fy + 2.65, fz, 1.4, 0.35, 1.4, 0, { isTowerShell: true });
        batch.add('cylinder', mats.water, fx, fy + 2.82, fz, 1.2, 0.05, 1.2, 0, { noShadow: true });
        // 塔尖金莲花喷水嘴与涌泉水柱
        batch.add('cone', mats.sacredGold, fx, fy + 3.1, fz, 0.32, 0.55, 0.32, 0, { noShadow: true });
        batch.add('cylinder', mats.water, fx, fy + 3.5, fz, 0.18, 0.7, 0.18, 0, { noShadow: true });
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const sx = fx + Math.cos(a) * 2.6, sz = fz + Math.sin(a) * 2.6;
          batch.add('box', mats.bronze, sx, fy + 1.65, sz, 0.35, 0.35, 0.35, a, { isTowerShell: true });
        }
      };

      // ── 台阶系统：西翼宏伟弧形礼仪阶梯 (Cascading Processional Stairs y=5.2 -> 12.0) ──
      const addCeremonialStairs = () => {
        const stepCount = 14;
        const startX = 46.5, endX = 57.5;
        const startY = 5.2, endY = 12.0;
        const stairWidth = 8.0;
        const stepDX = (endX - startX) / stepCount;
        const stepDY = (endY - startY) / stepCount;
        for (let i = 0; i < stepCount; i++) {
          const curX = startX + (i + 0.5) * stepDX;
          const curY = startY + (i + 0.5) * stepDY;
          const treadH = curY - startY + 0.15;
          batch.add('box', mats.marble, curX, startY + treadH / 2, -10.0, stepDX * 1.15, treadH, stairWidth, 0, { isTowerShell: true });
          batch.add('box', mats.lapis, curX, curY + 0.02, -10.0, stepDX * 1.05, 0.04, 2.4, 0, { noShadow: true });
          if (i % 2 === 0) {
            batch.add('box', mats.sacredGold, curX, curY + 0.03, -10.0, 0.25, 0.04, 0.25, Math.PI / 4, { noShadow: true });
          }
        }
        for (const sideZ of [-10.0 - stairWidth / 2 - 0.35, -10.0 + stairWidth / 2 + 0.35]) {
          const midX = (startX + endX) / 2, midY = (startY + endY) / 2;
          const len = Math.hypot(endX - startX, endY - startY);
          const slope = Math.atan2(endY - startY, endX - startX);
          batch.add('box', mats.stoneDark, midX, midY + 0.45, sideZ, len * 1.05, 0.9, 0.45, slope, { isTowerShell: true });
          batch.add('cylinder', mats.bronze, startX, startY + 1.2, sideZ, 0.35, 1.5, 0.35, 0, { isTowerShell: true });
          batch.add('cone', mats.sacredGold, startX, startY + 2.1, sideZ, 0.25, 0.65, 0.25, 0, { noShadow: true });
          batch.add('cylinder', mats.bronze, endX, endY + 1.2, sideZ, 0.35, 1.5, 0.35, 0, { isTowerShell: true });
          batch.add('cone', mats.sacredGold, endX, endY + 2.1, sideZ, 0.25, 0.65, 0.25, 0, { noShadow: true });
        }
        addGuardianLion(startX - 1.2, startY, -10.0 - stairWidth / 2 - 1.2, 0);
        addGuardianLion(startX - 1.2, startY, -10.0 + stairWidth / 2 + 1.2, 0);
        // 阶梯入口两侧与平台外围花台（严格置于主行动通道外侧，留出宽裕的 8 米中央通行大道）
        const outerZOffset = stairWidth / 2 + 1.8;
        addTerracottaPlanter(startX - 1.8, startY, -10.0 - outerZOffset, 0.6, 0.85);
        addTerracottaPlanter(startX - 1.8, startY, -10.0 + outerZOffset, 0.6, 0.85);
        addTerracottaPlanter(endX - 1.8, endY, -10.0 - outerZOffset, 0.5, 0.75);
        addTerracottaPlanter(endX - 1.8, endY, -10.0 + outerZOffset, 0.5, 0.75);
      };

      // ── 空中花园植物细节：陶土无花果树盆栽、棕榈盆景与垂吊爬墙藤蔓 ──
      const addTerracottaPlanter = (px, py, pz, r = 0.55, h = 0.8) => {
        const plantData = { isPlant: true, noOcclusion: true, isTowerShell: true };
        batch.add('cylinder', mats.firedBrick, px, py + h * 0.45, pz, r, h * 0.9, r * 0.75, 0, plantData);
        batch.add('cylinder', mats.sand, px, py + h * 0.88, pz, r * 0.92, 0.12, r * 0.92, 0, plantData);
        batch.add('dome', mats.leaf, px, py + h + 0.45, pz, r * 1.35, r * 1.15, r * 1.35, 0, plantData);
        batch.add('cone', mats.leaf, px, py + h + 0.95, pz, r * 0.95, 0.75, r * 0.95, 0, plantData);
        // 注册紧凑避障圆柱（半径适度收拢，杜绝阻碍角色擦肩而过）
        addCircleObstacle(px, pz, Math.min(0.35, r * 0.65), 'planter');
      };

      const addHangingIvy = (vx, vy, vz, len = 2.2, width = 0.65) => {
        batch.add('box', mats.leaf, vx, vy - len * 0.35, vz, width, len * 0.7, 0.14, 0, { isTowerShell: true });
        batch.add('cone', mats.leaf, vx, vy - len * 0.78, vz, width * 0.75, len * 0.45, 0.16, 0, { isTowerShell: true });
      };

      const addWallSconce = (sx, sy, sz, ry) => {
        batch.add('box', mats.bronze, sx, sy, sz, 0.18, 0.55, 0.35, ry, { isTowerShell: true });
        batch.add('cone', mats.sacredGold, sx + 0.18 * Math.sin(ry), sy + 0.32, sz + 0.18 * Math.cos(ry), 0.16, 0.38, 0.16, 0, { noShadow: true });
      };

      // ── 第 1 章：巴别塔同心圆一层 · 52米直径圆环大殿与三大扇区 (y=12.0~18.0, R=26m) ──
      addRotundaWallArc(26.0, 12.0, 18.0, -125, 125, 10, mats.stoneDark);
      addRotundaColonnadeArc(26.0, 12.0, 18.0, 125, 235, 15);
      // 西翼大门前礼仪阶梯与守门双翼公牛拉玛苏
      addCeremonialStairs();
      addLamassuSculpture(57.8, 12.0, -4.5, 0, 1.15);
      addLamassuSculpture(57.8, 12.0, -15.5, 0, 1.15);

      // 北壁采光高窗与壁龛 (内嵌青铜常明壁灯)
      for (const p of [-80, -40, 0, 40, 80]) {
        const pr = p * Math.PI / 180;
        const wx = cx + 25.6 * Math.sin(pr), wz = cz - 25.6 * Math.cos(pr);
        batch.add('box', mats.dark, wx, 15.6, wz, 1.35, 2.7, 0.25, -pr, { noShadow: true, isTowerShell: true });
        batch.add('arch', mats.adobeLight, wx, 17.15, wz, 1.45, 1.2, 0.3, -pr, { isTowerShell: true });
        addWallSconce(wx, 14.8, wz, -pr);
      }
      // 放射状隔墙 (西北角: 动力机房与中庭; 东北角: 中庭与书斋)
      addRadialSpokeWall(12.0, 18.0, -45, 7.0, 26.0, 11.5, 16.0, mats.stoneDark);
      addRadialSpokeWall(12.0, 18.0, 45, 7.0, 26.0, 11.5, 16.0, mats.stoneDark);

      // 【扇区 1：西北水力动力齿轮机房】
      batch.add('cylinder', mats.bronze, cx - 18.5, 15.2, cz - 11.8, 2.8, 0.42, 2.8, Math.PI / 2, { isTowerShell: true });
      batch.add('cylinder', mats.cedar, cx - 13.5, 16.5, cz - 11.8, 1.8, 0.45, 1.8, Math.PI / 2, { isTowerShell: true });
      batch.add('cylinder', mats.bronze, cx - 16.0, 13.5, cz - 11.8, 1.3, 0.45, 1.3, Math.PI / 2, { isTowerShell: true });
      batch.add('box', mats.stone, cx - 16.5, 12.35, cz - 4.0, 11.5, 0.55, 1.4, 0.3, { isTowerShell: true });
      batch.add('box', mats.water, cx - 16.5, 12.52, cz - 4.0, 11.0, 0.25, 0.9, 0.3, { noShadow: true });
      batch.add('box', mats.cedar, cx - 19.5, 12.75, cz + 4.5, 3.2, 0.75, 1.5, 0, { isTowerShell: true });
      batch.add('cylinder', mats.bronze, cx - 12.8, 13.5, cz + 4.5, 0.65, 0.15, 0.65, Math.PI / 2, { isTowerShell: true });

      // 【扇区 2：正北万门列柱大中庭与塔心三级叠水喷泉】
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const px = cx + Math.sin(a) * 7.0, pz = cz - Math.cos(a) * 7.0;
        if (pz > cz + 5.5) continue;
        batch.add('column', mats.marble, px, 15.0, pz, 0.65, 6.0, 0.65, 0, { isTowerShell: true });
        batch.add('box', mats.marble, px, 12.3, pz, 1.45, 0.45, 1.45, 0, { isTowerShell: true });
        batch.add('box', mats.marble, px, 17.7, pz, 1.45, 0.45, 1.45, 0, { isTowerShell: true });
      }
      // 宏伟三级叠水喷泉置于塔心大中庭
      addGrandFountain(cx, 12.0, cz);
      // 喷泉辐射环流水槽与环绕陶土绿植
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const rx = cx + Math.cos(a) * 5.2, rz = cz + Math.sin(a) * 5.2;
        batch.add('box', mats.marble, rx, 12.18, rz, 1.6, 0.22, 0.75, a, { isTowerShell: true });
        batch.add('box', mats.water, rx, 12.28, rz, 1.5, 0.08, 0.45, a, { noShadow: true });
        // 陶土绿植盆景布置于外围廊柱旁，留出中庭开阔环廊动线
        addTerracottaPlanter(cx + Math.cos(a + Math.PI / 4) * 9.2, 12.0, cz + Math.sin(a + Math.PI / 4) * 9.2, 0.48, 0.72);
      }
      for (const side of [-1, 1]) {
        const fx = cx + side * 7.2;
        batch.add('cylinder', mats.basalt, fx, 12.6, cz, 0.65, 1.0, 0.65, 0);
        batch.add('cylinder', mats.bronze, fx, 13.2, cz, 0.85, 0.25, 0.85, 0);
        batch.add('cone', mats.sacredGold, fx, 13.7, cz, 0.45, 0.8, 0.45, 0, { noShadow: true });
      }

      // 【扇区 3：东北掌印铭文书斋与学者雕像】
      for (let sy = 13.2; sy <= 17.5; sy += 1.1) {
        batch.add('box', mats.cedar, cx + 16.0, sy, cz - 11.8, 11.5, 0.16, 0.65, -0.45, { isTowerShell: true });
        batch.add('box', mats.adobeLight, cx + 16.0, sy + 0.32, cz - 11.6, 11.0, 0.35, 0.35, -0.45, { isTowerShell: true });
      }
      batch.add('box', mats.cedar, cx + 15.5, 12.75, cz - 3.0, 6.5, 0.75, 1.6, -0.25, { isTowerShell: true });
      batch.add('box', mats.stone, cx + 15.5, 12.45, cz - 1.5, 5.5, 0.45, 0.65, -0.25, { isTowerShell: true });
      batch.add('box', mats.cedar, cx + 15.5, 12.75, cz + 4.5, 6.5, 0.75, 1.6, -0.25, { isTowerShell: true });
      batch.add('box', mats.stone, cx + 15.5, 12.45, cz + 6.0, 5.5, 0.45, 0.65, -0.25, { isTowerShell: true });
      addScribeStatue(cx + 17.5, 12.0, cz - 6.5, -Math.PI / 3, false);

      // ── 第 2 章：巴别塔同心圆二层与绝壁回廊 (y=18.0~32.0, R=23.5m ~ 18.5m) ──
      addRotundaWallArc(23.5, 18.0, 25.0, -125, 125, 10, mats.stone);
      addRotundaColonnadeArc(23.5, 18.0, 25.0, 125, 235, 15);
      addRotundaWallArc(21.0, 25.0, 32.0, -125, 125, 10, mats.stoneDark);
      addRotundaColonnadeArc(21.0, 25.0, 32.0, 125, 235, 15);
      addRadialSpokeWall(18.0, 25.0, -35, 6.0, 23.5, 10.0, 14.5, mats.stone);
      addRadialSpokeWall(18.0, 25.0, 35, 6.0, 23.5, 10.0, 14.5, mats.stone);

      // 二层天阶议事厅与日晷台精装细节
      // 1. 半圆环阶梯式议事席长凳
      for (let bi = 0; bi < 3; bi++) {
        const br = 15.5 - bi * 2.2;
        const by = 18.0 + (bi + 1) * 0.45;
        for (let a = -70; a <= 70; a += 20) {
          const ar = a * Math.PI / 180;
          const bx = cx + br * Math.sin(ar), bz = cz - br * Math.cos(ar);
          batch.add('box', mats.marble, bx, by - 0.22, bz, 2.4, 0.45, 0.95, -ar, { isTowerShell: true });
          const cushionMat = (bi + Math.abs(a / 20)) % 2 === 0 ? mats.turquoise : mats.cloth;
          batch.add('box', cushionMat, bx, by + 0.04, bz, 2.2, 0.08, 0.85, -ar, { noShadow: true });
        }
      }
      // 2. 议事大厅中央三足青铜巨鼎圣火
      batch.add('cylinder', mats.basalt, cx, 18.25, cz, 3.2, 0.5, 3.2, 0, { isTowerShell: true });
      batch.add('cylinder', mats.bronze, cx, 19.1, cz, 2.2, 1.2, 2.2, 0, { isTowerShell: true });
      batch.add('cone', mats.sacredGold, cx, 20.1, cz, 1.1, 1.4, 1.1, 0, { noShadow: true });
      // 3. 守门公牛神拉玛苏雕像与天象黄铜日晷圆台
      addLamassuSculpture(cx - 12.0, 18.0, cz - 7.5, Math.PI / 4, 0.95);
      addLamassuSculpture(cx + 12.0, 18.0, cz - 7.5, -Math.PI / 4, 0.95);
      batch.add('cylinder', mats.marble, cx, 25.2, cz, 4.2, 0.4, 4.2, 0, { isTowerShell: true });
      batch.add('cylinder', mats.lapis, cx, 25.42, cz, 3.6, 0.06, 3.6, 0, { noShadow: true });
      batch.add('cone', mats.bronze, cx, 26.1, cz, 0.35, 1.3, 0.35, 0.25, { noShadow: true });

      // ── 第 3 章：巴别塔同心圆三层 · 云之回廊与绝壁工坊 (y=32.0~50.0, R=18.5m ~ 14.5m) ──
      addRotundaWallArc(18.5, 32.0, 42.0, -125, 125, 12, mats.stone);
      addRotundaColonnadeArc(18.5, 32.0, 42.0, 125, 235, 16);
      addRotundaWallArc(16.5, 42.0, 50.0, -125, 125, 12, mats.stoneDark);
      addRotundaColonnadeArc(16.5, 42.0, 50.0, 125, 235, 16);
      addRadialSpokeWall(32.0, 42.0, -40, 5.0, 18.5, 8.5, 12.5, mats.stone);
      addRadialSpokeWall(32.0, 42.0, 40, 5.0, 18.5, 8.5, 12.5, mats.stone);

      // 三层绝壁工坊系统：悬挑起重吊车、木工台、锻造炉与物料堆
      // 1. 西北悬挑重型起重木吊车 (Derrick Crane)
      const craneX = cx - 14.0, craneZ = cz - 7.0, craneY = 42.0;
      batch.add('column', mats.cedar, craneX, craneY + 3.2, craneZ, 0.45, 6.4, 0.45, 0, { isTowerShell: true });
      batch.add('box', mats.cedar, craneX - 2.8, craneY + 6.1, craneZ, 6.2, 0.35, 0.35, 0.18, { isTowerShell: true });
      batch.add('cylinder', mats.bronze, craneX - 5.5, craneY + 5.5, craneZ, 0.55, 0.18, 0.55, Math.PI / 2, { noShadow: true });
      batch.add('cylinder', mats.bronze, craneX - 5.5, craneY + 3.6, craneZ, 0.08, 3.6, 0.08, 0, { noShadow: true });
      batch.add('cone', mats.bronze, craneX - 5.5, craneY + 1.6, craneZ, 0.28, 0.45, 0.28, Math.PI, { noShadow: true });
      // 卷扬机绞盘木鼓
      batch.add('cylinder', mats.cedar, craneX + 0.8, craneY + 0.95, craneZ, 0.65, 0.75, 0.65, 0, { isTowerShell: true });

      // 2. 工兵重型木工作案与绘图长桌
      batch.add('box', mats.cedar, cx - 8.5, craneY + 0.85, cz + 2.5, 4.8, 0.85, 1.8, 0.15, { isTowerShell: true });
      batch.add('box', mats.lapis, cx - 8.5, craneY + 1.32, cz + 2.5, 1.8, 0.06, 0.95, 0.15, { noShadow: true });
      batch.add('cylinder', mats.bronze, cx - 6.8, craneY + 1.45, cz + 2.8, 0.18, 0.32, 0.18, 0, { noShadow: true });

      // 3. 石砌风动锻造炉与铁砧
      const forgeX = cx + 8.5, forgeZ = cz - 5.5, forgeY = 42.0;
      batch.add('box', mats.firedBrick, forgeX, forgeY + 0.9, forgeZ, 2.6, 1.8, 2.2, -0.2, { isTowerShell: true });
      batch.add('cylinder', mats.stoneDark, forgeX, forgeY + 2.4, forgeZ, 0.45, 1.4, 0.45, 0, { isTowerShell: true });
      batch.add('cone', mats.sacredGold, forgeX - 0.2, forgeY + 0.65, forgeZ + 0.75, 0.45, 0.65, 0.45, 0, { noShadow: true });
      // 铁砧与冷却水槽
      batch.add('box', mats.basalt, forgeX - 2.5, forgeY + 0.65, forgeZ + 0.8, 0.75, 0.85, 1.2, -0.2, { isTowerShell: true });
      batch.add('box', mats.stone, forgeX + 2.2, forgeY + 0.45, forgeZ + 0.5, 1.2, 0.65, 1.6, -0.2, { isTowerShell: true });
      batch.add('box', mats.water, forgeX + 2.2, forgeY + 0.68, forgeZ + 0.5, 0.95, 0.08, 1.35, -0.2, { noShadow: true });

      // 4. 绝壁风力测候铜鸟 (Anemometer Weathervane)
      const vaneX = cx + 13.5, vaneZ = cz + 6.0, vaneY = 42.0;
      batch.add('column', mats.bronze, vaneX, vaneY + 2.6, vaneZ, 0.18, 5.2, 0.18, 0, { isTowerShell: true });
      batch.add('cone', mats.sacredGold, vaneX, vaneY + 5.4, vaneZ, 0.35, 0.65, 0.35, 0, { noShadow: true });
      batch.add('box', mats.bronze, vaneX, vaneY + 4.6, vaneZ, 1.8, 0.12, 0.12, 0.6, { noShadow: true });

      // ── 第 3 章：巴别塔同心圆四层 · 博尔赫斯圆形大图书馆 (y=50.0~68.0, R=13.5m ~ 11.5m) ──
      addRotundaWallArc(13.5, 50.0, 58.0, -130, 130, 10, mats.stoneDark);
      addRotundaColonnadeArc(13.5, 50.0, 58.0, 130, 230, 16);
      addLamassuSculpture(cx - 10.5, 50.0, cz, Math.PI / 2, 0.85);
      addScribeStatue(cx, 50.0, cz - 16.5, 0, true);
      for (let p = -110; p <= 110; p += 22) {
        const pr = p * Math.PI / 180;
        const bx = cx + 12.6 * Math.sin(pr), bz = cz - 12.6 * Math.cos(pr);
        batch.add('column', mats.marble, bx, 54.0, bz, 0.35, 8.0, 0.35, 0, { isTowerShell: true });
        for (let by = 51.6; by <= 56.8; by += 1.8) {
          batch.add('box', mats.cedar, bx, by, bz, 4.2, 0.22, 0.65, -pr, { isTowerShell: true });
          batch.add('box', mats.lapis, bx, by + 0.42, bz, 3.8, 0.55, 0.42, -pr, { isTowerShell: true });
        }
      }
      for (const r of [7.5, 4.5]) {
        for (const p of [-60, 0, 60]) {
          const pr = p * Math.PI / 180;
          const rx = cx + r * Math.sin(pr), rz = cz - r * Math.cos(pr);
          batch.add('box', mats.cedar, rx, 50.8, rz, 3.8, 0.8, 1.4, -pr, { isTowerShell: true });
          batch.add('box', mats.marble, rx, 50.45, rz + 1.1, 3.2, 0.45, 0.55, -pr, { isTowerShell: true });
          batch.add('cone', mats.bronze, rx - 1.2, 51.5, rz, 0.25, 0.5, 0.25, 0, { noShadow: true });
          batch.add('box', mats.alabaster, rx + 0.8, 51.25, rz, 0.75, 0.12, 0.55, -pr + 0.2, { isTowerShell: true });
        }
      }

      // 秘卷冷库圆环大殿与天球仪密阁 (y = 58.0 ~ 68.0, R = 11.5m)
      addRotundaWallArc(11.5, 58.0, 68.0, -130, 130, 10, mats.stoneDark);
      addRotundaColonnadeArc(11.5, 58.0, 68.0, 130, 230, 16);
      batch.add('box', mats.basalt, cx, 58.6, cz, 5.5, 0.85, 4.5, 0, { isTowerShell: true });
      batch.add('cylinder', mats.bronze, cx, 60.0, cz, 2.2, 0.2, 2.2, Math.PI / 4, { isTowerShell: true });
      batch.add('cone', mats.sacredGold, cx, 60.5, cz, 0.65, 1.2, 0.65, 0, { noShadow: true });
      addRadialSpokeWall(58.0, 68.0, -45, 4.5, 11.5, 6.5, 9.5, mats.stoneDark);
      addRadialSpokeWall(58.0, 68.0, 45, 4.5, 11.5, 6.5, 9.5, mats.stoneDark);
    };
    buildInteriorChambers();
  }

  function buildSacredPrecinct(root, batch, mats) {
    const cx = 67, cz = -10;
    // ── 终章：巴别塔同心圆之巅 · 天穹圣殿与破晓金坛（同心圆半径 9m ~ 4.5m，正居塔顶 cx=67, cz=-10） ──
    const languages = [
      { id: 'sumerian', name: '苏美尔语 (楔形文字)', color: mats.sacredGold, symbol: '𒀭' },
      { id: 'akkadian', name: '阿卡德语 (星辰印章)', color: mats.lapis, symbol: '𒊹' },
      { id: 'elamite', name: '埃兰语 (崇山之印)', color: mats.turquoise, symbol: '▲' },
      { id: 'hurrian', name: '胡里安语 (风暴刻符)', color: mats.porphyry, symbol: '⚡' },
      { id: 'aramaic', name: '阿拉米语 (破晓流光)', color: mats.alabaster, symbol: '☼' }
    ];

    languages.forEach((lang, i) => {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * 6.8;
      const pz = cz + Math.sin(angle) * 6.8;
      const py = 74.0;

      // 圣盘圆台基座
      batch.add('cylinder', mats.alabaster, px, py + 0.15, pz, 1.45, 0.3, 1.45, 0, { isTowerShell: true });
      batch.add('cylinder', lang.color, px, py + 0.32, pz, 1.15, 0.08, 1.15, 0, { noShadow: true });
      // 拱卫立柱与神光祭火
      batch.add('column', mats.alabaster, px - 0.85, py + 1.8, pz, 0.22, 3.2, 0.22, 0, { isTowerShell: true });
      batch.add('column', mats.alabaster, px + 0.85, py + 1.8, pz, 0.22, 3.2, 0.22, 0, { isTowerShell: true });
      batch.add('box', lang.color, px, py + 3.45, pz, 2.1, 0.25, 0.65, 0, { isTowerShell: true });
      batch.add('cone', mats.sacredGold, px, py + 0.85, pz, 0.28, 0.75, 0.28, 0, { noShadow: true });
    });

    // 塔心正中央同心圆黄金祭坛 (y = 86.0, r = 4.5m)
    for (let i = 0; i < 4; i++) {
      const stepR = 4.2 - i * 0.85;
      batch.add('cylinder', i === 3 ? mats.sacredGold : mats.alabaster, cx, 86.2 + i * 0.28, cz, stepR, 0.28, stepR, 0, { isTowerShell: true });
    }
    // 四角圣火铜鼎
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const fx = cx + Math.cos(a) * 3.2, fz = cz + Math.sin(a) * 3.2;
      batch.add('cylinder', mats.bronze, fx, 87.2, fz, 0.45, 1.1, 0.45, 0, { isTowerShell: true });
      batch.add('cone', mats.sacredGold, fx, 88.0, fz, 0.35, 0.85, 0.35, 0, { noShadow: true });
    }

    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe7a0, transparent: true, opacity: 0.055, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.6, 26, 32, 1, true), beamMat);
    beam.position.set(cx, 98, cz); beam.userData.noOcclusion = true; root.add(beam);
    // 深蓝星盘与旋转天球仪正居巴别塔顶（cx = 67, cz = -10, y = 92.0）
    const starDisc = new THREE.Mesh(new THREE.CircleGeometry(5.2, 64), new THREE.MeshBasicMaterial({ color: 0x07162e, transparent: true, opacity: 0.88, depthWrite: false }));
    starDisc.position.set(cx, 92.0, cz - 0.5); starDisc.userData.noOcclusion = true; root.add(starDisc);
    const starRandom = rng(1204), starPositions = [];
    for (let i = 0; i < 96; i++) {
      const a = starRandom() * Math.PI * 2, r = Math.sqrt(starRandom()) * 4.85;
      starPositions.push(cx + Math.cos(a) * r, 92.0 + Math.sin(a) * r, cz - 0.45);
    }
    const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffe8ae, size: 0.085, transparent: true, opacity: 0.9, depthWrite: false }));
    stars.userData.noOcclusion = true; root.add(stars);
    const rings = new THREE.Group(); rings.position.set(cx, 92.0, cz); rings.userData.noOcclusion = true;
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95 + i * 0.55, 0.045 + i * 0.012, 8, 64), i === 1 ? mats.turquoise : mats.sacredGold);
      ring.rotation.set(i * 0.65, i * 0.45, i * 0.8); rings.add(ring);
    }
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 12), mats.sacredGold); rings.add(sun); root.add(rings);
    if (OW.game && OW.game.anim) OW.game.anim.push({ update: dt => { rings.rotation.y += dt * 0.12; rings.children[0].rotation.z += dt * 0.16; beam.material.opacity = 0.05 + Math.sin(OW.game.time * 1.3) * 0.012; } });
    const sanctus = new THREE.PointLight(0xffd98a, 0.85, 36, 2); sanctus.position.set(cx, 90, cz + 4); root.add(sanctus);
  }

  // ════════════════ 绿洲茂密植被与沙海跋涉奇观 ════════════════
  function buildOasisAndDesertTrek(root, batch, mats) {
    const random = rng(20261104);

    // ─────────────────────────────────────────────────────────────
    // 1. 绿洲泉眼群落与茂密椰枣林 (x: -155 到 -105, z: -35 到 35)
    // ─────────────────────────────────────────────────────────────

    // 绿洲主泉水潭碧波 (Turquoise Spring Pool) 与鹅卵石环岸
    plane(root, 22.0, 16.0, mats.water, -125.0, 0.05, 1.8, { isGround: true, isWalkway: true });
    plane(root, 24.5, 18.5, mats.curb, -125.0, 0.03, 1.8, { isGround: true, isWalkway: true });

    // 绿洲分流灌溉水渠 (Irrigation Canals branching through the palms)
    plane(root, 4.5, 36.0, mats.water, -135.0, 0.04, 0, { isGround: true });
    plane(root, 34.0, 3.2, mats.water, -125.0, 0.04, -18.0, { isGround: true });

    // 48+ 棵葱郁高耸的海枣椰树林 (Tall Majestic Date Palms)
    // 密集围绕泉池、水渠与集市分布，树皮粗糙、羽叶舒展、下悬累累金红海枣果串
    for (let i = 0; i < 48; i++) {
      const px = -152 + random() * 48;
      const pz = -32 + random() * 64;
      // 保护主行进主道（|z| < 2.5 且 x 在主要走廊上）
      if (Math.abs(pz) < 2.6 && px > -140 && px < -105) continue;
      // 避开泉池深水核心
      if (Math.abs(px - (-125)) < 7.5 && Math.abs(pz - 1.8) < 5.5) continue;

      const trunkH = 5.2 + random() * 3.6;
      const leanAngle = (random() - 0.5) * 0.16;
      // 树干：使用圆柱体，天然树皮质感
      batch.add('cylinder', mats.cedar, px, trunkH / 2, pz, 0.28, trunkH, 0.28, leanAngle);

      // 放射状下垂海枣树冠羽状复叶 (8~10 片向四周延展下垂的长叶)
      const frondCount = 9;
      for (let f = 0; f < frondCount; f++) {
        const fa = (f / frondCount) * Math.PI * 2 + random() * 0.25;
        const fx = px + Math.sin(fa) * 1.5;
        const fz = pz + Math.cos(fa) * 1.5;
        batch.add('box', mats.leaf, fx, trunkH + 0.12, fz, 0.38, 0.08, 3.2, fa);
      }
      // 树冠下方悬挂沉甸甸的金色/蜜褐色海枣串 (Golden Ripe Date Bunches)
      for (let b = 0; b < 3; b++) {
        const ba = (b / 3) * Math.PI * 2 + 0.35;
        batch.add('box', mats.sacredGold, px + Math.sin(ba) * 0.65, trunkH - 0.35, pz + Math.cos(ba) * 0.65, 0.45, 0.55, 0.45, ba);
      }
    }

    // 60+ 丛泉边密集水生芦苇与水葱 (Dense Cattail & Reed Beds)
    for (let i = 0; i < 60; i++) {
      const rx = -138 + random() * 26;
      const rz = -8 + random() * 20;
      if (Math.abs(rx - (-125)) > 12.0 || Math.abs(rz - 1.8) > 9.5) continue;
      const rH = 1.3 + random() * 0.9;
      batch.add('cylinder', mats.leaf, rx, rH / 2, rz, 0.05, rH, 0.05, random() * Math.PI);
      // 棕色芦花毛棒 (Cattail spike)
      batch.add('cylinder', mats.wood, rx, rH + 0.15, rz, 0.09, 0.42, 0.09, 0);
    }

    // 16+ 株平顶伞房金合欢树与柽柳灌木 (Umbrella Acacias & Flowering Tamarisks)
    for (let i = 0; i < 16; i++) {
      const ax = -148 + random() * 45;
      const az = (random() > 0.5 ? 1 : -1) * (14 + random() * 18);
      const th = 4.2 + random() * 2.2;
      batch.add('cylinder', mats.wood, ax, th / 2, az, 0.22, th, 0.22, 0);
      // 金合欢标志性三层扁平绿伞树冠 (Layered Umbrella Canopy)
      batch.add('box', mats.leaf, ax, th, az, 4.2, 0.28, 3.8, random());
      batch.add('box', mats.leaf, ax + 0.4, th + 0.35, az - 0.3, 2.8, 0.24, 2.6, random());
    }

    // 绿洲梯田大麦农田 (Barley Fields with Terraces)
    plane(root, 14.0, 9.0, mats.gold, -135.0, 0.06, -10.0, { isGround: true });
    plane(root, 12.0, 8.0, mats.gold, -134.0, 0.06, 14.0, { isGround: true });

    // ─────────────────────────────────────────────────────────────
    // 2. 穿越百米荒原沙漠盛景 (x: -105 到 25, 跋涉 130 米浩瀚沙海)
    // ─────────────────────────────────────────────────────────────

    // 连绵起伏的金黄色半球体自然沙丘 (Natural Undulating Barchan Sand Dunes)
    // 彻底告别尖锐圆锥金字塔！全部采用柔和半球体沙丘，展现自然月牙沙海的优美风蚀流线！
    const duneConfigs = [
      // 南侧大沙丘群 (z: 16 ~ 42)
      { x: -142, z: 28, sx: 32, sy: 5.5, sz: 24, mat: mats.sand },
      { x: -115, z: 32, sx: 38, sy: 6.2, sz: 28, mat: mats.sand },
      { x: -88, z: 26, sx: 34, sy: 5.8, sz: 25, mat: mats.adobeLight },
      { x: -62, z: 34, sx: 42, sy: 6.5, sz: 30, mat: mats.sand },
      { x: -35, z: 25, sx: 36, sy: 5.2, sz: 26, mat: mats.sand },
      { x: -8, z: 30, sx: 40, sy: 6.0, sz: 28, mat: mats.adobeLight },
      { x: 18, z: 26, sx: 35, sy: 4.8, sz: 22, mat: mats.sand },

      // 北侧大沙丘群 (z: -40 ~ -80)
      { x: -150, z: -55, sx: 45, sy: 7.2, sz: 35, mat: mats.sand },
      { x: -118, z: -62, sx: 48, sy: 7.5, sz: 38, mat: mats.adobeLight },
      { x: -85, z: -50, sx: 40, sy: 6.8, sz: 32, mat: mats.sand },
      { x: -55, z: -58, sx: 44, sy: 7.0, sz: 34, mat: mats.sand },
      { x: -25, z: -48, sx: 38, sy: 6.2, sz: 30, mat: mats.adobeLight },
      { x: 5, z: -52, sx: 42, sy: 6.5, sz: 32, mat: mats.sand },
      { x: 35, z: -45, sx: 36, sy: 5.5, sz: 28, mat: mats.sand },

      // 近景低缓波浪起伏沙垄 (z: -16 ~ -28 与 10 ~ 18)
      { x: -98, z: -20, sx: 24, sy: 2.8, sz: 16, mat: mats.sand },
      { x: -75, z: 12, sx: 22, sy: 2.5, sz: 15, mat: mats.adobeLight },
      { x: -48, z: -22, sx: 26, sy: 3.0, sz: 18, mat: mats.sand },
      { x: -22, z: 14, sx: 24, sy: 2.6, sz: 16, mat: mats.sand }
    ];

    duneConfigs.forEach(d => {
      // dome 几何体自带顶部平滑球冠与底部平切，缩放后即为完美的自然月牙沙丘！
      batch.add('dome', d.mat, d.x, 0, d.z, d.sx, d.sy, d.sz, 0, { noShadow: true });
    });

    // 风蚀红砂岩雅丹石堡与峡谷阶地 (Weathered Sandstone Mesas & Bluffs)
    const mesas = [
      { x: -92, z: -35, w: 18, h: 4.8, d: 14 },
      { x: -68, z: 24, w: 22, h: 5.5, d: 16 },
      { x: -42, z: -32, w: 16, h: 4.2, d: 12 },
      { x: -14, z: 22, w: 20, h: 5.0, d: 15 }
    ];
    mesas.forEach(m => {
      // 基层厚重风蚀砂岩
      batch.add('box', mats.stoneDark, m.x, m.h * 0.35, m.z, m.w, m.h * 0.7, m.d, 0.1);
      // 上层阶梯风蚀台面
      batch.add('box', mats.stone, m.x + 0.5, m.h * 0.85, m.z - 0.5, m.w * 0.75, m.h * 0.3, m.d * 0.75, 0.15);
    });

    // 丝路跋涉商道向导石堆与经幡 (Silk Road Trail Cairns with Prayer Banners)
    const cairnX = [-92, -72, -52, -32, -12];
    cairnX.forEach((cx, idx) => {
      const cz = -1.8 + (idx % 2 ? 0.8 : -0.8);
      // 层叠阶石玛尼堆
      batch.add('box', mats.stone, cx, 0.25, cz, 1.4, 0.5, 1.4);
      batch.add('box', mats.stoneDark, cx, 0.65, cz, 1.0, 0.4, 1.0);
      batch.add('box', mats.stone, cx, 0.95, cz, 0.65, 0.3, 0.65);
      // 经幡立杆
      batch.add('cylinder', mats.wood, cx, 1.8, cz, 0.06, 2.2, 0.06, 0);
      // 丝路飘带红蓝金经幡
      const bannerMat = idx % 2 === 0 ? mats.cloth : (idx % 3 === 0 ? mats.lapis : mats.sacredGold);
      batch.add('box', bannerMat, cx + 0.28, 2.2, cz, 0.55, 0.32, 0.06, 0.2);
    });

    // 远古沧海巨兽白骨遗迹拱门 (Colossal Ancient Beast Rib Arches)
    // 矗立在沙漠腹地，见证两河流域千万年沧海桑田
    const ribSites = [-52.0, -72.0];
    ribSites.forEach(rx => {
      for (let r = 0; r < 5; r++) {
        const rz = -2.5 + r * 1.25;
        const ribScale = 2.4 + (r === 2 ? 0.6 : (r === 1 || r === 3 ? 0.3 : 0));
        // 半圆肋骨拱架 (arch)
        batch.add('arch', mats.alabaster, rx + (r - 2) * 0.65, 0.2, rz, ribScale, ribScale * 1.25, 0.8, Math.PI / 2);
      }
    });

    // 沙漠散落的骆驼刺与干燥沙生草丛 (Desert Shrubs & Tumbleweeds)
    for (let i = 0; i < 45; i++) {
      const sx = -105 + random() * 125;
      const sz = -15 + random() * 30;
      if (Math.abs(sz) < 1.2) continue; // 避开正中央走道
      const sw = 0.6 + random() * 0.7;
      batch.add('dome', mats.leaf, sx, 0, sz, sw, sw * 0.6, sw, random() * Math.PI, { noShadow: true });
    }
  }

  // ════════════════ 纵深远景与沙海天际线 ════════════════
  function buildFar(root, batch, mats) {
    // 北侧边界幼发拉底河岸与芦苇水域
    plane(root, 520, 24, mats.water, -20, -0.035, -96);
    plane(root, 520, 4.0, mats.curb, -20, -0.02, -84.0);

    const random = rng(711);

    // 远方雄浑沙海背景沙丘（柔和半球体 sand / adobeLight，无任何尖锥金字塔）
    for (let i = 0; i < 24; i++) {
      const x = -220 + i * 19 + random() * 8, z = -140 - random() * 60;
      const sx = 28 + random() * 36, sy = 6 + random() * 10, sz = 24 + random() * 30;
      batch.add('dome', i % 2 ? mats.sand : mats.adobeLight, x, 0, z, sx, sy, sz, random(), { noShadow: true });
    }

    // 远景两河平原古城低矮泥砖民居轮廓
    for (let i = 0; i < 60; i++) {
      const x = -160 + random() * 320, z = -96 - random() * 16;
      const h = 2 + random() * 4, w = 2.5 + random() * 4;
      batch.add('box', i % 3 ? mats.adobe : mats.stone, x, h / 2, z, w, h, w * 0.8, 0, { noShadow: true });
    }

    // 河岸远景棕榈林
    for (let i = 0; i < 38; i++) {
      const x = -135 + i * 7.0 + random() * 2, z = -88 - random() * 6, h = 4.5 + random() * 2.5;
      batch.add('cylinder', mats.wood, x, h / 2, z, 0.18, h, 0.18, 0, { noShadow: true });
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2;
        batch.add('box', mats.leaf, x + Math.sin(a) * 1.2, h, z + Math.cos(a) * 1.2, 0.35, 0.08, 2.8, a, { noShadow: true });
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
    buildOasisAndDesertTrek(root, batch, mats);
    buildFar(root, batch, mats);
    buildStreetDetails(batch, mats);
    OW.stats.instances = batch.finish();
    world.frontOccluders.length = 0;
    world.occlusionCandidates = [];
    world.root.traverse(o => {
      if (o.visible && o.isMesh && !o.userData.futureWalkway) {
        const u = o.userData;
        const isGround = u.isFloor || u.isGround || u.isWalkway || u.isRoad || u.isStep || u.isPlatform || u.isDeck || u.isBridge;
        if (!isGround && !u.noOcclusion && (u.isFrontOccluder || u.isTowerShell || u.isRoof || u.interiorId)) {
          world.occlusionCandidates.push(o);
          if (!o.isInstancedMesh) world.frontOccluders.push(o);
        }
      }
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

  // ── 巴别塔架构与层高全局配置 ──
  window.TOWER_CONFIG = {
    tierHeights: {
      ground: 0,
      tier1: 12.0,
      tier2: 32.0,
      tier3: 50.0,
      tier4: 68.0,
      sanctuary: 86.0
    },
    heightScale: 1.0,
    setHeightScale(scale) {
      const s = Math.max(0.7, Math.min(1.8, Number(scale) || 1.0));
      this.heightScale = s;
      if (window.DEV_PARAMS) window.DEV_PARAMS.towerHeightScale = s;
      if (OW.game && OW.game.world && OW.game.world.root) {
        OW.game.world.root.traverse(o => {
          if (o.userData && o.userData.isTowerShell && o.isMesh && !o.isInstancedMesh) {
            if (!o.userData._origScaleY) o.userData._origScaleY = o.scale.y;
            if (!o.userData._origPosY) o.userData._origPosY = o.position.y;
            o.scale.y = o.userData._origScaleY * s;
            o.position.y = o.userData._origPosY * s;
          }
        });
      }
      return s;
    }
  };

  OW.TOWER_CONFIG = window.TOWER_CONFIG;
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
