(() => {
  'use strict';

  /* ================= elements ================= */
  const $ = (id) => document.getElementById(id);
  const el = {
    screen:   $('screen'),
    formula:  $('formula'),
    mem:      $('mem'),
    keypad:   $('keypad'),
    calc:     $('calc'),
    swatches: $('swatches'),
    soundBtn: $('soundBtn'),
    dice:     $('dice'),
    themeName:$('themeName'),
    creditModal: $('creditModal'),
  };

  /* ================= themes ================= */
  const THEMES = [
    { id: 'black',   name: 'Black',    prev: 'linear-gradient(135deg,#1c1c1e,#000000)' },
    { id: 'dark',    name: 'Midnight', prev: 'linear-gradient(135deg,#22d3ee,#312e81)' },
    { id: 'light',   name: 'Paper',    prev: 'linear-gradient(135deg,#ff7a3d,#f4ede2)' },
    { id: 'rainbow', name: 'Rainbow',  prev: 'conic-gradient(#f43f5e,#f97316,#facc15,#4ade80,#22d3ee,#a78bfa,#f43f5e)' },
    { id: 'sunset',  name: 'Sunset',   prev: 'linear-gradient(135deg,#ff9a76,#c94277)' },
    { id: 'ocean',   name: 'Ocean',    prev: 'linear-gradient(135deg,#2ee6c8,#0a3a52)' },
    { id: 'neon',    name: 'Neon',     prev: 'linear-gradient(135deg,#00ffd5,#a855f7)' },
    { id: 'candy',   name: 'Candy',    prev: 'linear-gradient(135deg,#ff9ecb,#b8e9ff)' },
    { id: 'retro',   name: 'Retro',    prev: 'linear-gradient(135deg,#f2b33c,#2f5d34)' },
    { id: 'forest',  name: 'Forest',   prev: 'linear-gradient(135deg,#ffd23f,#14502f)' },
  ];

  const storage = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked — ignore */ } },
  };

  let theme   = storage.get('vibe.theme', 'black');
  let soundOn = storage.get('vibe.sound', '1') !== '0';

  /* ================= calculator state ================= */
  const S = {
    entry: '',       // digits currently being typed
    prev: null,      // stored operand
    op: null,        // pending operator
    ans: null,       // last result
    memory: 0,
    justEval: false, // last action was "="
    error: false,
    lastOp: null,    // for repeated "="
    lastVal: null,
    formula: '',
    lastRender: '',
  };

  const MAX_LEN = 15;
  const round = (v) => Number(v.toPrecision(12));
  const isNum = (v) => typeof v === 'number' && isFinite(v);

  function fmt(v) {
    if (!isFinite(v)) return 'Error';
    const abs = Math.abs(v);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
      return v.toExponential(7).replace(/\.?0+e/, 'e').replace('e+', 'e');
    }
    return v.toLocaleString('en-US', { maximumFractionDigits: 12 });
  }

  function formatEntry(s) {
    if (s.includes('e')) return s;
    const neg = s.startsWith('-');
    const body = neg ? s.slice(1) : s;
    const [i, f] = body.split('.');
    const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + grouped + (f !== undefined ? '.' + f : '');
  }

  const opSym = (o) => ({ add: '+', sub: '−', mul: '×', div: '÷' }[o] || o);

  /* ================= engine ================= */
  function resetAll() {
    S.entry = ''; S.prev = null; S.op = null; S.ans = null;
    S.justEval = false; S.error = false;
    S.lastOp = null; S.lastVal = null; S.formula = '';
  }

  function setError() {
    S.error = true;
    S.entry = ''; S.formula = '';
    sfx('err');
    const d = document.querySelector('.display');
    d.classList.remove('shake');
    void d.offsetWidth;
    d.classList.add('shake');
  }

  function apply(a, o, b) {
    const x = +a, y = +b;
    let r;
    switch (o) {
      case 'add': r = x + y; break;
      case 'sub': r = x - y; break;
      case 'mul': r = x * y; break;
      case 'div':
        if (y === 0) { setError(); return; }
        r = x / y; break;
      default: r = x + y;
    }
    return round(r);
  }

  function beginFresh() { // typing after "=" starts a new calculation
    S.entry = ''; S.prev = null; S.op = null;
    S.justEval = false; S.formula = '';
  }

  function digit(d) {
    if (S.error) resetAll();
    if (S.justEval) beginFresh();
    if (/^0+$/.test(S.entry)) { S.entry = d; return; }
    if (S.entry.replace('-', '').length >= MAX_LEN) return;
    S.entry += d;
  }

  function digit00() {
    if (S.error) resetAll();
    if (S.justEval) beginFresh();
    if (S.entry === '' || /^0+$/.test(S.entry)) { S.entry = '0'; return; }
    if (S.entry.replace('-', '').length + 2 > MAX_LEN) return;
    S.entry += '00';
  }

  function dot() {
    if (S.error) resetAll();
    if (S.justEval) beginFresh();
    if (S.entry.includes('.')) return;
    S.entry = S.entry === '' ? '0.' : S.entry + '.';
  }

  function setOp(o) {
    if (S.error) return;
    const v = S.entry !== '' ? parseFloat(S.entry) : null;
    if (S.prev === null) {
      S.prev = v !== null ? v : (S.ans !== null ? S.ans : 0);
    } else if (v !== null && S.op) {
      const r = apply(S.prev, S.op, v);
      if (S.error) return;
      S.prev = r;
    }
    S.op = o; S.entry = ''; S.justEval = false;
    S.lastOp = null; S.lastVal = null;
    S.formula = fmt(S.prev) + ' ' + opSym(o);
  }

  function finishValue(v) {
    if (!isNum(v)) { setError(); return false; }
    S.entry = String(round(v));
    S.justEval = false;
    return true;
  }

  function equals() {
    if (S.error) return;
    if (S.op && S.entry !== '') {
      const b = parseFloat(S.entry);
      const r = apply(S.prev, S.op, b);
      if (S.error) return;
      S.formula = fmt(S.prev) + ' ' + opSym(S.op) + ' ' + fmt(b) + ' =';
      S.ans = r; S.lastOp = S.op; S.lastVal = b;
      S.prev = null; S.op = null; S.entry = ''; S.justEval = true;
      confetti();
    } else if (S.op && S.entry === '' && S.prev !== null) {
      // "5 × =" repeats the operation with the same operand
      const r = apply(S.prev, S.op, S.prev);
      if (S.error) return;
      S.formula = fmt(S.prev) + ' ' + opSym(S.op) + ' ' + fmt(S.prev) + ' =';
      S.ans = r; S.lastOp = S.op; S.lastVal = S.prev;
      S.prev = null; S.op = null; S.entry = ''; S.justEval = true;
      confetti();
    } else if (S.justEval && S.ans !== null && S.lastOp !== null && S.lastVal !== null) {
      const r = apply(S.ans, S.lastOp, S.lastVal);
      if (S.error) return;
      S.formula = fmt(S.ans) + ' ' + opSym(S.lastOp) + ' ' + fmt(S.lastVal) + ' =';
      S.ans = r;
      S.prev = null; S.op = null; S.entry = ''; S.justEval = true;
    }
  }

  function backspace() {
    if (S.error || S.justEval) { resetAll(); return; }
    S.entry = S.entry.slice(0, -1);
  }

  function clearEntry() {
    if (S.error || S.justEval) { resetAll(); return; }
    S.entry = '';
  }

  function percent() {
    if (S.error) return;
    let v;
    if (S.entry !== '') {
      v = parseFloat(S.entry) / 100;
      // shop-calculator style: with a pending +/- , percent is relative to the stored value
      if (S.op && (S.op === 'add' || S.op === 'sub') && S.prev !== null) v = S.prev * v;
    } else {
      v = (S.ans !== null ? S.ans : 0) / 100;
    }
    finishValue(v);
  }

  function sqrt() {
    if (S.error) return;
    const base = S.entry !== '' ? parseFloat(S.entry) : (S.ans !== null ? S.ans : 0);
    finishValue(Math.sqrt(base));
  }

  function negate() {
    if (S.error) return;
    const base = S.entry !== '' ? parseFloat(S.entry) : (S.ans !== null ? S.ans : 0);
    finishValue(-base);
  }

  function recallAns() {
    if (S.ans !== null) { S.entry = String(S.ans); S.justEval = false; }
  }

  function mem(k) {
    if (S.error) return;
    const base = S.entry !== '' ? parseFloat(S.entry) : (S.ans !== null ? S.ans : 0);
    switch (k) {
      case 'mc': S.memory = 0; break;
      case 'mr': S.entry = String(S.memory); S.justEval = false; break;
      case 'm+': S.memory = round(S.memory + base); break;
      case 'm-': S.memory = round(S.memory - base); break;
    }
  }

  /* ================= render ================= */
  function render() {
    let txt;
    if (S.error) {
      txt = 'Error';
    } else if (S.entry !== '') {
      txt = formatEntry(S.entry);
    } else if (S.op && S.prev !== null) {
      txt = fmt(S.prev);
    } else if (S.ans !== null) {
      txt = fmt(S.ans);
    } else {
      txt = '0';
    }

    if (txt !== S.lastRender) {
      el.screen.classList.remove('bump');
      void el.screen.offsetWidth;
      el.screen.classList.add('bump');
      S.lastRender = txt;
    }

    el.screen.textContent = txt;
    el.screen.classList.toggle('small', txt.length > 11);
    el.screen.classList.toggle('err', S.error);
    el.formula.textContent = S.formula || '\u00A0';
    el.mem.style.opacity = S.memory !== 0 ? 1 : 0;
  }

  /* ================= audio ================= */
  let AC = null;
  const ACtor = window.AudioContext || window.webkitAudioContext;
  function audioCtx() {
    if (!ACtor) return null; // no Web Audio support — stay silent
    if (!AC) AC = new ACtor();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }

  function tone(freq, dur, { type = 'triangle', vol = 0.15, slide = 0, at = 0 } = {}) {
    if (!soundOn) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(30, freq), t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function clack(at = 0, vol = 0.4, freq = 2600) {
    if (!soundOn) return;
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime + at;
    const len = Math.max(1, Math.floor(c.sampleRate * 0.03));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t);
  }

  function sfx(kind) {
    if (!soundOn) return;
    audioCtx();
    switch (kind) {
      case 'num':   clack(0, .35, 3000); tone(220, .06, { vol: .1, slide: -70 }); break;
      case 'op':    clack(0, .4, 2000);  tone(330, .07, { type: 'square', vol: .05, slide: -90 }); break;
      case 'fn':    clack(0, .3, 1800);  tone(300, .05, { vol: .1, slide: -60 }); break;
      case 'clear': clack(0, .3, 2200);  tone(520, .09, { type: 'square', vol: .05, slide: -320 }); break;
      case 'eq':    clack(0, .4, 2800);  tone(523.25, .1, { vol: .14 }); tone(783.99, .16, { vol: .12, at: .07 }); break;
      case 'err':   tone(160, .22, { type: 'sawtooth', vol: .14, slide: -60 }); break;
      case 'theme': tone(660, .07, { vol: .09 }); tone(880, .1, { vol: .09, at: .06 }); break;
      case 'dice':  tone(440, .06, { vol: .09 }); tone(660, .06, { vol: .09, at: .05 }); tone(880, .1, { vol: .09, at: .1 }); break;
    }
  }

  /* ================= key interactions ================= */
  const kindOf = (key) => {
    if (key === 'eq') return 'eq';
    if (key === 'ac' || key === 'c' || key === 'bs') return 'clear';
    if (key === 'add' || key === 'sub' || key === 'mul' || key === 'div') return 'op';
    if (key === '0' || key === '00' || key === 'dot' || /^[1-9]$/.test(key)) return 'num';
    return 'fn';
  };

  function onKey(key) {
    switch (key) {
      case '0': case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9': digit(key); break;
      case '00':  digit00(); break;
      case 'dot': dot(); break;
      case 'add': case 'sub': case 'mul': case 'div': setOp(key); break;
      case 'eq':  equals(); break;
      case 'ac':  resetAll(); break;
      case 'c':   clearEntry(); break;
      case 'bs':  backspace(); break;
      case 'pct': percent(); break;
      case 'sqrt': sqrt(); break;
      case 'neg': negate(); break;
      case 'ans': recallAns(); break;
      case 'mc': case 'mr': case 'm+': case 'm-': mem(key); break;
    }
    render();
  }

  function press(btn) {
    btn.classList.add('pressed');
    clearTimeout(btn._pt);
    btn._pt = setTimeout(() => btn.classList.remove('pressed'), 220);
  }

  function ripple(btn, x, y) {
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.setProperty('--x', x + 'px');
    r.style.setProperty('--y', y + 'px');
    btn.appendChild(r);
    setTimeout(() => r.remove(), 500);
  }

  el.keypad.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    e.preventDefault();
    const rect = btn.getBoundingClientRect();
    ripple(btn, e.clientX - rect.left, e.clientY - rect.top);
    press(btn);
    sfx(kindOf(btn.dataset.key));
    onKey(btn.dataset.key);
  });

  // keyboard-originated activation of a focused button (Enter / Space)
  el.keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (btn && e.detail === 0) {
      press(btn);
      sfx(kindOf(btn.dataset.key));
      onKey(btn.dataset.key);
    }
  });

  el.keypad.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    if (modalOpen) { // the modal takes over the keyboard while it's open
      if (e.key === 'Escape') closeModal();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // a focused key button will also fire a click on Enter/Space — let it handle it
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest && e.target.closest('.key')) return;
    const map = {
      '+': 'add', '-': 'sub', '*': 'mul', '/': 'div',
      'Enter': 'eq', '=': 'eq', 'Escape': 'ac', 'Backspace': 'bs',
      '%': 'pct', '.': 'dot', ',': 'dot',
      'r': 'mr', 'R': 'mr',
    };
    const key = map[e.key] || (/^[0-9]$/.test(e.key) ? e.key : null) ||
                (e.key.toLowerCase() === 'c' ? 'c' : null);
    if (!key) return;
    if (e.key === '/' || e.key === 'Backspace') e.preventDefault();
    const btn = el.keypad.querySelector(`[data-key="${key}"]`);
    if (btn) { press(btn); sfx(kindOf(key)); }
    onKey(key);
  });

  window.addEventListener('blur', () => {
    el.keypad.querySelectorAll('.pressed').forEach((b) => b.classList.remove('pressed'));
  });

  /* ================= confetti ================= */
  function confetti() {
    const d = document.querySelector('.display').getBoundingClientRect();
    const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
    const cs = getComputedStyle(document.body);
    const colors = [
      cs.getPropertyValue('--accent').trim() || '#ffffff',
      cs.getPropertyValue('--ke1').trim(),
      cs.getPropertyValue('--ke2').trim(),
      '#ffd23f', '#ff8c5a',
    ];
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      const ang = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 140;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.setProperty('--tx', (Math.cos(ang) * dist) + 'px');
      p.style.setProperty('--ty', (Math.sin(ang) * dist + 60) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.width = (6 + Math.random() * 6) + 'px';
      p.style.height = (8 + Math.random() * 8) + 'px';
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  /* ================= credit modal ================= */
  const modal = el.creditModal;
  const brand = document.querySelector('.brand');
  let modalOpen = false;
  let autoShown = false;
  let modalTrigger = null;

  function openModal(fromTrigger) {
    if (modalOpen) return;
    modalOpen = true;
    modalTrigger = fromTrigger || null;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open'); // lock background scrolling
    sfx('theme');
    const close = modal.querySelector('.modal-close');
    if (close) close.focus();
  }

  function closeModal() {
    if (!modalOpen) return;
    modalOpen = false;
    autoShown = true; // don't re-trigger the auto popup after it's been dismissed
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    // hand focus back to whatever opened the popup
    if (modalTrigger && typeof modalTrigger.focus === 'function') modalTrigger.focus();
    modalTrigger = null;
    sfx('clear');
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('.modal-close') || e.target.closest('.modal-btn')) {
      closeModal();
    }
  });

  // the brand logo doubles as a way to re-open the credit popup
  if (brand) brand.addEventListener('click', () => openModal(brand));

  /* ================= themes & controls ================= */
  function buildSwatches() {
    THEMES.forEach((t) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.style.background = t.prev;
      b.title = t.name;
      b.dataset.theme = t.id;
      b.setAttribute('aria-label', t.name);
      el.swatches.appendChild(b);
    });
  }

  function applyTheme(id, silent) {
    theme = id;
    document.body.dataset.theme = id;
    storage.set('vibe.theme', id);
    el.swatches.querySelectorAll('.swatch').forEach((s) =>
      s.classList.toggle('active', s.dataset.theme === id));
    const t = THEMES.find((x) => x.id === id);
    if (t) el.themeName.textContent = t.name;
    // keep the browser chrome (status bar / tab bar) in sync on mobile
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const bg = getComputedStyle(document.body).getPropertyValue('--bg1').trim();
      if (bg) meta.content = bg;
    }
    // re-pop the calculator
    el.calc.classList.remove('pop');
    void el.calc.offsetWidth;
    el.calc.classList.add('pop');
    if (!silent) sfx('theme');
  }

  function setSound(on) {
    soundOn = on;
    storage.set('vibe.sound', on ? '1' : '0');
    el.soundBtn.textContent = on ? '🔊' : '🔇';
    el.soundBtn.classList.toggle('off', !on);
  }

  el.swatches.addEventListener('click', (e) => {
    const s = e.target.closest('.swatch');
    if (s) applyTheme(s.dataset.theme);
  });

  el.dice.addEventListener('click', () => {
    const others = THEMES.filter((t) => t.id !== theme);
    const pick = others[Math.floor(Math.random() * others.length)];
    applyTheme(pick.id);
    sfx('dice');
  });

  el.soundBtn.addEventListener('click', () => {
    setSound(!soundOn);
    if (soundOn) sfx('theme');
  });

  /* ================= init ================= */
  buildSwatches();
  applyTheme(theme, true);
  setSound(soundOn);
  render();

  // credit popup — let the calculator finish its entrance first
  setTimeout(() => { if (!autoShown) openModal(); }, 1100);
})();
