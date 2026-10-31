// Kör: node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../src/questions.js');

const RUNS = 400;

for (const mode of Object.values(Q.MODES)) {
  for (const cat of mode.cats) {
    test(`${mode.name}: ${cat.name}`, () => {
      for (let level = 1; level <= 5; level++) {
        for (let i = 0; i < RUNS; i++) {
          const q = Q.generate(mode.id, cat.id, level);
          const where = `${mode.id}/${cat.id} nivå ${level}: ${q.key}`;
          for (const field of ['prompt', 'speak', 'hint', 'explain', 'key']) {
            assert.equal(typeof q[field], 'string', `${where} saknar ${field}`);
            assert.ok(q[field].length > 0, `${where} har tom ${field}`);
            assert.ok(!/undefined|NaN|null|\[object/.test(q[field]), `${where} ${field}: ${q[field]}`);
          }
          assert.ok(q.prompt.includes('data-slot') || q.input === 'choices', `${where} saknar svarsruta`);
          if (q.input === 'numpad') {
            assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 9999, `${where} svar ${q.answer}`);
          } else {
            assert.equal(q.input, 'choices', where);
            const values = q.choices.map((c) => c.value);
            assert.ok(values.includes(q.answer), `${where} svaret finns inte bland valen`);
            assert.equal(new Set(values).size, values.length, `${where} dubbletter: ${values}`);
            assert.ok(values.length >= 2 && values.length <= 4, `${where} antal val ${values.length}`);
            for (const c of q.choices) {
              assert.ok(!/undefined|NaN/.test(c.html), `${where} val ${c.html}`);
              if (typeof c.value === 'number') assert.ok(Number.isInteger(c.value) && c.value >= 0, `${where} val ${c.value}`);
            }
          }
        }
      }
    });
  }
}

test('bråkval har aldrig två alternativ med samma värde', () => {
  for (let i = 0; i < 3000; i++) {
    const q = Q.generate('big', 'fraction', 1 + (i % 2));
    const vals = q.choices.map((c) => { const [a, b] = c.value.split('/').map(Number); return (a / b).toFixed(6); });
    assert.equal(new Set(vals).size, vals.length, q.choices.map((c) => c.value).join(' '));
  }
});

test('klockans namn följer svenskt språkbruk', () => {
  assert.equal(Q.timeName(3, 30), 'halv fyra');
  assert.equal(Q.timeName(12, 30), 'halv ett');
  assert.equal(Q.timeName(3, 45), 'kvart i fyra');
  assert.equal(Q.timeName(3, 25), 'fem i halv fyra');
  assert.equal(Q.timeName(11, 35), 'fem över halv tolv');
  assert.equal(Q.timeName(1, 0), 'klockan ett');
});

test('jämförelser: rätt tecken', () => {
  for (let i = 0; i < 2000; i++) {
    const q = Q.generate('big', 'compare', 1 + (i % 5));
    const m = q.explain.match(/^(\d+) är (mindre än|större än|lika med) (\d+)\.$/);
    assert.ok(m, q.explain);
    const [l, r] = [Number(m[1]), Number(m[3])];
    const sign = l < r ? '<' : l > r ? '>' : '=';
    assert.equal(q.answer, sign);
  }
});

test('rektangel visas aldrig tillsammans med kvadrat', () => {
  for (let i = 0; i < 3000; i++) {
    const q = Q.generate('small', 'shapes', 2 + (i % 3));
    if (q.answer === 'rektangel') assert.ok(!q.choices.some((c) => c.value === 'kvadrat'));
  }
});
