/* Mattedyket – spelets gränssnitt och logik. */
(function () {
  'use strict';

  const Q = window.MDQuestions;
  const ROUND = 10;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.lang = 'sv';

  // ---------- Havsvänner att samla ----------
  const FRIENDS = [
    { e: '🐠', name: 'Tropiska Tia', cost: 0 },
    { e: '🐟', name: 'Fisken Frans', cost: 5 },
    { e: '🦀', name: 'Krabban Krister', cost: 12, floor: true },
    { e: '🐡', name: 'Blåsfisken Blåsan', cost: 20 },
    { e: '🐚', name: 'Snäckan Sally', cost: 30, still: true },
    { e: '🐙', name: 'Bläckfisken Otto', cost: 42 },
    { e: '🦐', name: 'Räkan Rut', cost: 55 },
    { e: '🐢', name: 'Sköldpaddan Sigge', cost: 70 },
    { e: '🦞', name: 'Hummern Holger', cost: 85, floor: true },
    { e: '🐬', name: 'Delfinen Doris', cost: 100 },
    { e: '🦑', name: 'Kalmaren Kalle', cost: 120 },
    { e: '🦭', name: 'Sälen Selma', cost: 140 },
    { e: '🦦', name: 'Uttern Ulla', cost: 165 },
    { e: '🐧', name: 'Pingvinen Pingo', cost: 190 },
    { e: '🐳', name: 'Valen Vilma', cost: 220 },
    { e: '🦈', name: 'Hajen Harald', cost: 250 },
    { e: '🐋', name: 'Blåvalen Bo', cost: 290 },
    { e: '🧜', name: 'Sjöjungfrun Meja', cost: 340 },
    { e: '🐉', name: 'Havsdraken Ragnar', cost: 400 },
  ];
  const unlockedFor = (pearls) => FRIENDS.filter((f) => f.cost <= pearls);
  const nextFriend = (pearls) => FRIENDS.find((f) => f.cost > pearls);

  const PRAISE = ['Rätt!', 'Snyggt!', 'Toppen!', 'Klockrent!', 'Grymt bra!', 'Precis!', 'Superbra!', 'Härligt!', 'Pärlfint!', 'Du är en mattehaj!'];
  const PRAISE_AGAIN = ['Rätt! Bra att du försökte igen.', 'Där satt den!', 'Rätt – snyggt kämpat!'];
  const TRY_AGAIN = ['Nästan! Försök en gång till.', 'Inte riktigt. Testa igen!', 'Hoppsan! Prova en gång till.'];

  // ---------- Sparad data ----------
  const KEY = 'mattedyket.v1';
  const modeDefaults = () => ({ pearls: 0, rounds: 0, ratings: {}, stats: {}, disabled: {} });
  const defaults = () => ({
    settings: { muted: false, sound: true, speech: true, auto: { small: true, big: false } },
    modes: { small: modeDefaults(), big: modeDefaults() },
  });
  function merge(base, extra) {
    for (const k in extra) {
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k] && typeof base[k] === 'object') merge(base[k], extra[k]);
      else base[k] = extra[k];
    }
    return base;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch (e) { /* privat läge eller blockerad lagring */ }
    return defaults();
  }
  let store = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignoreras */ }
  }

  // ---------- Ljud (syntetiserat, fungerar offline) ----------
  const Sound = {
    ctx: null,
    get on() { return store.settings.sound && !store.settings.muted; },
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { this.ctx = new AC(); } catch (e) { return null; }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    },
    tone(f, t0, dur, o) {
      const opt = Object.assign({ type: 'sine', vol: 0.16, to: 0 }, o);
      const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
      osc.type = opt.type;
      osc.frequency.setValueAtTime(f, t0);
      if (opt.to) osc.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(opt.vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(c.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    },
    play(name) {
      if (!this.on) return;
      const c = this.ensure();
      if (!c) return;
      const t = c.currentTime + 0.02;
      switch (name) {
        case 'tap': this.tone(520, t, 0.08, { to: 880, vol: 0.06 }); break;
        case 'bubble': this.tone(260, t, 0.14, { to: 1200, vol: 0.1 }); break;
        case 'right': [523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.08, 0.22, { vol: 0.14 })); this.tone(1047, t + 0.24, 0.4, { vol: 0.1 }); break;
        case 'wrong': this.tone(330, t, 0.28, { type: 'triangle', to: 220, vol: 0.12 }); break;
        case 'pearl': this.tone(1319, t, 0.18, { vol: 0.08 }); this.tone(1760, t + 0.07, 0.3, { vol: 0.07 }); break;
        case 'star': this.tone(784, t, 0.3, { type: 'triangle', vol: 0.12, to: 1175 }); break;
        case 'fanfare': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.11, 0.3, { type: 'triangle', vol: 0.1 })); break;
        case 'unlock': [659, 784, 988, 1319].forEach((f, i) => this.tone(f, t + i * 0.1, 0.45, { vol: 0.11 })); break;
      }
    },
  };

  // ---------- Uppläsning ----------
  const Speech = {
    ok: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    voice: null,
    loaded: false,
    init() {
      if (!this.ok) return;
      const choose = () => {
        let voices = [];
        try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { /* ignoreras */ }
        if (voices.length) this.loaded = true;
        const sv = voices.filter((v) => /^sv([-_]|$)/i.test(v.lang));
        this.voice = sv.find((v) => v.localService) || sv[0] || null;
        refreshSpeakButton();
      };
      choose();
      try { window.speechSynthesis.addEventListener('voiceschanged', choose); } catch (e) { window.speechSynthesis.onvoiceschanged = choose; }
    },
    // Visa knappen om det finns en svensk röst – eller om webbläsaren inte listar röster alls.
    usable() { return this.ok && (!this.loaded || !!this.voice); },
    allowed() { return this.usable() && store.settings.speech && !store.settings.muted; },
    clean(t) {
      return String(t)
        .replace(/<[^>]+>/g, ' ')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?/gu, ' ')
        .replace(/·/g, ' gånger ')
        .replace(/−/g, ' minus ')
        .replace(/\+/g, ' plus ')
        .replace(/(\d)\s*\/\s*(\d)/g, '$1 delat med $2')
        .replace(/=/g, ' är ')
        .replace(/\s+/g, ' ')
        .trim();
    },
    speak(text, force) {
      if (!this.ok || !text || (!force && !this.allowed())) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(this.clean(text));
        u.lang = 'sv-SE';
        if (this.voice) u.voice = this.voice;
        u.rate = mode === 'small' ? 0.88 : 0.96;
        u.pitch = 1.05;
        window.speechSynthesis.speak(u);
      } catch (e) { /* ignoreras */ }
    },
    stop() { try { if (this.ok) window.speechSynthesis.cancel(); } catch (e) { /* ignoreras */ } },
  };
  const autoSpeak = () => store.settings.auto[mode] && Speech.allowed();

  // ---------- Skärmar ----------
  let screen = 'home';
  function show(id) {
    $$('.screen').forEach((s) => { s.hidden = s.id !== 'screen-' + id; });
    screen = id;
    if (id !== 'game') Speech.stop();
  }
  function setDepth(v) { document.documentElement.style.setProperty('--depth', String(v)); }

  function goHome() {
    clearTimeout(timer);
    cur = null;
    renderHome();
    setDepth(0);
    show('home');
  }

  function renderHome() {
    for (const m of ['small', 'big']) {
      const p = store.modes[m].pearls;
      $(`[data-pearls="${m}"] span`).textContent = p;
      const friends = unlockedFor(p);
      $(`[data-friends="${m}"]`).textContent = friends.slice(-3).map((f) => f.e).join('');
    }
    const btn = $('#btn-sound');
    btn.querySelector('use').setAttribute('href', store.settings.muted ? '#i-mute' : '#i-speak');
    btn.setAttribute('aria-label', store.settings.muted ? 'Slå på ljud' : 'Stäng av ljud');
    btn.classList.toggle('off', store.settings.muted);
  }

  // ---------- Dialog ----------
  let dialogResolve = null;
  function ask(o) {
    $('#dlg-title').textContent = o.title;
    $('#dlg-text').textContent = o.text;
    $('#dlg-cancel').textContent = o.cancel;
    $('#dlg-ok').textContent = o.ok;
    $('#dialog').hidden = false;
    $('#dlg-cancel').focus({ preventScroll: true });
    return new Promise((res) => { dialogResolve = res; });
  }
  function closeDialog(val) {
    $('#dialog').hidden = true;
    if (dialogResolve) { const r = dialogResolve; dialogResolve = null; r(val); }
  }

  // ---------- Spelomgång ----------
  let mode = 'small';
  let round = null;
  let cur = null;
  let timer = 0;

  const rating = (m, cat) => store.modes[m].ratings[cat] || 1;
  function enabledCats(m) {
    const all = Q.MODES[m].cats.map((c) => c.id);
    const on = all.filter((id) => !store.modes[m].disabled[id]);
    return on.length ? on : all;
  }

  function startRound(m) {
    mode = m;
    clearTimeout(timer);
    round = { i: 0, results: [], keys: new Set(), bag: [], cats: enabledCats(m), prev: null, pearls: 0, first: 0 };
    $('#progress').innerHTML = Array.from({ length: ROUND }, () => '<span class="pslot"></span>').join('');
    show('game');
    refreshSpeakButton();
    nextQuestion();
  }

  // Blanda kategorierna: alla valda områden kommer med innan något upprepas, aldrig samma två gånger i rad.
  function nextCat() {
    if (!round.bag.length) round.bag = Q.shuffle(round.cats);
    let i = round.bag.findIndex((c) => c !== round.prev);
    if (i < 0) { round.bag = round.bag.concat(Q.shuffle(round.cats)); i = round.bag.findIndex((c) => c !== round.prev); }
    if (i < 0) i = 0;
    const cat = round.bag.splice(i, 1)[0];
    round.prev = cat;
    return cat;
  }

  function nextQuestion() {
    if (round.i >= ROUND) { endRound(); return; }
    const cat = nextCat();
    let q, n = 0;
    do { q = Q.generate(mode, cat, rating(mode, cat)); } while (round.keys.has(q.key) && ++n < 15);
    round.keys.add(q.key);
    cur = { q, tries: 0, typed: '', locked: false };
    renderQuestion();
  }

  const slot = () => $('#q-prompt [data-slot]');

  function renderQuestion() {
    const q = cur.q;
    const info = Q.MODES[mode].cats.find((c) => c.id === q.cat);
    const card = $('#q-card');
    $('#q-cat').textContent = `${info.icon} ${info.name}`;
    $('#q-prompt').innerHTML = q.prompt;
    $('#q-visual').innerHTML = q.visual;
    $('#q-feedback').innerHTML = '';
    card.classList.remove('correct', 'shake', 'enter');
    void card.offsetWidth;
    card.classList.add('enter');
    $('#q-mascot').classList.remove('happy', 'sad');
    renderAnswers();
    updateProgress();
    setDepth(round.i / ROUND);
    $('#play').scrollTop = 0;
    if (autoSpeak()) { clearTimeout(timer); timer = setTimeout(() => Speech.speak(q.speak), 300); }
  }

  function renderAnswers() {
    const box = $('#answers');
    const q = cur.q;
    if (q.input === 'numpad') {
      box.innerHTML = '<div class="numpad" role="group" aria-label="Sifferknappar">' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key" type="button" data-key="${n}">${n}</button>`).join('') +
        '<button class="key erase" type="button" data-key="del" aria-label="Sudda"><svg><use href="#i-erase"/></svg></button>' +
        '<button class="key" type="button" data-key="0">0</button>' +
        '<button class="key ok" type="button" data-key="ok" aria-label="Svara" disabled><svg><use href="#i-check"/></svg></button></div>';
      const s = slot();
      if (s) s.classList.add('typing');
    } else {
      box.innerHTML = `<div class="choices" data-kind="${q.kind}" style="--n:${q.choices.length}">` +
        q.choices.map((c, i) => `<button class="choice" type="button" data-i="${i}"${c.aria ? ` aria-label="${c.aria}"` : ''}>${c.html}</button>`).join('') +
        '</div>';
    }
  }

  function keypad(k) {
    if (!cur || cur.locked) return;
    if (k === 'ok') { if (cur.typed) submit(Number(cur.typed)); return; }
    if (k === 'del') cur.typed = cur.typed.slice(0, -1);
    else if (cur.typed.length < 4) cur.typed = (cur.typed === '0' ? '' : cur.typed) + k;
    Sound.play('tap');
    const s = slot();
    if (s) s.textContent = cur.typed;
    const ok = $('#answers .key.ok');
    if (ok) ok.disabled = !cur.typed;
  }

  function submit(value, btn) {
    cur.tries++;
    if (value === cur.q.answer) correct(btn);
    else wrong(btn);
  }

  function answerHtml(q) {
    if (q.input === 'numpad') return String(q.answer);
    const c = q.choices.find((x) => x.value === q.answer);
    return c ? c.html : String(q.answer);
  }
  function fillSlot(cls) {
    const s = slot();
    if (!s) return;
    s.classList.remove('typing');
    s.innerHTML = answerHtml(cur.q);
    s.classList.add(cls);
  }
  function lockAnswers() { $$('#answers button').forEach((b) => { b.disabled = true; }); }
  function feedback(html) { $('#q-feedback').innerHTML = html; }
  function mascot(mood) {
    const m = $('#q-mascot');
    m.classList.remove('happy', 'sad');
    void m.offsetWidth;
    m.classList.add(mood);
  }

  function correct(btn) {
    cur.locked = true;
    const first = cur.tries === 1;
    const res = first ? 'first' : 'second';
    record(cur.q.cat, res);
    const idx = round.results.length;
    round.results.push(res);
    if (first) round.first++;
    round.pearls++;
    store.modes[mode].pearls++;
    save();

    fillSlot('ok');
    if (btn) btn.classList.add('right');
    lockAnswers();
    $('#q-card').classList.add('correct');
    mascot('happy');
    Sound.play('right');
    const praise = pick(first ? PRAISE : PRAISE_AGAIN);
    feedback(`<span class="praise">${praise}</span>`);
    if (autoSpeak()) Speech.speak(praise);
    flyPearl(idx, () => {
      updateProgress(true);
      Sound.play('pearl');
    });
    round.i++;
    clearTimeout(timer);
    timer = setTimeout(nextQuestion, first ? 1500 : 1800);
  }

  function wrong(btn) {
    const q = cur.q;
    Sound.play('wrong');
    if (navigator.vibrate) { try { navigator.vibrate(35); } catch (e) { /* ignoreras */ } }
    mascot('sad');
    const card = $('#q-card');
    card.classList.remove('shake', 'enter');
    void card.offsetWidth;
    card.classList.add('shake');

    if (cur.tries < 2) {
      if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
      if (q.input === 'numpad') {
        cur.typed = '';
        const s = slot();
        if (s) s.textContent = '';
        const ok = $('#answers .key.ok');
        if (ok) ok.disabled = true;
      }
      const t = pick(TRY_AGAIN);
      feedback(`<span class="try">${t}</span><span class="hint">💡 ${q.hint}</span>`);
      if (autoSpeak()) Speech.speak(`${t} ${q.hint}`);
      return;
    }

    cur.locked = true;
    record(q.cat, 'miss');
    round.results.push('miss');
    round.i++;
    if (btn) btn.classList.add('wrong');
    fillSlot('reveal');
    feedback(`<span class="explain"><b>Så här blir det:</b>${q.explain}</span>`);
    if (autoSpeak()) Speech.speak(q.explain);
    updateProgress();
    const last = round.i >= ROUND;
    $('#answers').innerHTML = `<div class="next-wrap"><button class="btn primary big" type="button" data-next>${last ? 'Se resultatet' : 'Nästa fråga'}</button></div>`;
    $('#answers [data-next]').focus({ preventScroll: true });
  }

  // Svårigheten anpassas per område: tre rätt i rad på första försöket ger nästa nivå.
  function record(cat, res) {
    const m = store.modes[mode];
    const st = m.stats[cat] || (m.stats[cat] = { n: 0, first: 0 });
    st.n++;
    if (res === 'first') st.first++;
    const r = rating(mode, cat) + (res === 'first' ? 0.36 : res === 'second' ? -0.1 : -0.5);
    m.ratings[cat] = Math.max(1, Math.min(5.99, r));
    save();
  }

  function updateProgress(popLast) {
    const slots = $$('#progress .pslot');
    slots.forEach((el, i) => {
      const r = round.results[i];
      const isNow = !r && i === round.results.length;
      el.className = 'pslot' + (r ? ' ' + r : '') + (isNow ? ' now' : '');
      el.innerHTML = r === 'first' || r === 'second' ? '<svg viewBox="0 0 24 24"><use href="#i-pearl"/></svg>' : '';
      if (popLast && i === round.results.length - 1) el.classList.add('pop');
    });
    const p = $('#progress');
    p.setAttribute('aria-valuenow', String(round.results.length));
    p.setAttribute('aria-valuetext', `${round.results.length} av ${ROUND} frågor klara`);
  }

  function flyPearl(idx, done) {
    const target = $$('#progress .pslot')[idx];
    if (!target || reducedMotion) { done(); return; }
    const a = $('#q-card').getBoundingClientRect(), b = target.getBoundingClientRect();
    const sx = a.left + a.width / 2 - 20, sy = a.top + a.height / 2 - 20;
    const el = document.createElement('div');
    el.className = 'fly';
    el.innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40"><use href="#i-pearl"/></svg>';
    el.style.left = sx + 'px';
    el.style.top = sy + 'px';
    el.style.transform = 'scale(1.8)';
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = `translate(${b.left + b.width / 2 - 20 - sx}px, ${b.top + b.height / 2 - 20 - sy}px) scale(.75)`;
    }));
    setTimeout(() => { el.remove(); done(); }, 780);
  }

  function endRound() {
    const m = store.modes[mode];
    const before = m.pearls - round.pearls;
    const first = round.first;
    const second = round.results.filter((r) => r === 'second').length;
    const stars = first >= 9 ? 3 : first >= 6 ? 2 : 1;
    m.pearls += stars;
    m.rounds++;
    save();
    const earned = round.pearls + stars;
    const newFriends = FRIENDS.filter((f) => f.cost > before && f.cost <= m.pearls);

    setDepth(0.9);
    const title = stars === 3 ? 'Fantastiskt dyk!' : stars === 2 ? 'Snyggt dykt!' : 'Bra kämpat!';
    $('#end-title').textContent = title;
    $('#end-stars').innerHTML = [1, 2, 3].map((s) => `<svg viewBox="0 0 24 24" class="${s <= stars ? 'on' : ''}"><use href="#i-star"/></svg>`).join('');
    $('#end-stars').setAttribute('aria-label', `${stars} av 3 stjärnor`);
    let summary = `${first} av ${ROUND} rätt på första försöket`;
    if (second) summary += ` och ${second} på andra`;
    $('#end-summary').textContent = summary + '.';
    $('#end-pearls').textContent = `+${earned}`;
    const unlock = $('#end-unlock');
    if (newFriends.length) {
      const f = newFriends[newFriends.length - 1];
      $('#unlock-emoji').textContent = f.e;
      $('#unlock-name').textContent = newFriends.length > 1 ? `${f.name} och ${newFriends.length - 1} till` : f.name;
      unlock.hidden = false;
    } else unlock.hidden = true;
    const nx = nextFriend(m.pearls);
    $('#end-next').textContent = nx ? `Nästa havsvän om ${nx.cost - m.pearls} pärlor.` : 'Du har hittat alla havsvänner!';
    show('end');
    Sound.play('fanfare');
    for (let s = 0; s < stars; s++) setTimeout(() => Sound.play('star'), 700 + s * 250);
    if (newFriends.length) setTimeout(() => Sound.play('unlock'), 1500);
    if (autoSpeak()) {
      const f = newFriends[newFriends.length - 1];
      setTimeout(() => Speech.speak(`${title} Du fick ${stars} ${stars === 1 ? 'stjärna' : 'stjärnor'}.${f ? ` Ny vän i akvariet: ${f.name}!` : ''}`), 900);
    }
    $('#btn-again').focus({ preventScroll: true });
  }

  // ---------- Akvariet ----------
  let aqMode = 'small';
  function openAquarium(m) {
    aqMode = m;
    mode = m;
    const p = store.modes[m].pearls;
    $('#aq-title').textContent = 'Akvariet';
    $('#aq-pearls span').textContent = p;
    const tank = $('#tank');
    const have = unlockedFor(p);
    tank.innerHTML = have.map((f, i) => {
      const dur = 14 + Math.random() * 14;
      const delay = -Math.random() * dur;
      const style = f.still
        ? `left:${12 + Math.random() * 70}%;bottom:5%;animation:none`
        : f.floor
          ? `bottom:4%;animation-duration:${dur * 1.5}s;animation-delay:${delay}s`
          : `top:${8 + Math.random() * 56}%;animation-duration:${dur}s;animation-delay:${delay}s`;
      return `<div class="swimmer${f.floor ? ' walk' : ''}" style="${style}"><span><button type="button" data-friend="${i}" aria-label="${f.name}">${f.e}</button></span></div>`;
    }).join('');
    const nx = nextFriend(p);
    $('#aq-next').innerHTML = nx
      ? `Samla <b>${nx.cost - p}</b> ${nx.cost - p === 1 ? 'pärla' : 'pärlor'} till för att hitta nästa havsvän!`
      : 'Du har hittat alla havsvänner!';
    $('#collection').innerHTML = FRIENDS.map((f, i) => (f.cost <= p
      ? `<button type="button" class="critter" data-friend="${i}"><span class="ce">${f.e}</span><span class="cn">${f.name}</span></button>`
      : `<button type="button" class="critter locked" data-locked="${i}" aria-label="Låst. ${f.cost - p} pärlor kvar."><span class="ce">${f.e}</span><span class="cn"><svg><use href="#i-lock"/></svg>${f.cost}</span></button>`)).join('');
    setDepth(0.15);
    show('aquarium');
  }

  function poke(i) {
    const f = FRIENDS[i];
    Sound.play('bubble');
    Speech.speak(f.name, false);
    const b = $(`#tank [data-friend="${i}"]`);
    if (b) {
      const s = b.parentElement;
      s.classList.remove('boing');
      void s.offsetWidth;
      s.classList.add('boing');
    }
  }

  // ---------- Inställningar ----------
  let setTab = 'small';
  let swFailed = false;
  let installPrompt = null;

  function openSettings() {
    const s = store.settings;
    $('#set-sound').checked = s.sound;
    $('#set-speech').checked = s.speech;
    $('#set-auto-small').checked = s.auto.small;
    $('#set-auto-big').checked = s.auto.big;
    refreshVoiceStatus();
    renderCats();
    refreshOffline();
    setDepth(0.3);
    show('settings');
  }

  function refreshVoiceStatus() {
    let t;
    if (!Speech.ok) t = 'Den här webbläsaren kan inte läsa upp text.';
    else if (Speech.voice) t = `Svensk röst: ${Speech.voice.name}.`;
    else if (Speech.loaded) t = 'Ingen svensk röst hittades. Lägg till en svensk röst i enhetens inställningar (på iPad: Inställningar → Hjälpmedel → Talat innehåll → Röster → Svenska).';
    else t = 'Uppläsningen använder enhetens svenska röst.';
    $('#voice-status').textContent = t;
    $('#btn-test-voice').hidden = !Speech.ok;
  }

  function renderCats() {
    $$('.seg [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === setTab)));
    const m = store.modes[setTab];
    $('#cat-list').innerHTML = Q.MODES[setTab].cats.map((c) => {
      const st = m.stats[c.id];
      const lvl = Math.floor(rating(setTab, c.id));
      const dots = [1, 2, 3, 4, 5].map((n) => `<i class="${n <= lvl ? 'on' : ''}"></i>`).join('');
      const acc = st && st.n ? `${Math.round((st.first / st.n) * 100)} % rätt direkt · ${st.n} frågor` : 'Inte övat än';
      return `<label class="cat-row"><span class="ci" aria-hidden="true">${c.icon}</span><span class="cname">${c.name}</span>` +
        `<input type="checkbox" role="switch" id="cat-${setTab}-${c.id}" data-cat="${c.id}" ${m.disabled[c.id] ? '' : 'checked'}>` +
        `<span class="cstat"><span class="lvl" title="Nivå ${lvl} av 5" aria-label="Nivå ${lvl} av 5">${dots}</span><span>${acc}</span></span></label>`;
    }).join('');
  }

  function refreshOffline() {
    let t;
    if (location.protocol === 'file:') t = 'Spelet körs från en fil på enheten och fungerar redan utan internet.';
    else if (swFailed || !('serviceWorker' in navigator)) t = 'Här kan spelet inte sparas för offlinebruk. Använd den installerade appen eller filen index.html i stället.';
    else if (navigator.serviceWorker.controller) t = '✓ Spelet är sparat på enheten och fungerar utan internet.';
    else t = 'Spelet sparas på enheten första gången det laddas. Ladda om sidan en gång så är det klart.';
    $('#offline-status').textContent = t;
    $('#btn-install').hidden = !installPrompt;
  }

  function refreshSpeakButton() {
    const show = Speech.usable() && store.settings.speech && !store.settings.muted;
    $('#btn-speak').hidden = !show;
    $('#q-mascot').disabled = !show;
  }

  function speakCurrent() {
    if (!cur) return;
    const hint = cur.tries === 1 && !cur.locked ? ' ' + cur.q.hint : '';
    const extra = cur.locked && cur.tries >= 2 ? ' ' + cur.q.explain : '';
    Speech.speak(cur.q.speak + hint + extra);
  }

  // ---------- Bubblor i bakgrunden ----------
  function makeBubbles() {
    const box = $('#bubbles');
    let html = '';
    for (let i = 0; i < 16; i++) {
      const size = 6 + Math.random() * 22;
      const dur = 9 + Math.random() * 12;
      html += `<span style="left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${-Math.random() * dur}s"></span>`;
    }
    box.innerHTML = html;
  }

  // ---------- Händelser ----------
  function bind() {
    document.addEventListener('pointerdown', () => { if (Sound.on) Sound.ensure(); }, { once: true });

    $$('[data-play]').forEach((b) => b.addEventListener('click', () => { Sound.play('bubble'); startRound(b.dataset.play); }));
    $$('[data-aquarium]').forEach((b) => b.addEventListener('click', () => { Sound.play('bubble'); openAquarium(b.dataset.aquarium); }));
    $$('[data-back]').forEach((b) => b.addEventListener('click', goHome));
    $('#btn-settings').addEventListener('click', () => { setTab = mode; openSettings(); });
    $('#btn-sound').addEventListener('click', () => {
      store.settings.muted = !store.settings.muted;
      save();
      if (store.settings.muted) Speech.stop(); else Sound.play('bubble');
      renderHome();
      refreshSpeakButton();
    });

    $('#btn-quit').addEventListener('click', async () => {
      Speech.stop();
      const leave = await ask({ title: 'Vill du sluta dyka?', text: 'Pärlorna du redan har samlat sparas.', cancel: 'Fortsätt dyka', ok: 'Sluta' });
      if (leave) goHome();
    });
    $('#btn-speak').addEventListener('click', speakCurrent);
    $('#q-mascot').addEventListener('click', () => { mascot('happy'); speakCurrent(); });

    $('#answers').addEventListener('click', (e) => {
      const key = e.target.closest('[data-key]');
      if (key) { keypad(key.dataset.key); return; }
      const ch = e.target.closest('.choice');
      if (ch && !ch.disabled && cur && !cur.locked) { const c = cur.q.choices[Number(ch.dataset.i)]; submit(c.value, ch); return; }
      if (e.target.closest('[data-next]')) { Sound.play('bubble'); nextQuestion(); }
    });

    const countTap = (e) => {
      const pic = e.target.closest('.pics.tappable .pic');
      if (!pic) return;
      pic.classList.toggle('counted');
      Sound.play('tap');
    };
    $('#q-visual').addEventListener('click', countTap);
    $('#q-visual').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); countTap(e); } });

    $('#btn-again').addEventListener('click', () => startRound(mode));
    $('#btn-end-aquarium').addEventListener('click', () => openAquarium(mode));
    $('#btn-end-home').addEventListener('click', goHome);

    $('#tank').addEventListener('click', (e) => { const b = e.target.closest('[data-friend]'); if (b) poke(Number(b.dataset.friend)); });
    $('#collection').addEventListener('click', (e) => {
      const b = e.target.closest('[data-friend]');
      if (b) { poke(Number(b.dataset.friend)); return; }
      const l = e.target.closest('[data-locked]');
      if (l) {
        const f = FRIENDS[Number(l.dataset.locked)];
        const left = f.cost - store.modes[aqMode].pearls;
        Sound.play('tap');
        Speech.speak(`Samla ${left} ${left === 1 ? 'pärla' : 'pärlor'} till.`);
      }
    });

    const setting = (id, fn) => $(id).addEventListener('change', (e) => { fn(e.target.checked); save(); refreshSpeakButton(); });
    setting('#set-sound', (v) => { store.settings.sound = v; if (v) { store.settings.muted = false; Sound.play('bubble'); } });
    setting('#set-speech', (v) => { store.settings.speech = v; if (v) store.settings.muted = false; else Speech.stop(); });
    setting('#set-auto-small', (v) => { store.settings.auto.small = v; });
    setting('#set-auto-big', (v) => { store.settings.auto.big = v; });
    $('#btn-test-voice').addEventListener('click', () => Speech.speak('Hej! Jag heter Bubbel. Vad är tre plus fyra?', true));

    $$('.seg [data-tab]').forEach((b) => b.addEventListener('click', () => { setTab = b.dataset.tab; renderCats(); }));
    $('#cat-list').addEventListener('change', (e) => {
      const inp = e.target.closest('[data-cat]');
      if (!inp) return;
      const m = store.modes[setTab];
      const on = Q.MODES[setTab].cats.filter((c) => !m.disabled[c.id]).length;
      if (!inp.checked && on <= 1) { inp.checked = true; return; }
      if (inp.checked) delete m.disabled[inp.dataset.cat]; else m.disabled[inp.dataset.cat] = true;
      save();
    });

    $('#btn-install').addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      try { await installPrompt.userChoice; } catch (e) { /* ignoreras */ }
      installPrompt = null;
      refreshOffline();
    });
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (screen === 'settings') refreshOffline(); });

    $('#btn-reset').addEventListener('click', async () => {
      const yes = await ask({ title: 'Nollställa allt?', text: 'Alla pärlor, havsvänner och nivåer försvinner för båda dyken. Inställningarna för ljud behålls.', cancel: 'Avbryt', ok: 'Nollställ' });
      if (!yes) return;
      store.modes = { small: modeDefaults(), big: modeDefaults() };
      save();
      renderCats();
    });

    $('#dlg-cancel').addEventListener('click', () => closeDialog(false));
    $('#dlg-ok').addEventListener('click', () => closeDialog(true));
    $('#dialog').addEventListener('click', (e) => { if (e.target.id === 'dialog') closeDialog(false); });

    document.addEventListener('keydown', (e) => {
      if (!$('#dialog').hidden) { if (e.key === 'Escape') closeDialog(false); return; }
      if (screen !== 'game' || !cur) return;
      if (e.key === 'Escape') { $('#btn-quit').click(); return; }
      if (cur.locked) return;
      if (cur.q.input === 'numpad') {
        if (/^[0-9]$/.test(e.key)) keypad(e.key);
        else if (e.key === 'Backspace') { e.preventDefault(); keypad('del'); }
        else if (e.key === 'Enter') { e.preventDefault(); keypad('ok'); }
      } else if (/^[1-4]$/.test(e.key) && cur.q.kind !== 'num') {
        const b = $$('#answers .choice')[Number(e.key) - 1];
        if (b && !b.disabled) b.click();
      }
    });

    document.addEventListener('visibilitychange', () => { if (document.hidden) Speech.stop(); });
    $('#q-card').addEventListener('animationend', (e) => { if (e.target.id === 'q-card') e.target.classList.remove('enter', 'shake'); });
  }

  // ---------- Offline (service worker) ----------
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker.register('sw.js').catch(() => { swFailed = true; });
      } catch (e) { swFailed = true; }
    });
  }

  makeBubbles();
  bind();
  Speech.init();
  renderHome();
  refreshSpeakButton();
  registerSW();
})();
