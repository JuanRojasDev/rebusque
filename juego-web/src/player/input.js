/**
 * Entrada para vista isométrica: clic/toque para caminar o usar cosas,
 * WASD opcional en PC, rueda o pellizco para el zoom, botones para girar la cámara.
 */
export function createInput({ canvas, actBtn, runBtn, rotL, rotR }) {
  const keys = new Set();
  const state = {
    touch: window.matchMedia('(pointer: coarse)').matches,
    enabled: false,
    pressed: new Set(),
    taps: [],
    hover: null,
    zoom: 0,
    rotate: 0,
    actPressed: false,
  };
  let runToggle = false;
  const pointers = new Map();
  let pinchDist = 0;

  const isTyping = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    const k = e.key.toLowerCase();
    if (!keys.has(k)) state.pressed.add(k);
    keys.add(k);
    if (state.enabled && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    if (!state.enabled) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state.enabled) return;
    if (e.pointerType === 'mouse') state.hover = { x: e.clientX, y: e.clientY };
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist) state.zoom += (pinchDist - d) * 0.03;
      pinchDist = d;
    }
  });
  const end = (e) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!p || !state.enabled) return;
    if (pointers.size === 0) pinchDist = 0;
    const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
    if (moved < 10 && performance.now() - p.t < 600 && e.button !== 2) state.taps.push({ x: e.clientX, y: e.clientY });
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
  canvas.addEventListener('pointerleave', () => (state.hover = null));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    if (!state.enabled) return;
    state.zoom += Math.sign(e.deltaY) * 1.2;
  }, { passive: true });

  actBtn.addEventListener('click', () => (state.actPressed = true));
  runBtn.addEventListener('click', () => {
    runToggle = !runToggle;
    runBtn.classList.toggle('is-on', runToggle);
    runBtn.setAttribute('aria-pressed', String(runToggle));
  });
  rotL.addEventListener('click', () => (state.rotate -= 1));
  rotR.addEventListener('click', () => (state.rotate += 1));

  return {
    state,
    poll() {
      let mx = 0, my = 0;
      if (keys.has('w') || keys.has('arrowup')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown')) my += 1;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;
      const len = Math.hypot(mx, my);
      if (len > 1) { mx /= len; my /= len; }
      if (state.pressed.has('q')) state.rotate -= 1;
      if (state.pressed.has('r')) state.rotate += 1;
      const snap = {
        moveX: mx,
        moveY: my,
        run: keys.has('shift') || runToggle,
        act: keys.has('e') || keys.has(' '),
        actPressed: state.actPressed || state.pressed.has('e') || state.pressed.has(' '),
        pressed: new Set(state.pressed),
        taps: state.taps.splice(0),
        hover: state.hover,
        zoom: state.zoom,
        rotate: state.rotate,
      };
      state.zoom = 0;
      state.rotate = 0;
      state.actPressed = false;
      state.pressed.clear();
      return snap;
    },
    releasePointer() {},
  };
}
