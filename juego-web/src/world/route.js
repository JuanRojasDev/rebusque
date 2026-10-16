import * as THREE from 'three';
import { heightAt } from './city.js';

function chevronTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 64, 64);
  x.fillStyle = 'rgba(246, 196, 0, 0.55)';
  x.fillRect(0, 8, 64, 48);
  x.strokeStyle = '#fff6c8';
  x.lineWidth = 9;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(20, 16);
  x.lineTo(40, 32);
  x.lineTo(20, 48);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Cinta con flechas animadas sobre el piso que marca la ruta del GPS. */
export function createRouteRibbon(scene) {
  const tex = chevronTexture();
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const geo = new THREE.BufferGeometry();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 4;
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  const W = 0.32;

  return {
    set(points) {
      if (!points || points.length < 2) {
        mesh.visible = false;
        return;
      }
      // remuestrea cada ~0,5 m para seguir el bordillo
      const pts = [];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.5));
        for (let k = 0; k < n; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
      }
      pts.push(points[points.length - 1]);
      const pos = [], uv = [], idx = [];
      let dist = 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const q = pts[Math.min(i + 1, pts.length - 1)];
        const o = pts[Math.max(i - 1, 0)];
        let dx = q.x - o.x, dz = q.z - o.z;
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        if (i > 0) dist += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
        const y = heightAt(p.x, p.z) + 0.03;
        pos.push(p.x - dz * W, y, p.z + dx * W, p.x + dz * W, y, p.z - dx * W);
        uv.push(dist / 0.9, 0, dist / 0.9, 1);
        if (i < pts.length - 1) {
          const j = i * 2;
          idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
        }
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeBoundingSphere();
      mesh.visible = true;
    },
    update(dt) {
      tex.offset.x -= dt * 1.4;
    },
  };
}
