const fs = require("fs");
const path = require("path");

const srcDir = path.resolve(__dirname, "..", "..", "Figmaaidefectdetectionsystem", "build");
const destDir = path.resolve(__dirname, "..", "web");

const copyDir = (src, dest) => {
  if (!fs.existsSync(src)) {
    console.error(`Missing web build at ${src}`);
    process.exit(1);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
};

copyDir(srcDir, destDir);
