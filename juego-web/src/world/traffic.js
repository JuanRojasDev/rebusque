import * as THREE from 'three';
import { makeVehicle } from './vehicles.js';

// Se maneja por la derecha. "s" es el avance a lo largo del carril.
const LANES = [
  { axis: 'x', dir: 1, offset: 3, cars: 4 },
  { axis: 'x', dir: -1, offset: -3, cars: 4 },
  { axis: 'z', dir: 1, offset: -3, cars: 2 },
  { axis: 'z', dir: -1, offset: 3, cars: 2 },
];
const STOP_S = -9.9;
const END_S = 98;
const DECEL = 5.5;

const CYCLE = [
  { x: 'verde', z: 'rojo', t: 16 },
  { x: 'ambar', z: 'rojo', t: 3 },
  { x: 'rojo', z: 'rojo', t: 1.5 },
  { x: 'rojo', z: 'verde', t: 12 },
  { x: 'rojo', z: 'ambar', t: 3 },
  { x: 'rojo', z: 'rojo', t: 1.5 },
];

export function createTraffic(scene, city, { beams = true } = {}) {
  const cars = [];
  let seed = 3;
  for (const lane of LANES) {
    for (let i = 0; i < lane.cars; i++) {
      const roll = (seed * 9301 + 49297) % 233280 / 233280;
      seed++;
      const kind = roll < 0.4 ? 'taxi' : roll < 0.86 ? 'carro' : 'buseta';
      const v = makeVehicle(kind, seed, { beams });
      scene.add(v.group);
      cars.push({
        ...v,
        lane,
        kind,
        s: -END_S + i * (END_S * 2 / lane.cars) + Math.random() * 8,
        v: 6 + Math.random() * 4,
        vmax: kind === 'buseta' ? 9 : 10 + Math.random() * 3,
        begUntil: 0,
        honkUntil: 0,
        braking: false,
      });
    }
  }

  let phase = 0;
  let phaseT = CYCLE[0].t;
  let onHonk = () => {};

  const toWorld = (car) => {
    const { lane } = car;
    const a = car.s * lane.dir;
    return lane.axis === 'x' ? [a, lane.offset] : [lane.offset, a];
  };

  function update(dt, t, player) {
    phaseT -= dt;
    if (phaseT <= 0) {
      phase = (phase + 1) % CYCLE.length;
      phaseT = CYCLE[phase].t;
    }
    const lights = CYCLE[phase];
    city.setSignals(lights);

    for (const car of cars) {
      const { lane } = car;
      const half = car.length / 2;
      const front = car.s + half;
      let desired = car.vmax;

      const light = lights[lane.axis];
      if (light !== 'verde' && front < STOP_S + 0.4) {
        const dist = STOP_S - front;
        const canStop = car.v * car.v / (2 * DECEL) < dist + 1;
        if (light === 'rojo' || canStop) desired = Math.min(desired, Math.sqrt(2 * DECEL * Math.max(0, dist - 0.2)));
      }

      // distancia al carro de adelante
      let gapMin = Infinity;
      for (const o of cars) {
        if (o === car || o.lane !== lane) continue;
        let gap = o.s - o.length / 2 - front;
        if (gap < -o.length) gap += END_S * 2;
        if (gap > -0.5 && gap < gapMin) gapMin = gap;
      }
      if (gapMin < 40) desired = Math.min(desired, Math.sqrt(2 * DECEL * Math.max(0, gapMin - 2.2)));

      // jugador atravesado
      if (player) {
        const ps = (lane.axis === 'x' ? player.x : player.z) * lane.dir;
        const lat = Math.abs((lane.axis === 'x' ? player.z : player.x) - lane.offset);
        const gap = ps - front;
        if (lat < car.width / 2 + 0.6 && gap > -car.length && gap < 14) {
          desired = Math.min(desired, Math.sqrt(2 * DECEL * 1.3 * Math.max(0, gap - 1.2)));
          if (gap < 7 && t > car.honkUntil && car.v < 3) {
            car.honkUntil = t + 3.5 + Math.random() * 3;
            onHonk(car);
          }
        }
      }

      const prev = car.v;
      const dv = THREE.MathUtils.clamp(desired - car.v, -DECEL * 1.6 * dt, 3 * dt);
      car.v = Math.max(0, car.v + dv);
      car.braking = car.v < prev - 0.01 || car.v < 0.3;
      car.s += car.v * dt;
      if (car.s - half > END_S) {
        // reaparece al fondo, detrás del último de su carril
        let minS = Infinity;
        for (const o of cars) if (o.lane === lane && o !== car) minS = Math.min(minS, o.s);
        car.s = Math.min(-END_S, minS - 12 - Math.random() * 10);
        car.v = car.vmax * 0.8;
      }

      const [x, z] = toWorld(car);
      car.group.position.set(x, 0, z);
      car.group.rotation.y = lane.axis === 'x' ? (lane.dir > 0 ? 0 : Math.PI) : (lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      for (const w of car.wheels) w.rotation.z -= (car.v * dt) / 0.33;
      car.tailMat.color.setRGB(car.braking ? 6 : 1.3, car.braking ? 0.15 : 0.03, car.braking ? 0.08 : 0.02);
      car.x = x;
      car.z = z;
    }
    return lights;
  }

  /** Carros detenidos junto al jugador (para pedir monedas en el semáforo). */
  function stoppedNear(p, t) {
    let best = null;
    let bestD = Infinity;
    for (const car of cars) {
      if (car.v > 0.4 || t < car.begUntil) continue;
      const { lane } = car;
      const along = Math.abs(((lane.axis === 'x' ? p.x : p.z) * lane.dir) - car.s);
      const lat = Math.abs((lane.axis === 'x' ? p.z : p.x) - lane.offset);
      if (along < car.length / 2 + 0.8 && lat < car.width / 2 + 1.4) {
        const d = along + lat;
        if (d < bestD) { bestD = d; best = car; }
      }
    }
    return best;
  }

  /** Empuja al jugador fuera de los carros y avisa si lo atropellaron. */
  function collide(p, radius = 0.35) {
    let hit = 0;
    for (const car of cars) {
      const { lane } = car;
      const along = ((lane.axis === 'x' ? p.x : p.z) * lane.dir) - car.s;
      const lat = (lane.axis === 'x' ? p.z : p.x) - lane.offset;
      const hl = car.length / 2 + radius, hw = car.width / 2 + radius;
      if (Math.abs(along) < hl && Math.abs(lat) < hw) {
        const pushLat = (hw - Math.abs(lat)) * Math.sign(lat || 1);
        if (lane.axis === 'x') p.z += pushLat; else p.x += pushLat;
        if (car.v > 4) hit = Math.max(hit, car.v);
      }
    }
    return hit;
  }

  return {
    cars,
    update,
    stoppedNear,
    collide,
    set onHonk(fn) { onHonk = fn; },
    get lights() { return CYCLE[phase]; },
  };
}
