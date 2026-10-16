const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const releaseDir = path.join(root, 'release');
const mode = process.argv[2];
if (!['--bootstrap', '--promote'].includes(mode)) {
  throw new Error('Uso: node tools/promote-release.cjs --bootstrap|--promote');
}

const scriptPath = path.join(releaseDir, 'klingo.user.js');
const old = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '';
if (mode === '--bootstrap' && fs.existsSync(path.join(releaseDir, 'klingo.meta.js'))) {
  throw new Error('A distribuição estável já foi inicializada.');
}
if (mode === '--bootstrap' && !old) throw new Error('Copie primeiro o último userscript estável para release/.');
if (mode === '--promote' && !old) throw new Error('Inicialize a distribuição estável primeiro.');

const source = mode === '--bootstrap'
  ? old
  : fs.readFileSync(path.join(root, 'klingo.user.js'), 'utf8');
const modules = fs.readdirSync(path.join(root, 'src'))
  .filter((name) => /^\d{2}-.*\.js$/.test(name)).sort()
  .map((name) => fs.readFileSync(path.join(root, 'src', name), 'utf8').trimEnd()).join('\n\n') + '\n';
if (mode === '--promote' && source !== modules) throw new Error('Execute node tools/build.cjs antes da promoção.');

function versionOf(script) {
  const value = script.match(/^\/\/ @version\s+(\d+(?:\.\d+)*)$/m)?.[1];
  if (!value) throw new Error('Versão numérica ausente no userscript.');
  return value.split('.').map(Number);
}
function newer(candidate, current) {
  const length = Math.max(candidate.length, current.length);
  for (let i = 0; i < length; i++) {
    if ((candidate[i] || 0) !== (current[i] || 0)) return (candidate[i] || 0) > (current[i] || 0);
  }
  return false;
}
if (mode === '--promote' && !newer(versionOf(source), versionOf(old))) {
  throw new Error('A promoção exige uma versão maior que a estável atual.');
}

const stable = source
  .replace(/^\/\/ @updateURL\s+.*$/m,
    '// @updateURL    https://raw.githubusercontent.com/mtialison/klingo/testes-codex/release/klingo.meta.js')
  .replace(/^\/\/ @downloadURL\s+.*$/m,
    '// @downloadURL  https://raw.githubusercontent.com/mtialison/klingo/testes-codex/release/klingo.user.js')
  .replaceAll('/testes-codex/assets/', '/testes-codex/release/assets/');
const header = stable.match(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==/m)?.[0];
if (!header) throw new Error('Cabeçalho Tampermonkey inválido.');

fs.mkdirSync(releaseDir, { recursive: true });
if (mode === '--promote') {
  const assetDir = path.join(releaseDir, 'assets');
  fs.mkdirSync(assetDir, { recursive: true });
  for (const name of ['login-icon.png', 'message-alert.mp3']) {
    fs.copyFileSync(path.join(root, 'assets', name), path.join(assetDir, name));
  }
}
fs.writeFileSync(scriptPath, stable);
fs.writeFileSync(path.join(releaseDir, 'klingo.meta.js'), `${header}\n`);
console.log(`Distribuição estável preparada: versão ${versionOf(stable).join('.')}.`);
