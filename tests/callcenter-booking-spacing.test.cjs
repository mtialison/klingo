const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', '03-modal-agendamento-primeira-vez.js'), 'utf8');

test('bloco inferior do cadastro acompanha o conteúdo sem espaço vazio fixo', () => {
  assert.match(source, /#cadastroModal\.tm-primeira-vez-layout div\.mt-3\.mb-5 \{\s*height: auto !important;\s*min-height: 0 !important;\s*max-height: none !important;\s*flex-grow: 0 !important;\s*padding-bottom: 0 !important;\s*margin-bottom: 16px !important;/);
});
