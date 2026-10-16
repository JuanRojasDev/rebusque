import { icon, setIcon } from './icons.js';
import { NEEDS, cop } from '../game/data.js';

const $ = (id) => document.getElementById(id);

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === false || v === null || v === undefined) continue;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) e.append(c);
  return e;
}

export function createHud() {
  const root = $('hud');
  const needsEl = $('needs');
  const needEls = {};
  for (const n of NEEDS) {
    const li = el('li', { class: 'need', 'data-level': 'verde', 'aria-label': n.label },
      el('span', { class: 'need__icon' }, icon(n.icon, { size: 16, stroke: 2.5 })),
      el('span', { class: 'need__label', text: n.label }),
      el('span', { class: 'need__bar', 'aria-hidden': 'true' }, el('span', { class: 'need__fill' })),
      el('span', { class: 'need__value', text: '0' }));
    needsEl.append(li);
    needEls[n.id] = { li, value: li.querySelector('.need__value'), fill: li.querySelector('.need__fill'), last: -1, level: '' };
  }

  setIcon($('btn-inv'), 'backpack');
  setIcon($('btn-pause'), 'pause');
  setIcon($('touch-act'), 'hand', { size: 34 });
  setIcon($('touch-run'), 'run');
  setIcon($('menu-close'), 'x');
  setIcon($('objective-arrow'), 'arrow', { size: 36, stroke: 3 });

  const prompt = $('prompt');
  prompt.addEventListener('click', () => hud.onPrompt?.());
  const promptText = $('prompt-text');
  const promptKey = $('prompt-key');
  const promptHold = $('prompt-hold');
  const promptFill = promptHold.firstElementChild;
  let promptId = null;
  let lastMoney = null;
  let lastObjective = '';
  let menuOnClose = null;
  let lastFocus = null;
  let touch = false;

  const menu = $('menu');
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); hud.closeMenu(); }
  });
  $('menu-close').addEventListener('click', () => hud.closeMenu());
  menu.addEventListener('pointerdown', (e) => {
    if (e.target === menu) hud.closeMenu();
  });

  const hud = {
    root,
    show(on) { root.hidden = !on; },
    setTouch(on) {
      touch = on;
      $('touch').hidden = !on;
    },
    update({ money, needs, minutes, day, weather, statuses }) {
      if (money !== lastMoney) {
        $('money').textContent = cop(money);
        if (lastMoney !== null && money > lastMoney) {
          const p = $('plate-money');
          p.classList.remove('is-bump');
          void p.offsetWidth;
          p.classList.add('is-bump');
        }
        lastMoney = money;
      }
      for (const n of NEEDS) {
        const v = Math.round(needs[n.id]);
        const e = needEls[n.id];
        if (e.last !== v) {
          e.value.textContent = v;
          e.fill.style.transform = `scaleX(${Math.max(0, Math.min(100, v)) / 100})`;
          e.last = v;
          const level = v < 30 ? 'rojo' : v < 60 ? 'ambar' : 'verde';
          if (level !== e.level) {
            e.li.dataset.level = level;
            e.level = level;
            e.li.setAttribute('aria-label', `${n.label}: ${v} de 100`);
          }
        }
      }
      const h = Math.floor(minutes / 60) % 24;
      const m = Math.floor(minutes % 60);
      $('clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      $('day').textContent = `Día ${day}`;
      const wIcon = weather.kind === 'aguacero' ? 'storm' : weather.kind === 'llovizna' ? 'drizzle' : (h >= 18 || h < 6) ? 'moon' : 'sun';
      if ($('weather').dataset.icon !== wIcon) {
        setIcon($('weather'), wIcon, { size: 26 });
        $('weather').dataset.icon = wIcon;
        $('weather').setAttribute('aria-label', weather.kind === 'aguacero' ? 'Aguacero' : weather.kind === 'llovizna' ? 'Llovizna' : 'Sin lluvia');
      }
      const st = $('status');
      const key = statuses.map((s) => s.id).join('|');
      if (st.dataset.key !== key) {
        st.dataset.key = key;
        st.replaceChildren(...statuses.map((s) => el('li', { class: `chip ${s.tone ? `chip--${s.tone}` : ''}` }, icon(s.icon, { size: 14 }), s.label)));
      }
    },
    prompt(t) {
      if (!t) {
        if (!prompt.hidden) prompt.hidden = true;
        promptId = null;
        return;
      }
      const id = `${t.id}|${t.text}|${t.blocked ? 1 : 0}`;
      if (promptId !== id) {
        promptId = id;
        prompt.hidden = false;
        promptText.textContent = t.text;
        prompt.classList.toggle('is-blocked', !!t.blocked);
        if (touch) setIcon(promptKey, t.icon ?? 'hand', { size: 20 });
        else promptKey.textContent = 'E';
        promptHold.hidden = !t.hold;
      }
      promptFill.style.width = `${Math.round((t.progress ?? 0) * 100)}%`;
    },
    toast(text, { kind = '', ic = 'check', ms = 2600 } = {}) {
      const box = $('toasts');
      const t = el('div', { class: `toast ${kind ? `toast--${kind}` : ''}` }, icon(ic, { size: 16 }), text);
      box.append(t);
      while (box.children.length > 5) box.firstElementChild.remove();
      setTimeout(() => {
        t.classList.add('is-out');
        setTimeout(() => t.remove(), 280);
      }, ms);
    },
    objective({ step, text, angle }) {
      const sign = $('objective');
      if (text !== lastObjective) {
        $('objective-text').textContent = text;
        $('objective-step').textContent = step;
        sign.classList.remove('is-new');
        void sign.offsetWidth;
        sign.classList.add('is-new');
        lastObjective = text;
      }
      const arrow = $('objective-arrow');
      if (angle === null || angle === undefined) {
        arrow.style.visibility = 'hidden';
      } else {
        arrow.style.visibility = 'visible';
        arrow.style.transform = `rotate(${angle}rad)`;
      }
    },
    get menuOpen() { return !menu.hidden; },
    openMenu({ title, sub = '', ic = 'store', body, foot = [], onClose = null }) {
      lastFocus = document.activeElement;
      setIcon($('menu-icon'), ic, { size: 34 });
      $('menu-title').textContent = title;
      $('menu-sub').textContent = sub;
      $('menu-body').replaceChildren(typeof body === 'function' ? body() : body);
      $('menu-foot').replaceChildren(...foot);
      $('menu-foot').hidden = foot.length === 0;
      menuOnClose = onClose;
      menu.hidden = false;
      const first = menu.querySelector('.menu__foot .btn--primary:not([disabled])') || menu.querySelector('.menu__body button:not([disabled])') || $('menu-close');
      first?.focus({ preventScroll: true });
    },
    refreshMenu({ body, foot, sub }) {
      if (menu.hidden) return;
      const scroll = $('menu-body').scrollTop;
      if (body) $('menu-body').replaceChildren(typeof body === 'function' ? body() : body);
      if (foot) $('menu-foot').replaceChildren(...foot);
      if (sub !== undefined) $('menu-sub').textContent = sub;
      $('menu-body').scrollTop = scroll;
    },
    closeMenu() {
      if (menu.hidden) return;
      menu.hidden = true;
      const cb = menuOnClose;
      menuOnClose = null;
      cb?.();
      lastFocus?.focus?.({ preventScroll: true });
    },
    fade(on, text = '') {
      const f = $('fade');
      f.textContent = text;
      f.classList.toggle('is-on', on);
    },
    wet(on) { $('fx-wet').classList.toggle('is-on', on); },
  };
  return hud;
}

export function button(label, { primary = false, small = true, disabled = false, onClick, ghost = !primary } = {}) {
  return el('button', {
    type: 'button',
    class: `btn ${primary ? 'btn--primary' : ''} ${ghost ? 'btn--ghost' : ''} ${small ? 'btn--small' : ''}`,
    disabled: disabled || null,
    onclick: onClick,
  }, label);
}
