import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, tauriCli, syncAndroid, syncIos, generateAndroid } from './mobile-icons.mjs';

export function runTauri(args, project = root, runner = spawnSync) {
  const cli = tauriCli(project), [platform, action] = args;
  const mobile = ["android"].includes(platform) && ['init', 'dev', 'build', 'run'].includes(action);
  const call = argv => {
    const result = runner(process.execPath, [cli, ...argv], { cwd: project, env: process.env, stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Tauri command failed (${result.status ?? result.signal ?? 'unknown'})`);
  };
  const sync = () => (platform === 'android' ? generateAndroid(project) : syncIos(project));
  if (mobile && action !== 'init') {
    const generated = platform === 'android' ? 'src-tauri/gen/android/app/src/main/AndroidManifest.xml' : 'src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset/Contents.json';
    if (!existsSync(resolve(project, generated))) throw new Error(`Run ${platform} init before ${action}`);
    sync();
  }
  call(args);
  if (mobile && action === 'init') sync();
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runTauri(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
