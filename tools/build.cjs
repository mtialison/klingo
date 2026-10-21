const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sourceDir = path.join(root, 'src');
const files = fs.readdirSync(sourceDir).filter((name) => /^\d{2}-.*\.js$/.test(name)).sort();
if (!files.length) throw new Error('Nenhum módulo encontrado em src/.');

const source = files.map((name) => fs.readFileSync(path.join(sourceDir, name), 'utf8').trimEnd())
  .join('\n\n') + '\n';
if (!source.startsWith('// ==UserScript==')) throw new Error('Cabeçalho Tampermonkey ausente.');

const assets = [
  ['__TM_LOGIN_ICON_DATA__', 'image/png', 'login-icon.png'],
  ['__TM_MESSAGE_SOUND_DATA__', 'audio/mpeg', 'message-alert.mp3']
];
let main = source;
for (const [placeholder, mimeType, filename] of assets) {
  const contents = fs.readFileSync(path.join(root, 'assets', filename)).toString('base64');
  const quoted = `'${placeholder}'`;
  if (!main.includes(quoted)) throw new Error(`Recurso não utilizado: ${filename}.`);
  main = main.replace(quoted, JSON.stringify(`data:${mimeType};base64,${contents}`));
}
if (main.includes('__TM_')) throw new Error('Restou um recurso não resolvido.');

const test = main
  .replace(/^\/\/ @name\s+.*$/m, '// @name         klingo (testes)')
  .replace(/^\/\/ @namespace\s+.*$/m, '// @namespace    http://tampermonkey.net/klingo-testes')
  .replace(/^\/\/ @version\s+.*$/m, '// @version      1.18')
  .replace(/^\/\/ @description\s+.*$/m, '// @description  🐒')
  .replace(/^\/\/ @updateURL\s+.*$/m,
    '// @updateURL    https://raw.githubusercontent.com/mtialison/klingo/testes-codex/klingo.test.user.js')
  .replace(/^\/\/ @downloadURL\s+.*$/m,
    '// @downloadURL  https://raw.githubusercontent.com/mtialison/klingo/testes-codex/klingo.test.user.js');

fs.writeFileSync(path.join(root, 'klingo.user.js'), main);
fs.writeFileSync(path.join(root, 'klingo.test.user.js'), test);
console.log(`Versões main e testes geradas a partir de ${files.length} módulos.`);
