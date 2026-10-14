const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const script = fs.readFileSync(path.join(__dirname, '..', 'klingo.user.js'), 'utf8');
const start = script.indexOf('/* =========================\n   CALL CENTER / CONFIRMAÇÃO - CALENDÁRIO DE ATENDIMENTOS');
const end = script.indexOf('/* =========================\n   CONFIRMAÇÃO - FILTRO', start);
assert.ok(start >= 0 && end > start);
const calendar = script.slice(start, end);

test('ambos os campos recebem calendário; escolher data preserva a atualização nativa do Klingo', () => {
  assert.match(calendar, /\[current\.startInput, current\.endInput\]\.forEach/);
  assert.match(calendar, /input\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\)/);
  assert.match(calendar, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
  assert.doesNotMatch(calendar, /current\.refresh\.click\(/);
});

test('oculta o seletor nativo nos dois campos e pinta somente o primeiro', () => {
  assert.match(calendar, /input\.\$\{INPUT_CLASS\}\[type="date"\]::-webkit-calendar-picker-indicator \{ display: none !important; \}/);
  assert.match(calendar, /\[current\.startInput, current\.endInput\]\.forEach\(\(input, index\) => \{\s*input\.classList\.add\(INPUT_CLASS\)/);
  assert.match(calendar, /if \(state\.input === current\.endInput\) \{\s*state\.days = new Map\(\);\s*state\.loading = false;\s*state\.error = '';\s*render\(\);\s*return;/);
  assert.match(calendar, /const painted = state\.input === tmConfirmationCalendarAdapter\.read\(\)\?\.startInput/);
  assert.match(calendar, /state\.input !== current\.startInput\) return/);
});
