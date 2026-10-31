/* Mattedyket – uppgiftsgeneratorer.
 * Varje generator tar en nivå (1–5) och returnerar en fråga:
 * { key, prompt, speak, visual, input: 'choices'|'numpad', answer, choices, kind, unit, hint, explain }
 */
(function (root) {
  'use strict';

  // ---------- Hjälpfunktioner ----------
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const chance = (p) => Math.random() < p;
  const SLOT = null;
  const OP = { plus: '+', minus: '−', times: '·', div: '/' };

  function q(o) {
    return Object.assign({ input: 'choices', kind: 'num', visual: '', unit: '', hint: '', explain: '', choices: [] }, o);
  }

  // Ekvation som HTML; null blir svarsrutan.
  function eq(tokens) {
    return '<div class="eq">' + tokens.map((t) => {
      if (t === SLOT) return '<span class="slot" data-slot></span>';
      if (typeof t === 'number') return `<span class="n">${t}</span>`;
      if (t === '=') return '<span class="op eqs">=</span>';
      if (/^[+−·/<>]$/.test(t)) return `<span class="op">${t}</span>`;
      return `<span class="n">${t}</span>`;
    }).join('') + '</div>';
  }

  // Talsvar med rimliga felalternativ (vanliga misstag först).
  function numberChoices(answer, count, opts) {
    const o = Object.assign({ min: 0, max: 100000, near: [1, 2], extra: [] }, opts || {});
    const set = new Set([answer]);
    const ok = (c) => Number.isInteger(c) && c >= o.min && c <= o.max;
    const pool = shuffle(o.extra).concat(shuffle(o.near.flatMap((d) => [answer + d, answer - d])));
    for (const c of pool) {
      if (set.size >= count) break;
      if (ok(c)) set.add(c);
    }
    for (let d = 1; set.size < count && d < 1000; d++) {
      if (ok(answer + d)) set.add(answer + d);
      if (set.size < count && ok(answer - d)) set.add(answer - d);
    }
    return shuffle([...set]).map((v) => ({ value: v, html: String(v), speak: String(v) }));
  }

  // ---------- Bilder ----------
  const CRITTERS = [
    { e: '🐟', one: 'fisk', many: 'fiskar' },
    { e: '🐠', one: 'tropisk fisk', many: 'tropiska fiskar' },
    { e: '🦀', one: 'krabba', many: 'krabbor' },
    { e: '🐙', one: 'bläckfisk', many: 'bläckfiskar' },
    { e: '🐢', one: 'sköldpadda', many: 'sköldpaddor' },
    { e: '🐬', one: 'delfin', many: 'delfiner' },
    { e: '🐚', one: 'snäcka', many: 'snäckor' },
    { e: '🐡', one: 'blåsfisk', many: 'blåsfiskar' },
    { e: '🦐', one: 'räka', many: 'räkor' },
    { e: '🐳', one: 'val', many: 'valar' },
  ];

  function pics(emoji, n, opts) {
    const o = opts || {};
    const cols = o.cols || (n <= 5 ? Math.max(n, 1) : 5);
    let html = `<div class="pics${o.tap ? ' tappable' : ''}" style="--cols:${cols}">`;
    for (let i = 0; i < n; i++) {
      const gone = o.gone && i >= n - o.gone;
      html += `<span class="pic${gone ? ' gone' : ''}"${o.tap ? ' role="button" tabindex="0" aria-label="Räkna"' : ''}>${emoji}</span>`;
    }
    return html + '</div>';
  }

  function frame(filled, size) {
    let html = `<div class="frame" style="--cols:5" aria-label="${filled} av ${size} rutor är fyllda">`;
    for (let i = 0; i < size; i++) html += `<span class="cell${i < filled ? ' on' : ''}"></span>`;
    return html + '</div>';
  }

  // ---------- Former ----------
  const SHAPE_COLORS = ['#FF7452', '#2FBF9B', '#FFC233', '#4BA3F5', '#B57BFF', '#FF6FA5'];
  const SHAPES = {
    cirkel: { name: 'cirkel', def: 'cirkeln', corners: 0, hint: 'En cirkel är helt rund och har inga hörn.' },
    kvadrat: { name: 'kvadrat', def: 'kvadraten', corners: 4, hint: 'En kvadrat har fyra hörn och fyra lika långa sidor.' },
    triangel: { name: 'triangel', def: 'triangeln', corners: 3, hint: 'En triangel har tre hörn.' },
    rektangel: { name: 'rektangel', def: 'rektangeln', corners: 4, hint: 'En rektangel har fyra hörn, två långa sidor och två korta sidor.' },
    femhorning: { name: 'femhörning', def: 'femhörningen', corners: 5, hint: 'En femhörning har fem hörn.' },
    sexhorning: { name: 'sexhörning', def: 'sexhörningen', corners: 6, hint: 'En sexhörning har sex hörn.' },
  };
  function polygon(n, r, rot) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 2 * Math.PI) / n;
      pts.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (52 + r * Math.sin(a)).toFixed(1));
    }
    return `<polygon points="${pts.join(' ')}"/>`;
  }
  function shapeSvg(key, color) {
    const c = color || pick(SHAPE_COLORS);
    let body;
    switch (key) {
      case 'cirkel': body = '<circle cx="50" cy="50" r="40"/>'; break;
      case 'kvadrat': body = '<rect x="14" y="14" width="72" height="72" rx="3"/>'; break;
      case 'rektangel': body = '<rect x="4" y="27" width="92" height="46" rx="3"/>'; break;
      case 'triangel': body = pick([
        '<polygon points="50,8 94,88 6,88"/>',
        '<polygon points="12,10 12,90 90,90"/>',
        '<polygon points="10,20 90,20 50,92"/>',
        '<polygon points="20,8 92,60 8,90"/>',
      ]); break;
      case 'femhorning': body = polygon(5, 44, -Math.PI / 2); break;
      case 'sexhorning': body = polygon(6, 44, 0); break;
    }
    return `<svg class="shape" viewBox="0 0 100 100" aria-hidden="true"><g fill="${c}" stroke="rgba(11,37,64,.55)" stroke-width="3" stroke-linejoin="round">${body}</g></svg>`;
  }

  // ---------- Klockan ----------
  const HOURS = ['tolv', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv'];
  const nextH = (h) => (h % 12) + 1;
  const prevH = (h) => ((h + 10) % 12) + 1;
  function timeName(h, m) {
    const H = HOURS[h], N = HOURS[nextH(h)];
    switch (m) {
      case 0: return `klockan ${H}`;
      case 5: return `fem över ${H}`;
      case 10: return `tio över ${H}`;
      case 15: return `kvart över ${H}`;
      case 20: return `tjugo över ${H}`;
      case 25: return `fem i halv ${N}`;
      case 30: return `halv ${N}`;
      case 35: return `fem över halv ${N}`;
      case 40: return `tjugo i ${N}`;
      case 45: return `kvart i ${N}`;
      case 50: return `tio i ${N}`;
      case 55: return `fem i ${N}`;
    }
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function clockSvg(h, m) {
    let marks = '';
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 * Math.PI) / 180;
      const big = i % 5 === 0;
      const r1 = big ? 80 : 84, r2 = 89;
      marks += `<line x1="${(100 + r1 * Math.sin(a)).toFixed(1)}" y1="${(100 - r1 * Math.cos(a)).toFixed(1)}" x2="${(100 + r2 * Math.sin(a)).toFixed(1)}" y2="${(100 - r2 * Math.cos(a)).toFixed(1)}" stroke-width="${big ? 3.5 : 1.5}"/>`;
    }
    let nums = '';
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      nums += `<text x="${(100 + 64 * Math.sin(a)).toFixed(1)}" y="${(100 - 64 * Math.cos(a) + 8).toFixed(1)}">${i}</text>`;
    }
    const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
    return `<svg class="clock" viewBox="0 0 200 200" role="img" aria-label="En klocka">
      <circle cx="100" cy="100" r="96" fill="#FFFFFF" stroke="#0E5C8C" stroke-width="7"/>
      <g stroke="#0B2540" stroke-linecap="round">${marks}</g>
      <g class="clock-nums" fill="#0B2540" text-anchor="middle">${nums}</g>
      <line x1="100" y1="100" x2="100" y2="54" stroke="#0B2540" stroke-width="9" stroke-linecap="round" transform="rotate(${ha} 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="22" stroke="#FF7452" stroke-width="5" stroke-linecap="round" transform="rotate(${ma} 100 100)"/>
      <circle cx="100" cy="100" r="7" fill="#0B2540"/>
    </svg>`;
  }

  // ---------- Bråk ----------
  const DEN = { 2: ['halv', 'halvor'], 3: ['tredjedel', 'tredjedelar'], 4: ['fjärdedel', 'fjärdedelar'], 5: ['femtedel', 'femtedelar'], 6: ['sjättedel', 'sjättedelar'], 8: ['åttondel', 'åttondelar'] };
  const WORD = ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta'];
  const fracName = (k, n) => (k === 1 ? `en ${DEN[n][0]}` : `${WORD[k]} ${DEN[n][1]}`);
  const fracHtml = (k, n) => `<span class="frac"><span>${k}</span><span>${n}</span></span>`;
  function fracSvg(k, n) {
    const fill = '#FF7452', empty = '#FFFFFF', stroke = '#0B2540';
    if (chance(0.5)) {
      // Cirkel ("pizza")
      let parts = '';
      const off = rnd(0, n - 1);
      for (let i = 0; i < n; i++) {
        const a1 = ((i / n) * 2 - 0.5) * Math.PI, a2 = (((i + 1) / n) * 2 - 0.5) * Math.PI;
        const x1 = 50 + 44 * Math.cos(a1), y1 = 50 + 44 * Math.sin(a1);
        const x2 = 50 + 44 * Math.cos(a2), y2 = 50 + 44 * Math.sin(a2);
        const on = (i - off + n) % n < k;
        parts += `<path d="M50,50 L${x1.toFixed(2)},${y1.toFixed(2)} A44,44 0 0,1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${on ? fill : empty}"/>`;
      }
      return `<svg class="fracfig" viewBox="0 0 100 100" aria-hidden="true"><g stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round">${parts}</g></svg>`;
    }
    // Rektangel ("chokladkaka")
    let parts = '';
    const w = 96 / n;
    for (let i = 0; i < n; i++) {
      parts += `<rect x="${(2 + i * w).toFixed(2)}" y="2" width="${w.toFixed(2)}" height="46" fill="${i < k ? fill : empty}"/>`;
    }
    return `<svg class="fracfig bar" viewBox="0 0 100 50" aria-hidden="true"><g stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round">${parts}</g></svg>`;
  }

  // Dela upp ett tal i hundratal/tiotal/ental (för ledtrådar).
  function splitHint(a, b, sign) {
    const parts = [];
    const H = (x) => Math.floor(x / 100) * 100, T = (x) => Math.floor((x % 100) / 10) * 10, E = (x) => x % 10;
    if (a >= 100 || b >= 100) parts.push(`hundratal: ${H(a)} ${sign} ${H(b)}`);
    parts.push(`tiotal: ${T(a)} ${sign} ${T(b)}`);
    parts.push(`ental: ${E(a)} ${sign} ${E(b)}`);
    return 'Dela upp talen – ' + parts.join(', ') + '. Sätt sedan ihop delarna.';
  }

  const NAMES = ['Ella', 'Omar', 'Alva', 'Liam', 'Noor', 'Elias', 'Saga', 'Hugo', 'Maja', 'Ali', 'Wilma', 'Leo', 'Selma', 'Adam'];

  // =====================================================================
  //  LILLA DYKET (6 år)
  // =====================================================================
  const small = {
    count(L) {
      const max = [5, 7, 10, 12, 15][L - 1];
      const n = rnd(L === 1 ? 1 : 3, max);
      const c = pick(CRITTERS);
      return q({
        key: `count${n}${c.e}`,
        prompt: `<p class="ask">Hur många ${c.many}?</p>`,
        speak: `Hur många ${c.many} ser du?`,
        visual: pics(c.e, n, { tap: true }),
        answer: n,
        choices: numberChoices(n, 3, { min: 1 }),
        hint: 'Tryck på djuren när du räknar dem, så tappar du inte bort någon.',
        explain: `Det är ${n} ${n === 1 ? c.one : c.many}.`,
      });
    },

    add(L) {
      let a, b;
      if (L === 1) { a = rnd(1, 4); b = rnd(1, 5 - a); }
      else if (L === 2) { a = rnd(1, 8); b = rnd(1, 10 - a); }
      else if (L === 3) { a = rnd(0, 9); b = rnd(0, 10 - a); }
      else if (L === 4) {
        const t = rnd(0, 2);
        if (t === 0) { a = 10; b = rnd(1, 9); }
        else if (t === 1) { a = rnd(2, 9); b = a; }
        else { a = rnd(11, 15); b = rnd(1, 19 - a); }
      } else { a = rnd(6, 9); b = rnd(11 - a, 9); }
      if (chance(0.5) && L !== 5) [a, b] = [b, a];
      const sum = a + b;
      const c = pick(CRITTERS);
      const big = Math.max(a, b), sm = Math.min(a, b);
      let hint;
      if (L <= 2) hint = 'Räkna alla djuren tillsammans.';
      else if (sm === 0) hint = 'Plus noll ändrar ingenting!';
      else if (L === 4 && a === b) hint = `Dubbelt! ${a} och ${a} till.`;
      else if (L === 5) hint = `Gör en tia först: ${a} + ${10 - a} = 10. Sedan ${b - (10 - a)} till.`;
      else hint = `Börja på ${big} och räkna ${sm} steg till.`;
      return q({
        key: `add${a}+${b}`,
        prompt: eq([a, OP.plus, b, '=', SLOT]),
        speak: `Vad är ${a} plus ${b}?`,
        visual: L <= 2 ? `<div class="pic-sum">${pics(c.e, a, { cols: a > 5 ? Math.ceil(a / 2) : a })}<span class="pic-op">+</span>${pics(c.e, b, { cols: b > 5 ? Math.ceil(b / 2) : b })}</div>` : '',
        answer: sum,
        choices: numberChoices(sum, 3, { extra: [sum + 1, sum - 1, a, b].filter((x) => x !== sum) }),
        hint,
        explain: `${a} + ${b} = ${sum}`,
      });
    },

    sub(L) {
      let a, b;
      if (L === 1) { a = rnd(2, 5); b = rnd(1, a - 1); }
      else if (L === 2) { a = rnd(4, 10); b = rnd(1, a - 1); }
      else if (L === 3) { a = rnd(3, 10); b = rnd(0, a); }
      else if (L === 4) { a = rnd(11, 19); b = chance(0.3) ? 10 : rnd(1, a - 10); }
      else { a = rnd(11, 18); b = rnd(a - 9, 9); }
      const d = a - b;
      const c = pick(CRITTERS);
      let hint;
      if (L <= 2) hint = `Djuren med kryss har simmat iväg. Räkna de som är kvar.`;
      else if (b === 0) hint = 'Minus noll ändrar ingenting!';
      else if (L === 4 && b === 10) hint = 'Ta bort tian, då är bara entalen kvar.';
      else if (L === 5) hint = `Ta först bort ${a - 10} så att du kommer till 10. Ta sedan bort ${b - (a - 10)} till.`;
      else hint = `Börja på ${a} och räkna baklänges ${b} steg.`;
      return q({
        key: `sub${a}-${b}`,
        prompt: eq([a, OP.minus, b, '=', SLOT]),
        speak: `Vad är ${a} minus ${b}?`,
        visual: L <= 2 ? pics(c.e, a, { gone: b }) : '',
        answer: d,
        choices: numberChoices(d, 3, { extra: [d + 1, d - 1, a + b].filter((x) => x !== d) }),
        hint,
        explain: `${a} − ${b} = ${d}`,
      });
    },

    compare(L) {
      if (L === 1) {
        const c = pick(CRITTERS);
        let x = rnd(1, 6), y = rnd(1, 6);
        while (y === x) y = rnd(1, 6);
        const ans = Math.max(x, y);
        return q({
          key: `cmpg${x}-${y}`,
          prompt: '<p class="ask">Vilken grupp har flest?</p>',
          speak: `Vilken grupp har flest ${c.many}?`,
          kind: 'group',
          answer: ans,
          choices: [x, y].map((v) => ({ value: v, html: pics(c.e, v), speak: '' })),
          hint: 'Räkna djuren i varje grupp.',
          explain: `Gruppen med ${ans} ${c.many} har flest.`,
        });
      }
      const max = [0, 0, 10, 20, 50, 100][L];
      const n = L === 2 ? 2 : 3;
      const most = L === 2 || chance(0.6);
      const set = new Set();
      if (L === 5 && chance(0.5)) {
        // Fälla: samma siffror i olika ordning.
        let t = rnd(1, 9), e = rnd(1, 9);
        while (e === t) e = rnd(1, 9);
        set.add(t * 10 + e); set.add(e * 10 + t);
      }
      while (set.size < n) set.add(rnd(L === 2 ? 0 : 1, max));
      const nums = shuffle([...set]);
      const ans = most ? Math.max(...nums) : Math.min(...nums);
      const word = most ? 'störst' : 'minst';
      return q({
        key: `cmp${nums.join('-')}${word}`,
        prompt: `<p class="ask">Vilket tal är <strong>${word}</strong>?</p>`,
        speak: `Vilket tal är ${word}?`,
        answer: ans,
        choices: nums.map((v) => ({ value: v, html: String(v), speak: String(v) })),
        hint: L >= 4 ? 'Titta på tiotalen först – alltså siffran till vänster.' : most ? 'Det tal som kommer sist när man räknar är störst.' : 'Det tal som kommer först när man räknar är minst.',
        explain: `${ans} är ${word}.`,
      });
    },

    sequence(L) {
      let nums, missing;
      let hint = 'Räkna högt från början.';
      if (L === 1) { const s = rnd(1, 6); nums = [s, s + 1, s + 2, s + 3]; missing = 3; }
      else if (L === 2) { const s = rnd(1, 7); nums = [s, s + 1, s + 2, s + 3]; missing = rnd(0, 3); }
      else if (L === 3) { const s = rnd(6, 17); nums = [s, s + 1, s + 2, s + 3]; missing = rnd(1, 3); }
      else if (L === 4) { const s = rnd(5, 20); nums = [s, s - 1, s - 2, s - 3]; missing = rnd(1, 3); hint = 'Här räknar vi baklänges – talen blir mindre.'; }
      else {
        const step = pick([2, 5, 10]);
        const s = step === 2 ? 2 * rnd(0, 5) : step * rnd(0, 3);
        nums = [s, s + step, s + 2 * step, s + 3 * step];
        missing = rnd(1, 3);
        hint = `Talen hoppar ${step} steg varje gång.`;
      }
      const ans = nums[missing];
      const tokens = nums.map((v, i) => (i === missing ? SLOT : v));
      const step = Math.abs(nums[1] - nums[0]);
      return q({
        key: `seq${nums.join(',')}m${missing}`,
        prompt: '<p class="ask">Vilket tal fattas?</p><div class="seq">' + tokens.map((t) => (t === SLOT ? '<span class="slot" data-slot></span>' : `<span class="seq-n">${t}</span>`)).join('') + '</div>',
        speak: 'Vilket tal fattas? ' + tokens.map((t) => (t === SLOT ? 'vilket tal?' : t)).join(', '),
        answer: ans,
        choices: numberChoices(ans, 3, { near: step > 1 ? [step, 1] : [1, 2] }),
        hint,
        explain: `Talen är ${nums.join(', ')}.`,
      });
    },

    bonds(L) {
      const total = L <= 2 ? 5 : 10;
      const a = L === 1 ? rnd(1, 4) : L === 2 ? rnd(0, 5) : L === 5 ? rnd(0, 10) : rnd(1, 9);
      const ans = total - a;
      const name = total === 5 ? 'femkompis' : 'tiokompis';
      return q({
        key: `bond${a}/${total}`,
        prompt: `<p class="ask">Hitta ${name}n!</p>` + eq([a, OP.plus, SLOT, '=', total]),
        speak: `${a} plus hur många blir ${total}?`,
        visual: L <= 4 ? frame(a, total) : '',
        answer: ans,
        choices: numberChoices(ans, 3, { max: total, extra: [ans + 1, ans - 1, a].filter((x) => x !== ans) }),
        hint: L <= 4 ? 'Räkna de tomma rutorna.' : `Tänk på tiokompisarna: ${a} och vad blir 10 tillsammans?`,
        explain: `${a} + ${ans} = ${total}`,
      });
    },

    shapes(L) {
      const askCorners = L === 3 || (L === 5 && chance(0.5));
      if (askCorners) {
        const key = pick(L === 3 ? ['triangel', 'kvadrat', 'rektangel', 'cirkel'] : Object.keys(SHAPES));
        const s = SHAPES[key];
        return q({
          key: `corner${key}`,
          prompt: `<p class="ask">Hur många hörn har en ${s.name}?</p>`,
          speak: `Hur många hörn har en ${s.name}?`,
          visual: `<div class="shape-big">${shapeSvg(key)}</div>`,
          answer: s.corners,
          choices: numberChoices(s.corners, 3, { near: [1, 2] }),
          hint: s.corners ? 'Peka på varje hörn och räkna.' : 'Har den några spetsiga hörn alls?',
          explain: `En ${s.name} har ${s.corners === 0 ? 'inga' : s.corners} hörn.`,
        });
      }
      const pool = L === 1 ? ['cirkel', 'kvadrat', 'triangel']
        : L === 2 ? ['cirkel', 'kvadrat', 'triangel', 'rektangel']
          : Object.keys(SHAPES);
      const target = pick(pool);
      // En kvadrat är också en rektangel – visa aldrig kvadrat när vi letar rektangel.
      const others = shuffle(pool.filter((k) => k !== target && !(target === 'rektangel' && k === 'kvadrat')));
      const opts = shuffle([target].concat(others.slice(0, 2)));
      const colors = shuffle(SHAPE_COLORS);
      return q({
        key: `shape${target}`,
        prompt: `<p class="ask">Tryck på ${SHAPES[target].def}!</p>`,
        speak: `Tryck på ${SHAPES[target].def}.`,
        kind: 'shape',
        answer: target,
        choices: opts.map((k, i) => ({ value: k, html: shapeSvg(k, colors[i]), speak: SHAPES[k].name, aria: SHAPES[k].name })),
        hint: SHAPES[target].hint,
        explain: `Det här är ${SHAPES[target].def}.`,
      });
    },

    pattern(L) {
      const items = shuffle(['🐟', '🦀', '🐙', '🐚', '🐢', '🐡', '🐬', '🦐', '🐳']);
      const [A, B, C, D] = items;
      const unit = [null, [A, B], pick([[A, A, B], [A, B, B]]), [A, B, C], [A, A, B, B], pick([[A, A, B, C], [A, B, C, D], [A, B, B, C]])][L];
      const shown = L <= 1 ? rnd(4, 5) : L === 2 ? 5 : L === 3 ? rnd(4, 5) : rnd(5, 7);
      const row = [];
      for (let i = 0; i < shown; i++) row.push(unit[i % unit.length]);
      const ans = unit[shown % unit.length];
      const opts = [ans];
      for (const e of unit.concat(items)) { if (opts.length >= 3) break; if (!opts.includes(e)) opts.push(e); }
      return q({
        key: `pat${row.join('')}`,
        prompt: '<p class="ask">Vad kommer sen?</p><div class="pattern">' + row.map((e) => `<span>${e}</span>`).join('') + '<span class="slot emoji-slot" data-slot></span></div>',
        speak: 'Titta på mönstret. Vad kommer sen?',
        kind: 'emoji',
        answer: ans,
        choices: shuffle(opts).map((e) => ({ value: e, html: e, speak: '' })),
        hint: 'Hitta biten som upprepas om och om igen.',
        explain: `Mönstret upprepas: ${unit.join(' ')}`,
      });
    },
  };

  // =====================================================================
  //  STORA DYKET (9 år)
  // =====================================================================
  const TABLES = [null, [2, 5, 10], [2, 3, 4, 5, 10], [2, 3, 4, 5, 6, 10], [2, 3, 4, 5, 6, 7, 8, 9], [2, 3, 4, 5, 6, 7, 8, 9, 10]];

  const big = {
    add(L) {
      let a, b;
      if (L === 1) { a = rnd(11, 89); if (a % 10 === 9) a -= 1; b = rnd(1, 9 - (a % 10)); }
      else if (L === 2) { const aT = rnd(1, 7), aO = rnd(0, 8), bT = rnd(1, 8 - aT), bO = rnd(0, 9 - aO); a = aT * 10 + aO; b = bT * 10 + bO; }
      else if (L === 3) { const aO = rnd(2, 9), bO = rnd(10 - aO, 9), aT = rnd(1, 7), bT = rnd(1, 8 - aT); a = aT * 10 + aO; b = bT * 10 + bO; }
      else if (L === 4) { a = rnd(100, 899); b = rnd(10, 99); }
      else { a = rnd(100, 599); b = rnd(100, 399); }
      if (L >= 2 && chance(0.3)) [a, b] = [b, a];
      const s = a + b;
      return q({
        key: `add${a}+${b}`, input: 'numpad',
        prompt: eq([a, OP.plus, b, '=', SLOT]),
        speak: `Vad är ${a} plus ${b}?`,
        answer: s,
        hint: L === 1 ? `Lägg ihop entalen först: ${a % 10} + ${b} = ${(a % 10) + b}.` : splitHint(a, b, '+'),
        explain: `${a} + ${b} = ${s}`,
      });
    },

    sub(L) {
      let a, b;
      if (L === 1) { a = rnd(12, 99); if (a % 10 === 0) a += 1; b = rnd(1, a % 10); }
      else if (L === 2) { const aT = rnd(2, 9), aO = rnd(0, 9), bT = rnd(1, aT - 1), bO = rnd(0, aO); a = aT * 10 + aO; b = bT * 10 + bO; }
      else if (L === 3) { const aT = rnd(2, 9), aO = rnd(0, 8), bO = rnd(aO + 1, 9), bT = rnd(1, aT - 1); a = aT * 10 + aO; b = bT * 10 + bO; }
      else if (L === 4) { a = rnd(120, 999); b = rnd(11, 99); }
      else { a = rnd(300, 999); b = rnd(101, a - 50); }
      const d = a - b;
      let hint;
      if (L <= 2) hint = splitHint(a, b, '−');
      else if (L === 3) hint = `Ta först bort tiotalen: ${a} − ${b - (b % 10)} = ${a - (b - (b % 10))}. Ta sedan bort ${b % 10}.`;
      else hint = `Ta bort i steg: först hundratalen, sedan tiotalen och sist entalen. Eller räkna upp från ${b} till ${a}.`;
      return q({
        key: `sub${a}-${b}`, input: 'numpad',
        prompt: eq([a, OP.minus, b, '=', SLOT]),
        speak: `Vad är ${a} minus ${b}?`,
        answer: d,
        hint,
        explain: `${a} − ${b} = ${d}`,
      });
    },

    mul(L) {
      const t = pick(TABLES[L]);
      const f = rnd(L === 1 ? 1 : 2, 10);
      const p = t * f;
      if (L === 5 && chance(0.35)) {
        return q({
          key: `mulm${t}*${f}`, input: 'numpad',
          prompt: eq([SLOT, OP.times, t, '=', p]),
          speak: `Vilket tal gånger ${t} blir ${p}?`,
          answer: f,
          hint: `Räkna ${t}-hopp tills du kommer till ${p}: ${t}, ${2 * t}, ${3 * t} …`,
          explain: `${f} · ${t} = ${p}`,
        });
      }
      const [a, b] = chance(0.5) ? [t, f] : [f, t];
      const sm = Math.min(a, b), lg = Math.max(a, b);
      const hint = sm <= 5
        ? `${a} · ${b} är samma sak som ${Array(sm).fill(lg).join(' + ')}.`
        : `Tips: 5 · ${lg} = ${5 * lg}. Lägg sedan till ${sm - 5} · ${lg} till.`;
      return q({
        key: `mul${a}*${b}`, input: 'numpad',
        prompt: eq([a, OP.times, b, '=', SLOT]),
        speak: `Vad är ${a} gånger ${b}?`,
        answer: p,
        hint,
        explain: `${a} · ${b} = ${p}`,
      });
    },

    div(L) {
      const t = pick(TABLES[L]);
      const f = rnd(1, 10);
      const p = t * f;
      if (L === 5 && chance(0.3)) {
        return q({
          key: `divm${p}/${t}`, input: 'numpad',
          prompt: eq([p, OP.div, SLOT, '=', f]),
          speak: `${p} delat med vilket tal blir ${f}?`,
          answer: t,
          hint: `Tänk: ${f} gånger vilket tal blir ${p}?`,
          explain: `${p} / ${t} = ${f} eftersom ${f} · ${t} = ${p}.`,
        });
      }
      return q({
        key: `div${p}/${t}`, input: 'numpad',
        prompt: eq([p, OP.div, t, '=', SLOT]),
        speak: `Vad är ${p} delat med ${t}?`,
        answer: f,
        hint: `Tänk baklänges: vilket tal gånger ${t} blir ${p}?`,
        explain: `${p} / ${t} = ${f} eftersom ${f} · ${t} = ${p}.`,
      });
    },

    missing(L) {
      if (L === 1) {
        const total = rnd(11, 20), a = rnd(1, total - 1);
        return q({
          key: `mis${a}+?=${total}`, input: 'numpad',
          prompt: eq([a, OP.plus, SLOT, '=', total]),
          speak: `${a} plus vilket tal blir ${total}?`,
          answer: total - a,
          hint: `Räkna upp från ${a} till ${total}.`,
          explain: `${a} + ${total - a} = ${total}`,
        });
      }
      if (L === 2 || L === 3) {
        const a = L === 2 ? 10 * rnd(1, 9) : (() => { let x = rnd(11, 89); if (x % 10 === 0) x += 3; return x; })();
        return q({
          key: `mis${a}+?=100`, input: 'numpad',
          prompt: '<p class="ask">Hitta hundrakompisen!</p>' + eq([a, OP.plus, SLOT, '=', 100]),
          speak: `${a} plus vilket tal blir 100?`,
          answer: 100 - a,
          hint: L === 2 ? 'Hur många tiotal saknas upp till 100?' : `Gå först till närmaste tiotal: ${a} + ${10 - (a % 10)} = ${a + 10 - (a % 10)}. Hur långt är det sedan till 100?`,
          explain: `${a} + ${100 - a} = 100`,
        });
      }
      if (L === 4) {
        if (chance(0.5)) {
          const b = rnd(5, 40), c = rnd(10, 60);
          return q({
            key: `mis?-${b}=${c}`, input: 'numpad',
            prompt: eq([SLOT, OP.minus, b, '=', c]),
            speak: `Vilket tal minus ${b} blir ${c}?`,
            answer: b + c,
            hint: `Tänk tvärtom: ${c} + ${b} = ?`,
            explain: `${b + c} − ${b} = ${c}`,
          });
        }
        const a = rnd(30, 99), c = rnd(5, a - 5);
        return q({
          key: `mis${a}-?=${c}`, input: 'numpad',
          prompt: eq([a, OP.minus, SLOT, '=', c]),
          speak: `${a} minus vilket tal blir ${c}?`,
          answer: a - c,
          hint: `Räkna upp från ${c} till ${a}.`,
          explain: `${a} − ${a - c} = ${c}`,
        });
      }
      const kind = rnd(0, 2);
      if (kind === 0) {
        const t = rnd(2, 9), f = rnd(2, 10), p = t * f;
        return q({
          key: `mis?*${t}=${p}`, input: 'numpad',
          prompt: eq([SLOT, OP.times, t, '=', p]),
          speak: `Vilket tal gånger ${t} blir ${p}?`,
          answer: f,
          hint: `Räkna ${t}-hopp tills du kommer till ${p}.`,
          explain: `${f} · ${t} = ${p}`,
        });
      }
      if (kind === 1) {
        const t = rnd(2, 9), f = rnd(2, 10), p = t * f;
        return q({
          key: `mis${p}/?=${f}`, input: 'numpad',
          prompt: eq([p, OP.div, SLOT, '=', f]),
          speak: `${p} delat med vilket tal blir ${f}?`,
          answer: t,
          hint: `Tänk: ${f} gånger vilket tal blir ${p}?`,
          explain: `${p} / ${t} = ${f}`,
        });
      }
      const a = 50 * rnd(1, 19);
      return q({
        key: `mis${a}+?=1000`, input: 'numpad',
        prompt: '<p class="ask">Hitta tusenkompisen!</p>' + eq([a, OP.plus, SLOT, '=', 1000]),
        speak: `${a} plus vilket tal blir 1000?`,
        answer: 1000 - a,
        hint: 'Räkna i hundratal och femtiotal upp till 1000.',
        explain: `${a} + ${1000 - a} = 1000`,
      });
    },

    place(L) {
      const PLACE = ['ental', 'tiotal', 'hundratal'];
      if (L <= 2) {
        const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, L === 1 ? 2 : 3);
        const n = Number(digits.join(''));
        const pos = rnd(0, digits.length - 1);
        const d = digits[pos];
        const placeIdx = digits.length - 1 - pos;
        const val = d * Math.pow(10, placeIdx);
        const other = digits[(pos + 1) % digits.length];
        const extra = [d, d * 10, d * 100, other * Math.pow(10, placeIdx)].filter((v) => v !== val);
        const choices = shuffle([val].concat(extra.slice(0, 3))).map((v) => ({ value: v, html: String(v), speak: String(v) }));
        const numHtml = String(n).split('').map((ch, i) => (i === pos ? `<mark>${ch}</mark>` : ch)).join('');
        return q({
          key: `place${n}p${pos}`,
          prompt: `<p class="ask">Vad är siffran <strong>${d}</strong> värd i talet</p><div class="eq big-num"><span class="n">${numHtml}</span></div>`,
          speak: `Vad är siffran ${d} värd i talet ${n}?`,
          answer: val,
          choices,
          hint: 'Längst till höger står entalen, sedan tiotalen och sedan hundratalen.',
          explain: `Siffran ${d} står på ${PLACE[placeIdx]}splatsen, så den är värd ${val}.`,
        });
      }
      if (L <= 4) {
        const h = rnd(1, 9);
        let t = rnd(1, 9), o = rnd(1, 9);
        if (L === 4) { if (chance(0.5)) t = 0; else if (chance(0.5)) o = 0; }
        const n = h * 100 + t * 10 + o;
        let parts = [[h, 'hundratal', 'h'], [t, 'tiotal', 't'], [o, 'ental', 'e']];
        if (L === 4) parts = shuffle(parts);
        return q({
          key: `comp${n}${parts.map((p) => p[2]).join('')}`, input: 'numpad',
          prompt: '<p class="ask">Vilket tal är det?</p><div class="blocks">' + parts.map((p) => `<span class="block block-${p[2]}"><b>${p[0]}</b> ${p[1]}</span>`).join('') + '</div><div class="eq"><span class="slot" data-slot></span></div>',
          speak: 'Vilket tal är ' + parts.map((p) => `${p[0]} ${p[1]}`).join(', ') + '?',
          answer: n,
          hint: t === 0 || o === 0 ? 'Hundratalen skrivs först, sedan tiotalen och sist entalen. Finns det inga, skriver man en nolla.' : 'Hundratalen skrivs först, sedan tiotalen och sist entalen.',
          explain: `${h} hundratal, ${t} tiotal och ${o} ental är ${n}.`,
        });
      }
      const k = pick([1, 10, 100]);
      const more = chance(0.5);
      let n;
      if (more) {
        n = k === 1 ? rnd(1, 8) * 100 + pick([99, 9, 19, 49]) : k === 10 ? rnd(1, 8) * 100 + 90 + rnd(0, 9) : rnd(100, 899);
      } else {
        n = k === 1 ? rnd(1, 9) * 100 + pick([0, 10, 50]) : k === 10 ? rnd(1, 9) * 100 + rnd(0, 9) : rnd(200, 999);
      }
      const ans = more ? n + k : n - k;
      return q({
        key: `pm${n}${more ? '+' : '-'}${k}`, input: 'numpad',
        prompt: `<p class="ask">Vilket tal är <strong>${k} ${more ? 'mer' : 'mindre'}</strong> än</p><div class="eq big-num"><span class="n">${n}</span></div><div class="eq"><span class="slot" data-slot></span></div>`,
        speak: `Vilket tal är ${k} ${more ? 'mer' : 'mindre'} än ${n}?`,
        answer: ans,
        hint: `Vilken siffra ändras när man ${more ? 'lägger till' : 'tar bort'} ${k}? Se upp om det blir en ny tia eller hundra!`,
        explain: `${n} ${more ? '+' : '−'} ${k} = ${ans}`,
      });
    },

    clock(L) {
      const allowed = [null, [0], [0, 30], [0, 30, 15, 45], [0, 30, 15, 45, 5, 10, 20, 40, 50, 55], [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]][L];
      const h = rnd(1, 12), m = pick(allowed);
      const name = timeName(h, m);
      const cands = [[prevH(h), m], [nextH(h), m]];
      if (m === 15) cands.push([h, 45]);
      if (m === 45) cands.push([h, 15], [nextH(h), 15]);
      if (m === 30) cands.push([h, 0], [nextH(h), 0]);
      if (m === 25) cands.push([h, 35]);
      if (m === 35) cands.push([h, 25]);
      const swapH = m === 0 ? 12 : m / 5;
      cands.push([swapH, (h % 12) * 5]);
      shuffle(allowed).forEach((mm) => cands.push([h, mm]));
      const names = [name];
      for (const [hh, mm] of cands) {
        if (names.length >= 4) break;
        const nm = timeName(hh, mm);
        if (nm && !names.includes(nm)) names.push(nm);
      }
      while (names.length < 4) {
        const nm = timeName(rnd(1, 12), pick(allowed.length > 1 ? allowed : [0, 30]));
        if (!names.includes(nm)) names.push(nm);
      }
      let hint;
      if (m === 0) hint = 'När den långa visaren pekar rakt upp på 12 är det jämnt klockslag. Den korta visaren visar timmen.';
      else if (m === 30) hint = 'Långa visaren på 6 betyder halv. Titta noga – den korta visaren är på väg mot nästa timme!';
      else if (m === 15 || m === 45) hint = 'Långa visaren på 3 betyder kvart över. På 9 betyder det kvart i.';
      else hint = 'Varje siffra är fem minuter för den långa visaren. Den korta visaren visar timmen.';
      const explainName = m === 0 ? `Klockan är ${HOURS[h]}.` : `Klockan är ${name}.`;
      return q({
        key: `clock${h}:${m}`,
        prompt: '<p class="ask">Vad är klockan?</p>',
        speak: 'Vad är klockan?',
        visual: clockSvg(h, m),
        kind: 'text',
        answer: name,
        choices: shuffle(names).map((nm) => ({ value: nm, html: cap(nm), speak: nm })),
        hint,
        explain: explainName,
      });
    },

    fraction(L) {
      if (L <= 2) {
        const n = L === 1 ? pick([2, 3, 4]) : pick([2, 3, 4, 5, 6, 8]);
        const k = L === 1 ? 1 : rnd(1, n - 1);
        const ans = `${k}/${n}`;
        const val = k / n;
        const cands = L === 1
          ? [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 8]]
          : [[n - k, n], [k, n - k], [k, n + 1], [k + 1, n], [k - 1, n], [k, n - 1], [n, k]];
        const seen = new Set([val.toFixed(6)]);
        const opts = [[k, n]];
        for (const [a, b] of shuffle(cands)) {
          if (opts.length >= 4) break;
          if (a < 1 || b < 2 || a >= b || !DEN[b] || seen.has((a / b).toFixed(6))) continue;
          seen.add((a / b).toFixed(6)); opts.push([a, b]);
        }
        for (const [a, b] of shuffle([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [1, 6], [1, 8], [3, 8]])) {
          if (opts.length >= 4) break;
          if (seen.has((a / b).toFixed(6))) continue;
          seen.add((a / b).toFixed(6)); opts.push([a, b]);
        }
        return q({
          key: `frac${ans}`,
          prompt: '<p class="ask">Hur stor del är färgad?</p>',
          speak: 'Hur stor del av figuren är färgad?',
          visual: `<div class="frac-visual">${fracSvg(k, n)}</div>`,
          kind: 'frac',
          answer: ans,
          choices: shuffle(opts).map(([a, b]) => ({ value: `${a}/${b}`, html: fracHtml(a, b), speak: fracName(a, b), aria: fracName(a, b) })),
          hint: 'Räkna först hur många lika stora delar det finns. Räkna sedan de färgade delarna.',
          explain: `${k} av ${n} delar är färgade. Det är ${fracName(k, n)}.`,
        });
      }
      const n = L === 3 ? pick([2, 2, 4]) : L === 4 ? pick([2, 3, 4, 5]) : pick([3, 4, 5]);
      const k = L === 5 ? rnd(2, n - 1) : 1;
      const total = n * rnd(2, L === 5 ? 8 : 10);
      const ans = (total / n) * k;
      const nm = k === 1 && n === 2 ? 'hälften' : fracName(k, n);
      return q({
        key: `fof${k}/${n}of${total}`, input: 'numpad',
        prompt: `<p class="ask">Hur mycket är ${nm} av ${total}?</p><div class="eq">${fracHtml(k, n)}<span class="n small-of">av</span><span class="n">${total}</span><span class="op eqs">=</span><span class="slot" data-slot></span></div>`,
        speak: `Hur mycket är ${nm} av ${total}?`,
        answer: ans,
        hint: k === 1 ? `Dela ${total} i ${n} lika stora delar.` : `Räkna först ut en ${DEN[n][0]} av ${total}. Ta sedan det gånger ${k}.`,
        explain: k === 1 ? `${total} / ${n} = ${ans}` : `${total} / ${n} = ${total / n} och ${total / n} · ${k} = ${ans}`,
      });
    },

    word(L) {
      const N = pick(NAMES);
      const T = [];
      if (L <= 2) {
        T.push(() => {
          const a = L === 1 ? rnd(5, 15) : rnd(12, 48), b = L === 1 ? rnd(3, 12) : rnd(11, 45);
          return { text: `${N} hittar ${a} snäckor på stranden och ${b} snäckor till i vattnet. Hur många snäckor hittar ${N} sammanlagt?`, answer: a + b, unit: 'snäckor', hint: 'Sammanlagt betyder att man lägger ihop.', explain: `${a} + ${b} = ${a + b}` };
        });
        T.push(() => {
          const a = L === 1 ? rnd(10, 20) : rnd(30, 90), b = rnd(3, a - 2);
          return { text: `Ett fiskstim har ${a} fiskar. ${b} fiskar simmar iväg. Hur många fiskar är kvar i stimmet?`, answer: a - b, unit: 'fiskar', hint: 'Fiskarna som simmar iväg ska tas bort. Det är minus.', explain: `${a} − ${b} = ${a - b}` };
        });
      }
      if (L >= 2 && L <= 4) {
        T.push(() => {
          const k = rnd(2, 6);
          return { text: `En bläckfisk har 8 armar. Hur många armar har ${k} bläckfiskar tillsammans?`, answer: 8 * k, unit: 'armar', hint: `Räkna 8 en gång för varje bläckfisk: ${k} · 8.`, explain: `${k} · 8 = ${8 * k}` };
        });
        T.push(() => {
          const k = rnd(2, 10);
          return { text: `En sjöstjärna har 5 armar. Hur många armar har ${k} sjöstjärnor?`, answer: 5 * k, unit: 'armar', hint: `Räkna 5-hopp, en gång för varje sjöstjärna.`, explain: `${k} · 5 = ${5 * k}` };
        });
        T.push(() => {
          const a = rnd(20, 60), b = rnd(5, a - 5);
          return { text: `En dykare är på ${a} meters djup och simmar ${b} meter uppåt. På hur många meters djup är dykaren nu?`, answer: a - b, unit: 'meter', hint: 'Uppåt betyder att djupet blir mindre.', explain: `${a} − ${b} = ${a - b}` };
        });
      }
      if (L >= 3) {
        T.push(() => {
          const t = rnd(2, 6), f = rnd(2, 9);
          return { text: `${N} har ${t * f} pärlor och delar dem lika mellan ${t} kompisar. Hur många pärlor får varje kompis?`, answer: f, unit: 'pärlor', hint: `Dela ${t * f} i ${t} lika stora högar.`, explain: `${t * f} / ${t} = ${f}` };
        });
        T.push(() => {
          const r = rnd(2, 6), c = rnd(3, 9);
          return { text: `I ett akvarium finns ${r} rader med koraller. Det är ${c} koraller i varje rad. Hur många koraller finns det?`, answer: r * c, unit: 'koraller', hint: 'Lika många i varje rad – då kan man räkna gånger.', explain: `${r} · ${c} = ${r * c}` };
        });
        T.push(() => {
          const a = rnd(25, 30), b = rnd(6, 9);
          return { text: `En blåval kan bli ${a} meter lång. En späckhuggare kan bli ${b} meter lång. Hur många meter längre kan blåvalen bli?`, answer: a - b, unit: 'meter', hint: 'Hur mycket längre? Räkna ut skillnaden med minus.', explain: `${a} − ${b} = ${a - b}` };
        });
      }
      if (L >= 4) {
        T.push(() => {
          const m = 10 * rnd(6, 10), c1 = rnd(15, 35), c2 = rnd(10, m - c1 - 5);
          return { text: `${N} har ${m} kronor och köper en dykmask för ${c1} kronor och en snorkel för ${c2} kronor. Hur många kronor har ${N} kvar?`, answer: m - c1 - c2, unit: 'kr', hint: 'Räkna först ut vad sakerna kostar tillsammans.', explain: `${c1} + ${c2} = ${c1 + c2} och ${m} − ${c1 + c2} = ${m - c1 - c2}` };
        });
        T.push(() => {
          const p = rnd(3, 6), n = rnd(4, 9), s = rnd(2, 9);
          return { text: `Det finns ${p} påsar med ${n} pärlor i varje påse. Dessutom ligger ${s} lösa pärlor på bordet. Hur många pärlor finns det totalt?`, answer: p * n + s, unit: 'pärlor', hint: 'Räkna först ut hur många pärlor det finns i påsarna.', explain: `${p} · ${n} = ${p * n} och ${p * n} + ${s} = ${p * n + s}` };
        });
        T.push(() => {
          const d = pick([15, 20, 25, 30]), k = rnd(2, 4);
          return { text: `Ett dyk tar ${d} minuter. ${N} dyker ${k} gånger. Hur många minuter dyker ${N} sammanlagt?`, answer: d * k, unit: 'minuter', hint: `${k} gånger ${d} minuter.`, explain: `${k} · ${d} = ${d * k}` };
        });
      }
      const t = pick(T)();
      return q({
        key: `word${t.text}`, input: 'numpad', kind: 'word',
        prompt: `<p class="story">${t.text}</p><div class="eq answer-row"><span class="slot" data-slot></span><span class="unit">${t.unit}</span></div>`,
        speak: t.text,
        answer: t.answer,
        unit: t.unit,
        hint: t.hint,
        explain: `${t.explain} ${t.unit}.`,
      });
    },

    compare(L) {
      let left, right, lv, rv, ls, rs;
      if (L === 1) {
        lv = rnd(10, 99); rv = chance(0.15) ? lv : rnd(10, 99);
        if (chance(0.4)) { const t = Math.floor(lv / 10), e = lv % 10; if (e > 0 && e !== t) rv = e * 10 + t; }
        left = lv; right = rv; ls = lv; rs = rv;
      } else if (L === 2) {
        const h = rnd(1, 9);
        lv = h * 100 + rnd(0, 99); rv = chance(0.15) ? lv : h * 100 + rnd(0, 99);
        left = lv; right = rv; ls = lv; rs = rv;
      } else if (L === 3) {
        const a = rnd(10, 60), b = rnd(5, 39);
        lv = a + b; rv = lv + pick([-10, -1, 0, 1, 10, -2, 2]);
        left = `${a} + ${b}`; ls = `${a} plus ${b}`; right = rv; rs = rv;
      } else if (L === 4) {
        const a = rnd(3, 9), b = rnd(3, 9);
        lv = a * b; rv = lv + pick([-3, -1, 0, 1, 2, 5]);
        left = `${a} · ${b}`; ls = `${a} gånger ${b}`; right = rv; rs = rv;
      } else {
        const a = 50 * rnd(2, 10), b = 50 * rnd(2, 10);
        lv = a + b;
        const c = lv + 50 * rnd(2, 6), d = c - lv + pick([-50, 0, 0, 50]);
        rv = c - d;
        left = `${a} + ${b}`; ls = `${a} plus ${b}`; right = `${c} − ${d}`; rs = `${c} minus ${d}`;
      }
      const ans = lv < rv ? '<' : lv > rv ? '>' : '=';
      const W = { '<': 'mindre än', '>': 'större än', '=': 'lika med' };
      return q({
        key: `cmp${left}?${right}`,
        prompt: '<p class="ask">Vilket tecken ska stå i rutan?</p>' + `<div class="eq cmp${L >= 3 ? ' long' : ''}"><span class="n">${left}</span><span class="slot" data-slot></span><span class="n">${right}</span></div>`,
        speak: `Vilket tecken ska stå mellan ${ls} och ${rs}? Större än, mindre än eller lika med?`,
        kind: 'sign',
        answer: ans,
        choices: ['<', '=', '>'].map((s) => ({ value: s, html: s, speak: W[s], aria: W[s] })),
        hint: L >= 3 ? 'Räkna först ut värdet på båda sidorna. Spetsen pekar mot det mindre talet.' : 'Spetsen pekar mot det mindre talet. Den öppna sidan vänder sig mot det större.',
        explain: `${lv} är ${W[ans]} ${rv}.`,
      });
    },

    sequence(L) {
      let nums, missing = 4, hint = 'Hur mycket ökar eller minskar talen varje gång?', explain;
      if (L <= 4) {
        const step = pick([null, [2, 5, 10], [3, 4, -2, -5, -10], [25, 50, 100, -25, -50], [6, 7, 8, 9, 11, 12, 15, 20, -3, -4, -6, -7]][L]);
        let s;
        if (L === 1) s = rnd(1, 30);
        else if (L === 3) s = Math.abs(step) === 100 ? 100 * rnd(1, 4) + pick([0, 25, 50]) : 25 * rnd(0, 12);
        else s = rnd(1, 60);
        if (step < 0) s = Math.max(s, -step * 4 + rnd(0, 20));
        nums = [0, 1, 2, 3, 4].map((i) => s + i * step);
        if (L >= 2) missing = rnd(1, 4);
        explain = `Talen ${step > 0 ? 'ökar' : 'minskar'} med ${Math.abs(step)} varje gång.`;
      } else if (chance(0.5)) {
        const s = rnd(1, 6);
        nums = [s, 2 * s, 4 * s, 8 * s, 16 * s];
        hint = 'Jämför ett tal med nästa. Vad händer med talet?';
        explain = 'Talen dubbleras varje gång.';
      } else {
        const s = rnd(1, 20);
        nums = [s, s + 1, s + 3, s + 6, s + 10];
        hint = 'Titta på hur mycket det ökar. Ökningen ändras!';
        explain = 'Talet ökar med 1, sedan 2, sedan 3 och sedan 4.';
      }
      const ans = nums[missing];
      const tokens = nums.map((v, i) => (i === missing ? SLOT : v));
      return q({
        key: `bseq${nums.join(',')}m${missing}`, input: 'numpad',
        prompt: '<p class="ask">Vilket tal fattas?</p><div class="seq">' + tokens.map((t) => (t === SLOT ? '<span class="slot" data-slot></span>' : `<span class="seq-n">${t}</span>`)).join('') + '</div>',
        speak: 'Vilket tal fattas? ' + tokens.map((t) => (t === SLOT ? 'vilket tal?' : t)).join(', '),
        answer: ans,
        hint,
        explain,
      });
    },
  };

  // =====================================================================
  const MODES = {
    small: {
      id: 'small', name: 'Lilla dyket', age: 6, choiceCount: 3,
      cats: [
        { id: 'count', name: 'Räkna', icon: '🐟', gen: small.count },
        { id: 'add', name: 'Plus', icon: '➕', gen: small.add },
        { id: 'sub', name: 'Minus', icon: '➖', gen: small.sub },
        { id: 'bonds', name: 'Fem- och tiokompisar', icon: '🤝', gen: small.bonds },
        { id: 'compare', name: 'Störst och minst', icon: '⚖️', gen: small.compare },
        { id: 'sequence', name: 'Talföljder', icon: '🔢', gen: small.sequence },
        { id: 'shapes', name: 'Former', icon: '🔺', gen: small.shapes },
        { id: 'pattern', name: 'Mönster', icon: '🐚', gen: small.pattern },
      ],
    },
    big: {
      id: 'big', name: 'Stora dyket', age: 9, choiceCount: 4,
      cats: [
        { id: 'add', name: 'Addition', icon: '➕', gen: big.add },
        { id: 'sub', name: 'Subtraktion', icon: '➖', gen: big.sub },
        { id: 'mul', name: 'Multiplikation', icon: '✖️', gen: big.mul },
        { id: 'div', name: 'Division', icon: '➗', gen: big.div },
        { id: 'missing', name: 'Saknade tal', icon: '❓', gen: big.missing },
        { id: 'place', name: 'Positionssystemet', icon: '💯', gen: big.place },
        { id: 'compare', name: 'Större eller mindre', icon: '⚖️', gen: big.compare },
        { id: 'sequence', name: 'Talföljder', icon: '🔢', gen: big.sequence },
        { id: 'clock', name: 'Klockan', icon: '🕒', gen: big.clock },
        { id: 'fraction', name: 'Bråk', icon: '🍕', gen: big.fraction },
        { id: 'word', name: 'Textuppgifter', icon: '📖', gen: big.word },
      ],
    },
  };

  function generate(modeId, catId, level) {
    const cat = MODES[modeId].cats.find((c) => c.id === catId);
    const L = Math.max(1, Math.min(5, Math.floor(level)));
    const question = cat.gen(L);
    question.cat = catId;
    question.level = L;
    return question;
  }

  const api = { MODES, generate, timeName, shuffle };
  root.MDQuestions = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
