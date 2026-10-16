const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sourceDir = path.join(root, 'src');
const files = fs.readdirSync(sourceDir).filter((name) => /^\d{2}-.*\.js$/.test(name)).sort();
if (!files.length) throw new Error('Nenhum módulo encontrado em src/.');

const output = files.map((name) => fs.readFileSync(path.join(sourceDir, name), 'utf8').trimEnd())
  .join('\n\n') + '\n';
if (!output.startsWith('// ==UserScript==')) throw new Error('Cabeçalho Tampermonkey ausente.');
fs.writeFileSync(path.join(root, 'klingo.user.js'), output);
console.log(`klingo.user.js gerado a partir de ${files.length} módulos (${Buffer.byteLength(output)} bytes).`);
