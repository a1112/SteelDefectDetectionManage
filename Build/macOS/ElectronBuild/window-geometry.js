const fs = require('node:fs');
const path = require('node:path');

function valid(bounds) {
  return bounds && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(bounds[key])) && bounds.width > 0 && bounds.height > 0;
}
function contains(area, bounds) {
  return bounds.x >= area.x && bounds.y >= area.y && bounds.x + bounds.width <= area.x + area.width && bounds.y + bounds.height <= area.y + area.height;
}
function resolveBounds(displays, primary, saved) {
  const restored = valid(saved);
  const overlap = area => restored ? Math.max(0, Math.min(area.x + area.width, saved.x + saved.width) - Math.max(area.x, saved.x)) * Math.max(0, Math.min(area.y + area.height, saved.y + saved.height) - Math.max(area.y, saved.y)) : 0;
  const display = restored ? displays.find(d => contains(d.workArea, saved)) || displays.reduce((best, d) => overlap(d.workArea) > overlap(best.workArea) ? d : best, primary) : primary;
  const area = display.workArea;
  const capW = Math.max(1, area.width - 64), capH = Math.max(1, area.height - 96);
  const width = restored ? (saved.width <= area.width ? saved.width : Math.min(saved.width, capW)) : Math.max(Math.min(840, capW), Math.min(1120, area.width * .82, capW));
  const height = restored ? (saved.height <= area.height ? saved.height : Math.min(saved.height, capH)) : Math.max(Math.min(560, capH), Math.min(720, area.height * .84, capH));
  return {
    x: Math.round(restored ? Math.max(area.x, Math.min(saved.x, area.x + area.width - width)) : area.x + (area.width - width) / 2),
    y: Math.round(restored ? Math.max(area.y, Math.min(saved.y, area.y + area.height - height)) : area.y + (area.height - height) / 2),
    width: Math.round(width), height: Math.round(height),
    minWidth: Math.floor(Math.min(840, capW, width)), minHeight: Math.floor(Math.min(560, capH, height)),
    show: false,
  };
}
function readState(file) {
  try { const value = JSON.parse(fs.readFileSync(file, 'utf8')); return valid(value) ? value : undefined; } catch { return undefined; }
}
function writeState(file, bounds) {
  if (!valid(bounds)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  try { fs.writeFileSync(temporary, JSON.stringify(bounds)); fs.renameSync(temporary, file); }
  finally { try { fs.unlinkSync(temporary); } catch {} }
}
function startupOptions(app, screen) {
  const file = path.join(app.getPath('userData'), 'startup-window-geometry.json');
  return resolveBounds(screen.getAllDisplays(), screen.getPrimaryDisplay(), readState(file));
}
function trackWindow(win, app) {
  const file = path.join(app.getPath('userData'), 'startup-window-geometry.json');
  let timer;
  const save = () => { try { writeState(file, win.getNormalBounds()); } catch (error) { console.warn('Window geometry could not be saved:', error.message); } };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(save, 150); };
  win.on('move', schedule); win.on('resize', schedule);
  win.on('close', () => { clearTimeout(timer); save(); });
  win.on('closed', () => clearTimeout(timer));
  win.once('ready-to-show', () => win.show());
}
module.exports = { valid, resolveBounds, readState, writeState, startupOptions, trackWindow };
