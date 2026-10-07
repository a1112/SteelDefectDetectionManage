# Android launcher icon preparation

Run inside Build/Android/TauriBuild:

```sh
npm ci
npm run test:mobile-icons
npm run tauri:android:init
npm run tauri:android:build -- --debug
npm run icons:android:check
```

The wrapper requires the committed @tauri-apps/cli 2.10.1 lock. It generates from this public repository's own Build/resource/icon/icon.png in an isolated temporary output whose parent has no gen directory, then copies only 17 Android launcher PNG/XML/color resources to src-tauri/gen/android/app/src/main/res. Temporary desktop outputs never replace desktop assets. Only the script-owned temporary directories are removed. Missing or invalid inputs stop before the first target write.

The locked CLI produces 49px hdpi legacy/round derivatives. The helper regenerates only those two 72px PNGs from their 192px counterparts with the same CLI and PNG-only temporary outputs. Repeated synchronization leaves matching target files unchanged. Source artwork, desktop resources and unrelated native resources stay unchanged.

Initialization must succeed before synchronization; build/dev synchronize before invoking the CLI. The committed Gradle preBuild guard checks parity for direct Gradle builds. If the native project is replaced or regenerated outside this wrapper, verify that the guard is still present. Bare CLI or direct builds without the guard bypass preparation and are unsupported. Alternate source sets and unexpected component icon overrides fail closed and require explicit integration.

The scripts do not download tools or accept SDK licenses. This is an Android source repair using existing branding; no new brand design or iOS target is introduced. Tests cover fixtures, staging, initialization order and failure, invalid or missing inputs, path escapes and symlinks, repeatability and preservation. These are not APK, SDK, signing, installed-device, adaptive-mask or release acceptance tests. Inspect the intended variant's merged manifest and compiled resources, then install and inspect the package before release.
