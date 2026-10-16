import { PLACES, VIADUCT } from '../world/city.js';

/**
 * Minimapa como diagrama de Metro: vías como líneas gruesas a 0/90°, lugares
 * como estaciones, el objetivo con anillo amarillo. Gira con la cámara.
 */
export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let size = 0;
  const STATIONS = [
    { ...PLACES.tienda, label: 'TIENDA' },
    { ...PLACES.recicladora, label: 'RECICLADORA' },
    { ...PLACES.pila, label: 'PILA' },
    { ...PLACES.cambuche, label: 'CAMBUCHE' },
    { x: -11, z: 1, label: 'SEMÁFORO' },
  ];

  function resize() {
    const css = canvas.getBoundingClientRect().width || 168;
    if (css === size) return;
    size = css;
    canvas.width = Math.round(css * dpr);
    canvas.height = Math.round(css * dpr);
  }

  return {
    draw({ px, pz, yaw, camYaw, objective, t, route = null }) {
      resize();
      const W = canvas.width;
      const S = W / 2;
      const scale = (W / 120) * 0.92; // ±60 m
      const c = Math.cos(camYaw), s = Math.sin(camYaw);
      const tr = (x, z) => {
        const dx = x - px, dz = z - pz;
        return [S + (dx * c - dz * s) * scale, S + (dx * s + dz * c) * scale];
      };
      ctx.save();
      ctx.clearRect(0, 0, W, W);
      // esmalte azul noche
      const r = 12 * dpr;
      ctx.beginPath();
      ctx.roundRect(0, 0, W, W, r);
      ctx.fillStyle = '#0a1830';
      ctx.fill();
      ctx.clip();

      const line = (a, b, color, width, dash = null) => {
        const [x1, y1] = tr(a[0], a[1]);
        const [x2, y2] = tr(b[0], b[1]);
        ctx.strokeStyle = color;
        ctx.lineWidth = width * dpr;
        ctx.lineCap = 'round';
        ctx.setLineDash(dash ? dash.map((d) => d * dpr) : []);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };
      // viaducto (línea verde punteada), avenida y calle (blancas)
      line([(VIADUCT.minX + VIADUCT.maxX) / 2, -90], [(VIADUCT.minX + VIADUCT.maxX) / 2, 90], '#1fae5b', 7, [10, 6]);
      line([-90, 0], [90, 0], '#e9eef7', 9);
      line([0, -90], [0, 90], '#e9eef7', 9);
      line([-90, 0], [90, 0], '#0a1830', 2.5);
      line([0, -90], [0, 90], '#0a1830', 2.5);

      ctx.setLineDash([]);
      if (route?.length) {
        for (const [w, col] of [[6, '#0e0f12'], [3.5, '#f6c400']]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = w * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(S, S);
          for (const p of route) {
            const [x, y] = tr(p.x, p.z);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      for (const st of STATIONS) {
        const [x, y] = tr(st.x, st.z);
        const isObj = objective && Math.hypot(objective.x - st.x, objective.z - st.z) < 4;
        ctx.beginPath();
        ctx.arc(x, y, 5.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2.5 * dpr;
        ctx.strokeStyle = '#0e0f12';
        ctx.stroke();
        if (isObj) {
          ctx.beginPath();
          ctx.arc(x, y, (9 + Math.sin(t * 4) * 1.5) * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = '#f6c400';
          ctx.lineWidth = 3 * dpr;
          ctx.stroke();
        }
        ctx.font = `800 ${8.5 * dpr}px Overpass, sans-serif`;
        ctx.fillStyle = '#d6e4ff';
        ctx.textAlign = 'left';
        ctx.fillText(st.label, x + 8 * dpr, y + 3 * dpr);
      }
      // objetivo fuera de estación (p. ej. bolsas)
      if (objective && !STATIONS.some((st) => Math.hypot(objective.x - st.x, objective.z - st.z) < 4)) {
        const [x, y] = tr(objective.x, objective.z);
        ctx.beginPath();
        ctx.arc(x, y, (5 + Math.sin(t * 4)) * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = '#f6c400';
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();
      }
      // jugador: flecha amarilla
      const heading = yaw - camYaw;
      ctx.translate(S, S);
      ctx.rotate(-heading + Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, -9 * dpr);
      ctx.lineTo(6.5 * dpr, 7 * dpr);
      ctx.lineTo(0, 3.5 * dpr);
      ctx.lineTo(-6.5 * dpr, 7 * dpr);
      ctx.closePath();
      ctx.fillStyle = '#f6c400';
      ctx.fill();
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = '#0e0f12';
      ctx.stroke();
      ctx.restore();
      // filete blanco de señal
      ctx.beginPath();
      ctx.roundRect(4 * dpr, 4 * dpr, W - 8 * dpr, W - 8 * dpr, r - 4 * dpr);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
    },
  };
}
