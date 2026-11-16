/* Find Your Impact: quiz flow, scoring, lead capture and kiosk behaviour. */
(() => {
  const D = window.IMPACT;
  const $ = s => document.querySelector(s);
  const KIOSK = new URLSearchParams(location.search).has('kiosk');
  const STORE = 'ii-fair:v1:leads';
  const PRINTS = 'ii-fair:v1:prints';
  const img = n => `img/${n}.jpg`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const Q = id => D.questions.find(q => q.id === id);
  const opt = (id, v) => (Q(id).options || []).find(o => o.v === v);

  document.body.classList.toggle('is-kiosk', KIOSK);
  const land = Land.Live($('#land'));

  /* ---------- storage (wrapped: private mode can throw) ---------- */
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

  /* ---------- state ---------- */
  let state;
  const fresh = () => { state = { step: 0, answers: {}, result: null, lead: null }; };
  fresh();

  /* ---------- screens ---------- */
  function show(name) {
    document.body.dataset.screen = name;
    window.scrollTo(0, 0);
    const h = document.querySelector(`#screen-${name} h1, #screen-${name} h2`);
    if (h && name !== 'quiz') { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  /* ---------- intro ---------- */
  function buildIntro() {
    const stack = $('#photo-stack');
    stack.innerHTML = D.stack.map((p, i) => `
      <figure class="card" style="--i:${i}">
        <img src="${img(p.img)}" alt="" ${i > 2 ? 'loading="lazy"' : ''} decoding="async">
        ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}
      </figure>`).join('');
    const cards = [...stack.children];
    let front = 0;
    const order = () => cards.forEach((c, i) => c.style.setProperty('--pos', (i - front + cards.length) % cards.length));
    order();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInterval(() => { if (document.body.dataset.screen === 'intro') { front = (front + 1) % cards.length; order(); } }, 3600);
    }

    const items = Object.values(D.programs).map(p => `<span>${esc(p.name)} <em>${esc(p.tag)}</em></span>`).join('');
    $('#ticker').innerHTML = items + items;

    if (window.QRCode) { // shown on wide screens and in kiosk mode (see CSS)
      const url = location.protocol.startsWith('http') ? location.origin + location.pathname : 'https://impact-internship.com/';
      new QRCode($('#qr'), { text: url, width: 104, height: 104, colorDark: '#121a30', colorLight: '#f4ede1' });
      $('#intro-qr').hidden = false;
    }
    updateCount();
  }

  function updateCount() {
    const today = new Date().toDateString();
    const n = read(STORE, []).filter(l => new Date(l.created_at).toDateString() === today).length;
    const el = $('#intro-count');
    el.hidden = n === 0;
    el.textContent = `${n} ${n === 1 ? 'student has' : 'students have'} found their match here today.`;
  }

  /* ---------- scoring ---------- */
  function scores(a) {
    const s = Object.fromEntries(Object.keys(D.programs).map(k => [k, 0]));
    const add = sc => { for (const k in sc) s[k] += sc[k]; };
    if (a.study) add(opt('study', a.study).score);
    if (a.day != null) {
      const n = a.day / 100;
      const q = Q('day');
      for (const k in s) s[k] += (q.nature[k] || 0) * n + (q.people[k] || 0) * (1 - n);
    }
    if (a.place) add(opt('place', a.place).score);
    if (a.learn) add(opt('learn', a.learn).score);
    return s;
  }
  const ranking = a => {
    const s = scores(a), keys = Object.keys(s);
    return keys.sort((x, y) => s[y] - s[x] || keys.indexOf(x) - keys.indexOf(y)).map(k => ({ k, v: s[k] }));
  };

  /* ---------- landscape from answers ---------- */
  function hash(str) { let h = 7; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function landFrom(a) {
    const p = { ...Land.DEFAULTS };
    if (a.study) p.ox = Q('study').options.findIndex(o => o.v === a.study) * 1.7;
    if (a.day != null) p.warmth = 1 - a.day / 100;
    if (a.place === 'rw') { p.hills = 0.95; p.coast = 0; p.table = 0; }
    if (a.place === 'sa') { p.hills = 0.4; p.coast = 1; p.table = 1; }
    if (a.rank) p.oy = Q('rank').options.findIndex(o => o.v === a.rank[0]) * 1.3 + 0.4;
    if (a.learn) p.warmth = clamp(p.warmth + ({ create: 0.15, teach: 0.1, analyse: 0, explore: -0.15 }[a.learn] || 0));
    if (a.months) p.levels = 6 + a.months;
    if (a.start) p.oz = (hash(a.start) % 100) / 40;
    return p;
  }

  /* ---------- live meter ---------- */
  function buildMeter() {
    $('#meter-list').innerHTML = Object.entries(D.programs).map(([k, p]) => `
      <li data-k="${k}"><span class="meter__name">${esc(p.name)}</span>
      <span class="meter__place">${esc(p.tag)}</span>
      <span class="meter__bar"><i></i></span></li>`).join('');
  }
  function updateMeter() {
    const r = ranking(state.answers);
    const top = Math.max(8, r[0].v);
    const answered = Object.keys(state.answers).length > 0;
    r.forEach((x, i) => {
      const li = $(`#meter-list [data-k="${x.k}"]`);
      li.style.order = i;
      li.classList.toggle('is-top', answered && i === 0);
      li.querySelector('i').style.width = `${answered ? Math.max(4, (x.v / top) * 100) : 6}%`;
    });
  }

  function answer(id, v) {
    state.answers[id] = v;
    land.set(landFrom(state.answers));
    land.mark(true);
    updateMeter();
    $('#next').disabled = false;
  }

  /* ---------- quiz rendering ---------- */
  const ICONS = {
    create: '<path d="M8 40 L22 12 L36 40" /><path d="M14 30 H30" /><circle cx="22" cy="12" r="3"/>',
    teach: '<path d="M6 12 C14 9 20 10 24 14 C28 10 34 9 42 12 V38 C34 35 28 36 24 40 C20 36 14 35 6 38 Z" /><path d="M24 14 V40" />',
    analyse: '<path d="M8 40 H40" /><rect x="11" y="26" width="6" height="14" /><rect x="21" y="16" width="6" height="24" /><rect x="31" y="8" width="6" height="32" />',
    explore: '<circle cx="24" cy="24" r="17" /><path d="M30 18 L26.5 26.5 L18 30 L21.5 21.5 Z" />',
    build: '<rect x="8" y="28" width="14" height="12" /><rect x="26" y="28" width="14" height="12" /><rect x="17" y="14" width="14" height="12" />',
    protect: '<path d="M24 6 C32 12 38 12 40 12 C40 28 34 37 24 42 C14 37 8 28 8 12 C10 12 16 12 24 6 Z" /><path d="M24 34 C24 26 28 20 33 18 C30 24 28 28 24 34" />'
  };

  function render() {
    const q = D.questions[state.step];
    const a = state.answers[q.id];
    const n = D.questions.length;

    $('#route').innerHTML = D.questions.map((x, i) =>
      `<li class="${i < state.step ? 'done' : ''} ${i === state.step ? 'current' : ''}" ${i === state.step ? 'aria-current="step"' : ''}><span class="sr">Question ${i + 1}</span></li>`).join('');

    let body = '';
    switch (q.type) {
      case 'chips':
        body = `<div class="chips" role="radiogroup" aria-labelledby="q-title">${q.options.map(o =>
          `<button type="button" class="chip" role="radio" aria-checked="${a === o.v}" data-v="${o.v}">${esc(o.label)}</button>`).join('')}</div>`;
        break;
      case 'slider': {
        const v = a ?? 50;
        body = `<div class="duo" style="--mixv:${v / 100}">
            <img class="duo__a" src="${img(q.left.img)}" alt="">
            <img class="duo__b" src="${img(q.right.img)}" alt="">
            <span class="duo__line" aria-hidden="true"></span>
            <p class="duo__read" id="duo-read">${sliderWord(v)}</p>
          </div>
          <div class="slider">
            <span>${esc(q.left.label)}</span>
            <input type="range" min="0" max="100" value="${v}" id="slide" aria-label="${esc(q.left.label)} to ${esc(q.right.label)}" aria-valuetext="${sliderWord(v)}">
            <span>${esc(q.right.label)}</span>
          </div>`;
        break;
      }
      case 'split':
        body = `<div class="split" role="radiogroup" aria-labelledby="q-title">${q.options.map(o => `
          <button type="button" class="split__opt" role="radio" aria-checked="${a === o.v}" data-v="${o.v}">
            <img src="${img(o.img)}" alt="">
            <span class="split__text"><strong>${esc(o.label)}</strong><em>${esc(o.sub)}</em></span>
          </button>`).join('')}</div>`;
        break;
      case 'rank': {
        const order = a || q.options.map(o => o.v);
        body = `<ol class="rank" id="rank">${order.map((v, i) => `
          <li data-v="${v}"><span class="rank__n">${i + 1}</span><span class="rank__grip" aria-hidden="true"></span>
          <span class="rank__label">${esc(opt('rank', v).label)}</span>
          <span class="rank__btns"><button type="button" data-move="-1" aria-label="Move ${esc(opt('rank', v).label)} up">↑</button><button type="button" data-move="1" aria-label="Move ${esc(opt('rank', v).label)} down">↓</button></span></li>`).join('')}</ol>`;
        break;
      }
      case 'tiles':
        body = `<div class="tiles" role="radiogroup" aria-labelledby="q-title">${q.options.map(o => `
          <button type="button" class="tile" role="radio" aria-checked="${a === o.v}" data-v="${o.v}">
            <svg viewBox="0 0 48 48" aria-hidden="true">${ICONS[o.v]}</svg>
            <strong>${esc(o.label)}</strong><span>${esc(o.sub)}</span>
          </button>`).join('')}</div>`;
        break;
      case 'timeline': {
        const v = a ?? q.recommended;
        const ticks = Array.from({ length: q.max - q.min + 1 }, (_, i) => i + q.min)
          .map(m => `<span class="${m === q.recommended ? 'rec' : ''}">${m}</span>`).join('');
        body = `<div class="tl">
            <p class="tl__big"><span id="tl-n">${v}</span> <span id="tl-unit">${v === 1 ? 'month' : 'months'}</span></p>
            <p class="tl__note" id="tl-note">${tlNote(v, q)}</p>
            <input type="range" min="${q.min}" max="${q.max}" step="1" value="${v}" id="tl" aria-label="Months" style="--p:${(v - q.min) / (q.max - q.min)}">
            <div class="tl__ticks" aria-hidden="true">${ticks}</div>
          </div>`;
        break;
      }
      case 'months': {
        const now = new Date();
        const list = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() + 1 + i, 1));
        body = `<div class="months" role="radiogroup" aria-labelledby="q-title">${list.map(d => {
          const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return `<button type="button" class="month" role="radio" aria-checked="${a === v}" data-v="${v}">
            <strong>${d.toLocaleString('en-GB', { month: 'short' })}</strong><span>${d.getFullYear()}</span></button>`;
        }).join('')}<button type="button" class="month month--wide" role="radio" aria-checked="${a === 'unsure'}" data-v="unsure"><strong>Not sure yet</strong></button></div>`;
        break;
      }
    }

    const stage = $('#stage');
    stage.innerHTML = `
      <p class="q__count"><em>${String(state.step + 1).padStart(2, '0')}</em> / ${String(n).padStart(2, '0')} <span>${esc(q.kicker)}</span></p>
      <h2 class="q__title" id="q-title" tabindex="-1">${esc(q.title)}</h2>
      <p class="q__hint">${esc(q.hint)}</p>
      <div class="q__body q__body--${q.type}">${body}</div>`;
    stage.classList.remove('is-out');
    void stage.offsetWidth;
    stage.classList.add('is-in');

    // defaults count as an answer for sliders and ranking, so Next works straight away
    if (q.type === 'slider' && a == null) answer('day', 50);
    if (q.type === 'timeline' && a == null) answer('months', q.recommended);
    if (q.type === 'rank' && a == null) answer('rank', q.options.map(o => o.v));

    $('#back').style.visibility = state.step === 0 ? 'hidden' : 'visible';
    $('#next').disabled = state.answers[q.id] == null;
    $('#next').firstChild.textContent = state.step === n - 1 ? 'See my match ' : 'Next ';
    wire(q);
    $('#q-title').focus({ preventScroll: true });
  }

  function sliderWord(v) {
    return v < 20 ? 'All about people' : v < 40 ? 'Mostly people' : v <= 60 ? 'An even mix' : v <= 80 ? 'Mostly nature' : 'All about nature';
  }
  function tlNote(v, q) {
    if (v === q.recommended) return 'Our recommended length.';
    if (v >= 9) return 'Long enough to spend your whole study-abroad period with us.';
    if (v <= 2) return 'Short and focused.';
    return v < q.recommended ? 'A shorter stay.' : 'Time to really settle in.';
  }

  function pick(q, btn) {
    btn.parentElement.querySelectorAll('[role=radio]').forEach(b => b.setAttribute('aria-checked', b === btn));
    answer(q.id, btn.dataset.v);
    clearTimeout(pick.t);
    pick.t = setTimeout(next, q.type === 'split' ? 650 : 420);
  }

  function wire(q) {
    const stage = $('#stage');
    if (['chips', 'split', 'tiles', 'months'].includes(q.type)) {
      stage.querySelectorAll('[role=radio]').forEach(b => b.addEventListener('click', () => pick(q, b)));
    }
    if (q.type === 'slider') {
      const r = $('#slide');
      r.addEventListener('input', () => {
        const v = +r.value;
        stage.querySelector('.duo').style.setProperty('--mixv', v / 100);
        $('#duo-read').textContent = sliderWord(v);
        r.setAttribute('aria-valuetext', sliderWord(v));
        answer('day', v);
      });
    }
    if (q.type === 'timeline') {
      const r = $('#tl');
      r.addEventListener('input', () => {
        const v = +r.value;
        $('#tl-n').textContent = v;
        $('#tl-unit').textContent = v === 1 ? 'month' : 'months';
        $('#tl-note').textContent = tlNote(v, q);
        r.style.setProperty('--p', (v - q.min) / (q.max - q.min));
        answer('months', v);
      });
    }
    if (q.type === 'rank') wireRank();
  }

  function wireRank() {
    const list = $('#rank');
    const commit = () => {
      [...list.children].forEach((li, i) => { li.querySelector('.rank__n').textContent = i + 1; });
      answer('rank', [...list.children].map(li => li.dataset.v));
    };
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-move]');
      if (!b) return;
      const li = b.closest('li'), dir = +b.dataset.move;
      const sib = dir < 0 ? li.previousElementSibling : li.nextElementSibling;
      if (!sib) return;
      dir < 0 ? list.insertBefore(li, sib) : list.insertBefore(sib, li);
      commit();
      b.focus();
    });
    let drag = null, offset = 0;
    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        drag = li; offset = e.clientY;
        li.setPointerCapture(e.pointerId);
        li.classList.add('is-drag');
      });
      li.addEventListener('pointermove', e => {
        if (drag !== li) return;
        // swap with neighbours (as many as the pointer has passed), keeping the item under the finger
        for (let guard = 0; guard < 4; guard++) {
          li.style.transform = '';
          const home = li.getBoundingClientRect().top;
          const prev = li.previousElementSibling, nxt = li.nextElementSibling;
          if (prev && e.clientY < prev.getBoundingClientRect().top + prev.offsetHeight / 2) list.insertBefore(li, prev);
          else if (nxt && e.clientY > nxt.getBoundingClientRect().top + nxt.offsetHeight / 2) list.insertBefore(nxt, li);
          else break;
          offset += li.getBoundingClientRect().top - home;
        }
        li.style.transform = `translateY(${e.clientY - offset}px)`;
      });
      const end = () => { if (drag !== li) return; drag = null; li.classList.remove('is-drag'); li.style.transform = ''; commit(); };
      li.addEventListener('pointerup', end);
      li.addEventListener('pointercancel', end);
      li.addEventListener('lostpointercapture', end);
      window.addEventListener('pointerup', end);
    });
  }

  function go(step) {
    const stage = $('#stage');
    stage.classList.remove('is-in');
    stage.classList.add('is-out');
    setTimeout(() => { state.step = step; render(); }, 200);
  }
  function next() {
    const q = D.questions[state.step];
    if (state.answers[q.id] == null) return;
    if (state.step < D.questions.length - 1) go(state.step + 1);
    else finish();
  }

  /* ---------- result ---------- */
  function monthLabel(v) {
    if (!v || v === 'unsure') return 'Start date open';
    const [y, m] = v.split('-').map(Number);
    return 'From ' + new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  }
  function because(a, prog) {
    const parts = [];
    if (a.study) parts.push(opt('study', a.study).phrase);
    if (a.place && prog.places.includes(a.place)) parts.push(opt('place', a.place).phrase);
    else if (a.day != null) parts.push(a.day > 60 ? "you're happiest out in nature" : a.day < 40 ? 'you come alive around people' : 'you want people and nature in your days');
    if (a.learn) parts.push(opt('learn', a.learn).phrase);
    else if (a.rank) parts.push(opt('rank', a.rank[0]).phrase);
    const last = parts.pop();
    return `Because ${parts.length ? parts.join(', ') + ' and ' : ''}${last}.`;
  }

  async function finish() {
    const r = ranking(state.answers);
    const k = r[0].k, k2 = r[1].k;
    const a = state.answers;
    const where = p => p.places.includes(a.place) ? a.place : p.places[0];
    const prog = D.programs[k], placeKey = where(prog), place = D.places[placeKey];
    const alt = D.programs[k2], altPlace = D.places[where(alt)];
    const n = read(PRINTS, 0) + 1; write(PRINTS, n);
    state.result = { k, k2, place: placeKey, number: `Nº ${String(n).padStart(4, '0')}` };

    $('#result-title').textContent = prog.name;
    $('#result-sub').textContent = prog.sub || '';
    $('#result-sub').hidden = !prog.sub;
    $('#result-place').innerHTML = `${esc(place.city)}, ${esc(place.country)} <span>${esc(place.coords)}</span>`;
    $('#result-because').textContent = because(a, prog);
    const moved = a.place && placeKey !== a.place ? ` This role runs in ${place.city}.` : '';
    $('#result-blurb').textContent = `${prog.blurb}${moved} ${place.way}`;
    $('#result-photo').innerHTML = `<img src="${img(prog.img)}" alt="">`;
    $('#result-alt').innerHTML = `Also worth a look: <strong>${esc(alt.name)}</strong> in ${esc(altPlace.city)}, ${esc(altPlace.country)}.`;
    $('#result-extra').innerHTML = `<strong>What you'd work on</strong><span>${prog.tasks.map(esc).join('</span><span>')}</span>`;
    $('#result-extra').hidden = false;

    try { await document.fonts.ready; } catch { /* fonts are optional */ }
    Land.print($('#print'), landFrom({ ...a, place: placeKey }), {
      number: state.result.number,
      title: prog.name,
      place: `${place.city}, ${place.country}`,
      line: `${a.months} ${a.months === 1 ? 'month' : 'months'}  ·  ${monthLabel(a.start)}`
    });
    land.mark(false);
    show('result');
  }

  /* ---------- lead form ---------- */
  const sheet = $('#form-sheet');
  function openForm() {
    const prog = D.programs[state.result.k];
    $('#form-intro').textContent = `We'll send your ${prog.name} match, the open vacancies that fit it and your print.`;
    sheet.showModal();
    setTimeout(() => $('#f-name').focus(), 50);
  }
  function validate() {
    const f = $('#lead-form');
    const checks = {
      name: f.name.value.trim().length > 1,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()),
      school: f.school.value.trim().length > 1,
      year: !!f.year.value,
      consent: f.consent.checked
    };
    let first = null;
    for (const [k, ok] of Object.entries(checks)) {
      const el = f[k];
      el.closest('.field, .check')?.classList.toggle('is-invalid', !ok);
      $(`#e-${k}`).classList.toggle('is-shown', !ok);
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok && !first) first = el;
    }
    if (first) first.focus();
    return !first;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    const f = e.target, a = state.answers;
    const lead = {
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
      created_at: new Date().toISOString(),
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      school: f.school.value.trim(),
      study_year: f.year.value,
      phone: f.phone.value.trim(),
      consent: true,
      marketing: f.news.checked,
      study: opt('study', a.study)?.label || '',
      people_nature: a.day,
      destination: `${D.places[state.result.place].city}, ${D.places[state.result.place].country}`,
      priorities: (a.rank || []).map(v => opt('rank', v).label).join(' > '),
      learns_by: opt('learn', a.learn)?.label || '',
      months: a.months,
      start: a.start,
      match: D.programs[state.result.k].name,
      second_match: D.programs[state.result.k2].name,
      print_no: state.result.number,
      source: KIOSK ? 'kiosk' : 'phone',
      synced: false
    };
    const all = read(STORE, []);
    all.push(lead);
    write(STORE, all);
    state.lead = lead;
    sync();

    sheet.close();
    const first = lead.name.split(/\s+/)[0];
    $('#thanks-title').innerHTML = `You're on the map, <em>${esc(first)}.</em>`;
    $('#thanks-text').textContent = `The Impact Internship team will send your ${lead.match} match file to ${lead.email}. Come and say hi at the stand, we'd love to hear what you're looking for.`;
    show('thanks');
    if (KIOSK) countdown();
  }

  /* Sends unsent sign-ups to the Cloudflare Worker (set in data.js), which saves and emails them.
     Each sign-up stays on this device until the Worker confirms it, so a weak fair Wi-Fi loses nothing. */
  let syncing = false;
  async function sync() {
    const base = (D.worker || '').replace(/\/+$/, '');
    if (!base || syncing || !navigator.onLine) return;
    syncing = true;
    try {
      const all = read(STORE, []);
      let changed = false;
      for (const l of all.filter(x => !x.synced)) {
        const { synced, ...row } = l;
        try {
          const res = await fetch(`${base}/lead`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row)
          });
          if (res.ok || res.status === 400 || res.status === 413) { l.synced = res.ok ? true : 'rejected'; changed = true; }
          else if (res.status === 429) break;
        } catch { break; }
      }
      if (changed) write(STORE, all);
    } finally { syncing = false; }
  }
  addEventListener('online', sync);
  setInterval(sync, 60 * 1000);

  function savePrint() {
    $('#print').toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'impact-internship-field-print.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  }

  /* ---------- reset and kiosk timers ---------- */
  let timer = null, lastTouch = Date.now();
  function reset() {
    clearInterval(timer); timer = null;
    clearTimeout(pick.t);
    [sheet, $('#idle'), $('#admin')].forEach(d => d.open && d.close());
    $('#lead-form').reset();
    document.querySelectorAll('.is-invalid, .is-shown').forEach(el => el.classList.remove('is-invalid', 'is-shown'));
    fresh();
    land.reset();
    land.mark(false);
    updateMeter();
    updateCount();
    show('intro');
  }
  function countdown() {
    let s = D.kiosk.thanksSeconds;
    const el = $('#thanks-reset');
    el.hidden = false;
    const tick = () => { el.textContent = `Next explorer in ${s}s`; if (s-- <= 0) reset(); };
    tick();
    timer = setInterval(tick, 1000);
  }
  if (KIOSK) {
    ['pointerdown', 'keydown', 'input'].forEach(ev => addEventListener(ev, () => { lastTouch = Date.now(); }, true));
    setInterval(() => {
      const scr = document.body.dataset.screen;
      const idle = $('#idle');
      if (scr === 'intro' || scr === 'thanks' || idle.open || $('#admin').open) return;
      if (Date.now() - lastTouch > D.kiosk.idleSeconds * 1000) {
        let s = D.kiosk.idleCountdown;
        idle.showModal();
        const t = setInterval(() => {
          if (!idle.open) return clearInterval(t);
          $('#idle-text').textContent = `Starting fresh for the next person in ${s}s.`;
          if (s-- <= 0) { clearInterval(t); reset(); }
        }, 1000);
        $('#idle-text').textContent = `Starting fresh for the next person in ${s + 1}s.`;
      }
    }, 1000);
  }

  /* ---------- staff panel ---------- */
  function openAdmin() {
    const all = read(STORE, []);
    const waiting = all.filter(l => !l.synced).length, rejected = all.filter(l => l.synced === 'rejected').length;
    $('#admin-summary').textContent = `${all.length} sign-up${all.length === 1 ? '' : 's'} saved in this browser.` +
      (D.worker
        ? (waiting ? ` ${waiting} still waiting to be sent (they go out when the connection is back).` : ' All sent to the inbox and database.') +
          (rejected ? ` ${rejected} refused by the server: keep them via the CSV.` : '')
        : ' Sending is not set up, so download the CSV before clearing this browser.');
    sync();
    $('#admin-table').innerHTML = all.length ? `<table><thead><tr><th>When</th><th>Name</th><th>Email</th><th>School</th><th>Match</th></tr></thead><tbody>${
      all.slice().reverse().map(l => `<tr><td>${new Date(l.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${esc(l.name)}</td><td>${esc(l.email)}</td><td>${esc(l.school)}</td><td>${esc(l.match)}</td></tr>`).join('')}</tbody></table>` : '<p>No sign-ups yet.</p>';
    $('#admin').showModal();
  }
  function csv() {
    const all = read(STORE, []);
    if (!all.length) return;
    const cols = Object.keys(all[0]);
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const text = [cols.join(','), ...all.map(l => cols.map(c => cell(l[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' }));
    a.download = `impact-fair-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  /* ---------- events ---------- */
  $('#start').addEventListener('click', () => { state.step = 0; render(); show('quiz'); });
  $('#next').addEventListener('click', next);
  $('#back').addEventListener('click', () => state.step > 0 && go(state.step - 1));
  $('#restart').addEventListener('click', reset);
  $('#again').addEventListener('click', reset);
  $('#thanks-restart').addEventListener('click', reset);
  $('#open-form').addEventListener('click', openForm);
  $('#close-form').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });
  $('#lead-form').addEventListener('submit', submit);
  $('#lead-form').addEventListener('input', e => { // clear a field's error as soon as it is edited
    const k = e.target.name;
    if (!k || !$(`#e-${k}`)) return;
    e.target.closest('.field, .check')?.classList.remove('is-invalid');
    $(`#e-${k}`).classList.remove('is-shown');
    e.target.removeAttribute('aria-invalid');
  });
  $('#save-print').addEventListener('click', savePrint);
  $('#idle-stay').addEventListener('click', () => { lastTouch = Date.now(); $('#idle').close(); });
  $('#admin-close').addEventListener('click', () => { $('#admin').close(); if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search); });
  $('#admin-csv').addEventListener('click', csv);
  $('#admin-clear').addEventListener('click', () => {
    const n = read(STORE, []).length;
    if (n && confirm(`Delete all ${n} sign-ups from this browser? This can't be undone. Download the CSV first if you need them.`)) {
      write(STORE, []); openAdmin(); updateCount();
    }
  });

  // logo: tap = back to start, hold 3 seconds = staff panel
  let hold;
  const brand = $('#brand');
  brand.addEventListener('pointerdown', () => { hold = setTimeout(() => { hold = 'opened'; openAdmin(); }, 3000); });
  brand.addEventListener('pointerup', () => { if (hold !== 'opened') { clearTimeout(hold); if (document.body.dataset.screen !== 'intro') reset(); } hold = null; });
  brand.addEventListener('pointerleave', () => { if (hold !== 'opened') clearTimeout(hold); });
  brand.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reset(); } });
  brand.addEventListener('contextmenu', e => e.preventDefault());

  const checkHash = () => { if (location.hash === '#admin') openAdmin(); };
  addEventListener('hashchange', checkHash);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.body.dataset.screen === 'quiz' && !e.target.closest('button, input')) next();
  });

  buildIntro();
  buildMeter();
  updateMeter();
  show('intro');
  checkHash();
  sync();
})();
