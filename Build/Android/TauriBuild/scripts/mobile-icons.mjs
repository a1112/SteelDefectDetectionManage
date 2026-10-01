// Synchronize only launcher resources owned by this project. No network access.
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve, relative, sep, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { opaquePng } from './png-opaque.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const cliVersion = '2.10.1';
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
export const androidFiles = Object.keys(densities).flatMap(d => ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground'].map(n => `mipmap-${d}/${n}.png`)).concat(['mipmap-anydpi-v26/ic_launcher.xml', 'values/ic_launcher_background.xml']);
function bounded(base, name, required = true) {
  if (typeof name !== 'string' || name.includes('\\') || name.includes('\0') || name.split('/').some(p => !p || p === '.' || p === '..') || name.startsWith('/')) throw new Error(`Unsafe resource path: ${name}`);
  const out = resolve(base, name);
  if (relative(base, out).startsWith(`..${sep}`) || out === base) throw new Error(`Path escapes resource root: ${name}`);
  // Reject symlinks in source, destination and their ancestors, including base.
  for (let part = out; ; part = dirname(part)) {
    let st; try { st = lstatSync(part); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (st?.isSymbolicLink()) throw new Error(`Symlink resource path: ${part}`);
    if (dirname(part) === part) break;
  }
  if (required && (!existsSync(out) || !lstatSync(out).isFile())) throw new Error(`Missing resource: ${out}`);
  return out;
}
function png(file, width, noAlpha = false) {
  const bytes = readFileSync(file);
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.length < 33 || bytes.toString('ascii',12,16) !== 'IHDR') throw new Error(`Invalid PNG: ${file}`);
  if (bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== width) throw new Error(`Wrong icon dimensions (${width} required): ${file}`);
  let transparency = [4, 6].includes(bytes[25]);
  for (let i = 8; i + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(i); if (i + length + 12 > bytes.length) throw new Error(`Truncated PNG: ${file}`);
    if (bytes.toString('ascii', i+4, i+8) === 'tRNS') transparency = true;
    i += length + 12;
  }
  if (noAlpha && transparency) throw new Error(`iOS AppIcon must have no alpha channel/transparency: ${file}`);
  return bytes;
}
function apply(plan, check) {
  // Every input is validated before the first write.
  for (const { source, destination, bytes } of plan) if (check && (!existsSync(destination) || !(bytes ?? readFileSync(source)).equals(readFileSync(destination)))) throw new Error(`Stale or missing native icon: ${destination}`);
  if (!check) for (const { source, destination, bytes: prepared } of plan) {
    const bytes = prepared ?? readFileSync(source);
    if (!existsSync(destination) || !bytes.equals(readFileSync(destination))) { mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, bytes); }
  }
}
function xmlRefs(xml, files, source) {
  if (/<!DOCTYPE|<!ENTITY/.test(xml)) throw new Error('Unsupported XML entities');
  for (const [, type, name] of xml.matchAll(/@(mipmap|drawable|color)\/([a-z_0-9]+)/g)) {
    const found = type === 'color' ? readFileSync(bounded(source, 'values/ic_launcher_background.xml'), 'utf8').includes(`name="${name}"`) : files.some(p => p.startsWith(`${type}-`) && p.endsWith(`/${name}.png`));
    if (!found) throw new Error(`Unresolved launcher resource: @${type}/${name}`);
  }
}
export function syncAndroid(project = root, { check = false, source = 'src-tauri/icons/android' } = {}) {
  bounded(project, 'src-tauri/tauri.conf.json');
  bounded(project, `${source}/mipmap-anydpi-v26/ic_launcher.xml`);
  const src = resolve(project, source), target = resolve(project, 'src-tauri/gen/android/app/src/main/res');
  bounded(project, 'src-tauri/gen/android/app/src/main/AndroidManifest.xml');
  const manifest = readFileSync(bounded(project, 'src-tauri/gen/android/app/src/main/AndroidManifest.xml'), 'utf8');
  if (!/<application\b[^>]*android:icon="@mipmap\/ic_launcher"/s.test(manifest)) throw new Error('Expected application launcher @mipmap/ic_launcher');
  for (const [, icon] of manifest.matchAll(/android:(?:icon|roundIcon)="([^"]+)"/g)) if (!['@mipmap/ic_launcher', '@mipmap/ic_launcher_round'].includes(icon)) throw new Error(`Unsupported component icon override: ${icon}`);
  const gradle = readFileSync(bounded(project, 'src-tauri/gen/android/app/build.gradle.kts'), 'utf8');
  if (/sourceSets|res\.srcDir|res\.setSrcDirs/.test(gradle)) throw new Error('Non-default Android sourceSets require explicit icon integration');
  const plan = androidFiles.map(name => ({ source: bounded(src, name), destination: bounded(target, name, false) }));
  let repairStage;
  try {
    for (const d of Object.keys(densities)) for (const n of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground']) {
      const path = bounded(src, `mipmap-${d}/${n}.png`), expected = n.endsWith('foreground') ? densities[d] * 108 / 48 : densities[d];
      const bytes = readFileSync(path);
      if (d === 'hdpi' && n !== 'ic_launcher_foreground' && bytes.readUInt32BE(16) === 49 && bytes.readUInt32BE(20) === 49) {
        const input = bounded(src, `mipmap-xxxhdpi/${n}.png`); png(input, 192);
        repairStage ??= mkdtempSync(join(project, '.mobile-icon-hdpi-'));
        const output = join(repairStage, n), cli = tauriCli(project);
        const run = spawnSync(process.execPath, [cli, 'icon', input, '--png', '72', '--output', output], { cwd: project, stdio: 'inherit', shell: false });
        if (run.error || run.status !== 0) throw run.error ?? new Error('HDPI PNG-only generation failed');
        plan.find(p => p.source === path).bytes = png(bounded(output, '72x72.png'), 72);
      } else png(path, expected);
    }

  const xml = readFileSync(bounded(src, 'mipmap-anydpi-v26/ic_launcher.xml'), 'utf8');
  if (!xml.includes('<adaptive-icon') || !xml.includes('<foreground') || !xml.includes('<background')) throw new Error('Invalid adaptive launcher XML');
  xmlRefs(xml, androidFiles, src);
  apply(plan, check);
  return plan.length;
  } finally { if (repairStage) rmSync(repairStage, { recursive: true, force: true }); }
}
export function syncIos(project = root, { check = false } = {}) {
  bounded(project, 'src-tauri/tauri.conf.json');
  const catalog = 'src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset';
  const contents = JSON.parse(readFileSync(bounded(project, `${catalog}/Contents.json`), 'utf8'));
  if (!Array.isArray(contents.images) || !contents.images.some(i => i.idiom === 'ios-marketing')) throw new Error('AppIcon catalog must include marketing icon');
  const plan = contents.images.map(image => {
    if (!image.filename || !/^\d+(?:\.5)?x\d+(?:\.5)?$/.test(image.size) || !/^[123]x$/.test(image.scale)) throw new Error('AppIcon image missing filename/size/scale');
    const [w,h] = image.size.split('x').map(Number); if (w !== h) throw new Error('AppIcon must be square');
    const source = bounded(resolve(project, 'src-tauri/icons/ios'), image.filename);
    const bytes = opaquePng(png(source, w * Number(image.scale[0])));
    return { source, destination: bounded(resolve(project, catalog), image.filename, false), bytes };
  });
  const apple = resolve(project, 'src-tauri/gen/apple');
  const projects = readdirSync(apple).filter(n => n.endsWith('.xcodeproj'));
  if (!projects.some(n => /ASSETCATALOG_COMPILER_APPICON_NAME\s*=\s*AppIcon;/.test(readFileSync(bounded(apple, `${n}/project.pbxproj`), 'utf8')))) throw new Error('Xcode does not select AppIcon');
  apply(plan, check); return plan.length;
}
export function tauriCli(project = root) {
  const pkg = resolve(project, 'node_modules/@tauri-apps/cli/package.json');
  if (!existsSync(pkg)) throw new Error(`Install the locked @tauri-apps/cli ${cliVersion} before building`);
  // pnpm's package directory is a symlink: permit it only for the installed CLI,
  // not for icon paths, and require its exact published version.
  const info = JSON.parse(readFileSync(pkg, 'utf8'));
  if (info.version !== cliVersion) throw new Error(`Expected @tauri-apps/cli ${cliVersion}, found ${info.version}`);
  return resolve(project, 'node_modules/@tauri-apps/cli/tauri.js');
}
export function generateAndroid(project = root, { check = false } = {}) {
  const canonical = bounded(resolve(project, '../../..'), 'Build/resource/icon/icon.png');
  const cli = tauriCli(project), stage = mkdtempSync(join(project, '.mobile-icon-stage-'));
  try {
    const output = join(stage, 'icons');
    // No sibling gen/ exists: the locked CLI must emit output/android.
    const run = spawnSync(process.execPath, [cli, 'icon', canonical, '--output', output], { cwd: project, stdio: 'inherit', shell: false });
    if (run.error || run.status !== 0) throw run.error ?? new Error(`Tauri icon failed (${run.status})`);
    if (existsSync(join(stage, 'gen'))) throw new Error('Unexpected Tauri staging gen/ route');
    const count = syncAndroid(project, { check, source: relative(project, join(output, 'android')).split(sep).join('/') });
    syncAndroid(project, { check: true, source: relative(project, join(output, 'android')).split(sep).join('/') });
    return count;
  } finally { rmSync(stage, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [platform, flag] = process.argv.slice(2);
    if (!['android', 'ios'].includes(platform) || (flag && flag !== '--check')) throw new Error('Usage: mobile-icons.mjs <android|ios> [--check]');
    const count = platform === 'ios' ? syncIos(root, { check: flag === '--check' }) : generateAndroid(root, { check: flag === '--check' });
    console.log(`${platform}: verified ${count} launcher resources`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
