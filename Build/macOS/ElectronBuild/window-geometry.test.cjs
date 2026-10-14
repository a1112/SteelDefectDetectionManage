const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const vm = require('node:vm');
const policy = require('./window-geometry');
const primary = { workArea: { x:0, y:32, width:1280, height:768 }, scaleFactor:2 };
const second = { workArea: { x:-1600, y:20, width:1600, height:900 }, scaleFactor:1 };
test('compact first launch uses logical work area without scaling it twice', () => {
  const bounds=policy.resolveBounds([primary,second],primary);
  assert.equal(bounds.show,false); assert(bounds.width<=1120);assert(bounds.height<=720);
  assert(bounds.x>=0 && bounds.y>=32 && bounds.x+bounds.width<=1280 && bounds.y+bounds.height<=800);
});
test('preserve valid secondary display and work-area-sized user rectangles', () => {
  for(const saved of [{x:-1500,y:40,width:640,height:400},{x:0,y:32,width:1280,height:768}]) {
    const result=policy.resolveBounds([primary,second],primary,saved);
    for(const key of ['x','y','width','height'])assert.equal(result[key],saved[key]);
  }
});
test('removed display only relocates a still-valid small saved size', () => {
  const result=policy.resolveBounds([primary],primary,{x:-1500,y:40,width:640,height:400});
  assert.equal(result.width,640); assert.equal(result.height,400);assert.equal(result.minWidth,640);assert.equal(result.x,0);
});
test('only shrink oversized axes on a small screen', () => {
  const small={workArea:{x:0,y:24,width:800,height:576}};
  const result=policy.resolveBounds([small],small,{x:0,y:24,width:800,height:1000});
  assert.equal(result.width,800);assert.equal(result.height,480);assert.equal(result.minHeight,480);
});
test('malformed records are rejected and atomic write retains valid data', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'codex-electron-geometry-'));const file=path.join(dir,'state.json');
  try {
    fs.writeFileSync(file,'{"x":0,"y":32,"width":0,"height":400}');assert.equal(policy.readState(file),undefined);
    const saved={x:0,y:32,width:640,height:400};policy.writeState(file,saved);assert.deepEqual(policy.readState(file),saved);
    fs.mkdirSync(`${file}.${process.pid}.tmp`);assert.throws(()=>policy.writeState(file,{...saved,width:800}));assert.deepEqual(policy.readState(file),saved);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('actual main entry creates hidden fitted window and retains explicit maximize controls', async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'codex-electron-main-'));const windows=[];const handlers=new Map();
  class FakeWindow extends EventEmitter {
    constructor(options){super();this.options=options;this.webContents=new EventEmitter();this.maximized=false;this.shown=false;windows.push(this);}
    setMenuBarVisibility(){} loadFile(){assert.equal(this.shown,false);this.emit('ready-to-show');} show(){this.shown=true;}
    getNormalBounds(){const {x,y,width,height}=this.options;return{x,y,width,height};}
    isMaximized(){return this.maximized;} maximize(){this.maximized=true;} unmaximize(){this.maximized=false;}
    static getAllWindows(){return windows;} static fromWebContents(){return windows[0];}
  }
  const app=new EventEmitter();app.getPath=()=>dir;app.whenReady=()=>Promise.resolve();app.quit=()=>{};
  const electron={app,BrowserWindow:FakeWindow,ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},screen:{getAllDisplays:()=>[primary,second],getPrimaryDisplay:()=>primary}};
  try {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'main.js'),'utf8'),{require:id=>id==='electron'?electron:id==='./window-geometry'?policy:require(id),__dirname,process:{env:{},platform:'darwin'},console});
    await Promise.resolve();assert.equal(windows.length,1);const win=windows[0];assert.equal(win.options.show,false);assert.equal(win.shown,true);
    const toggle=handlers.get('window:toggle-maximize');assert.equal(toggle({sender:{}}),true);assert.equal(toggle({sender:{}}),false);
    win.emit('close');assert.deepEqual(policy.readState(path.join(dir,'startup-window-geometry.json')),win.getNormalBounds());win.emit('closed');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
