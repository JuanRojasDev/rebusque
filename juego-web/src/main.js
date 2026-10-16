import '@fontsource/overpass/600.css';
import '@fontsource/overpass/800.css';
import '@fontsource/overpass/900.css';
import './styles.css';
import * as THREE from 'three';
import { createEngine, buildEnvironment, defaultQuality, simplifyMaterials, QUALITY } from './engine.js';
import { buildCity, PLACES } from './world/city.js';
import { createAtmosphere } from './world/atmosphere.js';
import { createTraffic } from './world/traffic.js';
import { createBags, createCambuche } from './world/props.js';
import { createCharacter } from './player/character.js';
import { normalizeLook } from './player/look.js';
import { createCreator } from './ui/creator.js';
import { createController } from './player/controller.js';
import { createNav } from './player/nav.js';
import { createInput } from './player/input.js';
import { createAudio } from './audio.js';
import { createHud, el, button } from './ui/hud.js';
import { setIcon } from './ui/icons.js';
import { createMinimap } from './ui/minimap.js';
import { createBigMap, DESTINATIONS } from './ui/bigmap.js';
import { createRouteRibbon } from './world/route.js';
import { icon } from './ui/icons.js';
import { createGame, newState, loadSave, clearSave, ORIGINS } from './game/game.js';

const $ = (id) => document.getElementById(id);
const PREF_KEY = 'rebusque.preferencias';
const prefs = (() => {
  try { return JSON.parse(localStorage.getItem(PREF_KEY)) ?? {}; } catch { return {}; }
})();
const savePrefs = () => {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* sin almacenamiento */ }
};

const progress = (p) => ($('loading-fill').style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`);
// cede el hilo entre fases de carga; setTimeout también avanza con la pestaña en segundo plano
const tick = () => new Promise((r) => setTimeout(r, 0));
const GAME_ZOOM = 13;
const TITLE_ZOOM = 7.5;

async function boot() {
  const times = {};
  let tm = performance.now();
  const mark = (k) => { const n = performance.now(); times[k] = Math.round(n - tm); tm = n; };
  progress(0.05);
  await Promise.all([
    document.fonts.load('900 64px Overpass'),
    document.fonts.load('800 32px Overpass'),
    document.fonts.load('600 16px Overpass'),
  ]).catch(() => {});
  mark('fuentes');

  const qualityName = QUALITY[prefs.quality] ? prefs.quality : defaultQuality();
  let engine;
  try {
    engine = createEngine($('scene'), qualityName);
  } catch (err) {
    console.error(err);
    $('loading').querySelector('.sign__title').textContent = 'Tu navegador no soporta WebGL';
    return;
  }
  const { scene, camera, renderer } = engine;
  progress(0.15);
  await tick();

  scene.environment = buildEnvironment(renderer);
  mark('entorno');
  const city = buildCity(scene, engine.quality);
  mark('ciudad');
  progress(0.55);
  await tick();

  const atmo = createAtmosphere(scene, engine.quality, city.lamps);
  const traffic = createTraffic(scene, city, { beams: true });
  const bags = createBags(scene, city.trashSpots);
  const cambuche = createCambuche(scene, PLACES.cambuche);
  mark('atmosfera+trafico');
  progress(0.7);
  await tick();

  const save = loadSave();
  const look = normalizeLook(save?.look ?? prefs.look);
  const character = createCharacter(look);
  scene.add(character.group);
  const keyLight = new THREE.PointLight('#ffe2bf', 0, 7, 2);
  scene.add(keyLight);

  // marca de destino (rombo amarillo)
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, 4),
    new THREE.MeshBasicMaterial({ color: '#f6c400', transparent: true, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);

  simplifyMaterials(scene);
  mark('pixelate');
  const nav = createNav(city.colliders);
  mark('nav');
  const controller = createController(character, camera, city.colliders, engine);
  const input = createInput({
    canvas: renderer.domElement,
    actBtn: $('touch-act'),
    runBtn: $('touch-run'),
    rotL: $('rot-left'),
    rotR: $('rot-right'),
  });
  const audio = createAudio();
  const hud = createHud();
  setIcon($('rot-left'), 'arrow', { size: 22 });
  setIcon($('rot-right'), 'arrow', { size: 22 });
  const minimap = createMinimap($('minimap'));
  const guide = { target: null, route: null, dist: 0 };
  const ribbon = createRouteRibbon(scene);
  const game = createGame({ city, atmo, traffic, character, controller, bags, cambuche, audio, hud, minimap, engine, input, guide });
  hud.onPrompt = () => game.activate();
  if (import.meta.env.DEV) window.__rbq = { engine, atmo, game, controller, city, traffic, times };
  atmo.onThunder = (d) => audio.thunder(d);
  traffic.onHonk = () => audio.honk();
  controller.teleport(-12.5, 7.4, Math.PI);
  engine.setZoom(TITLE_ZOOM);

  renderer.compile(scene, camera);
  mark('compile');
  progress(1);
  await tick();

  // ---------- Clic / toque ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);
  const hitP = new THREE.Vector3();
  function groundAt(x, y) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(ground, hitP) ? hitP.clone() : null;
  }
  function pickAt(p, t) {
    let best = null, bd = Infinity;
    for (const b of bags.bags) {
      if (!b.active) continue;
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      if (d < 1.3 && d < bd) { bd = d; best = { id: 'bolsa', bag: b, x: b.x, z: b.z }; }
    }
    if (best) return best;
    for (const car of traffic.cars) {
      if (car.v > 0.4) continue;
      const d = Math.hypot(car.x - p.x, car.z - p.z);
      if (d < car.length / 2 + 0.4) {
        const lat = car.lane.axis === 'x' ? [0, Math.sign(p.z - car.z || 1) * 1.8] : [Math.sign(p.x - car.x || 1) * 1.8, 0];
        return { id: 'pedir', x: car.x + lat[0], z: car.z + lat[1], car };
      }
    }
    void t;
    for (const [id, pl] of Object.entries(PLACES)) {
      if (Math.hypot(pl.x - p.x, pl.z - p.z) < pl.r + 1.2) return { id, x: pl.x, z: pl.z };
    }
    return null;
  }
  let markerT = 0;
  function goTo(x, z) {
    const path = nav.find(controller.st.pos.x, controller.st.pos.z, x, z);
    controller.setPath(path);
    if (path) {
      const end = path[path.length - 1];
      marker.position.set(end.x, 0.2, end.z);
      marker.visible = true;
      markerT = 1.2;
    }
    return !!path;
  }

  // ---------- Título ----------
  let mode = 'title';
  let titleLook = { ...look };
  let customized = !!(save || prefs.customized);
  const touch = input.state.touch;
  const creator = createCreator({ audio });

  function syncProfile() {
    $('profile-name').textContent = titleLook.nombre || 'Sin nombre todavía';
    const o = ORIGINS[titleLook.origen];
    $('profile-meta').textContent = `${o ? o.name : ''}${save ? ' · partida guardada' : ''}`;
  }
  syncProfile();

  async function customize({ doneLabel = 'Listo' } = {}) {
    const result = await creator.open(titleLook, { doneLabel });
    if (result) {
      titleLook = result;
      customized = true;
      prefs.look = titleLook;
      prefs.customized = true;
      savePrefs();
      character.setLook(titleLook);
      syncProfile();
    }
    return result;
  }
  $('btn-customize').addEventListener('click', () => customize());

  const qSel = $('quality-select');
  qSel.value = qualityName;
  qSel.addEventListener('change', () => {
    prefs.quality = qSel.value;
    prefs.look = titleLook;
    savePrefs();
    location.reload();
  });

  $('controls-hint').innerHTML = touch
    ? 'Toca el piso para caminar. Toca una bolsa, la tienda o un carro detenido para usarlos. Pellizca para acercar y usa las flechas para girar la vista.'
    : 'Clic para caminar o usar algo · <kbd>W A S D</kbd> también mueven · <kbd>Shift</kbd> correr · <kbd>E</kbd> usar · <kbd>Q</kbd> <kbd>R</kbd> girar · rueda: zoom · <kbd>M</kbd> mapa · <kbd>I</kbd> costal · <kbd>Esc</kbd> pausa';

  if (save) {
    $('btn-play').querySelector('.btn__label').textContent = 'Continuar';
    $('btn-new').hidden = false;
  }

  function startGame(fresh) {
    audio.resume();
    prefs.look = titleLook;
    savePrefs();
    const state = !fresh && save ? { ...save, look: titleLook } : newState({ ...titleLook });
    if (fresh) clearSave();
    $('title').hidden = true;
    hud.show(true);
    hud.setTouch(touch);
    input.state.enabled = true;
    mode = 'play';
    engine.setZoom(prefs.zoom ?? GAME_ZOOM);
    game.start(state);
    const nuevo = !save || fresh;
    hud.toast(nuevo ? `Llegaste a la cuadra con las manos vacías, ${titleLook.nombre}. Toca rebuscarse.` : `Partida cargada. Qué más, ${titleLook.nombre || 'parce'}.`, { ms: 5200, ic: nuevo ? 'hand' : 'save', kind: nuevo ? '' : 'bien' });
  }
  $('btn-play').addEventListener('click', async () => {
    if (!save && (!customized || !titleLook.nombre)) {
      const r = await customize({ doneLabel: 'Empezar a jugar' });
      if (!r) return;
    }
    startGame(false);
  });
  $('btn-new').addEventListener('click', async () => {
    if (!window.confirm('¿Empezar de cero? Se borra la partida guardada.')) return;
    const r = await customize({ doneLabel: 'Empezar a jugar' });
    if (r) startGame(true);
  });

  // ---------- Pausa ----------
  function openPause() {
    if (hud.menuOpen || creator.isOpen) return;
    game.pause();
    const body = el('div', {},
      el('p', { class: 'empty', text: 'La partida se guarda cuando duermes en el cambuche. Si vuelves al título, pierdes lo que hiciste desde la última vez que dormiste.' }),
    );
    const foot = [
      button('Cambiar apariencia', {
        onClick: async () => {
          hud.closeMenu();
          game.pause();
          const r = await creator.open(game.state.look, { doneLabel: 'Listo' });
          if (r) {
            game.setLook(r);
            titleLook = r;
            prefs.look = r;
            savePrefs();
          }
          game.resume();
        },
      }),
      button(audio.muted ? 'Activar sonido' : 'Silenciar', {
        onClick: () => {
          audio.setMuted(!audio.muted);
          hud.closeMenu();
          openPause();
        },
      }),
      button('Volver al título', {
        onClick: () => {
          if (window.confirm('¿Volver al título? Pierdes lo que no hayas guardado durmiendo.')) location.reload();
        },
      }),
      button('Seguir jugando', { primary: true, onClick: () => hud.closeMenu() }),
    ];
    const who = game.state.look?.nombre;
    hud.openMenu({ title: 'Pausa', sub: `${who ? `${who} · ` : ''}Día ${game.state.day}`, ic: 'pause', body, foot, onClose: () => game.resume() });
  }
  $('btn-pause').addEventListener('click', openPause);

  // ---------- GPS ----------
  setIcon($('btn-map'), 'map');
  setIcon($('bigmap-icon'), 'map', { size: 34 });
  setIcon($('bigmap-close'), 'x');
  setIcon($('bigmap-pin'), 'pin', { size: 22 });
  const bigmapEl = $('bigmap');
  const bigmap = createBigMap($('bigmap-canvas'), { buildings: city.buildings, onPick: (p) => setDestination(p) });
  const DEST_ICON = { tienda: 'store', recicladora: 'recycle', pila: 'bath', cambuche: 'tent', semaforo: 'hand' };
  $('bigmap-dests').replaceChildren(...DESTINATIONS.map((d) => el('button', {
    type: 'button',
    class: 'dest-btn',
    'data-id': d.id,
    'aria-pressed': 'false',
    onclick: () => setDestination({ x: d.x, z: d.z, label: d.label, id: d.id }),
  }, icon(DEST_ICON[d.id], { size: 18 }), d.short)));
  let routeTimer = 0;
  function recompute() {
    if (!guide.target) return;
    const path = nav.find(controller.st.pos.x, controller.st.pos.z, guide.target.x, guide.target.z);
    guide.route = path;
    let d = 0, px = controller.st.pos.x, pz = controller.st.pos.z;
    for (const p of path ?? []) { d += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; }
    guide.dist = d;
    ribbon.set(path ? [{ x: controller.st.pos.x, z: controller.st.pos.z }, ...path] : null);
  }
  function syncMapUi() {
    const has = !!guide.target;
    $('bigmap-dest').hidden = !has;
    $('bigmap-clear').disabled = !has;
    $('bigmap-go').disabled = !has || !guide.route;
    if (has) {
      $('bigmap-dest-name').textContent = guide.target.label;
      $('bigmap-dest-dist').textContent = guide.route ? ` · ${Math.round(guide.dist)} m caminando` : ' · No hay camino hasta allá';
    }
    $('bigmap-dests').querySelectorAll('.dest-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === guide.target?.id)));
  }
  function setDestination(p) {
    guide.target = p;
    recompute();
    syncMapUi();
    audio.ui();
  }
  function clearDestination() {
    guide.target = null;
    guide.route = null;
    ribbon.set(null);
    syncMapUi();
  }
  function openMap() {
    if (hud.menuOpen || !bigmapEl.hidden) return;
    game.pause();
    bigmapEl.hidden = false;
    syncMapUi();
    $('bigmap-close').focus({ preventScroll: true });
  }
  function closeMap() {
    if (bigmapEl.hidden) return;
    bigmapEl.hidden = true;
    game.resume();
  }
  $('btn-map').addEventListener('click', openMap);
  $('bigmap-close').addEventListener('click', closeMap);
  $('bigmap-clear').addEventListener('click', clearDestination);
  $('bigmap-go').addEventListener('click', () => {
    if (guide.route) controller.setPath(guide.route.map((p) => ({ ...p })));
    closeMap();
  });
  bigmapEl.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key.toLowerCase() === 'm') { e.stopPropagation(); closeMap(); } });
  bigmapEl.addEventListener('pointerdown', (e) => { if (e.target === bigmapEl) closeMap(); });
  $('btn-inv').addEventListener('click', () => !hud.menuOpen && game.openInventario());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'play' && !hud.menuOpen) openPause();
  });

  $('loading').hidden = true;
  $('title').hidden = false;

  // ---------- Bucle ----------
  const clock = new THREE.Clock();
  const titleFocus = new THREE.Vector3();
  let t = 0;
  let hoverT = 0;
  const idle = { moveX: 0, moveY: 0, act: false, actPressed: false, pressed: new Set(), taps: [], zoom: 0, rotate: 0 };

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    t += dt;
    let env;

    if (mode === 'title') {
      env = game.frame(dt, idle, t);
      character.update(dt, { speed: 0, t, load: 0.4 });
      const narrow = window.innerWidth < 820;
      const yaw = controller.st.camYaw;
      const shift = narrow ? 0 : 2.6;
      titleFocus.set(-12.5 + Math.cos(yaw) * shift, 0.15 + (narrow ? -0.6 : 0.8), 7.4 - Math.sin(yaw) * shift);
      controller.st.camYawTarget = (Math.PI * 3) / 4 + Math.sin(t * 0.15) * 0.12;
      controller.placeCamera(dt, false, titleFocus);
    } else {
      const inp = input.poll();
      if (!hud.menuOpen && !game.paused && !creator.isOpen) {
        if (inp.pressed.has('m')) openMap();
        else if (inp.pressed.has('i') || inp.pressed.has('tab')) game.openInventario();
        else if (inp.pressed.has('escape') || inp.pressed.has('p')) openPause();
        if (inp.rotate) controller.rotate(Math.sign(inp.rotate));
        if (inp.zoom) {
          engine.setZoom(engine.viewHeight + inp.zoom);
          prefs.zoom = engine.viewHeight;
        }
        for (const tap of inp.taps) {
          const p = groundAt(tap.x, tap.y);
          if (!p) continue;
          const pick = pickAt(p, t);
          audio.ui();
          if (pick) {
            const near = game.target && game.target.id === pick.id && (!pick.bag || game.target.bag === pick.bag);
            if (near) game.activate();
            else if (goTo(pick.x, pick.z)) game.queue(pick);
          } else {
            game.queue(null);
            goTo(p.x, p.z);
          }
        }
        // cursor de mano sobre cosas usables
        hoverT -= dt;
        if (inp.hover && hoverT <= 0) {
          hoverT = 0.12;
          const p = groundAt(inp.hover.x, inp.hover.y);
          renderer.domElement.style.cursor = p && pickAt(p, t) ? 'pointer' : 'default';
        }
      }
      env = game.frame(dt, inp, t);
      // GPS: recalcula la ruta y avisa al llegar
      if (guide.target) {
        routeTimer -= dt;
        const left = Math.hypot(guide.target.x - controller.st.pos.x, guide.target.z - controller.st.pos.z);
        if (left < 2.2) {
          hud.toast(`Llegaste: ${guide.target.label}`, { kind: 'bien', ic: 'pin' });
          audio.coin();
          clearDestination();
        } else if (routeTimer <= 0) {
          routeTimer = 0.6;
          recompute();
        }
      }
      ribbon.update(dt);
      if (!bigmapEl.hidden) bigmap.draw({ player: controller.st.pos, yaw: controller.st.yaw, guide, bags: bags.bags, t });
    }

    // luz de personaje: lo hace legible de noche
    keyLight.position.set(
      controller.st.pos.x + Math.sin(controller.st.camYaw) * 1.6,
      controller.st.pos.y + 2.2,
      controller.st.pos.z + Math.cos(controller.st.camYaw) * 1.6,
    );
    keyLight.intensity = (env?.night ?? 1) * 5;
    if (marker.visible) {
      markerT -= dt;
      marker.material.opacity = Math.max(0, markerT / 1.2);
      marker.rotation.z += dt * 2;
      if (markerT <= 0 || !controller.st.path) marker.visible = markerT > 0 && !!controller.st.path;
    }
    engine.ink.material.uniforms.uFlash.value = (env?.flash ?? 0) * 0.25;
    if (!creator.isOpen) engine.render();
  }
  loop();
}

boot();
