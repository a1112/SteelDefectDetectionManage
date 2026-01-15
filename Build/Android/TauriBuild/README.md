# Android Tauri Build

This folder contains the Tauri v2 Android build setup.

Prerequisites
- Rust toolchain (rustup + cargo)
- Android SDK + NDK
- Java JDK

Rust install
- https://www.rust-lang.org/zh-CN/tools/install
- Windows rustup: https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe
- Verify: `rustc -V` and `cargo -V`

JDK install
- https://www.oracle.com/java/technologies/downloads/
- https://adoptium.net/temurin/releases/
- Verify: `java -version`

Environment variables (examples)
- ANDROID_SDK_ROOT
- ANDROID_NDK_HOME
- JAVA_HOME

One-time init
- From this folder run: `npm install`
- Then run: `npm run tauri:android init`

Build
- `build.bat`
  - Runs Vite build, then `tauri android build`
