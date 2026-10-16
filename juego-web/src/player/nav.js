import { BOUNDS } from '../world/city.js';

const CELL = 0.5;
const RADIUS = 0.38;

/** Rejilla de navegación + A* (8 vecinos) + suavizado por línea de visión. */
export function createNav(colliders) {
  const size = Math.ceil((BOUNDS * 2) / CELL) + 1;
  const blocked = new Uint8Array(size * size);
  const toCell = (v) => Math.round((v + BOUNDS) / CELL);
  const toWorld = (c) => c * CELL - BOUNDS;
  const idx = (x, z) => z * size + x;

  for (const c of colliders) {
    const x0 = Math.max(0, toCell(c.minX - RADIUS) - 1), x1 = Math.min(size - 1, toCell(c.maxX + RADIUS) + 1);
    const z0 = Math.max(0, toCell(c.minZ - RADIUS) - 1), z1 = Math.min(size - 1, toCell(c.maxZ + RADIUS) + 1);
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const wx = toWorld(x), wz = toWorld(z);
        if (wx > c.minX - RADIUS && wx < c.maxX + RADIUS && wz > c.minZ - RADIUS && wz < c.maxZ + RADIUS) blocked[idx(x, z)] = 1;
      }
    }
  }

  const free = (x, z) => x >= 0 && z >= 0 && x < size && z < size && !blocked[idx(x, z)];

  function nearestFree(cx, cz) {
    if (free(cx, cz)) return [cx, cz];
    for (let r = 1; r < 12; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (free(cx + dx, cz + dz)) return [cx + dx, cz + dz];
        }
      }
    }
    return null;
  }

  function lineFree(ax, az, bx, bz) {
    const dist = Math.hypot(bx - ax, bz - az);
    const steps = Math.ceil(dist / (CELL * 0.5));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!free(toCell(ax + (bx - ax) * t), toCell(az + (bz - az) * t))) return false;
    }
    return true;
  }

  // montículo binario para la lista abierta
  const g = new Float32Array(size * size);
  const from = new Int32Array(size * size);
  const seen = new Uint32Array(size * size);
  let stamp = 0;

  function find(sx, sz, tx, tz) {
    const s = nearestFree(toCell(sx), toCell(sz));
    const e = nearestFree(toCell(tx), toCell(tz));
    if (!s || !e) return null;
    if (lineFree(sx, sz, toWorld(e[0]), toWorld(e[1]))) return [{ x: toWorld(e[0]), z: toWorld(e[1]) }];
    stamp++;
    const heap = [];
    const push = (n, f) => {
      heap.push([f, n]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top[1];
    };
    const h = (x, z) => {
      const dx = Math.abs(x - e[0]), dz = Math.abs(z - e[1]);
      return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
    };
    const start = idx(s[0], s[1]);
    const goal = idx(e[0], e[1]);
    g[start] = 0;
    seen[start] = stamp;
    from[start] = -1;
    push(start, h(s[0], s[1]));
    let iter = 0;
    while (heap.length && iter++ < 60000) {
      const cur = pop();
      if (cur === goal) break;
      const cx = cur % size, cz = (cur / size) | 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz;
          if (!free(nx, nz)) continue;
          if (dx && dz && (!free(cx + dx, cz) || !free(cx, cz + dz))) continue;
          const n = idx(nx, nz);
          const cost = g[cur] + (dx && dz ? Math.SQRT2 : 1);
          if (seen[n] !== stamp || cost < g[n]) {
            seen[n] = stamp;
            g[n] = cost;
            from[n] = cur;
            push(n, cost + h(nx, nz));
          }
        }
      }
    }
    if (seen[goal] !== stamp) return null;
    const cells = [];
    for (let n = goal; n !== -1; n = from[n]) cells.push(n);
    cells.reverse();
    // suavizado: salta puntos con línea de visión
    const pts = cells.map((n) => ({ x: toWorld(n % size), z: toWorld((n / size) | 0) }));
    const out = [];
    let ax = sx, az = sz;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !lineFree(ax, az, pts[j].x, pts[j].z)) j--;
      out.push(pts[j]);
      ax = pts[j].x;
      az = pts[j].z;
      i = j + 1;
    }
    return out;
  }

  return { find, free: (x, z) => free(toCell(x), toCell(z)) };
}
