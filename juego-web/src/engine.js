import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/**
 * Motor isométrico en alta definición: cámara ortográfica, contorno suave por
 * profundidad (look de maqueta ilustrada) y FXAA. Nada de bloom: liviano.
 */
export const QUALITY = {
  bajo: { maxDpr: 1, scale: 0.85, shadows: false, shadowSize: 0, rain: 700, splashes: 40, lightPool: 2, envSize: 0.35, outline: 1 },
  alto: { maxDpr: 1.5, scale: 1, shadows: true, shadowSize: 2048, rain: 1400, splashes: 90, lightPool: 4, envSize: 0.6, outline: 1.5 },
  ultra: { maxDpr: 2, scale: 1, shadows: true, shadowSize: 4096, rain: 2600, splashes: 160, lightPool: 6, envSize: 1, outline: 2 },
};

export function defaultQuality() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  return coarse || small ? 'bajo' : 'alto';
}

/** Contorno de silueta por diferencias de profundidad + viñeta y relámpago. */
class InkPass extends Pass {
  constructor(camera) {
    super();
    this.camera = camera;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uRange: { value: 200 },
        uWidth: { value: 1.5 },
        uFlash: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse, tDepth;
        uniform vec2 uTexel;
        uniform float uRange, uWidth, uFlash;
        varying vec2 vUv;
        float d(vec2 o) { return texture2D(tDepth, vUv + o * uTexel * uWidth).r * uRange; }
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          float z = d(vec2(0.0));
          float far = max(max(d(vec2(1.0, 0.0)), d(vec2(-1.0, 0.0))), max(d(vec2(0.0, 1.0)), d(vec2(0.0, -1.0))));
          float edge = smoothstep(0.35, 1.2, far - z);
          c.rgb *= 1.0 - edge * 0.38;
          vec2 q = vUv - 0.5;
          c.rgb *= 1.0 - dot(q, q) * 0.28;
          c.rgb += uFlash * vec3(0.5, 0.55, 0.75);
          gl_FragColor = c;
        }
      `,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }
  setSize(w, h) { this.material.uniforms.uTexel.value.set(1 / w, 1 / h); }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = readBuffer.depthTexture;
    u.uRange.value = this.camera.far - this.camera.near;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }
}

export function createEngine(container, qualityName) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 1, 220);

  const rt = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    depthTexture: new THREE.DepthTexture(4, 4),
  });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const ink = new InkPass(camera);
  composer.addPass(ink);
  composer.addPass(new OutputPass());
  const fxaa = new FXAAPass();
  composer.addPass(fxaa);

  const engine = {
    renderer, scene, camera, composer, ink,
    quality: null,
    qualityName: null,
    viewHeight: 13,
    texel: 0.01,
    setQuality(name) {
      const q = QUALITY[name] ?? QUALITY.alto;
      engine.quality = q;
      engine.qualityName = name;
      renderer.shadowMap.enabled = q.shadows;
      ink.material.uniforms.uWidth.value = q.outline;
      engine.resize();
    },
    resize() {
      const q = engine.quality ?? QUALITY.alto;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const pr = Math.min(window.devicePixelRatio || 1, q.maxDpr) * q.scale;
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      engine.pixelHeight = h * pr;
      engine.updateProjection();
    },
    updateProjection() {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const vh = engine.viewHeight * (h > w ? 1.45 : 1);
      const vw = vh * (w / h);
      camera.left = -vw / 2;
      camera.right = vw / 2;
      camera.top = vh / 2;
      camera.bottom = -vh / 2;
      camera.updateProjectionMatrix();
      engine.texel = vh / Math.max(1, engine.pixelHeight ?? h);
    },
    setZoom(vh) {
      engine.viewHeight = THREE.MathUtils.clamp(vh, 7, 24);
      engine.updateProjection();
    },
    render() { composer.render(); },
  };

  engine.setQuality(qualityName);
  window.addEventListener('resize', () => engine.resize());
  new ResizeObserver(() => engine.resize()).observe(container);
  return engine;
}

/**
 * Unifica los materiales a Lambert (sombreado limpio de maqueta y barato).
 * El asfalto y lo marcado con userData.keep conservan su material original.
 */
export function simplifyMaterials(scene, anisotropy = 4) {
  const cache = new Map();
  const fixTex = (t) => {
    if (!t) return;
    t.anisotropy = anisotropy;
    t.needsUpdate = true;
  };
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const conv = (m) => {
      if (!m || m.isShaderMaterial || m.isMeshBasicMaterial || m.isMeshLambertMaterial || m.isSpriteMaterial || m.userData.keep) return m;
      if (cache.has(m)) return cache.get(m);
      const l = new THREE.MeshLambertMaterial({
        color: m.color,
        map: m.map ?? null,
        emissive: m.emissive ?? new THREE.Color(0),
        emissiveMap: m.emissiveMap ?? null,
        emissiveIntensity: m.emissiveIntensity ?? 1,
        side: m.side,
        transparent: m.transparent,
        opacity: m.opacity,
        vertexColors: m.vertexColors,
      });
      fixTex(l.map);
      l.userData = m.userData;
      cache.set(m, l);
      return l;
    };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
  });
  return cache;
}

/** Mapa de entorno nocturno (solo lo usa el asfalto mojado). */
export function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color('#1a1d24');
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(40, 40, 10, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: '#5a3a1e', side: THREE.BackSide }),
  );
  ring.position.y = 2;
  env.add(ring);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), new THREE.MeshBasicMaterial({ color: i % 3 ? '#ffb15a' : '#9ec4ff', side: THREE.DoubleSide }));
    m.position.set(Math.cos(a) * 30, 2 + (i % 5) * 1.6, Math.sin(a) * 30);
    m.rotation.y = -a + Math.PI / 2;
    env.add(m);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  return tex;
}
