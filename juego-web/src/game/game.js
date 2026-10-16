import { MATERIALS, ITEMS, SHOP, CAMBUCHE, LOOT, ORIGINS, CAPACITY, cop } from './data.js';
import { PLACES, underViaduct } from '../world/city.js';
import { el, button } from '../ui/hud.js';
import { icon } from '../ui/icons.js';

const SAVE_KEY = 'rebusque.partida.v1';
const SAVE_VERSION = 1;
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export function newState(look) {
  return {
    v: SAVE_VERSION,
    day: 1,
    minutes: 17 * 60,
    money: 0,
    needs: { hambre: 55, sueno: 62, higiene: 45, salud: 85, vicio: 60 },
    inv: {},
    capacity: CAPACITY.base,
    built: {},
    look,
    objective: 0,
    stats: { bags: 0, sold: 0, ate: 0, slept: 0, earned: 0, begged: 0 },
    status: { gripa: false, malestar: 0 },
    wetMin: 0,
    pos: [-12.5, 7.4],
    yaw: Math.PI,
    bagState: null,
    weather: null,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object' || s.v !== SAVE_VERSION) return null;
    // valida lo mínimo para no romper el juego con un guardado corrupto
    if (typeof s.money !== 'number' || !s.needs || !s.inv) return null;
    // migración: el ánimo pasó a ser el vicio
    if (s.needs.vicio === undefined) s.needs.vicio = 60;
    delete s.needs.animo;
    return s;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* sin almacenamiento */ }
}

export function createGame(ctx) {
  const { city, atmo, traffic, character, controller, bags, cambuche, audio, hud, minimap, engine } = ctx;
  let S = null;
  let target = null;
  let hold = 0;
  let action = null;
  let actionUntil = 0;
  let hudTimer = 0;
  let paused = true;
  let sleeping = false;
  let t = 0;
  let lastObjectiveStep = -1;
  let queued = null; // interacción pedida por clic: se ejecuta al llegar
  let autoHold = false;

  // ---------- utilidades de inventario ----------
  const weightOf = (id) => (MATERIALS[id]?.peso ?? ITEMS[id]?.peso ?? 0);
  const load = () => Object.entries(S.inv).reduce((a, [id, q]) => a + weightOf(id) * q, 0);
  const has = (id, q = 1) => (S.inv[id] ?? 0) >= q;
  const add = (id, q = 1) => { S.inv[id] = (S.inv[id] ?? 0) + q; if (S.inv[id] <= 0) delete S.inv[id]; };
  const nameOf = (id) => MATERIALS[id]?.name ?? ITEMS[id]?.name ?? id;
  const hour = () => (S.minutes / 60) % 24;
  const isNight = () => hour() >= 18 || hour() < 6;

  function sheltered(x, z) {
    if (underViaduct(x, z)) return true;
    if (x > -22.5 && x < -12.5 && z > 8 && z < 9.7) return true; // toldo de la tienda
    if (x > 14 && x < 31 && z > -24.6 && z < -9.6) return true; // dentro de la recicladora
    return false;
  }

  // ---------- guardar ----------
  function save() {
    S.pos = [controller.st.pos.x, controller.st.pos.z];
    S.yaw = controller.st.yaw;
    S.bagState = bags.serialize();
    S.weather = { kind: atmo.weather.kind, remaining: atmo.weather.remaining };
    S.savedAt = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
      return true;
    } catch {
      return false;
    }
  }

  // ---------- botín ----------
  function rollLoot() {
    const draws = 1 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.18 ? 1 : 0) + (S.look.origen === 'reciclador' ? 1 : 0);
    const table = LOOT.filter(([id]) => !(id === 'colchon' && (S.built.cama || has('colchon'))));
    const total = table.reduce((a, r) => a + r[1], 0);
    const got = {};
    for (let i = 0; i < draws; i++) {
      let r = Math.random() * total;
      for (const [id, w, min, max] of table) {
        r -= w;
        if (r <= 0) {
          got[id] = (got[id] ?? 0) + min + Math.floor(Math.random() * (max - min + 1));
          break;
        }
      }
    }
    return got;
  }

  function searchBag(bag) {
    const got = rollLoot();
    bags.take(bag, S.minutes);
    S.stats.bags++;
    S.needs.higiene = clamp(S.needs.higiene - 3);
    audio.rustle();
    let full = false;
    const cap = S.capacity;
    for (const [id, q] of Object.entries(got)) {
      let take = 0;
      for (let k = 0; k < q; k++) {
        if (load() + weightOf(id) > cap) { full = true; break; }
        add(id, 1);
        take++;
      }
      if (take > 0) {
        const rare = ['cobre', 'celular', 'reloj', 'colchon', 'lona'].includes(id);
        hud.toast(`+${take} ${nameOf(id)}`, { kind: rare ? 'plata' : '', ic: MATERIALS[id]?.icon ?? ITEMS[id]?.icon ?? 'package' });
        if (rare) audio.bigCoin();
      }
    }
    if (Object.keys(got).length === 0) hud.toast('Nada que sirva', { ic: 'trash' });
    if (full) hud.toast('El costal está lleno: vende en la recicladora', { kind: 'malo', ic: 'backpack', ms: 3400 });
    if (Math.random() < 0.04) {
      S.needs.salud = clamp(S.needs.salud - 8);
      hud.toast('Te cortaste con un vidrio (−8 salud)', { kind: 'malo', ic: 'bandage' });
      audio.bad();
    }
  }

  function beg(car) {
    car.begUntil = t + 40;
    S.stats.begged++;
    const r = Math.random();
    if (r < 0.03) {
      S.money += 10000;
      S.stats.earned += 10000;
      hud.toast('¡Un billete de diez mil! Bendiciones', { kind: 'plata', ic: 'banknote' });
      audio.bigCoin();
      return;
    }
    const noProb = 0.32 + (S.needs.higiene < 30 ? 0.25 : 0);
    if (r < noProb) {
      hud.toast(Math.random() < 0.5 ? 'Subió el vidrio' : '"Hoy no, mijo"', { ic: 'hand' });
      return;
    }
    const mult = (0.55 + S.needs.higiene / 110) * (S.look.origen === 'migrante' ? 1.3 : 1);
    const amount = Math.max(200, Math.round(((200 + Math.random() * 1300) * mult) / 100) * 100);
    S.money += amount;
    S.stats.earned += amount;
    hud.toast(`+${cop(amount)} de un conductor`, { kind: 'plata', ic: 'coins' });
    audio.coin();
  }

  function bathe() {
    const soap = has('jabon');
    if (soap) add('jabon', -1);
    S.needs.higiene = soap ? 100 : clamp(S.needs.higiene + 55);
    S.wetMin = Math.max(S.wetMin, 60);
    audio.splash();
    hud.toast(soap ? 'Quedaste como nuevo (jabón)' : 'Te lavaste en la pila', { kind: 'bien', ic: 'bath' });
  }

  // ---------- consumir ----------
  function consume(id) {
    const it = ITEMS[id];
    if (!it?.use || !has(id)) return;
    add(id, -1);
    const u = it.use;
    if (u.hambre) S.needs.hambre = clamp(S.needs.hambre + u.hambre);
    if (u.sueno) S.needs.sueno = clamp(S.needs.sueno + u.sueno);
    if (u.vicio) S.needs.vicio = clamp(S.needs.vicio + u.vicio);
    if (u.salud) S.needs.salud = clamp(S.needs.salud + u.salud);
    if (it.cures === 'gripa' && S.status.gripa) {
      S.status.gripa = false;
      hud.toast('Se te quitó la gripa', { kind: 'bien', ic: 'pill' });
    }
    if (it.risk && !S.built.fogon && Math.random() < it.risk) {
      S.status.malestar = 180;
      S.needs.salud = clamp(S.needs.salud - 10);
      hud.toast('Te cayó mal la comida', { kind: 'malo', ic: 'alert' });
      audio.bad();
    }
    if (u.hambre) S.stats.ate++;
    action = 'comer';
    actionUntil = t + 1.2;
  }

  // ---------- menús ----------
  const moneyFoot = () => el('span', { class: 'menu__money' }, 'Tienes ', el('span', { text: cop(S.money) }));

  function rowEl({ ic, name, desc, qty, price, btn, cls = '' }) {
    return el('li', { class: `row ${cls}` },
      icon(ic, { size: 24 }),
      el('span', { class: 'row__name' }, name, desc ? el('span', { class: 'row__desc', text: desc }) : null),
      qty !== undefined ? el('span', { class: 'row__qty', text: qty }) : el('span'),
      price !== undefined ? el('span', { class: 'row__price', text: price }) : btn ?? el('span'),
    );
  }

  function openRecicladora() {
    const mult = S.look.origen === 'endeudado' ? 1.15 : 1;
    const render = () => {
      const sellable = Object.entries(S.inv).filter(([id]) => MATERIALS[id]);
      const total = sellable.reduce((a, [id, q]) => a + MATERIALS[id].precio * q * mult, 0);
      const body = sellable.length
        ? el('ul', { class: 'rows' }, sellable.map(([id, q]) => {
            const m = MATERIALS[id];
            return rowEl({ ic: m.icon, name: m.name, desc: `${cop(m.precio * mult)} por ${m.unit}`, qty: `× ${q}`, price: cop(m.precio * q * mult) });
          }))
        : el('p', { class: 'empty', text: 'No traes nada para vender. Busca en las bolsas de basura: cartón, plástico, latas, chatarra y, con suerte, cobre.' });
      const foot = [
        moneyFoot(),
        button(total ? `Vender todo · ${cop(total)}` : 'Vender todo', {
          primary: true,
          disabled: !total,
          onClick: () => {
            for (const [id] of sellable) delete S.inv[id];
            S.money += total;
            S.stats.earned += total;
            S.stats.sold++;
            audio.bigCoin();
            hud.toast(`Vendiste por ${cop(total)}`, { kind: 'plata', ic: 'coins' });
            hud.refreshMenu(render());
          },
        }),
      ];
      return { body, foot };
    };
    const r = render();
    hud.openMenu({ title: 'Recicladora El Progreso', sub: 'Pagan de contado, al peso.', ic: 'recycle', ...r, onClose: resume });
  }

  function openTienda() {
    const render = () => {
      const body = el('ul', { class: 'rows' }, SHOP.map((s) => {
        const it = s.upgrade ? { name: s.name, icon: s.icon, desc: s.desc } : ITEMS[s.id];
        const owned = s.upgrade && S.capacity >= CAPACITY.costal;
        const heavy = !s.upgrade && load() + weightOf(s.id) * (s.qty ?? 1) > S.capacity;
        const cant = S.money < s.precio || owned || heavy;
        return el('li', { class: 'row' },
          icon(it.icon, { size: 24 }),
          el('span', { class: 'row__name' }, s.label ?? it.name, el('span', { class: 'row__desc', text: owned ? 'Ya lo tienes.' : heavy ? 'No te cabe en el costal.' : it.desc })),
          el('span', { class: 'row__price', text: cop(s.precio) }),
          button(owned ? 'Listo' : 'Comprar', {
            disabled: cant,
            onClick: () => {
              S.money -= s.precio;
              if (s.upgrade) S.capacity = CAPACITY.costal;
              else add(s.id, s.qty ?? 1);
              audio.ui();
              hud.toast(`Compraste ${s.label ?? it.name}`, { ic: 'bag' });
              hud.refreshMenu(render());
            },
          }),
        );
      }));
      return { body, foot: [moneyFoot(), button('Abrir el costal', { onClick: () => { hud.closeMenu(); openInventario(); } })] };
    };
    hud.openMenu({ title: 'Tienda La Esquinita', sub: 'Doña Rosa fía, pero solo a los conocidos.', ic: 'store', ...render(), onClose: resume });
  }

  function openInventario() {
    pause();
    const render = () => {
      const entries = Object.entries(S.inv);
      const body = entries.length
        ? el('ul', { class: 'rows' }, entries.map(([id, q]) => {
            const m = MATERIALS[id];
            const it = ITEMS[id];
            const usable = it?.use;
            return el('li', { class: 'row' },
              icon(m?.icon ?? it?.icon ?? 'box', { size: 24 }),
              el('span', { class: 'row__name' }, nameOf(id), el('span', { class: 'row__desc', text: m ? `Se vende en la recicladora · ${cop(m.precio)} por ${m.unit}` : it?.desc ?? '' })),
              el('span', { class: 'row__qty', text: `× ${q}` }),
              usable ? button(it.use.hambre ? 'Comer' : id === 'cigarrillo' ? 'Fumar' : 'Usar', { onClick: () => { consume(id); hud.refreshMenu(render()); } }) : el('span'),
            );
          }))
        : el('p', { class: 'empty', text: 'El costal está vacío.' });
      const foot = [
        el('span', { class: 'menu__money' }, `Carga ${load().toFixed(1).replace('.', ',')} / ${S.capacity} kg · `, el('span', { text: cop(S.money) })),
      ];
      return { body, foot };
    };
    hud.openMenu({ title: 'Tu costal', sub: 'Lo que cargas encima.', ic: 'backpack', ...render(), onClose: resume });
  }

  function reqLine(req) {
    return el('span', { class: 'req' }, Object.entries(req).map(([id, q]) => {
      const n = S.inv[id] ?? 0;
      return el('span', { class: n >= q ? 'req__ok' : 'req__no', text: `${nameOf(id)} ${Math.min(n, q)}/${q}` });
    }));
  }

  function openCambuche() {
    const render = () => {
      const body = el('ul', { class: 'rows' }, CAMBUCHE.map((p) => {
        const done = !!S.built[p.id];
        const locked = p.needs && !S.built[p.needs];
        const ok = Object.entries(p.req).every(([id, q]) => has(id, q));
        return el('li', { class: `row row--build ${done ? 'is-done' : ''} ${locked ? 'is-locked' : ''}` },
          icon(done ? 'check' : locked ? 'lock' : p.icon, { size: 24 }),
          el('span', { class: 'row__name' }, p.name, el('span', { class: 'row__desc', text: locked ? 'Primero arma la base.' : p.desc }), done || locked ? null : reqLine(p.req)),
          done ? el('span', { class: 'row__qty', text: 'Hecho' }) : button('Armar', {
            disabled: locked || !ok,
            onClick: () => {
              for (const [id, q] of Object.entries(p.req)) add(id, -q);
              S.built[p.id] = true;
              cambuche.set(S.built);
              audio.build();
              hud.toast(`Armaste: ${p.name}`, { kind: 'bien', ic: 'hammer' });
              hud.refreshMenu(render());
            },
          }),
        );
      }));
      const night = isNight();
      const foot = [
        el('span', { class: 'menu__money', text: S.built.base ? 'Dormir guarda la partida.' : 'Sin base no se puede dormir.' }),
        button(night ? 'Dormir hasta las 6:00' : 'Echar una siesta (3 h)', { primary: true, disabled: !S.built.base, onClick: () => sleep() }),
      ];
      return { body, foot };
    };
    hud.openMenu({ title: 'Tu cambuche', sub: 'Bajo el viaducto: aquí no llueve.', ic: 'tent', ...render(), onClose: resume });
  }

  // ---------- dormir / desmayo ----------
  function advance(minutes) {
    const before = S.minutes;
    S.minutes += minutes;
    S.day += Math.floor(S.minutes / 1440) - Math.floor(before / 1440);
  }

  function sleep() {
    hud.closeMenu();
    pause();
    sleeping = true;
    action = 'dormir';
    hud.fade(true, 'Durmiendo…');
    const h = hour();
    const hours = isNight() ? (h >= 18 ? 24 - h + 6 : 6 - h) : 3;
    setTimeout(() => {
      advance(hours * 60);
      const quality = 0.55 + (S.built.techo ? 0.15 : 0) + (S.built.cama ? 0.2 : 0) + (S.built.paredes ? 0.1 : 0);
      S.needs.sueno = clamp(S.needs.sueno + hours * 12 * quality + 10);
      S.needs.hambre = clamp(S.needs.hambre - hours * 2.2);
      S.needs.salud = clamp(S.needs.salud + hours * (S.built.techo ? 1.4 : 0.6));
      S.needs.vicio = clamp(S.needs.vicio - hours * 1.5 + (S.built.vela ? 15 : 0));
      if (S.built.techo && S.status.gripa && Math.random() < 0.5) S.status.gripa = false;
      S.wetMin = 0;
      const msgs = [];
      if (!S.built.paredes && hours >= 5 && Math.random() < 0.25) {
        const lost = Math.floor(S.money * 0.4);
        S.money -= lost;
        for (const id of Object.keys(S.inv)) if (MATERIALS[id]) S.inv[id] = Math.floor(S.inv[id] * 0.5);
        for (const id of Object.keys(S.inv)) if (!S.inv[id]) delete S.inv[id];
        msgs.push([`Te robaron mientras dormías (${cop(lost)} y material). Unas paredes ayudarían.`, 'malo', 'alert']);
      }
      S.stats.slept++;
      const ok = save();
      atmo.setWeather(Math.random() < 0.5 ? 'despejado' : 'llovizna', 60 + Math.random() * 90);
      hud.fade(false);
      sleeping = false;
      action = null;
      hud.toast(ok ? `Dormiste ${Math.round(hours)} h · Partida guardada` : `Dormiste ${Math.round(hours)} h · No se pudo guardar en este navegador`, { kind: ok ? 'bien' : 'malo', ic: 'save', ms: 3600 });
      msgs.forEach(([m, k, i]) => hud.toast(m, { kind: k, ic: i, ms: 5000 }));
      resume();
    }, 1700);
  }

  function faint() {
    pause();
    sleeping = true;
    hud.fade(true, 'Te desmayaste…');
    setTimeout(() => {
      const h = hour();
      advance(((24 - h + 8) % 24 || 24) * 60);
      S.money = Math.floor(S.money * 0.5);
      for (const id of Object.keys(S.inv)) if (MATERIALS[id]) delete S.inv[id];
      S.needs = { hambre: Math.max(S.needs.hambre, 30), sueno: 70, higiene: Math.max(S.needs.higiene, 20), salud: 35, vicio: 30 };
      S.status.gripa = false;
      S.wetMin = 0;
      controller.teleport(-34, -12.6, 0);
      hud.fade(false);
      sleeping = false;
      hud.toast('Despertaste en el parque. Te sacaron la mitad de la plata y el material.', { kind: 'malo', ic: 'alert', ms: 5200 });
      resume();
    }, 2200);
  }

  // ---------- objetivos ----------
  const STEPS = [
    { done: () => S.stats.bags >= 3, text: () => `Busca en bolsas de basura (${Math.min(S.stats.bags, 3)}/3)`, target: () => nearestBag() },
    { done: () => S.stats.sold >= 1, text: () => 'Vende el material en la Recicladora El Progreso', target: () => PLACES.recicladora },
    { done: () => S.stats.ate >= 1, text: () => 'Compra comida en la Tienda La Esquinita y cómetela desde el costal', target: () => (Object.keys(S.inv).some((id) => ITEMS[id]?.use?.hambre) ? null : PLACES.tienda) },
    { done: () => !!S.built.base, text: () => `Junta cartón (${Math.min(S.inv.carton ?? 0, 8)}/8) y arma tu cambuche bajo el viaducto`, target: () => ((S.inv.carton ?? 0) >= 8 ? PLACES.cambuche : nearestBag()) },
    { done: () => S.stats.slept >= 1, text: () => 'Duerme en el cambuche: así se guarda la partida', target: () => PLACES.cambuche },
  ];
  function nearestBag() {
    let best = null, bd = Infinity;
    for (const b of bags.bags) {
      if (!b.active) continue;
      const d = Math.hypot(b.x - controller.st.pos.x, b.z - controller.st.pos.z);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  function freeHint() {
    const n = S.needs;
    const low = Object.entries(n).sort((a, b) => a[1] - b[1])[0];
    if (low[1] < 35) {
      if (low[0] === 'hambre') return ['Tienes hambre: compra comida en la tienda', PLACES.tienda];
      if (low[0] === 'sueno') return ['Estás muerto de sueño: ve a dormir al cambuche', PLACES.cambuche];
      if (low[0] === 'vicio') return ['Tienes ansiedad: compra un cigarrillo suelto en la tienda', PLACES.tienda];
      if (low[0] === 'higiene') return ['Hueles a basura: lávate en la pila del parque', PLACES.pila];
      if (low[0] === 'salud') return [S.status.gripa ? 'Tienes gripa: compra acetaminofén y descansa bajo techo' : 'Estás débil: come y duerme bajo techo', S.status.gripa ? PLACES.tienda : PLACES.cambuche];
    }
    const next = CAMBUCHE.find((p) => !S.built[p.id]);
    if (next) return [`Mejora el cambuche: ${next.name.toLowerCase()}`, PLACES.cambuche];
    return ['Pide monedas en el semáforo cuando esté en rojo', { x: -13, z: 1.2 }];
  }
  function objectiveInfo() {
    while (S.objective < STEPS.length && STEPS[S.objective].done()) {
      S.objective++;
      if (lastObjectiveStep !== -1) {
        hud.toast('Objetivo cumplido', { kind: 'bien', ic: 'check' });
        audio.coin();
      }
    }
    lastObjectiveStep = S.objective;
    if (S.objective < STEPS.length) {
      const st = STEPS[S.objective];
      return { step: `Objetivo ${S.objective + 1} de ${STEPS.length}`, text: st.text(), target: st.target() };
    }
    const [text, tg] = freeHint();
    return { step: 'Rebusque libre', text, target: tg };
  }

  // ---------- interacción ----------
  function findTarget() {
    const p = controller.st.pos;
    const cands = [];
    const d2 = (x, z) => Math.hypot(x - p.x, z - p.z);
    for (const b of bags.bags) {
      if (!b.active) continue;
      const d = d2(b.x, b.z);
      if (d < 1.5) {
        const full = load() + 0.5 > S.capacity;
        cands.push({ id: 'bolsa', d, bag: b, hold: 1.3, text: full ? 'Costal lleno · ve a vender' : 'Buscar en la bolsa', blocked: full, icon: 'search', pose: 'buscar', x: b.x, z: b.z });
      }
    }
    const pl = PLACES;
    if (d2(pl.recicladora.x, pl.recicladora.z) < pl.recicladora.r) cands.push({ id: 'recicladora', d: 1, text: 'Vender material', icon: 'recycle' });
    if (d2(pl.tienda.x, pl.tienda.z) < pl.tienda.r) cands.push({ id: 'tienda', d: 1, text: 'Comprar en la tienda', icon: 'store' });
    if (d2(pl.pila.x, pl.pila.z) < pl.pila.r) cands.push({ id: 'pila', d: 0.8, hold: 2.2, text: has('jabon') ? 'Bañarse con jabón' : 'Lavarse en la pila', icon: 'bath', pose: 'banar' });
    if (d2(pl.cambuche.x, pl.cambuche.z) < pl.cambuche.r) cands.push({ id: 'cambuche', d: 1.2, text: S.built.base ? 'Entrar al cambuche' : 'Armar el cambuche', icon: 'tent' });
    const car = traffic.stoppedNear(p, t);
    if (car) cands.push({ id: 'pedir', d: 0.5, car, hold: 1.5, text: 'Pedir una moneda', icon: 'hand', pose: 'pedir', x: car.x, z: car.z });
    cands.sort((a, b) => a.d - b.d);
    return cands[0] ?? null;
  }

  function trigger(tg) {
    switch (tg.id) {
      case 'recicladora': pause(); openRecicladora(); break;
      case 'tienda': pause(); openTienda(); break;
      case 'cambuche': pause(); openCambuche(); break;
      case 'bolsa': searchBag(tg.bag); break;
      case 'pila': bathe(); break;
      case 'pedir': beg(tg.car); break;
      default:
    }
  }

  function pause() {
    paused = true;
    ctx.input.releasePointer();
  }
  function resume() {
    if (sleeping) return;
    paused = false;
  }

  // ---------- simulación ----------
  function simulate(dt) {
    const gm = dt; // 1 s real = 1 minuto de juego
    const h = gm / 60;
    const prevDay = S.day;
    advance(gm);
    if (S.day !== prevDay) hud.toast(`Día ${S.day}`, { ic: 'sun' });

    const n = S.needs;
    const running = controller.st.speed > 3;
    n.hambre -= 4.2 * h * (S.status.malestar > 0 ? 1.5 : 1);
    n.sueno -= 4.6 * h * (running ? 1.4 : 1);
    n.higiene -= 1.6 * h;
    n.vicio -= 3.2 * h;
    if (S.status.malestar > 0) S.status.malestar = Math.max(0, S.status.malestar - gm);

    const p = controller.st.pos;
    const cover = sheltered(p.x, p.z);
    const rain = atmo.weather.intensity;
    const exposed = rain > 0.2 && !cover;
    const hardy = S.look.origen === 'desplazado' ? 0.6 : 1;
    if (exposed) {
      S.wetMin = Math.min(400, S.wetMin + gm * rain);
      n.salud -= 2.2 * h * rain * hardy;
      if (S.wetMin > 150 * (hardy < 1 ? 1.5 : 1) && !S.status.gripa && Math.random() < 0.002) {
        S.status.gripa = true;
        hud.toast('Te dio gripa por andar mojado', { kind: 'malo', ic: 'thermometer', ms: 3600 });
        audio.bad();
      }
    } else {
      S.wetMin = Math.max(0, S.wetMin - gm * (cover ? 1.2 : 0.6));
    }
    if (S.status.gripa) n.salud -= 1.5 * h;
    if (n.hambre <= 0) n.salud -= 6 * h;
    if (n.sueno <= 0) n.salud -= 1 * h;
    if (n.vicio < 20) n.salud -= 0.7 * h; // abstinencia
    if (n.hambre > 50 && n.sueno > 40 && !S.status.gripa) n.salud += 0.8 * h;
    for (const k of Object.keys(n)) n[k] = clamp(n[k]);
    if (n.salud <= 0) faint();
    return { exposed, cover };
  }

  function statuses(exposed) {
    const s = [];
    if (S.wetMin > 30) s.push({ id: 'mojado', label: 'Mojado', icon: 'droplets', tone: 'azul' });
    if (S.status.gripa) s.push({ id: 'gripa', label: 'Gripa', icon: 'thermometer', tone: 'rojo' });
    if (S.status.malestar > 0) s.push({ id: 'malestar', label: 'Malestar', icon: 'alert' });
    if (S.needs.vicio < 20) s.push({ id: 'abstinencia', label: 'Abstinencia', icon: 'flame', tone: 'rojo' });
    if (load() > S.capacity * 0.9) s.push({ id: 'lleno', label: 'Costal lleno', icon: 'backpack' });
    if (exposed && atmo.weather.intensity > 0.6) s.push({ id: 'aguacero', label: 'Busca techo', icon: 'rain', tone: 'azul' });
    return s;
  }

  return {
    get state() { return S; },
    get paused() { return paused; },
    start(state) {
      S = state;
      lastObjectiveStep = -1;
      character.setLook(S.look);
      controller.teleport(S.pos[0], S.pos[1], S.yaw);
      cambuche.set(S.built);
      bags.restore(S.bagState, S.minutes);
      if (S.weather) atmo.setWeather(S.weather.kind, S.weather.remaining);
      else atmo.setWeather('despejado', 75);
      paused = false;
    },
    pause,
    resume,
    openInventario,
    setLook(l) {
      if (S) S.look = l;
      character.setLook(l);
    },
    /** Pide una interacción (desde un clic): camina hasta ella y la usa al llegar. */
    queue(q) { queued = q; autoHold = false; },
    get target() { return target; },
    activate() {
      if (!target || paused) return;
      if (target.hold) autoHold = true;
      else trigger(target);
    },
    save,
    hour,
    /** Un cuadro de juego. Devuelve el estado del entorno para el render. */
    frame(dt, inp, now) {
      t = now;
      const h = S ? hour() : 17.1;
      const env = atmo.update(dt, now, {
        hour: h,
        gameMinutes: S && !paused ? dt : 0,
        focus: controller.st.pos,
        camera: engine.camera,
      });
      city.update(now, env);
      city.setFacadeNight?.(env.night);
      const lights = traffic.update(dt, now, S && !paused ? controller.st.pos : null);
      void lights;
      cambuche.update(now);
      if (!S) return env;

      let exposed = false, cover = true;
      if (!paused) {
        ({ exposed, cover } = simulate(dt));
        bags.update(S.minutes, controller.st.pos);
      }

      // interacción
      target = paused ? null : findTarget();
      if (queued && !paused) {
        const match = target && (target.id === queued.id) && (!queued.bag || target.bag === queued.bag);
        if (match && !controller.st.path) {
          if (target.hold) autoHold = true;
          else trigger(target);
          queued = null;
        } else if (!controller.st.path && !match) {
          queued = null;
        }
      }
      if (inp.moveX || inp.moveY) autoHold = false;
      if (autoHold && (!target || !target.hold)) autoHold = false;
      if (target?.hold && inp.actPressed) autoHold = true;
      const holdingAction = target?.hold && (inp.act || autoHold) && !target.blocked;
      if (holdingAction) {
        hold += dt / target.hold;
        action = target.pose;
        actionUntil = now + 0.15;
        if (target.x !== undefined) controller.faceTo(target.x, target.z);
        if (hold >= 1) {
          hold = 0;
          autoHold = false;
          trigger(target);
        }
      } else {
        hold = Math.max(0, hold - dt * 3);
        if (target && !target.hold && inp.actPressed) trigger(target);
      }
      if (now > actionUntil && action !== 'dormir') action = null;

      const sleepy = S.needs.sueno < 12 ? 0.8 : 1;
      const heavy = (load() > S.capacity * 0.85 ? 0.85 : 1) * (S.needs.vicio < 20 ? 0.88 : 1);
      city.cutaway(controller.st.pos, controller.st.camYaw, dt);
      const res = controller.update(dt, paused ? { ...inp, moveX: 0, moveY: 0 } : inp, {
        locked: !!holdingAction || sleeping,
        speedMul: sleepy * heavy,
        collideCars: (p, r) => traffic.collide(p, r),
      });
      if (res.hit && !paused) {
        S.needs.salud = clamp(S.needs.salud - res.hit * 1.6);
        controller.st.shake = 1;
        hud.toast('¡Casi te atropellan!', { kind: 'malo', ic: 'alert' });
        audio.honk();
      }

      character.update(dt, {
        speed: controller.st.speed,
        running: inp.run,
        action,
        t: now,
        load: load() / S.capacity,
        dirt: 1 - S.needs.higiene / 100,
        wet: Math.min(1, S.wetMin / 60),
      });

      // tráfico cercano para el audio
      let near = 0;
      for (const c of traffic.cars) {
        const d = Math.hypot(c.x - controller.st.pos.x, c.z - controller.st.pos.z);
        near = Math.max(near, (Math.min(1, c.v / 10)) * Math.max(0, 1 - d / 22));
      }
      audio.update(dt, { rain: env.rain, sheltered: cover, traffic: near, speed: paused ? 0 : controller.st.speed, wet: env.rain > 0.1 });

      hudTimer -= dt;
      if (hudTimer <= 0) {
        hudTimer = 0.1;
        hud.update({ money: S.money, needs: S.needs, minutes: S.minutes, day: S.day, weather: env, statuses: statuses(exposed) });
        hud.wet(exposed && env.rain > 0.6);
        const obj = objectiveInfo();
        const gps = ctx.guide?.target ? ctx.guide : null;
        let aim = obj.target;
        if (gps) {
          obj.step = 'GPS · destino marcado';
          obj.text = `${gps.target.label} · ${Math.round(gps.dist ?? 0)} m`;
          aim = gps.route?.[0] ?? gps.target;
        }
        let angle = null;
        if (aim) {
          const dx = aim.x - controller.st.pos.x;
          const dz = aim.z - controller.st.pos.z;
          const c = Math.cos(controller.st.camYaw), s = Math.sin(controller.st.camYaw);
          const sx = dx * c - dz * s, sy = dx * s + dz * c;
          angle = Math.atan2(sx, -sy);
          if (Math.hypot(dx, dz) < (gps ? 0.8 : 3)) angle = null;
        }
        hud.objective({ step: obj.step, text: obj.text, angle });
        minimap.draw({ px: controller.st.pos.x, pz: controller.st.pos.z, yaw: controller.st.yaw, camYaw: controller.st.camYaw, objective: gps ? gps.target : obj.target, t: now, route: gps?.route });
      }
      hud.prompt(target ? { ...target, progress: target.hold ? hold : 0 } : null);
      return env;
    },
  };
}

export { ORIGINS };
