import * as THREE from 'three';
import { CURB } from './city.js';
import * as T from './textures.js';

/** Bolsas de basura: geometría deformada, plástico mojado brillante. */
export function createBags(scene, spots) {
  const R = T.rng(99);
  const geos = [0, 1, 2].map((v) => {
    const g = new THREE.IcosahedronGeometry(0.36, 3);
    const p = g.attributes.position;
    const r = T.rng(11 + v);
    const bumps = Array.from({ length: 7 }, () => [new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), 0.05 + r() * 0.08]);
    const tmp = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      tmp.fromBufferAttribute(p, i);
      const n = tmp.clone().normalize();
      let d = 0;
      for (const [dir, amt] of bumps) d += Math.max(0, n.dot(dir)) ** 3 * amt;
      tmp.multiplyScalar(1 + d);
      if (tmp.y < -0.12) tmp.y = -0.12 - (tmp.y + 0.12) * 0.15; // asentada en el piso
      tmp.y *= 1.08;
      p.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    g.computeVertexNormals();
    return g;
  });
  const tex = T.trashBag(5);
  const mats = [
    new THREE.MeshPhysicalMaterial({ color: '#141518', map: tex.map, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1.6 }),
    new THREE.MeshPhysicalMaterial({ color: '#2a3d2f', roughness: 0.28, clearcoat: 0.6, envMapIntensity: 1.4 }),
    new THREE.MeshPhysicalMaterial({ color: '#b9bcc0', roughness: 0.35, clearcoat: 0.5, envMapIntensity: 1.2 }),
  ];
  const knotGeo = new THREE.ConeGeometry(0.06, 0.16, 6);
  const card = T.cardboard(21);
  const cardMat = new THREE.MeshStandardMaterial({ map: card.map, roughness: 0.92 });

  const bags = spots.map((s, i) => {
    const g = new THREE.Group();
    const n = 1 + Math.floor(R() * 2.2);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(geos[(i + k) % 3], mats[R() < 0.7 ? 0 : R() < 0.6 ? 1 : 2]);
      m.position.set((R() - 0.5) * 0.7, 0.36, (R() - 0.5) * 0.5);
      m.rotation.y = R() * Math.PI;
      const sc = 0.8 + R() * 0.4;
      m.scale.set(sc, sc * (0.85 + R() * 0.3), sc);
      m.castShadow = true;
      const knot = new THREE.Mesh(knotGeo, m.material);
      knot.position.y = 0.38;
      m.add(knot);
      g.add(m);
    }
    if (R() < 0.5) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.5), cardMat);
      c.position.set(0.35, 0.03, 0.2);
      c.rotation.y = R();
      g.add(c);
    }
    g.position.set(s.x, CURB, s.z);
    scene.add(g);
    return { x: s.x, z: s.z, group: g, active: R() < 0.7, respawnAt: 0 };
  });
  bags.forEach((b) => (b.group.visible = b.active));

  return {
    bags,
    take(bag, now) {
      bag.active = false;
      bag.group.visible = false;
      bag.respawnAt = now + 90 + Math.random() * 140;
    },
    update(now, player) {
      for (const b of bags) {
        if (b.active || now < b.respawnAt) continue;
        const d = Math.hypot(b.x - player.x, b.z - player.z);
        if (d > 18) {
          b.active = true;
          b.group.visible = true;
        }
      }
    },
    restore(list, now) {
      if (!Array.isArray(list)) return;
      bags.forEach((b, i) => {
        b.active = list[i] !== 0;
        b.group.visible = b.active;
        b.respawnAt = now + 60;
      });
    },
    serialize() {
      return bags.map((b) => (b.active ? 1 : 0));
    },
  };
}

/** El cambuche: aparece pieza por pieza bajo el viaducto. */
export function createCambuche(scene, spot) {
  const root = new THREE.Group();
  root.position.set(spot.x, CURB, spot.z);
  root.rotation.y = Math.PI * 0.08;
  scene.add(root);
  const card = T.cardboard(23);
  const cardMat = new THREE.MeshStandardMaterial({ map: card.map, roughness: 0.92 });
  const pieces = {};

  // basurita inicial que marca el sitio
  const marker = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6 + Math.random() * 0.4, 0.03, 0.5), cardMat);
    m.position.set((Math.random() - 0.5) * 1.4, 0.02 + i * 0.01, (Math.random() - 0.5) * 1);
    m.rotation.y = Math.random() * 3;
    marker.add(m);
  }
  root.add(marker);

  // base de cartón aplanado
  const base = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 2.1), cardMat);
    m.position.set(-0.9 + i * 0.88, 0.03, 0);
    m.rotation.y = (Math.random() - 0.5) * 0.08;
    m.receiveShadow = true;
    base.add(m);
  }
  pieces.base = base;

  // techo de lona azul sobre palos
  const techo = new THREE.Group();
  const stickMat = new THREE.MeshStandardMaterial({ color: '#4a3a28', roughness: 0.9 });
  for (const [x, z, h] of [[-1.5, -1.2, 1.7], [1.5, -1.2, 1.7], [-1.5, 1.2, 1.1], [1.5, 1.2, 1.1]]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, h, 6), stickMat);
    s.position.set(x, h / 2, z);
    s.castShadow = true;
    techo.add(s);
  }
  const tarpGeo = new THREE.PlaneGeometry(3.4, 2.8, 12, 10);
  const tp = tarpGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), y = tp.getY(i);
    tp.setZ(i, Math.sin((x / 3.4) * Math.PI) * 0.0 - Math.cos((x / 1.7) * Math.PI) * 0.05 - (1 - Math.abs(y) / 1.4) * 0.12);
  }
  tarpGeo.computeVertexNormals();
  const tarp = new THREE.Mesh(tarpGeo, new THREE.MeshStandardMaterial({ color: '#1f5fbf', roughness: 0.45, side: THREE.DoubleSide, envMapIntensity: 1.2 }));
  tarp.rotation.x = -Math.PI / 2 + 0.22;
  tarp.position.y = 1.45;
  tarp.castShadow = true;
  techo.add(tarp);
  pieces.techo = techo;

  // paredes de tablas
  const paredes = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.85 });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.2 + Math.random() * 0.3, 0.05), woodMat);
    p.position.set(-1.35 + i * 0.45, 0.62, -1.25);
    p.rotation.z = (Math.random() - 0.5) * 0.06;
    p.castShadow = true;
    paredes.add(p);
  }
  for (const x of [-1.55, 1.55]) {
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05 + Math.random() * 0.2, 0.5), woodMat);
      p.position.set(x, 0.55, -0.95 + i * 0.52);
      p.castShadow = true;
      paredes.add(p);
    }
  }
  pieces.paredes = paredes;

  // colchón manchado
  const cama = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 1.9), new THREE.MeshStandardMaterial({ color: '#9d9a86', roughness: 0.95 }));
  cama.position.set(-0.4, 0.13, 0);
  cama.castShadow = true;
  pieces.cama = cama;

  // fogón de latas con fuego
  const fogon = new THREE.Group();
  const canMat = new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: 0.85, roughness: 0.35 });
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), canMat);
    const a = (i / 5) * Math.PI * 2;
    c.position.set(Math.cos(a) * 0.18, 0.06, Math.sin(a) * 0.18);
    fogon.add(c);
  }
  const fireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a1a').multiplyScalar(4), transparent: true, opacity: 0.9 });
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 8), fireMat);
  fire.position.y = 0.2;
  fogon.add(fire);
  fogon.position.set(1.0, 0, 1.3);
  pieces.fogon = fogon;

  // vela y foto
  const vela = new THREE.Group();
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8), new THREE.MeshStandardMaterial({ color: '#f2eee0' }));
  candle.position.y = 0.06;
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc46b').multiplyScalar(5) }));
  flame.position.y = 0.15;
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshStandardMaterial({ color: '#d8c7a5', emissive: '#3a2a15', emissiveIntensity: 0.3 }));
  photo.position.set(0.12, 0.12, -0.02);
  photo.rotation.y = -0.4;
  vela.add(candle, flame, photo);
  vela.position.set(0.6, 0.06, -0.9);
  pieces.vela = vela;

  Object.values(pieces).forEach((p) => {
    p.visible = false;
    root.add(p);
  });

  return {
    root,
    set(built) {
      for (const [id, obj] of Object.entries(pieces)) obj.visible = !!built[id];
      marker.visible = !built.base;
    },
    update(t) {
      const f = 0.85 + Math.sin(t * 17) * 0.08 + Math.sin(t * 29) * 0.07;
      fire.scale.set(1, f * 1.1, 1);
      flame.scale.setScalar(0.9 + Math.sin(t * 11) * 0.1);
    },
  };
}
