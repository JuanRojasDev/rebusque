import { PLACES, VIADUCT, BOUNDS } from '../world/city.js';

export const DESTINATIONS = [
  { id: 'tienda', label: 'Tienda La Esquinita', short: 'Tienda', ...PLACES.tienda },
  { id: 'recicladora', label: 'Recicladora El Progreso', short: 'Recicladora', ...PLACES.recicladora },
  { id: 'pila', label: 'Pila del parque', short: 'Pila', ...PLACES.pila },
  { id: 'cambuche', label: 'Tu cambuche', short: 'Cambuche', ...PLACES.cambuche },
  { id: 'semaforo', label: 'Semáforo de la avenida', short: 'Semáforo', x: -13, z: 1.2 },
];

/**
 * Mapa grande estilo GPS: norte arriba, toca un punto para marcar destino.
 * Dibuja la cuadra (manzanas, vías, viaducto, parque), lugares, bolsas, la ruta y al jugador.
 */
export function createBigMap(canvas, { buildings, onPick }) {
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas');
  let size = 0;
  let scale = 1;
  let dpr = 1;
  const pad = 14;

  const toMap = (x, z) => [pad * dpr + (x + BOUNDS) * scale, pad * dpr + (z + BOUNDS) * scale];
  const toWorld = (mx, my) => [(mx - pad * dpr) / scale - BOUNDS, (my - pad * dpr) / scale - BOUNDS];

  function drawBase() {
    base.width = canvas.width;
    base.height = canvas.height;
    const b = base.getContext('2d');
    b.fillStyle = '#0a1830';
    b.fillRect(0, 0, base.width, base.height);
    // manzanas (cuadrantes) un tono más claro
    b.fillStyle = '#12284a';
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const [x0, y0] = toMap(sx > 0 ? 6 : -BOUNDS, sz > 0 ? 6 : -BOUNDS);
      const [x1, y1] = toMap(sx > 0 ? BOUNDS : -6, sz > 0 ? BOUNDS : -6);
      b.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    // parque
    b.fillStyle = '#1d4a2d';
    const [px0, py0] = toMap(-42, -30), [px1, py1] = toMap(-22, -9.6);
    b.fillRect(px0, py0, px1 - px0, py1 - py0);
    // edificios
    b.fillStyle = '#2b4570';
    b.strokeStyle = '#0a1830';
    b.lineWidth = 1 * dpr;
    for (const bd of buildings) {
      const [x0, y0] = toMap(bd.minX, bd.minZ), [x1, y1] = toMap(bd.maxX, bd.maxZ);
      b.fillRect(x0, y0, x1 - x0, y1 - y0);
      b.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }
    // vías
    const road = (ax, az, bx, bz, w) => {
      const [x0, y0] = toMap(ax, az), [x1, y1] = toMap(bx, bz);
      b.strokeStyle = '#e9eef7';
      b.lineWidth = w * scale;
      b.lineCap = 'butt';
      b.beginPath();
      b.moveTo(x0, y0);
      b.lineTo(x1, y1);
      b.stroke();
    };
    road(-BOUNDS, 0, BOUNDS, 0, 12);
    road(0, -BOUNDS, 0, BOUNDS, 12);
    b.setLineDash([6 * dpr, 6 * dpr]);
    b.strokeStyle = '#f2b400';
    b.lineWidth = 1.2 * dpr;
    for (const [ax, az, bx, bz] of [[-BOUNDS, 0, BOUNDS, 0], [0, -BOUNDS, 0, BOUNDS]]) {
      const [x0, y0] = toMap(ax, az), [x1, y1] = toMap(bx, bz);
      b.beginPath();
      b.moveTo(x0, y0);
      b.lineTo(x1, y1);
      b.stroke();
    }
    // viaducto
    b.setLineDash([10 * dpr, 6 * dpr]);
    b.strokeStyle = '#1fae5b';
    b.lineWidth = (VIADUCT.maxX - VIADUCT.minX) * scale * 0.55;
    const [vx0, vy0] = toMap((VIADUCT.minX + VIADUCT.maxX) / 2, -BOUNDS);
    const [vx1, vy1] = toMap((VIADUCT.minX + VIADUCT.maxX) / 2, BOUNDS);
    b.globalAlpha = 0.55;
    b.beginPath();
    b.moveTo(vx0, vy0);
    b.lineTo(vx1, vy1);
    b.stroke();
    b.globalAlpha = 1;
    b.setLineDash([]);
    // rótulos de vías
    b.fillStyle = 'rgba(214, 228, 255, 0.85)';
    b.font = `800 ${10 * dpr}px Overpass, sans-serif`;
    b.textAlign = 'left';
    const [ax, ay] = toMap(-70, -2);
    b.fillText('AVENIDA 7', ax, ay);
    b.save();
    const [cx, cy] = toMap(-2.2, -66);
    b.translate(cx, cy);
    b.rotate(Math.PI / 2);
    b.fillText('CALLE 12', 0, 0);
    b.restore();
    const [vlx, vly] = toMap(57.5, -60);
    b.fillStyle = '#7fe0a4';
    b.fillText('VIADUCTO', vlx, vly);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const css = Math.floor(Math.min(r.width, r.height));
    if (!css || css === size) return;
    size = css;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(css * dpr);
    canvas.height = Math.round(css * dpr);
    scale = (canvas.width - pad * 2 * dpr) / (BOUNDS * 2);
    drawBase();
  }

  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width / r.width);
    const my = (e.clientY - r.top) * (canvas.height / r.height);
    const [x, z] = toWorld(mx, my);
    if (Math.abs(x) > BOUNDS || Math.abs(z) > BOUNDS) return;
    // si toca cerca de un lugar, toma ese lugar
    const near = DESTINATIONS.find((d) => Math.hypot(d.x - x, d.z - z) < 5);
    onPick(near ? { x: near.x, z: near.z, label: near.label } : { x, z, label: 'Punto marcado' });
  });

  return {
    draw({ player, yaw, guide, bags, t }) {
      resize();
      if (!size) return;
      ctx.drawImage(base, 0, 0);
      // bolsas disponibles
      ctx.fillStyle = 'rgba(180, 190, 200, 0.75)';
      for (const b of bags) {
        if (!b.active) continue;
        const [x, y] = toMap(b.x, b.z);
        ctx.fillRect(x - 1.5 * dpr, y - 1.5 * dpr, 3 * dpr, 3 * dpr);
      }
      // ruta
      if (guide?.route?.length) {
        const pts = [[player.x, player.z], ...guide.route.map((p) => [p.x, p.z])];
        for (const [w, c] of [[7, '#0e0f12'], [4, '#f6c400']]) {
          ctx.strokeStyle = c;
          ctx.lineWidth = w * dpr;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.beginPath();
          pts.forEach(([x, z], i) => {
            const [mx, my] = toMap(x, z);
            if (i) ctx.lineTo(mx, my); else ctx.moveTo(mx, my);
          });
          ctx.stroke();
        }
      }
      // estaciones
      for (const d of DESTINATIONS) {
        const [x, y] = toMap(d.x, d.z);
        ctx.beginPath();
        ctx.arc(x, y, 6.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 3 * dpr;
        ctx.strokeStyle = '#0e0f12';
        ctx.stroke();
        ctx.font = `900 ${10.5 * dpr}px Overpass, sans-serif`;
        ctx.textAlign = 'left';
        ctx.lineWidth = 3 * dpr;
        ctx.strokeStyle = '#0a1830';
        ctx.strokeText(d.short.toUpperCase(), x + 10 * dpr, y + 4 * dpr);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(d.short.toUpperCase(), x + 10 * dpr, y + 4 * dpr);
      }
      // destino: pin
      if (guide?.target) {
        const [x, y] = toMap(guide.target.x, guide.target.z);
        const pulse = 10 + Math.sin(t * 4) * 2;
        ctx.beginPath();
        ctx.arc(x, y, pulse * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = '#f6c400';
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x - 9 * dpr, y - 12 * dpr, x - 8 * dpr, y - 24 * dpr, x, y - 24 * dpr);
        ctx.bezierCurveTo(x + 8 * dpr, y - 24 * dpr, x + 9 * dpr, y - 12 * dpr, x, y);
        ctx.fillStyle = '#ff4433';
        ctx.fill();
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = '#0e0f12';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y - 16 * dpr, 3.2 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      // jugador
      const [px, py] = toMap(player.x, player.z);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI - yaw);
      ctx.beginPath();
      ctx.moveTo(0, -11 * dpr);
      ctx.lineTo(8 * dpr, 8 * dpr);
      ctx.lineTo(0, 4 * dpr);
      ctx.lineTo(-8 * dpr, 8 * dpr);
      ctx.closePath();
      ctx.fillStyle = '#f6c400';
      ctx.fill();
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeStyle = '#0e0f12';
      ctx.stroke();
      ctx.restore();
    },
  };
}
