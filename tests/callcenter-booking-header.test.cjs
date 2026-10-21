const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', '03-modal-agendamento-primeira-vez.js'), 'utf8');
function sourceFunction(name, nextName, context = {}) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf(`  function ${nextName}(`, start);
  assert.ok(start >= 0 && end > start);
  return vm.runInNewContext(`${source.slice(start, end)}\n${name}`, context);
}

test('procedimento recebe 🩺 uma única vez em cada cabeçalho', () => {
  const inserted = [];
  let emoji = null;
  const title = {
    querySelector: () => emoji,
    prepend: (node) => { emoji = node; inserted.push(node); }
  };
  const add = sourceFunction('tmCadAddProcedureEmoji', 'tmCadEmojifyHeaderIcon', {
    document: { createElement: () => ({ setAttribute() {} }) }
  });
  add(title);
  add(title);
  assert.equal(inserted.length, 1);
  assert.equal(emoji.textContent, '🩺');
  assert.match(source, /tmCadAddProcedureEmoji\(title\)/);
});

test('emojis substituem ícones sem duplicar em reaplicações', () => {
  const inserted = [];
  const icon = {
    classList: { add(name) { icon.hiddenClass = name; } },
    previousElementSibling: null,
    before(element) { this.previousElementSibling = element; inserted.push(element); }
  };
  const document = { createElement: () => ({
    className: '',
    classList: { contains(name) { return name === 'tm-cad-header-emoji'; } },
    setAttribute() {}
  }) };
  const emojify = sourceFunction('tmCadEmojifyHeaderIcon', 'tmCadDecorateHeader', { document });
  const container = { querySelector: () => icon };
  emojify(container, '.fa-calendar-alt', '📅');
  emojify(container, '.fa-calendar-alt', '📅');
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].textContent, '📅');
  assert.equal(icon.hiddenClass, 'tm-cad-native-icon-hidden');
});

test('cada cabeçalho ganha linhas distintas para data e horário', () => {
  const calls = [];
  const dateClasses = [];
  const timeClasses = [];
  const date = { textContent: '19 DE OUTUBRO', classList: { add: (name) => dateClasses.push(name) },
    querySelector: (selector) => selector === '.fa-calendar-alt' ? {} : null };
  const time = { textContent: '08:00-08:00', classList: { add: (name) => timeClasses.push(name) },
    querySelector: () => null };
  const decorate = sourceFunction('tmCadDecorateHeader', 'tmCadGetExternalConvenioForHeaderList', {
    tmCadEmojifyHeaderIcon: (_container, selector, emoji) => calls.push([selector, emoji])
  });
  const dateBlock = { querySelectorAll: () => [date, time] };
  decorate({}, {}, {}, dateBlock);
  decorate({}, {}, {}, dateBlock);
  assert.equal(dateClasses.includes('tm-cad-header-date-line'), true);
  assert.equal(timeClasses.includes('tm-cad-header-time-line'), true);
  assert.deepEqual(calls.slice(0, 5).map(([, emoji]) => emoji), ['👨‍⚕️', '💳', '🏥', '📅', '🕒']);
  assert.match(source, /headerItems\.forEach\(\(item\) => \{/);
  assert.match(source, /tmCadDecorateHeader\(profissional, convenio, unidade, dateBlock\)/);
});

test('tipografia uniforme vale também para vários procedimentos', () => {
  const style = source.slice(source.indexOf('  function tmCadInjectStyle()'), source.indexOf('  function tmCadVisibleModal()'));
  assert.match(style, /\.tm-cad-header-card \* \{\s*font-family: inherit !important;\s*font-size: 13px !important;\s*font-weight: 600 !important;/);
  assert.doesNotMatch(style, /tm-cad-multiple-headers[^\{]*\{\s*font-size: (?:15|18)px/);
  assert.match(style, /\.tm-cad-header-time-line \{\s*margin-top: 2px !important;/);
  assert.match(style, /\.tm-cad-native-icon-hidden \{\s*display: none !important;/);
});

test('botão Ocupar é ancorado no canto inferior direito de cada cartão', () => {
  const added = [];
  const group = { classList: { add: (name) => added.push(name) } };
  const button = { textContent: 'Ocupar', closest: () => group };
  const item = { querySelectorAll: () => [button], contains: (element) => element === group };
  const position = sourceFunction('tmCadPositionOcuparButton', 'tmCadApplyHeaderLayout', {
    tmCadNorm: (value) => String(value || '').trim()
  });
  position(item);
  assert.deepEqual(added, ['tm-cad-header-ocupar']);
  assert.match(source, /\.tm-cad-header-card \.tm-cad-header-ocupar \{\s*position: absolute !important;\s*right: 12px !important;\s*bottom: 10px !important;/);
  assert.doesNotMatch(source, /\.tm-cad-header-card \{\s*position: relative !important;\s*padding-bottom: 40px !important;/);
  assert.match(source, /headerItems\.forEach\(\(item\) => \{[\s\S]*?tmCadPositionOcuparButton\(item\)/);
});

test('retomada do rascunho redecorará cabeçalho recomposto pelo Klingo', () => {
  const needsLayout = sourceFunction('tmCadHeaderNeedsLayout', 'tmCadApplyHeaderLayout');
  let decorated = false;
  const title = { querySelector: () => decorated ? {} : null };
  const item = {
    classList: { contains: () => decorated },
    querySelector(selector) {
      if (selector === 'label .h4') return title;
      if (['label .fa-user-md', 'label .fa-building', 'label .fa-calendar-alt'].includes(selector)) return {};
      return decorated ? {} : null;
    }
  };
  const modal = { querySelectorAll: () => [item] };
  assert.equal(needsLayout(modal), true);
  decorated = true;
  assert.equal(needsLayout(modal), false);
  assert.match(source, /modal\.classList\.contains\('tm-primeira-vez-layout'\)\) \{\s*if \(tmCadHeaderNeedsLayout\(modal\)\) tmCadApplyHeaderLayout\(modal\);/);
});
