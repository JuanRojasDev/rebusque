/** Audio 100 % sintetizado con WebAudio: no hay archivos que descargar. */
export function createAudio() {
  let ctx = null;
  let master, rainGain, heavyGain, humGain, trafficGain, noiseBuf;
  let muted = false;
  let stepT = 0;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = w * 0.6 + last * 3;
    }

    const loop = (filters, gain) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      let node = src;
      for (const f of filters) { node.connect(f); node = f; }
      node.connect(gain);
      gain.connect(master);
      src.start();
    };
    const filt = (type, freq, q = 0.7) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    };
    rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    loop([filt('highpass', 500), filt('lowpass', 7000)], rainGain);
    heavyGain = ctx.createGain();
    heavyGain.gain.value = 0;
    loop([filt('bandpass', 1300, 0.6)], heavyGain);
    humGain = ctx.createGain();
    humGain.gain.value = 0.05;
    loop([filt('lowpass', 160)], humGain);
    trafficGain = ctx.createGain();
    trafficGain.gain.value = 0;
    loop([filt('lowpass', 340), filt('peaking', 90, 1)], trafficGain);
  }

  function burst({ freq = 800, type = 'bandpass', q = 1, dur = 0.08, gain = 0.2, sweep = null }) {
    if (!ctx || muted) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  function tone(freq, dur, { type = 'sine', gain = 0.12, at = 0, slide = null } = {}) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = type;
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  return {
    init,
    resume() { init(); ctx?.resume?.(); },
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.8;
    },
    update(dt, { rain = 0, sheltered = false, traffic = 0, speed = 0, wet = true }) {
      if (!ctx) return;
      const r = rain * (sheltered ? 0.45 : 1);
      rainGain.gain.value += (r * 0.22 - rainGain.gain.value) * Math.min(1, dt * 2);
      heavyGain.gain.value += ((sheltered ? rain * 0.12 : rain * 0.06) - heavyGain.gain.value) * Math.min(1, dt * 2);
      trafficGain.gain.value += (traffic * 0.5 - trafficGain.gain.value) * Math.min(1, dt * 4);
      if (speed > 0.3) {
        stepT -= dt * (1.2 + speed * 0.5);
        if (stepT <= 0) {
          stepT = 0.55;
          burst({ freq: wet ? 1100 : 600, q: 0.8, dur: wet ? 0.09 : 0.05, gain: wet ? 0.06 : 0.04 });
        }
      }
    },
    thunder(delay = 1) {
      if (!ctx || muted) return;
      setTimeout(() => {
        burst({ freq: 420, type: 'lowpass', q: 0.5, dur: 3.6, gain: 0.55, sweep: 60 });
        burst({ freq: 180, type: 'lowpass', q: 0.4, dur: 4.5, gain: 0.4, sweep: 40 });
      }, delay * 1000);
    },
    honk() {
      tone(392, 0.32, { type: 'square', gain: 0.05 });
      tone(494, 0.32, { type: 'square', gain: 0.04 });
    },
    coin() {
      tone(1318, 0.09, { gain: 0.08 });
      tone(1760, 0.18, { gain: 0.07, at: 0.07 });
    },
    bigCoin() {
      tone(988, 0.1, { gain: 0.08 });
      tone(1318, 0.1, { gain: 0.08, at: 0.08 });
      tone(1760, 0.3, { gain: 0.08, at: 0.16 });
    },
    rustle() { burst({ freq: 2400, q: 0.5, dur: 0.18, gain: 0.07 }); },
    splash() { burst({ freq: 900, q: 0.4, dur: 0.6, gain: 0.12, sweep: 300 }); },
    bad() { tone(220, 0.25, { type: 'triangle', gain: 0.08, slide: 150 }); },
    ui() { tone(660, 0.05, { gain: 0.05 }); },
    build() {
      burst({ freq: 300, q: 1.2, dur: 0.12, gain: 0.2 });
      burst({ freq: 260, q: 1.2, dur: 0.12, gain: 0.18 });
    },
  };
}
