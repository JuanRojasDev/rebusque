import * as THREE from 'three';
import { VIADUCT, ROAD } from './city.js';

const smooth = THREE.MathUtils.smoothstep;
const C = (hex) => new THREE.Color(hex);

// Paleta por momento del día: [noche, atardecer/amanecer, día]
const SKY_HEMI = [C('#3b4766'), C('#d99a7a'), C('#a9c6ea')];
const GROUND_HEMI = [C('#26190e'), C('#4a2a1a'), C('#5a4c3c')];
const FOG = [C('#0b0a0d'), C('#c4836a'), C('#a7b6c4')];
const FOG_RAIN = [C('#0a0a0c'), C('#6e5a52'), C('#7d858c')];
const SUN_COLOR = [C('#9db3e0'), C('#ffa25a'), C('#fff1dc')];

function tri(out, arr, night, dusk, day) {
  out.setRGB(0, 0, 0);
  out.r = arr[0].r * night + arr[1].r * dusk + arr[2].r * day;
  out.g = arr[0].g * night + arr[1].g * dusk + arr[2].g * day;
  out.b = arr[0].b * night + arr[1].b * dusk + arr[2].b * day;
  return out;
}

/**
 * Ciclo de día completo (amanecer, día, atardecer, noche), clima, lluvia por GPU
 * y un "pool" pequeño de faroles con luz real cerca del jugador.
 */
export function createAtmosphere(scene, quality, lamps, envs) {
  // ---------- Cielo ----------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uDay: { value: 0 }, uDusk: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 }, uRain: { value: 1 },
      uSun: { value: new THREE.Vector3(0, 1, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uDay, uDusk, uTime, uFlash, uRain;
      uniform vec3 uSun;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        float t = pow(max(h, 0.0), 0.5);
        float night = clamp(1.0 - uDay - uDusk, 0.0, 1.0);
        vec3 nightC = mix(vec3(0.16, 0.075, 0.03), vec3(0.006, 0.008, 0.018), t);
        vec3 dayC = mix(vec3(0.72, 0.8, 0.88), vec3(0.2, 0.42, 0.75), t);
        vec3 duskC = mix(mix(vec3(1.0, 0.5, 0.22), vec3(0.78, 0.36, 0.48), smoothstep(0.0, 0.25, t)), vec3(0.16, 0.2, 0.42), smoothstep(0.2, 0.9, t));
        vec3 col = nightC * night + duskC * uDusk + dayC * uDay;
        // sol y su halo
        float sd = max(dot(normalize(vDir), normalize(uSun)), 0.0);
        vec3 sunTint = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.55, 0.25), uDusk);
        col += sunTint * (pow(sd, 900.0) * 6.0 + pow(sd, 12.0) * 0.35 * (uDusk + uDay * 0.5)) * (1.0 - uRain * 0.85);
        // nubes
        vec2 uv = vDir.xz / (max(h, 0.04) + 0.25);
        float c = fbm(uv * 1.2 + vec2(uTime * 0.01, uTime * 0.004));
        c = smoothstep(0.5 - uRain * 0.35, 0.9, c);
        vec3 cloudNight = vec3(0.11, 0.06, 0.035) * (1.0 - t * 0.6);
        vec3 cloudDay = vec3(0.95, 0.96, 0.98);
        vec3 cloudDusk = mix(vec3(1.0, 0.62, 0.4), vec3(0.55, 0.32, 0.45), t);
        vec3 cloud = cloudNight * night + cloudDusk * uDusk + cloudDay * uDay;
        col = mix(col, cloud, c * 0.75);
        // lluvia: cielo encapotado
        vec3 grey = vec3(dot(col, vec3(0.3, 0.55, 0.15))) * mix(1.0, 0.75, uDay);
        col = mix(col, grey, uRain * 0.7);
        col += uFlash * vec3(0.5, 0.55, 0.75) * (0.5 + c);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  scene.fog = new THREE.Fog('#0b0a0d', 85, 190);
  scene.background = new THREE.Color('#0b0a0d');
  sky.visible = false;

  const hemi = new THREE.HemisphereLight('#3b4766', '#26190e', 0.4);
  scene.add(hemi);
  // un solo direccional: sol de día, luna de noche
  const sun = new THREE.DirectionalLight('#fff1dc', 0.2);
  sun.castShadow = quality.shadows;
  if (quality.shadows) {
    sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    const s = sun.shadow.camera;
    s.left = -30; s.right = 30; s.top = 30; s.bottom = -30; s.near = 1; s.far = 200;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
  }
  scene.add(sun, sun.target);

  // ---------- Pool de faroles ----------
  const pool = [];
  for (let i = 0; i < quality.lightPool; i++) {
    const s = new THREE.SpotLight('#ffab5c', 0, 24, 1.05, 0.65, 2);
    s.castShadow = i < (quality.spotShadows ?? 0);
    if (s.castShadow) {
      s.shadow.mapSize.set(512, 512);
      s.shadow.bias = -0.0008;
      s.shadow.camera.near = 0.5;
      s.shadow.camera.far = 14;
    }
    scene.add(s, s.target);
    pool.push({ light: s, lamp: null });
  }
  let poolTimer = 0;
  function assignPool(px, pz) {
    const sorted = lamps
      .filter((l) => !l.broken)
      .map((l) => ({ l, d: (l.pos.x - px) ** 2 + (l.pos.z - pz) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, pool.length);
    pool.forEach((p, i) => {
      const l = sorted[i]?.l ?? null;
      p.lamp = l;
      if (!l) return;
      p.light.position.copy(l.pos);
      p.light.target.position.set(l.pos.x, 0, l.pos.z);
      p.light.target.updateMatrixWorld();
    });
  }

  // ---------- Lluvia (todo en GPU) ----------
  const N = quality.rain;
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.translate(0, 0.5, 0);
  const rainGeo = new THREE.InstancedBufferGeometry();
  rainGeo.index = quad.index;
  rainGeo.setAttribute('position', quad.attributes.position);
  rainGeo.setAttribute('uv', quad.attributes.uv);
  const offs = new Float32Array(N * 4);
  for (let i = 0; i < offs.length; i++) offs[i] = Math.random();
  rainGeo.setAttribute('aOff', new THREE.InstancedBufferAttribute(offs, 4));
  rainGeo.instanceCount = N;
  const BOXW = 30, BOXH = 20;
  const rainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uIntensity: { value: 1 },
      uWind: { value: new THREE.Vector2(1.6, 0.6) },
      uLight: { value: 0.35 },
      uShelter: { value: new THREE.Vector4(VIADUCT.minX, VIADUCT.maxX, VIADUCT.y, 0) },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aOff;
      uniform float uTime, uIntensity;
      uniform vec3 uCam;
      uniform vec2 uWind;
      uniform vec4 uShelter;
      varying float vA;
      varying vec2 vUv;
      const float W = ${BOXW.toFixed(1)};
      const float H = ${BOXH.toFixed(1)};
      void main() {
        vUv = uv;
        float speed = 17.0 + aOff.w * 6.0;
        float fall = uTime * speed;
        vec2 base = aOff.xz * W + uWind * uTime;
        vec2 rel = mod(base - uCam.xz, W) - 0.5 * W;
        vec3 p;
        p.xz = uCam.xz + rel;
        p.y = uCam.y - 6.0 + mod(aOff.y * H - fall, H);
        float alive = step(aOff.w, uIntensity);
        if (p.x > uShelter.x && p.x < uShelter.y && p.y < uShelter.z) alive = 0.0;
        if (p.y < 0.0) alive = 0.0;
        vec3 dir = normalize(vec3(uWind.x, -speed, uWind.y));
        vec3 toCam = normalize(cameraPosition - p);
        vec3 side = normalize(cross(dir, toCam));
        float len = 0.5 + aOff.x * 0.3;
        vec3 world = p + side * position.x * 0.05 + dir * (position.y - 0.5) * len;
        vA = alive * (0.25 + aOff.z * 0.3);
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        if (alive < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLight;
      varying float vA;
      varying vec2 vUv;
      void main() {
        float a = vA * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
        gl_FragColor = vec4(vec3(0.78, 0.84, 0.95) * (0.6 + uLight), a * 0.55);
      }
    `,
  });
  const rain = new THREE.Mesh(rainGeo, rainMat);
  rain.frustumCulled = false;
  rain.renderOrder = 5;
  scene.add(rain);

  // salpicaduras discretas en el piso
  const NS = quality.splashes;
  const ring = new THREE.PlaneGeometry(1, 1);
  ring.rotateX(-Math.PI / 2);
  const splashGeo = new THREE.InstancedBufferGeometry();
  splashGeo.index = ring.index;
  splashGeo.setAttribute('position', ring.attributes.position);
  splashGeo.setAttribute('uv', ring.attributes.uv);
  const so = new Float32Array(NS * 3);
  for (let i = 0; i < so.length; i++) so[i] = Math.random();
  splashGeo.setAttribute('aOff', new THREE.InstancedBufferAttribute(so, 3));
  splashGeo.instanceCount = NS;
  const splashMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uIntensity: { value: 1 }, uShelter: rainMat.uniforms.uShelter },
    vertexShader: /* glsl */ `
      attribute vec3 aOff;
      uniform float uTime, uIntensity;
      uniform vec3 uCam;
      uniform vec4 uShelter;
      varying vec2 vUv;
      varying float vLife;
      varying float vAlive;
      void main() {
        vUv = uv;
        float cycle = uTime * (1.6 + aOff.z) + aOff.z * 10.0;
        float k = floor(cycle);
        vLife = fract(cycle);
        vec2 jitter = vec2(fract(sin(k * 12.9 + aOff.x * 78.2) * 4375.5), fract(sin(k * 4.1 + aOff.y * 37.7) * 9375.1));
        vec2 rel = (fract(aOff.xy + jitter) - 0.5) * 14.0;
        vec3 p = vec3(uCam.x + rel.x, 0.0, uCam.z + rel.y);
        p.y = (abs(p.x) < ${ROAD.toFixed(1)} || abs(p.z) < ${ROAD.toFixed(1)}) ? 0.02 : 0.165;
        vAlive = step(aOff.z, uIntensity);
        if (p.x > uShelter.x && p.x < uShelter.y) vAlive = 0.0;
        float s = 0.08 + vLife * 0.22;
        vec3 world = p + vec3(position.x * s, 0.0, position.z * s);
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying float vLife;
      varying float vAlive;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float ringA = smoothstep(0.75, 0.9, d) * smoothstep(1.0, 0.92, d);
        float a = ringA * (1.0 - vLife) * vAlive * 0.35;
        gl_FragColor = vec4(vec3(0.8, 0.82, 0.9), a);
      }
    `,
  });
  const splashes = new THREE.Mesh(splashGeo, splashMat);
  splashes.frustumCulled = false;
  scene.add(splashes);

  // ---------- Clima ----------
  const weather = { kind: 'despejado', remaining: 50, intensity: 0, target: 0, flash: 0, nextBolt: 8 };
  const KINDS = {
    despejado: { rain: 0, min: 120, max: 260 },
    llovizna: { rain: 0.35, min: 50, max: 140 },
    aguacero: { rain: 1, min: 35, max: 90 },
  };
  function nextWeather() {
    const opts = weather.kind === 'aguacero' ? ['despejado', 'llovizna'] : weather.kind === 'despejado' ? ['llovizna', 'aguacero', 'despejado'] : ['aguacero', 'despejado'];
    weather.kind = opts[Math.floor(Math.random() * opts.length)];
    const k = KINDS[weather.kind];
    weather.remaining = k.min + Math.random() * (k.max - k.min);
    weather.target = k.rain;
  }

  const tmp = new THREE.Color();
  const tmp2 = new THREE.Color();
  const sunDir = new THREE.Vector3();
  let onThunder = () => {};
  let envMode = null;

  return {
    weather,
    set onThunder(fn) { onThunder = fn; },
    setWeather(kind, remaining = 60, instant = true) {
      weather.kind = kind;
      weather.remaining = remaining;
      weather.target = KINDS[kind].rain;
      if (instant) weather.intensity = weather.target;
    },
    update(dt, t, { hour, gameMinutes, focus, camera }) {
      weather.remaining -= gameMinutes;
      if (weather.remaining <= 0) nextWeather();
      weather.intensity += (weather.target - weather.intensity) * Math.min(1, dt * 0.25);
      const rainK = weather.intensity;

      // sol: sale a las 6:00 por el oriente (+X) y se oculta a las 18:00
      const a = ((hour - 6) / 12) * Math.PI;
      const elev = Math.sin(a);
      sunDir.set(Math.cos(a), Math.max(elev, -0.3), 0.35).normalize();
      const day = smooth(elev, 0.05, 0.38);
      const dusk = Math.exp(-(((elev - 0.04) / 0.14) ** 2)) * (1 - day * 0.6);
      const night = Math.max(0, 1 - day - dusk);
      const lampsOn = 1 - smooth(elev, -0.06, 0.12);

      // relámpagos en aguacero
      weather.flash = Math.max(0, weather.flash - dt * 3.2);
      if (weather.kind === 'aguacero' && rainK > 0.7) {
        weather.nextBolt -= dt;
        if (weather.nextBolt <= 0) {
          weather.nextBolt = 14 + Math.random() * 30;
          weather.flash = 1;
          setTimeout(() => (weather.flash = Math.max(weather.flash, 0.6)), 120);
          onThunder(0.6 + Math.random() * 1.8);
        }
      }

      skyMat.uniforms.uDay.value = day;
      skyMat.uniforms.uDusk.value = dusk;
      skyMat.uniforms.uTime.value = t;
      skyMat.uniforms.uFlash.value = weather.flash * (night + dusk * 0.5);
      skyMat.uniforms.uRain.value = rainK;
      skyMat.uniforms.uSun.value.copy(sunDir);
      sky.position.copy(camera.position);

      tri(tmp, FOG, night, dusk, day);
      tri(tmp2, FOG_RAIN, night, dusk, day);
      scene.fog.color.copy(tmp).lerp(tmp2, rainK);
      scene.fog.far = 190 - rainK * 45;
      scene.background.copy(scene.fog.color);

      tri(hemi.color, SKY_HEMI, night, dusk, day);
      tri(hemi.groundColor, GROUND_HEMI, night, dusk, day);
      hemi.intensity = 0.75 + dusk * 0.65 + day * (1.1 - rainK * 0.3) + weather.flash * 2.5 * night;

      // direccional: sol (o luna cuando está bajo el horizonte)
      const isSun = elev > -0.05;
      // para iluminar, el sol nunca baja de ~20°: así el atardecer no deja la cuadra en sombra
      const dir = isSun ? new THREE.Vector3(sunDir.x, Math.max(sunDir.y, 0.36), sunDir.z).normalize() : new THREE.Vector3(-0.5, 0.8, 0.3).normalize();
      tri(sun.color, SUN_COLOR, isSun ? 0 : 1, isSun ? dusk : 0, isSun ? day : 0);
      sun.intensity = isSun ? (0.7 + day * 2.1 + dusk * 1.7) * (1 - rainK * 0.5) : 0.3;
      sun.position.set(focus.x + dir.x * 80, dir.y * 80, focus.z + dir.z * 80);
      sun.target.position.set(focus.x, 0, focus.z);
      sun.target.updateMatrixWorld();

      // reflejos: mapa de entorno de día o de noche
      const want = day + dusk * 0.6 > 0.5 ? 'day' : 'night';
      if (envs && want !== envMode) {
        envMode = want;
        scene.environment = envs[want];
      }
      scene.environmentIntensity = want === 'day' ? 0.75 : 0.55;

      poolTimer -= dt;
      if (poolTimer <= 0) {
        poolTimer = 0.3;
        assignPool(focus.x, focus.z);
      }
      for (const p of pool) p.light.intensity = p.lamp ? 130 * (p.lamp.intensity ?? 1) * lampsOn : 0;

      rainMat.uniforms.uTime.value = t;
      rainMat.uniforms.uCam.value.set(focus.x, focus.y + 4, focus.z);
      rainMat.uniforms.uIntensity.value = rainK;
      rainMat.uniforms.uLight.value = 0.25 + day * 0.4;
      splashMat.uniforms.uTime.value = t;
      splashMat.uniforms.uCam.value.copy(focus);
      splashMat.uniforms.uIntensity.value = rainK;
      rain.visible = rainK > 0.02;
      splashes.visible = rainK > 0.05;

      return { day, dusk, night: lampsOn, dark: night, rain: rainK, flash: weather.flash * night, kind: weather.kind };
    },
  };
}
