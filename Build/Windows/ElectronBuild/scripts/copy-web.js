const fs = require("fs");
const path = require("path");

const findRepoRoot = (startDir) => {
  let current = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(current, "Figmaaidefectdetectionsystem"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
};

const repoRoot = findRepoRoot(__dirname);
if (!repoRoot) {
  console.error("Unable to locate repo root for frontend build.");
  process.exit(1);
}

const srcDir = path.join(repoRoot, "Figmaaidefectdetectionsystem", "build");
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
