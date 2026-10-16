import * as THREE from 'three';
import { heightAt, BOUNDS } from '../world/city.js';

const RADIUS = 0.35;
const PITCH = Math.PI / 6; // 30°: proyección 2:1 del pixel art isométrico
const DIST = 90;

/**
 * Jugador en vista isométrica: camina por rutas (clic/toque) o con WASD.
 * La cámara ortográfica se alinea a la rejilla de píxeles para que no titile.
 */
export function createController(character, camera, colliders, engine) {
  const st = {
    pos: new THREE.Vector3(-12.5, 0.15, 7.4),
    yaw: Math.PI,
    camYaw: (Math.PI * 3) / 4,
    camYawTarget: (Math.PI * 3) / 4,
    speed: 0,
    vel: new THREE.Vector2(),
    shake: 0,
    path: null,
    running: false,
    focus: new THREE.Vector3(),
  };
  const f = new THREE.Vector3();
  const r = new THREE.Vector3();
  const u = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  function resolve(p) {
    for (const c of colliders) {
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      const dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < RADIUS * RADIUS) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * RADIUS;
          p.z = cz + (dz / d) * RADIUS;
        } else {
          const opts = [[c.minX - RADIUS - p.x, 0], [c.maxX + RADIUS - p.x, 0], [0, c.minZ - RADIUS - p.z], [0, c.maxZ + RADIUS - p.z]];
          opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
          p.x += opts[0][0];
          p.z += opts[0][1];
        }
      }
    }
    p.x = THREE.MathUtils.clamp(p.x, -BOUNDS, BOUNDS);
    p.z = THREE.MathUtils.clamp(p.z, -BOUNDS, BOUNDS);
  }

  function placeCamera(dt, snap = false, target = null) {
    // gira suave hacia el ángulo objetivo
    let dy = st.camYawTarget - st.camYaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    st.camYaw += snap ? dy : dy * (1 - Math.exp(-dt * 9));
    const tgt = target ?? new THREE.Vector3(st.pos.x, st.pos.y + 0.8, st.pos.z);
    if (snap) st.focus.copy(tgt);
    else st.focus.lerp(tgt, 1 - Math.exp(-dt * 8));

    f.set(-Math.sin(st.camYaw) * Math.cos(PITCH), -Math.sin(PITCH), -Math.cos(st.camYaw) * Math.cos(PITCH));
    r.crossVectors(f, UP).normalize();
    u.crossVectors(r, f).normalize();
    // alinea el foco a la rejilla de píxeles en el plano de la pantalla
    const tx = engine.texel;
    const pr = st.focus.dot(r), pu = st.focus.dot(u);
    const sr = Math.round(pr / tx) * tx, su = Math.round(pu / tx) * tx;
    const fx = st.focus.clone().addScaledVector(r, sr - pr).addScaledVector(u, su - pu);
    if (st.shake > 0) {
      st.shake = Math.max(0, st.shake - dt * 2);
      fx.addScaledVector(r, Math.round((Math.random() - 0.5) * 4) * tx * st.shake);
    }
    camera.position.copy(fx).addScaledVector(f, -DIST);
    camera.lookAt(fx);
  }

  return {
    st,
    teleport(x, z, yaw = st.yaw) {
      st.pos.set(x, heightAt(x, z), z);
      st.yaw = yaw;
      st.path = null;
      character.group.position.copy(st.pos);
      character.group.rotation.y = yaw;
      placeCamera(0, true);
    },
    setPath(path) { st.path = path && path.length ? path : null; },
    rotate(dir) { st.camYawTarget += (dir * Math.PI) / 2; },
    update(dt, inp, { locked = false, speedMul = 1, collideCars }) {
      let wx = 0, wz = 0, mag = 0;
      if (!locked && (inp.moveX || inp.moveY)) {
        st.path = null;
        const fx = -Math.sin(st.camYaw), fz = -Math.cos(st.camYaw);
        const rx = Math.cos(st.camYaw), rz = -Math.sin(st.camYaw);
        wx = fx * -inp.moveY + rx * inp.moveX;
        wz = fz * -inp.moveY + rz * inp.moveX;
        mag = Math.min(1, Math.hypot(wx, wz));
      } else if (!locked && st.path) {
        const next = st.path[0];
        const dx = next.x - st.pos.x, dz = next.z - st.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.25) {
          st.path.shift();
          if (!st.path.length) st.path = null;
        } else {
          wx = dx; wz = dz;
          mag = Math.min(1, d / 0.6);
        }
      }
      const run = inp.run || st.running;
      const maxSpeed = (run ? 4.6 : 2.5) * speedMul;
      const len = Math.hypot(wx, wz) || 1;
      const tvx = mag > 0.01 ? (wx / len) * maxSpeed * mag : 0;
      const tvz = mag > 0.01 ? (wz / len) * maxSpeed * mag : 0;
      const acc = 1 - Math.exp(-dt * 12);
      st.vel.x += (tvx - st.vel.x) * acc;
      st.vel.y += (tvz - st.vel.y) * acc;
      st.pos.x += st.vel.x * dt;
      st.pos.z += st.vel.y * dt;
      resolve(st.pos);
      const hit = collideCars ? collideCars(st.pos, RADIUS) : 0;
      resolve(st.pos);
      st.speed = Math.hypot(st.vel.x, st.vel.y);
      if (st.speed > 0.2) {
        const want = Math.atan2(st.vel.x, st.vel.y);
        let d = want - st.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        st.yaw += d * (1 - Math.exp(-dt * 14));
      }
      const gy = heightAt(st.pos.x, st.pos.z);
      st.pos.y += (gy - st.pos.y) * (1 - Math.exp(-dt * 20));
      character.group.position.copy(st.pos);
      character.group.rotation.y = st.yaw;
      placeCamera(dt);
      return { hit };
    },
    faceTo(x, z) {
      st.yaw = Math.atan2(x - st.pos.x, z - st.pos.z);
      character.group.rotation.y = st.yaw;
    },
    placeCamera,
  };
}
