const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', '04-modal-agendamento-paciente.js'), 'utf8');
function sourceFunction(name, nextName, context = {}) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf(`  function ${nextName}(`, start);
  assert.ok(start >= 0 && end > start, `${name} não encontrado`);
  return vm.runInNewContext(`${source.slice(start, end)}\n${name}`, context);
}

test('paciente existente mantém nascimento preenchido ao instalar a proteção', () => {
  const handlers = {};
  const input = {
    value: '1999-09-09', dataset: {},
    addEventListener(type, handler) { handlers[type] = handler; },
    dispatchEvent() {}
  };
  const field = { querySelector: () => input };
  const protect = sourceFunction('protectBirthDate', 'applyPacienteLayout', { Event });
  protect(field);
  protect(field);
  assert.equal(input.value, '1999-09-09');
  assert.deepEqual(Object.keys(handlers).sort(), ['focus', 'input', 'keydown', 'pointerdown']);

  handlers.keydown({ key: 'ArrowLeft' });
  assert.equal(input.value, '1999-09-09');
  handlers.pointerdown();
  assert.equal(input.value, '1999-09-09');
});

test('edição do ano do paciente preserva dia e mês e não bloqueia as setas', () => {
  const handlers = {};
  const input = {
    value: '1999-09-09', dataset: {},
    addEventListener(type, handler) { handlers[type] = handler; },
    dispatchEvent() {}
  };
  sourceFunction('protectBirthDate', 'applyPacienteLayout', { Event })({ querySelector: () => input });
  for (const year of ['0002', '0020', '0200', '2000']) {
    input.value = `${year}-09-09`;
    handlers.input();
  }
  let prevented = false;
  handlers.keydown({ key: '1', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(input.value, '0001-09-09');
  handlers.keydown({ key: 'ArrowLeft' });
  prevented = false;
  handlers.keydown({ key: '1', preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
});

test('cabeçalho do paciente replica fonte, emojis, linhas e botão sobreposto', () => {
  assert.match(source, /\.tm-paciente-header-card \* \{\s*font-family: inherit !important;\s*font-size: 13px !important;\s*font-weight: 600 !important;/);
  assert.match(source, /icon\.textContent = '🩺'/);
  for (const emoji of ['👨‍⚕️', '💳', '🏥', '📅', '🕒']) assert.ok(source.includes(`'${emoji}'`));
  assert.match(source, /\.tm-paciente-header-time-line \{\s*margin-top: 2px !important;/);
  assert.match(source, /\.tm-paciente-header-ocupar \{\s*position: absolute !important;\s*right: 12px !important;\s*bottom: 10px !important;/);
  assert.match(source, /items\.forEach\(\(item\) => \{/);
});

test('origem mantém aviso e seletor na mesma linha, oculta só o título e compacta rodapé', () => {
  assert.match(source, /\.tm-paciente-origem \.input-group \{\s*display: flex !important;\s*flex-wrap: nowrap !important;/);
  assert.match(source, /\.tm-paciente-origem \.input-group > select\.form-control \{\s*flex: 1 1 auto !important;\s*width: 0 !important;/);
  assert.match(source, /small\.closest\('\.border-bottom\.hover-title-bg'\)/);
  assert.match(source, /if \(title && !title\.querySelector\('select, input'\)\)/);
  assert.match(source, /div\.mt-3\.mb-5 \{\s*height: auto !important;\s*min-height: 0 !important;/);
});
