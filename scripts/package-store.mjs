import {cp, mkdir, rm, readFile, writeFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve, join} from 'node:path';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
const buildDir = join(root, 'dist', 'store-extension');
const releaseDir = join(root, 'release');
const zipName = `botanalyzer-${version}-chrome.zip`;
const zipPath = join(releaseDir, zipName);

await rm(buildDir, {recursive: true, force: true});
await mkdir(buildDir, {recursive: true});
await mkdir(releaseDir, {recursive: true});

await execSync('node scripts/build-extension.mjs', {cwd: root, stdio: 'inherit'});
await cp(join(root, 'dist', 'extension'), buildDir, {recursive: true});

const manifestPath = join(buildDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.version = version;
manifest.version_name = version + '-store';
manifest.description = 'Review comment patterns locally. Manual entry and import for TikTok and Instagram.';
manifest.permissions = ['storage'];
delete manifest.background;
manifest.action = {default_title: 'BotAnalyzer'};
manifest.icons = {16: 'icons/icon16.png', 32: 'icons/icon32.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png'};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

await cp(join(root, 'extension', 'icons'), join(buildDir, 'icons'), {recursive: true});
await rm(join(buildDir, 'extension', 'worker.js'), {force: true});

const forbidden = [/\.env/i, /secret/i, /password/i];
async function scan(dir) {
  for (const name of await readdir(dir, {withFileTypes: true})) {
    const p = join(dir, name.name);
    if (name.isDirectory()) await scan(p);
    else if (forbidden.some(rx => rx.test(name.name))) throw Error('Potencijalna tajna u paketu: ' + p);
  }
}
await scan(buildDir);

if (!JSON.parse(await readFile(join(buildDir, 'manifest.json'), 'utf8')).manifest_version) {
  throw Error('manifest.json nije u korenu build-a');
}

await rm(zipPath, {force: true});
execSync(`cd "${buildDir}" && zip -r "${zipPath}" .`, {stdio: 'inherit'});

const hash = createHash('sha256').update(await readFile(zipPath)).digest('hex');
const sums = `${hash}  ${zipName}\n`;
await writeFile(join(releaseDir, 'SHA256SUMS.txt'), sums);
console.log('Store ZIP:', zipPath);
console.log('SHA-256:', hash);
