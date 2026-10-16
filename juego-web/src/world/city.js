import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { makeVehicle } from './vehicles.js';

// Trazado (metros). Avenida a lo largo de X, calle a lo largo de Z.
export const ROAD = 6; // medio ancho de calzada
export const WALK = 9; // borde exterior del andén
export const CURB = 0.15;
export const BOUNDS = 76;
export const VIADUCT = { minX: 43, maxX: 57, y: 7.4, top: 8.6 };
const PARK = { minX: -42, maxX: -22, minZ: -30, maxZ: -9.6 };

export const PLACES = {
  tienda: { x: -16, z: 8.0, r: 2.8 },
  recicladora: { x: 22, z: -8.0, r: 3.2 },
  pila: { x: -32, z: -17, r: 2.2 },
  cambuche: { x: 50, z: 17.5, r: 3.6 },
};

export function heightAt(x, z) {
  return Math.abs(z) < ROAD || Math.abs(x) < ROAD ? 0 : CURB;
}

export function underViaduct(x, z) {
  return x > VIADUCT.minX && x < VIADUCT.maxX && Math.abs(z) < 80;
}

const box = (minX, maxX, minZ, maxZ) => ({ minX, maxX, minZ, maxZ });

export function buildCity(scene, quality) {
  const colliders = [];
  const trashSpots = [];
  const lamps = [];
  const updaters = [];
  const facadeMats = [];
  const buildings = [];
  let facadeNight = -1;
  const pxPerM = quality.envSize >= 1 ? 30 : quality.envSize >= 0.6 ? 22 : 15;
  const R = T.rng(1987);

  // ---------- Suelo ----------
  const asphalt = T.asphalt(7, quality.envSize >= 0.6 ? 1024 : 512);
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphalt.map,
    roughnessMap: asphalt.roughnessMap,
    bumpMap: asphalt.bumpMap,
    bumpScale: 0.6,
    roughness: 1,
    metalness: 0.05,
    envMapIntensity: 1.25,
  });
  roadMat.userData.keep = true;
  for (const t of [asphalt.map, asphalt.roughnessMap, asphalt.bumpMap]) t.repeat.set(170 / 14, 1);
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(170, ROAD * 2), roadMat);
  avenue.rotation.x = -Math.PI / 2;
  avenue.receiveShadow = true;
  scene.add(avenue);

  const crossMat = roadMat.clone();
  crossMat.map = asphalt.map.clone();
  crossMat.roughnessMap = asphalt.roughnessMap.clone();
  crossMat.bumpMap = asphalt.bumpMap.clone();
  for (const t of [crossMat.map, crossMat.roughnessMap, crossMat.bumpMap]) {
    t.repeat.set(1, 79 / 12);
    t.needsUpdate = true;
  }
  for (const sz of [1, -1]) {
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(ROAD * 2, 79), crossMat);
    seg.rotation.x = -Math.PI / 2;
    seg.position.set(0, 0, sz * (ROAD + 79 / 2));
    seg.receiveShadow = true;
    scene.add(seg);
  }

  // andenes: cuatro losas por cuadrante, con bordillo
  const walk = T.sidewalk(11);
  const walkMat = new THREE.MeshStandardMaterial({ map: walk.map, bumpMap: walk.bumpMap, bumpScale: 0.4, roughness: 0.7, envMapIntensity: 0.8 });
  walk.map.repeat.set(20, 20);
  walk.bumpMap.repeat.set(20, 20);
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(80, CURB, 80), walkMat);
      slab.position.set(sx * (ROAD + 40), CURB / 2, sz * (ROAD + 40));
      slab.receiveShadow = true;
      scene.add(slab);
    }
  }

  // tierra bajo el viaducto y prado del parque
  const dirt = T.dirt(31);
  const dirtMat = new THREE.MeshStandardMaterial({ map: dirt.map, bumpMap: dirt.bumpMap, bumpScale: 0.8, roughness: 0.95 });
  dirt.map.repeat.set(3, 6);
  for (const sz of [1, -1]) {
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(VIADUCT.maxX - VIADUCT.minX, 62), dirtMat);
    lot.rotation.x = -Math.PI / 2;
    lot.position.set((VIADUCT.minX + VIADUCT.maxX) / 2, CURB + 0.004, sz * (WALK + 31.3));
    lot.receiveShadow = true;
    scene.add(lot);
  }
  const grassMat = new THREE.MeshStandardMaterial({ color: '#1f2a17', roughness: 0.95, map: dirt.map });
  const park = new THREE.Mesh(new THREE.PlaneGeometry(PARK.maxX - PARK.minX, PARK.maxZ - PARK.minZ - 0.6), grassMat);
  park.rotation.x = -Math.PI / 2;
  park.position.set((PARK.minX + PARK.maxX) / 2, CURB + 0.004, (PARK.minZ + PARK.maxZ - 0.6) / 2);
  park.receiveShadow = true;
  scene.add(park);

  // ---------- Marcas viales ----------
  const marks = [];
  const plane = (w, d, x, z) => {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate(x, 0.012, z);
    return g;
  };
  const yellow = [];
  for (let x = -85; x < 85; x += 1) {
    if (Math.abs(x) < WALK + 1) continue;
    yellow.push(plane(1, 0.12, x + 0.5, 0.16), plane(1, 0.12, x + 0.5, -0.16));
  }
  for (let z = -85; z < 85; z += 1) {
    if (Math.abs(z) < WALK + 1) continue;
    yellow.push(plane(0.12, 1, 0.16, z + 0.5), plane(0.12, 1, -0.16, z + 0.5));
  }
  // cebras y líneas de pare
  for (const s of [1, -1]) {
    for (let k = -ROAD + 0.5; k < ROAD; k += 1.1) {
      marks.push(plane(2.2, 0.55, s * 7.6, k + 0.25));
      marks.push(plane(0.55, 2.2, k + 0.25, s * 7.6));
    }
    marks.push(plane(0.4, ROAD, s * 9.6, -s * ROAD / 2));
    marks.push(plane(ROAD, 0.4, s * ROAD / 2, s * 9.6));
  }
  const markMat = new THREE.MeshStandardMaterial({ color: '#d9d9d2', roughness: 0.55, emissive: '#3a3a36', emissiveIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -2 });
  const yelMat = new THREE.MeshStandardMaterial({ color: '#e0a800', roughness: 0.55, emissive: '#3a2a00', emissiveIntensity: 0.3, polygonOffset: true, polygonOffsetFactor: -2 });
  scene.add(new THREE.Mesh(mergeGeometries(marks), markMat));
  scene.add(new THREE.Mesh(mergeGeometries(yellow), yelMat));

  // ---------- Edificios ----------
  const brick = T.brick(3);
  const roofMats = ['#5d6062', '#7b5b49', '#4f5c54', '#6b6460'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  const trimMat = new THREE.MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.85 });
  const ironMat = new THREE.MeshStandardMaterial({ color: '#23262a', roughness: 0.6 });
  const acMat = new THREE.MeshStandardMaterial({ color: '#b9bdbf', roughness: 0.5 });
  const tankMat = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.5 });
  const tankGeo = new THREE.CylinderGeometry(0.6, 0.55, 1.1, 16);
  const tanks = [];

  function building({ x0, x1, z0, z1, floors, front, seed, shopFront = true, special }) {
    const w = x1 - x0, d = z1 - z0, h = floors * 3;
    const frontW = front === 'x+' || front === 'x-' ? d : w;
    const fac = T.facade({ seed, width: frontW, floors, pxPerM, shopFront });
    const facMat = new THREE.MeshStandardMaterial({
      map: fac.map,
      emissiveMap: fac.emissiveMap,
      emissive: '#ffffff',
      emissiveIntensity: 1.3,
      roughness: 0.82,
      envMapIntensity: 0.5,
    });
    facadeMats.push(facMat);
    const sideW = front === 'x+' || front === 'x-' ? w : d;
    const bMap = brick.map.clone();
    bMap.repeat.set(sideW / 8, h / 8);
    bMap.needsUpdate = true;
    const sideMat = new THREE.MeshStandardMaterial({ map: bMap, roughness: 0.9 });
    // orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z
    const roofMat = roofMats[Math.floor(R() * roofMats.length)];
    const mats = [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat];
    const faceIndex = { 'x+': 0, 'x-': 1, 'z+': 4, 'z-': 5 }[front];
    mats[faceIndex] = facMat;
    const opposite = { 0: 1, 1: 0, 4: 5, 5: 4 }[faceIndex];
    mats[opposite] = facMat;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    mesh.position.set((x0 + x1) / 2, CURB + h / 2, (z0 + z1) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    colliders.push(box(x0, x1, z0, z1));
    buildings.push({ mesh, minX: x0, maxX: x1, minZ: z0, maxZ: z1, h, cut: 1 });
    addTrims(mesh, { w, d, h, floors, front, special });
    // tanques de agua en la terraza
    const nt = 0;
    for (let i = 0; i < nt; i++) {
      tanks.push(new THREE.Vector3(x0 + 1 + R() * (w - 2), CURB + h + 0.55, z0 + 1 + R() * (d - 2)));
    }
    // basura frente a la fachada
    if (!special && R() < 0.75) {
      const off = 0.9;
      const along = 0.15 + R() * 0.7;
      let p;
      if (front === 'z-') p = [x0 + w * along, z0 - off];
      else if (front === 'z+') p = [x0 + w * along, z1 + off];
      else if (front === 'x+') p = [x1 + off, z0 + d * along];
      else p = [x0 - off, z0 + d * along];
      trashSpots.push({ x: p[0], z: p[1] });
    }
    return mesh;
  }

  function addTrims(mesh, { w, d, h, floors, front, special }) {
    const light = [], dark = [], ac = [];
    const bx = (arr, sx, sy, sz, x, y, z) => {
      const g = new THREE.BoxGeometry(sx, sy, sz);
      g.translate(x, y, z);
      arr.push(g);
    };
    // parapeto de la terraza y cornisa
    const top = h / 2;
    bx(light, w + 0.1, 0.55, 0.22, 0, top + 0.27, d / 2 - 0.11);
    bx(light, w + 0.1, 0.55, 0.22, 0, top + 0.27, -d / 2 + 0.11);
    bx(light, 0.22, 0.55, d, w / 2 - 0.11, top + 0.27, 0);
    bx(light, 0.22, 0.55, d, -w / 2 + 0.11, top + 0.27, 0);
    // frente: eje normal (n) y tangente (t)
    const fx = front === 'x+' ? 1 : front === 'x-' ? -1 : 0;
    const fz = front === 'z+' ? 1 : front === 'z-' ? -1 : 0;
    const halfN = fx ? w / 2 : d / 2;
    const along = fx ? d : w;
    const put = (arr, alongLen, sy, out, a, y) => {
      if (fx) bx(arr, out, sy, alongLen, fx * (halfN + out / 2), y, a);
      else bx(arr, alongLen, sy, out, a, y, fz * (halfN + out / 2));
    };
    for (let f = 1; f < floors; f++) put(light, along + 0.05, 0.14, 0.12, 0, -h / 2 + f * 3, );
    if (!special) {
      for (let f = 1; f < floors; f++) {
        const n = Math.max(1, Math.round(along / 4.5));
        for (let k = 0; k < n; k++) {
          const a = -along / 2 + (k + 0.5) * (along / n);
          const r = R();
          if (r < 0.28) {
            // balcón con baranda
            put(light, 2.2, 0.12, 0.85, a, -h / 2 + f * 3 + 0.06);
            put(dark, 2.2, 0.85, 0.05, a, -h / 2 + f * 3 + 0.5);
          } else if (r < 0.48) {
            // aire acondicionado bajo la ventana
            put(ac, 0.7, 0.45, 0.42, a + 0.6, -h / 2 + f * 3 + 0.7);
          }
        }
      }
    }
    const merged = [[light, trimMat], [dark, ironMat], [ac, acMat]];
    for (const [arr, m] of merged) {
      if (!arr.length) continue;
      const mm = new THREE.Mesh(mergeGeometries(arr), m);
      mm.castShadow = true;
      mm.receiveShadow = true;
      mesh.add(mm);
    }
  }

  // fila de edificios entre a y b sobre un eje
  function row({ from, to, side, axis, special = [] }) {
    let p = from;
    let seed = Math.floor(R() * 1e6);
    while (p < to - 4) {
      let w = 7 + R() * 6;
      if (p + w > to) w = to - p;
      const sp = special.find((s) => s.at >= p - 0.5 && s.at < p + w);
      const truncated = !!sp;
      if (sp) {
        // deja un hueco para el lugar especial
        const gap = sp.at - p;
        if (gap > 4) {
          w = gap;
        } else {
          sp.build();
          p = sp.at + sp.w;
          continue;
        }
      }
      const depth = 10 + R() * 5;
      const floors = 2 + Math.floor(R() * 3);
      seed += 97;
      if (axis === 'x') {
        const z0 = side > 0 ? WALK + 0.6 : -(WALK + 0.6) - depth;
        building({ x0: p, x1: p + w, z0, z1: z0 + depth, floors, front: side > 0 ? 'z-' : 'z+', seed });
      } else {
        const x0 = side > 0 ? WALK + 0.6 : -(WALK + 0.6) - depth;
        building({ x0, x1: x0 + depth, z0: p, z1: p + w, floors, front: side > 0 ? 'x-' : 'x+', seed });
      }
      // callejón ocasional
      const alley = !truncated && R() < 0.25 ? 2.4 : 0;
      if (alley) {
        const mid = p + w + alley / 2;
        if (axis === 'x') trashSpots.push({ x: mid, z: side * (WALK + 2.5) });
        else trashSpots.push({ x: side * (WALK + 2.5), z: mid });
      }
      p += w + alley;
    }
  }

  const specialTienda = {
    at: -24, w: 13,
    build: () => buildTienda(),
  };
  const specialRecicladora = {
    at: 14, w: 17,
    build: () => buildRecicladora(),
  };

  row({ from: -76, to: -9.6, side: 1, axis: 'x', special: [specialTienda] });
  row({ from: 9.6, to: VIADUCT.minX - 0.5, side: 1, axis: 'x' });
  row({ from: VIADUCT.maxX + 0.5, to: 76, side: 1, axis: 'x' });
  row({ from: -76, to: PARK.minX - 0.5, side: -1, axis: 'x' });
  row({ from: PARK.maxX + 0.5, to: -9.6, side: -1, axis: 'x' });
  row({ from: 9.6, to: VIADUCT.minX - 0.5, side: -1, axis: 'x', special: [specialRecicladora] });
  row({ from: VIADUCT.maxX + 0.5, to: 76, side: -1, axis: 'x' });
  for (const side of [1, -1]) {
    row({ from: 26, to: 76, side, axis: 'z' });
    row({ from: -76, to: -26, side, axis: 'z' });
  }

  const tankMesh = new THREE.InstancedMesh(tankGeo, tankMat, tanks.length);
  tanks.forEach((p, i) => tankMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
  tankMesh.castShadow = true;
  scene.add(tankMesh);

  // ---------- Tienda La Esquinita ----------
  function buildTienda() {
    const x0 = -24, x1 = -11, z0 = WALK + 0.6, z1 = z0 + 12;
    building({ x0, x1, z0, z1, floors: 2, front: 'z-', seed: 4242, shopFront: false, special: true });
    // local abierto
    const interior = new THREE.Mesh(
      new THREE.BoxGeometry(8, 2.6, 0.3),
      new THREE.MeshStandardMaterial({ map: shelvesTexture(), emissive: '#ffffff', emissiveMap: shelvesTexture(), emissiveIntensity: 0.45, roughness: 0.6 }),
    );
    interior.position.set(-17.5, CURB + 1.4, z0 - 0.16);
    scene.add(interior);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 1.5),
      new THREE.MeshStandardMaterial({ map: T.lightbox({ title: 'TIENDA LA ESQUINITA', sub: 'CERVEZA FRÍA · MINUTOS · RECARGAS · EMPANADAS', bg: '#c4161c' }), emissive: '#ffffff', emissiveIntensity: 0.9 }),
    );
    sign.material.emissiveMap = sign.material.map;
    sign.position.set(-17.5, CURB + 3.4, z0 - 0.35);
    sign.rotation.y = Math.PI;
    scene.add(sign);
    addAwning(-17.5, z0 - 1.1, 8.6, Math.PI, ['#c4161c', '#f2efe6']);
    // sillas plásticas
    const chairMat = new THREE.MeshStandardMaterial({ color: '#e9e7df', roughness: 0.45 });
    for (let i = 0; i < 3; i++) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), chairMat);
      ch.position.set(-21.4 + i * 0.75, CURB + 0.22, z0 - 1.6);
      ch.rotation.y = R() * 0.6;
      ch.castShadow = true;
      scene.add(ch);
    }
    const warm = new THREE.PointLight('#ffd7a0', 12, 12, 2);
    warm.position.set(-17.5, CURB + 2.4, z0 - 1.6);
    scene.add(warm);
    trashSpots.push({ x: -11.5, z: z0 - 0.9 }, { x: -24.5, z: z0 - 1 });
  }

  // ---------- Recicladora El Progreso ----------
  function buildRecicladora() {
    const x0 = 14, x1 = 31, z1 = -(WALK + 0.6), z0 = z1 - 15;
    const h = 6.5;
    const shellMat = new THREE.MeshStandardMaterial({ color: '#5c6166', roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });
    // galpón con lámina
    const back = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, 0.3), shellMat);
    back.position.set((x0 + x1) / 2, CURB + h / 2, z0);
    scene.add(back);
    for (const x of [x0, x1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, z1 - z0), shellMat);
      wall.position.set(x, CURB + h / 2, (z0 + z1) / 2);
      wall.castShadow = true;
      scene.add(wall);
    }
    const front1 = new THREE.Mesh(new THREE.BoxGeometry(4, h, 0.3), shellMat);
    front1.position.set(x0 + 2, CURB + h / 2, z1);
    const front2 = front1.clone();
    front2.position.x = x1 - 2;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 8, 2, 0.3), shellMat);
    lintel.position.set((x0 + x1) / 2, CURB + h - 1, z1);
    scene.add(front1, front2, lintel);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.6, 0.2, z1 - z0 + 0.6), shellMat);
    roof.position.set((x0 + x1) / 2, CURB + h, (z0 + z1) / 2);
    roof.castShadow = true;
    scene.add(roof);
    colliders.push(box(x0 - 0.2, x0 + 0.2, z0, z1), box(x1 - 0.2, x1 + 0.2, z0, z1), box(x0, x1, z0 - 0.2, z0 + 0.2));
    colliders.push(box(x0, x0 + 4, z1 - 0.2, z1 + 0.2), box(x1 - 4, x1, z1 - 0.2, z1 + 0.2));
    // pacas de cartón y costales
    const card = T.cardboard(21);
    const baleMat = new THREE.MeshStandardMaterial({ map: card.map, roughness: 0.9 });
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1), baleMat);
      const bx = x0 + 1.5 + (i % 7) * 1.5, bz = z0 + 1.2 + Math.floor(i / 7) * 1.3;
      b.position.set(bx, CURB + 0.5 + (i % 3 === 0 ? 1 : 0), bz);
      b.rotation.y = (R() - 0.5) * 0.2;
      b.castShadow = true;
      scene.add(b);
    }
    colliders.push(box(x0 + 0.5, x1 - 4, z0, z0 + 3));
    // báscula
    const scale = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.6), new THREE.MeshStandardMaterial({ color: '#30353a', metalness: 0.8, roughness: 0.3 }));
    scale.position.set(22.5, CURB + 0.06, z1 - 3);
    scene.add(scale);
    // tubos fluorescentes
    const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6fbff').multiplyScalar(2.2) });
    for (const tx of [18, 22.5, 27]) {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), tubeMat);
      tube.position.set(tx, CURB + h - 0.4, (z0 + z1) / 2);
      scene.add(tube);
    }
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 1.8),
      new THREE.MeshStandardMaterial({ map: T.lightbox({ title: 'RECICLADORA EL PROGRESO', sub: 'COMPRAMOS CARTÓN · PLÁSTICO · LATA · CHATARRA · COBRE' }), emissive: '#ffffff', emissiveIntensity: 0.9 }),
    );
    sign.material.emissiveMap = sign.material.map;
    sign.position.set(22.5, CURB + h + 1.1, z1 + 0.2);
    scene.add(sign);
    const signPost = new THREE.Mesh(new THREE.BoxGeometry(10.2, 2, 0.2), new THREE.MeshStandardMaterial({ color: '#202327' }));
    signPost.position.set(22.5, CURB + h + 1.1, z1 + 0.05);
    scene.add(signPost);
  }

  function addAwning(cx, cz, w, ry, colors) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const x = c.getContext('2d');
    for (let i = 0; i < 16; i++) {
      x.fillStyle = colors[i % 2];
      x.fillRect(i * 16, 0, 16, 64);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.6), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.7 }));
    aw.position.set(cx, CURB + 2.75, cz);
    aw.rotation.set(-Math.PI / 2 + 0.38, ry, 0, 'YXZ');
    aw.castShadow = true;
    scene.add(aw);
  }

  // ---------- Viaducto ----------
  const conc = T.concrete(41);
  const concMat = new THREE.MeshStandardMaterial({ map: conc.map, bumpMap: conc.bumpMap, bumpScale: 0.5, roughness: 0.92 });
  conc.map.repeat.set(1, 1);
  const deckMat = new THREE.MeshStandardMaterial({ color: '#4a4945', roughness: 0.95 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(VIADUCT.maxX - VIADUCT.minX, VIADUCT.top - VIADUCT.y, 170), deckMat);
  deck.position.set((VIADUCT.minX + VIADUCT.maxX) / 2, (VIADUCT.y + VIADUCT.top) / 2, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  scene.add(deck);
  const deckParts = [deck];
  for (const x of [VIADUCT.minX, VIADUCT.maxX]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 170), concMat);
    rail.position.set(x, VIADUCT.top + 0.5, 0);
    scene.add(rail);
    deckParts.push(rail);
  }
  for (let z = -74; z <= 74; z += 16) {
    if (Math.abs(z) < WALK + 1) continue;
    for (const x of [45.5, 54.5]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.4, VIADUCT.y, 1.4), concMat);
      col.position.set(x, VIADUCT.y / 2, z);
      col.castShadow = true;
      col.receiveShadow = true;
      scene.add(col);
      colliders.push(box(x - 0.75, x + 0.75, z - 0.75, z + 0.75));
    }
  }
  // lámparas bajo el viaducto (una dañada)
  for (const z of [16, 34]) {
    lamps.push({ pos: new THREE.Vector3(50, VIADUCT.y - 0.3, z), broken: z === 34, flicker: z === 16 ? 0.4 : 0, under: true });
  }
  trashSpots.push({ x: 47, z: 24 }, { x: 53, z: 12.5 }, { x: 48, z: -14 }, { x: 52, z: -22 });

  // ---------- Parque y pila pública ----------
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#2b2118', roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#16241a', roughness: 0.85 });
  for (const [tx, tz] of [[-38, -14], [-26, -24], [-37, -26], [-28, -13]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 4, 8), trunkMat);
    trunk.position.set(tx, CURB + 2, tz);
    trunk.castShadow = true;
    scene.add(trunk);
    for (let k = 0; k < 3; k++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + R(), 1), leafMat);
      leaf.position.set(tx + (R() - 0.5) * 1.8, CURB + 4.4 + R() * 1.4, tz + (R() - 0.5) * 1.8);
      leaf.castShadow = true;
      scene.add(leaf);
    }
    colliders.push(box(tx - 0.35, tx + 0.35, tz - 0.35, tz + 0.35));
  }
  const benchMat = new THREE.MeshStandardMaterial({ color: '#5b3b23', roughness: 0.8 });
  for (const [bx, bz, ry] of [[-34, -11.6, 0], [-24, -18, Math.PI / 2]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.6), benchMat);
    b.position.set(bx, CURB + 0.25, bz);
    b.rotation.y = ry;
    b.castShadow = true;
    scene.add(b);
    colliders.push(ry ? box(bx - 0.3, bx + 0.3, bz - 1, bz + 1) : box(bx - 1, bx + 1, bz - 0.3, bz + 0.3));
  }
  const pila = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1), concMat);
  basin.position.y = 0.4;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), new THREE.MeshStandardMaterial({ color: '#8a9096', metalness: 0.9, roughness: 0.3 }));
  pipe.position.set(0, 1.2, -0.35);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshStandardMaterial({ color: '#0d1a22', roughness: 0.02, metalness: 0.2 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.78;
  pila.add(basin, pipe, water);
  pila.position.set(PLACES.pila.x, CURB, PLACES.pila.z - 1.2);
  scene.add(pila);
  colliders.push(box(PLACES.pila.x - 0.75, PLACES.pila.x + 0.75, PLACES.pila.z - 1.75, PLACES.pila.z - 0.65));
  trashSpots.push({ x: -40, z: -20 }, { x: -23.5, z: -28 });

  // ---------- Postes de luz (instanciados) ----------
  for (let x = -70; x <= 72; x += 16) {
    if (Math.abs(x) < 12 || (x > VIADUCT.minX - 2 && x < VIADUCT.maxX + 2)) continue;
    lamps.push({ pos: new THREE.Vector3(x, 7, 5.2), pole: new THREE.Vector3(x, 0, 6.7) });
    lamps.push({ pos: new THREE.Vector3(x + 8, 7, -5.2), pole: new THREE.Vector3(x + 8, 0, -6.7) });
  }
  for (let z = -70; z <= 72; z += 16) {
    if (Math.abs(z) < 12) continue;
    lamps.push({ pos: new THREE.Vector3(5.2, 7, z), pole: new THREE.Vector3(6.7, 0, z) });
    lamps.push({ pos: new THREE.Vector3(-5.2, 7, z + 8), pole: new THREE.Vector3(-6.7, 0, z + 8) });
  }
  lamps.push({ pos: new THREE.Vector3(-32, 5, -21), pole: new THREE.Vector3(-32, CURB, -21), park: true });
  lamps.forEach((l, i) => {
    if (l.broken === undefined) l.broken = R() < 0.08;
    if (l.flicker === undefined) l.flicker = !l.broken && R() < 0.1 ? 0.5 + R() * 0.5 : 0;
    l.phase = R() * 100;
    l.index = i;
  });

  const poleLamps = lamps.filter((l) => l.pole);
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 1, 8);
  poleGeo.translate(0, 0.5, 0);
  const poleMat = new THREE.MeshStandardMaterial({ color: '#3d4247', metalness: 0.6, roughness: 0.5 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, poleLamps.length * 2);
  const headGeo = new THREE.BoxGeometry(0.9, 0.18, 0.36);
  const heads = new THREE.InstancedMesh(headGeo, poleMat, lamps.length);
  const bulbGeo = new THREE.BoxGeometry(0.62, 0.05, 0.24);
  const bulbs = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), lamps.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  let pi = 0;
  poleLamps.forEach((l) => {
    const h = l.pos.y - l.pole.y;
    m4.compose(l.pole, q.identity(), v.set(1, h, 1));
    poles.setMatrixAt(pi++, m4);
    // brazo
    const dir = new THREE.Vector3(l.pos.x - l.pole.x, 0, l.pos.z - l.pole.z);
    const len = dir.length();
    if (len > 0.01) {
      const mid = new THREE.Vector3((l.pos.x + l.pole.x) / 2, l.pos.y + 0.05, (l.pos.z + l.pole.z) / 2);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      m4.compose(mid.sub(dir.clone().multiplyScalar(0.5)), quat, v.set(0.6, len, 0.6));
      poles.setMatrixAt(pi++, m4);
    } else {
      m4.makeScale(0, 0, 0);
      poles.setMatrixAt(pi++, m4);
    }
    colliders.push(box(l.pole.x - 0.2, l.pole.x + 0.2, l.pole.z - 0.2, l.pole.z + 0.2));
  });
  poles.count = pi;
  const bulbColor = new THREE.Color();
  lamps.forEach((l, i) => {
    const yaw = l.pole ? Math.atan2(-(l.pos.z - l.pole.z), l.pos.x - l.pole.x) : 0;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    m4.compose(l.pos, q, v.set(1, 1, 1));
    heads.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(l.pos.x, l.pos.y - 0.1, l.pos.z), q, v.set(1, 1, 1));
    bulbs.setMatrixAt(i, m4);
    bulbs.setColorAt(i, l.broken ? bulbColor.set('#1a1a1a') : bulbColor.set('#ffb35a').multiplyScalar(4));
  });
  poles.castShadow = true;
  scene.add(poles, heads, bulbs);

  // conos de luz volumétrica bajo cada farol
  const coneH = 6.6;
  const coneGeo = new THREE.ConeGeometry(3.1, coneH, 28, 1, true);
  coneGeo.translate(0, -coneH / 2, 0);
  const coneMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color('#ffa64d') }, uStrength: { value: 0.18 }, uNight: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aIntensity;
      varying float vI;
      varying float vH;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vI = aIntensity;
        vH = -position.y / ${coneH.toFixed(1)};
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength, uNight;
      varying float vI;
      varying float vH;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float edge = pow(1.0 - abs(dot(vN, vV)), 1.6);
        float soft = 1.0 - edge;
        float fall = pow(1.0 - vH, 1.7) * smoothstep(0.0, 0.08, vH);
        float a = fall * soft * vI * uStrength * uNight;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, lamps.length);
  const intensity = new Float32Array(lamps.length);
  lamps.forEach((l, i) => {
    m4.makeTranslation(l.pos.x, l.pos.y - 0.12, l.pos.z);
    cones.setMatrixAt(i, m4);
    intensity[i] = l.broken ? 0 : 1;
  });
  const intensityAttr = new THREE.InstancedBufferAttribute(intensity, 1);
  coneGeo.setAttribute('aIntensity', intensityAttr);
  cones.frustumCulled = false;
  cones.renderOrder = 3;
  scene.add(cones);

  // ---------- Cables de luz y teléfono ----------
  const cableGeos = [];
  const sag = (a, b, s) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      p.y -= Math.sin(Math.PI * t) * s;
      pts.push(p);
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.018, 3, false);
  };
  const byLine = {};
  poleLamps.filter((l) => !l.park).forEach((l) => {
    const lineKey = Math.abs(l.pole.z) > 6 && Math.abs(l.pole.x) > 9 ? `z${Math.sign(l.pole.z)}` : `x${Math.sign(l.pole.x)}`;
    (byLine[lineKey] ??= []).push(l.pole);
  });
  for (const [k, pts] of Object.entries(byLine)) {
    pts.sort((a, b) => (k[0] === 'z' ? a.x - b.x : a.z - b.z));
    for (let i = 0; i < pts.length - 1; i++) {
      for (let c = 0; c < 3; c++) {
        const a = pts[i].clone().setY(6.2 - c * 0.35);
        const b = pts[i + 1].clone().setY(6.2 - c * 0.35);
        if (a.distanceTo(b) > 30) continue;
        cableGeos.push(sag(a, b, 0.5 + c * 0.25 + R() * 0.3));
      }
    }
  }
  // cables que cruzan la calle
  for (let i = 0; i < 6; i++) {
    const x = -60 + i * 22;
    if (x > VIADUCT.minX - 3 && x < VIADUCT.maxX + 3) continue;
    cableGeos.push(sag(new THREE.Vector3(x, 6.4, 6.7), new THREE.Vector3(x + 3, 6.1, -6.7), 1.2));
  }
  void cableGeos;

  // ---------- Semáforos ----------
  const signals = [];
  const housingMat = new THREE.MeshStandardMaterial({ color: '#16181b', roughness: 0.5, metalness: 0.4 });
  const lampOff = { rojo: new THREE.Color('#2a0806'), ambar: new THREE.Color('#2a1a02'), verde: new THREE.Color('#03200f') };
  const lampOn = { rojo: new THREE.Color('#ff2a1a').multiplyScalar(5), ambar: new THREE.Color('#ffae00').multiplyScalar(5), verde: new THREE.Color('#1aff7a').multiplyScalar(4) };
  // cada semáforo controla un sentido de circulación
  const approaches = [
    { axis: 'x', dir: 1, corner: [-8, 7.4], head: [-9.6, 3.1] },
    { axis: 'x', dir: -1, corner: [8, -7.4], head: [9.6, -3.1] },
    { axis: 'z', dir: 1, corner: [-7.4, -8], head: [-3.1, -9.6] },
    { axis: 'z', dir: -1, corner: [7.4, 8], head: [3.1, 9.6] },
  ];
  for (const a of approaches) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6.2, 8), housingMat);
    pole.position.set(a.corner[0], 3.1, a.corner[1]);
    g.add(pole);
    const armEnd = new THREE.Vector3(a.head[0], 5.9, a.head[1]);
    const armStart = new THREE.Vector3(a.corner[0], 5.9, a.corner[1]);
    const armLen = armEnd.distanceTo(armStart);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, armLen, 6), housingMat);
    arm.position.lerpVectors(armStart, armEnd, 0.5);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armEnd.clone().sub(armStart).normalize());
    g.add(arm);
    const head = new THREE.Group();
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.2, 0.36), housingMat);
    head.add(hb);
    const mats = {};
    ['rojo', 'ambar', 'verde'].forEach((c, i) => {
      const m = new THREE.MeshBasicMaterial({ color: lampOff[c].clone() });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18), m);
      disc.position.set(0, 0.36 - i * 0.36, 0.185);
      head.add(disc);
      mats[c] = m;
    });
    head.position.set(a.head[0], 5.2, a.head[1]);
    // mira hacia el tráfico que llega
    const face = a.axis === 'x' ? new THREE.Vector3(-a.dir, 0, 0) : new THREE.Vector3(0, 0, -a.dir);
    head.lookAt(head.position.clone().add(face));
    g.add(head);
    scene.add(g);
    colliders.push(box(a.corner[0] - 0.2, a.corner[0] + 0.2, a.corner[1] - 0.2, a.corner[1] + 0.2));
    signals.push({ ...a, mats, state: null });
  }
  function setSignals(states) {
    for (const s of signals) {
      const st = states[s.axis];
      if (s.state === st) continue;
      s.state = st;
      for (const c of ['rojo', 'ambar', 'verde']) s.mats[c].color.copy(c === st ? lampOn[c] : lampOff[c]);
    }
  }

  // ---------- Árboles de andén ----------
  const treeTrunk = new THREE.MeshStandardMaterial({ color: '#4a3526', roughness: 1 });
  const treeLeaf = [new THREE.MeshStandardMaterial({ color: '#2f6b3a', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#3d7d42', roughness: 0.9 })];
  for (const [tx, tz] of [[-62, 8.1], [-30, 8.1], [36, 8.1], [66, 8.1], [-58, -8.1], [-14, -8.1], [62, -8.1], [8.1, 34], [-8.1, 52], [8.1, -40], [-8.1, -60]]) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.6, 8), treeTrunk);
    trunk.position.y = 1.3;
    trunk.castShadow = true;
    g.add(trunk);
    const pit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 1.1), new THREE.MeshStandardMaterial({ color: '#3a2c20' }));
    pit.position.y = 0.03;
    g.add(pit);
    for (let k = 0; k < 3; k++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + R() * 0.5, 1), treeLeaf[k % 2]);
      leaf.position.set((R() - 0.5) * 0.9, 2.8 + R() * 0.8, (R() - 0.5) * 0.9);
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(tx, CURB, tz);
    scene.add(g);
    colliders.push(box(tx - 0.3, tx + 0.3, tz - 0.3, tz + 0.3));
  }

  // ---------- Paradero de bus ----------
  {
    const g = new THREE.Group();
    const post = new THREE.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.5, metalness: 0.4 });
    for (const x of [-1.6, 1.6]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.1), post);
      p.position.set(x, 1.25, 0.5);
      g.add(p);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 1.4), new THREE.MeshStandardMaterial({ color: '#1f6fb5', roughness: 0.4 }));
    roof.position.set(0, 2.5, 0.2);
    roof.castShadow = true;
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.7, 0.06), new THREE.MeshStandardMaterial({ color: '#9fc3d8', transparent: true, opacity: 0.45 }));
    back.position.set(0, 1.35, 0.85);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.45), post);
    bench.position.set(0, 0.5, 0.55);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: T.lightbox({ title: 'PARADERO', w: 512, h: 160 }) }));
    sign.position.set(0, 2.85, -0.45);
    sign.rotation.y = Math.PI;
    g.add(roof, back, bench, sign);
    g.position.set(-40, CURB, 7.2);
    scene.add(g);
    colliders.push(box(-41.8, -38.2, 7.6, 8.2));
  }

  // ---------- Chaza de tintos en la esquina ----------
  {
    const g = new THREE.Group();
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.7), new THREE.MeshStandardMaterial({ color: '#e9e3d2', roughness: 0.6 }));
    cart.position.y = 0.55;
    cart.castShadow = true;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: T.lightbox({ title: 'TINTO $1.000', bg: '#7a3b12', w: 512, h: 200 }) }));
    front.position.set(0, 0.6, 0.36);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), new THREE.MeshStandardMaterial({ color: '#555' }));
    pole.position.y = 1.7;
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.45, 8), new THREE.MeshStandardMaterial({ color: '#d0202f', roughness: 0.6 }));
    umb.position.y = 2.5;
    umb.castShadow = true;
    const termos = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 10), new THREE.MeshStandardMaterial({ color: '#c62828' }));
    termos.position.set(-0.35, 1.18, 0);
    const termos2 = termos.clone();
    termos2.position.x = 0.0;
    termos2.material = new THREE.MeshStandardMaterial({ color: '#1565c0' });
    g.add(cart, front, pole, umb, termos, termos2);
    g.position.set(-10.6, CURB, -11.2);
    g.rotation.y = Math.PI / 4;
    scene.add(g);
    colliders.push(box(-11.4, -9.8, -12, -10.4));
  }

  // ---------- Motos parqueadas ----------
  const motoMats = ['#c0392b', '#1f1f1f', '#2860b8'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.3 }));
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#141414' });
  for (const [mx, mz, ry, ci] of [[-26, 6.7, 0.25, 0], [-27.2, 6.7, 0.25, 1], [20, 6.7, -0.2, 2], [-6.7, 30, Math.PI / 2 + 0.2, 1], [6.7, -30, Math.PI / 2, 0]]) {
    const g = new THREE.Group();
    for (const x of [-0.6, 0.6]) {
      const wh = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 6, 14), wheelMat);
      wh.position.set(x, 0.32, 0);
      g.add(wh);
    }
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.3), motoMats[ci]);
    bodyM.position.set(0, 0.62, 0);
    bodyM.castShadow = true;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.28), wheelMat);
    seat.position.set(-0.15, 0.84, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.7), wheelMat);
    bar.position.set(0.5, 1.0, 0);
    g.add(bodyM, seat, bar);
    g.position.set(mx, CURB, mz);
    g.rotation.y = ry;
    scene.add(g);
    colliders.push(box(mx - 0.8, mx + 0.8, mz - 0.5, mz + 0.5));
  }

  // ---------- Canecas y carros parqueados ----------
  const binMat = new THREE.MeshStandardMaterial({ color: '#2f5d3a', roughness: 0.55 });
  const binGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.9, 12);
  for (const p of trashSpots.filter(() => R() < 0.25)) {
    const bin = new THREE.Mesh(binGeo, binMat);
    bin.position.set(p.x + 0.8, CURB + 0.45, p.z);
    bin.castShadow = true;
    scene.add(bin);
    colliders.push(box(p.x + 0.5, p.x + 1.1, p.z - 0.3, p.z + 0.3));
  }
  for (const [px, pz, ry, kind, col] of [[-48, 7.6, 0, 'carro', 3], [30, 7.6, Math.PI, 'carro', 1], [-7.6, 40, Math.PI / 2, 'taxi', 0], [7.6, -48, -Math.PI / 2, 'carro', 5]]) {
    const v2 = makeVehicle(kind, col, { beams: false });
    v2.group.position.set(px, CURB, pz);
    v2.group.rotation.y = ry;
    v2.tailMat.color.set('#3a0604');
    scene.add(v2.group);
    const hl = ry === 0 || ry === Math.PI ? [2.2, 0.9] : [0.9, 2.2];
    colliders.push(box(px - hl[0], px + hl[0], pz - hl[1], pz + hl[1]));
  }

  // ---------- Montañas con las luces de las comunas ----------
  const hillGeo = new THREE.CylinderGeometry(260, 260, 1, 160, 8, true);
  const pos = hillGeo.attributes.position;
  const profile = (a) => 38 + 26 * Math.sin(a * 3 + 0.4) + 14 * Math.sin(a * 7 + 1.3) + 6 * Math.sin(a * 17);
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const a = Math.atan2(pz, px);
    const t = py + 0.5; // 0 abajo, 1 arriba
    const h = profile(a);
    const inward = 1 - t * 0.32;
    pos.setXYZ(i, px * inward, -4 + t * h, pz * inward);
  }
  hillGeo.computeVertexNormals();
  void hillGeo;

  const N = 10;
  const lp = new Float32Array(N * 3);
  const lc = new Float32Array(N * 3);
  const warmC = new THREE.Color('#ffb562'), coolC = new THREE.Color('#bcd6ff'), whiteC = new THREE.Color('#fff1d0');
  for (let i = 0; i < N; i++) {
    const a = R() * Math.PI * 2;
    const t = Math.pow(R(), 1.8) * 0.92;
    const h = profile(a);
    const rad = 260 * (1 - t * 0.32) - 2;
    lp[i * 3] = Math.cos(a) * rad;
    lp[i * 3 + 1] = -4 + t * h;
    lp[i * 3 + 2] = Math.sin(a) * rad;
    const c = R() < 0.72 ? warmC : R() < 0.5 ? coolC : whiteC;
    const k = 0.6 + R() * 1.4;
    lc[i * 3] = c.r * k;
    lc[i * 3 + 1] = c.g * k;
    lc[i * 3 + 2] = c.b * k;
  }
  const lightsGeo = new THREE.BufferGeometry();
  lightsGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lightsGeo.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const cityLights = new THREE.Points(lightsGeo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, depthWrite: false }));

  // antenas con luz roja en la cima
  const beaconMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2010').multiplyScalar(4), fog: false });
  const beacons = [];
  for (let i = 0; i < 5; i++) {
    const a = 0.6 + i * 1.25;
    const h = profile(a);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), beaconMat);
    const rad = 260 * (1 - 0.32) + 1;
    b.position.set(Math.cos(a) * rad, -4 + h + 1, Math.sin(a) * rad);
    beacons.push(b);
  }

  updaters.push((t, env) => {
    // parpadeo de faroles dañados
    let dirty = false;
    lamps.forEach((l, i) => {
      if (l.broken) return;
      let k = env.night;
      if (l.flicker) {
        const f = Math.sin(t * 23 + l.phase) * Math.sin(t * 7.3 + l.phase * 2);
        k *= f > 0.75 * l.flicker ? 0.15 : 1;
      }
      if (intensityAttr.array[i] !== k) {
        intensityAttr.array[i] = k;
        dirty = true;
      }
      l.intensity = k;
    });
    if (dirty) intensityAttr.needsUpdate = true;
    coneMat.uniforms.uStrength.value = 0.09 + env.rain * 0.06;
    const blink = Math.sin(t * 2.2) > 0.2 ? 1 : 0.1;
    beacons.forEach((b) => (b.visible = blink > 0.5));
    cityLights.material.opacity = 0.35 + env.night * 0.65;
  });

  const camDir = new THREE.Vector3();
  function cutaway(player, camYaw, dt) {
    // dirección horizontal hacia la cámara
    camDir.set(Math.sin(camYaw), 0, Math.cos(camYaw));
    const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    const k = 1 - Math.exp(-dt * 10);
    for (const b of buildings) {
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      // punto del edificio más cercano al jugador
      const nx = Math.max(b.minX, Math.min(player.x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(player.z, b.maxZ));
      const ahead = (nx - player.x) * camDir.x + (nz - player.z) * camDir.z;
      const lat = Math.abs((cx - player.x) * rx + (cz - player.z) * rz);
      const halfW = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
      const block = ahead > -0.2 && ahead < b.h * 1.9 + 2 && lat < halfW + 7;
      const want = block ? Math.min(1, 1.4 / b.h) : 1;
      b.cut += (want - b.cut) * k;
      b.mesh.scale.y = b.cut;
      b.mesh.position.y = CURB + (b.h * b.cut) / 2;
    }
    const nearDeck = player.x > VIADUCT.minX - 16 && player.x < VIADUCT.maxX + 8;
    for (const d of deckParts) d.visible = !nearDeck;
  }

  return {
    colliders,
    trashSpots,
    lamps,
    buildings,
    cutaway,
    setSignals,
    update(t, env) {
      for (const u of updaters) u(t, env);
    },
    setFacadeNight(k) {
      if (Math.abs(k - facadeNight) < 0.01) return;
      facadeNight = k;
      for (const m of facadeMats) m.emissiveIntensity = 0.15 + k * 1.15;
    },
  };
}

function shelvesTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const x = c.getContext('2d');
  x.fillStyle = '#e7e2d2';
  x.fillRect(0, 0, 512, 192);
  const r = T.rng(77);
  for (let s = 0; s < 4; s++) {
    const y = 12 + s * 44;
    x.fillStyle = '#8b8577';
    x.fillRect(0, y + 34, 512, 4);
    for (let px = 6; px < 506; ) {
      const w = 10 + r() * 18;
      x.fillStyle = T.pick(r, ['#d81e1e', '#f2c300', '#1e6fd8', '#22a35a', '#ff7a00', '#ffffff', '#7a2fb3', '#111111']);
      x.fillRect(px, y + 34 - (16 + r() * 16), w - 2, 16 + r() * 16);
      px += w;
    }
  }
  // nevera de gaseosas
  x.fillStyle = '#c4161c';
  x.fillRect(380, 0, 120, 192);
  x.fillStyle = '#ffffff';
  x.fillRect(388, 10, 104, 150);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
