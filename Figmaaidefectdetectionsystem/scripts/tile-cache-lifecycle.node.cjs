const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');

const root = path.resolve(__dirname, '..');
const consumers = [
  { name: 'defect-view', file: 'src/components/DefectImageView.tsx', cache: 'tileImageCache', loading: 'tileImageLoading' },
  { name: 'dashboard-neighbor', file: 'src/pages/Dashboard.tsx', cache: 'neighborTileImageCache', loading: 'neighborTileImageLoading' },
];
const compiled = new Map();

function compile(file, consumer) {
  if (compiled.has(file)) return compiled.get(file);
  const original = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const allowed = new Set(['react/jsx-runtime']);
  ast.statements.filter(ts.isImportDeclaration).forEach(node => allowed.add(node.moduleSpecifier.text));
  // Expose the actual private bindings in memory; production files gain no exports.
  const source = consumer ? `${original}\nexport const __cache = ${consumer.cache};\nexport const __loading = ${consumer.loading};\n` : original;
  const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const entry = { code: result.outputText, allowed };
  compiled.set(file, entry); return entry;
}

function harness() {
  const timers = new Map(), images = [], events = new Map(), modules = new Map();
  let nextTimer = 1;
  const setTimer = (fn, delay) => { const id = nextTimer++; timers.set(id, { fn, delay }); return id; };
  const clearTimer = id => timers.delete(id);
  class FakeImage {
    constructor() { this.onload = null; this.onerror = null; this.complete = false; this.value = ''; images.push(this); }
    get src() { return this.value; }
    set src(value) { this.value = value; this.complete = false; }
  }
  const window = { setTimeout: setTimer, clearTimeout: clearTimer,
    addEventListener(name, fn) { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); } };
  const context = vm.createContext({ window, Image: FakeImage, setTimeout: setTimer, clearTimeout: clearTimer,
    fetch() { throw new Error('Unexpected real transport'); }, console: { log() {}, warn() {}, error() {} } });
  function load(file, consumer) {
    if (modules.has(file)) return modules.get(file).exports;
    const entry = compile(file, consumer), module = { exports: {} };
    modules.set(file, module);
    const requireFake = id => {
      if (id.endsWith('/lruImageCache')) return load('src/utils/lruImageCache.ts');
      if (id.endsWith('/tileImageLoader')) return load('src/utils/tileImageLoader.ts');
      assert.ok(entry.allowed.has(id), `Unexpected import: ${id}`);
      return {}; // UI/API imports are never executed; component functions are not mounted.
    };
    vm.runInContext(`(function(exports, require, module) {\n${entry.code}\n})`, context, { filename: file })
      (module.exports, requireFake, module);
    return module.exports;
  }
  const lru = load('src/utils/lruImageCache.ts'), loader = load('src/utils/tileImageLoader.ts');
  const bindings = new Map(consumers.map(c => [c.name, load(c.file, c)]));
  function pump() {
    let turns = 0;
    while (true) {
      const found = [...timers].find(([, timer]) => timer.delay === 0);
      if (!found) return;
      assert.ok(turns++ < 10000); timers.delete(found[0]); found[1].fn();
    }
  }
  function enqueue(name, key) {
    const binding = bindings.get(name);
    loader.queueTileImageLoad({ cacheKey: key, url: `/synthetic/${name}/${key}.png`,
      cache: binding.__cache, loading: binding.__loading, scope: name });
    pump();
  }
  function settle(image, failed = false) {
    const callback = failed ? image.onerror : image.onload;
    assert.equal(typeof callback, 'function'); image.complete = !failed; callback(); pump();
  }
  function loadTile(name, key, failed = false) {
    const before = images.length; enqueue(name, key);
    if (before === images.length) return { started: false, image: bindings.get(name).__cache.get(key) };
    assert.equal(images.length, before + 1); const image = images[before]; settle(image, failed);
    return { started: true, image };
  }
  return { timers, images, bindings, lru, loader, enqueue, settle, loadTile,
    unload() { (events.get('beforeunload') || []).forEach(fn => fn()); } };
}

test('the two tested bindings feed the production tile loader and are reachable from the application route', () => {
  for (const c of consumers) {
    const text = fs.readFileSync(path.join(root, c.file), 'utf8');
    assert.match(text, new RegExp(`cache: ${c.cache}\\b`));
    assert.match(text, /queueTileImageLoad\(/);
  }
  for (const [file, tag] of [['src/App.tsx', 'Dashboard'], ['src/pages/Dashboard.tsx', 'DefectsPage'], ['src/components/pages/DefectsPage.tsx', 'DefectImageView']]) {
    assert.match(fs.readFileSync(path.join(root, file), 'utf8'), new RegExp(`<${tag}\\b`));
  }
});

for (const c of consumers) {
  test(`${c.name}: 1000 actual loader completions retain at most 500 image entries`, () => {
    const h = harness(), binding = h.bindings.get(c.name);
    for (let i = 0; i < 1000; i++) h.loadTile(c.name, `tile-${i}`);
    console.log('RESOURCE_COUNTS', JSON.stringify({ consumer: c.name, completed: 1000,
      cached: binding.__cache.size, imagesWithSource: h.images.filter(image => image.src !== '').length }));
    assert.equal(binding.__cache.size, 500);
    assert.equal(h.images.filter(image => image.src !== '').length, 500);
    assert.equal(binding.__loading.size, 0); assert.equal(h.timers.size, 0);
  });
  test(`${c.name}: reading a cached tile protects it while the oldest cold image is released`, () => {
    const h = harness(), cache = h.bindings.get(c.name).__cache;
    for (let i = 0; i < 500; i++) h.loadTile(c.name, `tile-${i}`);
    const hot = cache.get('tile-0'); h.loadTile(c.name, 'tile-500');
    assert.equal(cache.get('tile-0'), hot); assert.equal(cache.has('tile-1'), false);
    assert.equal(h.images[1].src, ''); assert.notEqual(hot.src, '');
  });
  test(`${c.name}: returning to an evicted tile loads a fresh image`, () => {
    const h = harness(), cache = h.bindings.get(c.name).__cache;
    for (let i = 0; i < 501; i++) h.loadTile(c.name, `tile-${i}`);
    const old = h.images[0]; assert.equal(cache.has('tile-0'), false);
    const result = h.loadTile(c.name, 'tile-0'); assert.equal(result.started, true);
    assert.notEqual(result.image, old); assert.equal(old.src, ''); assert.equal(cache.size, 500);
  });
  test(`${c.name}: existing global unload cleanup clears this cache and its image sources`, () => {
    const h = harness(), cache = h.bindings.get(c.name).__cache;
    for (let i = 0; i < 3; i++) h.loadTile(c.name, `tile-${i}`);
    h.unload(); assert.equal(cache.size, 0); assert.ok(h.images.every(image => image.src === ''));
  });
  test(`${c.name}: a warm tile still avoids a duplicate load`, () => {
    const h = harness(), first = h.loadTile(c.name, 'warm'), second = h.loadTile(c.name, 'warm');
    assert.equal(second.started, false); assert.equal(first.image, second.image); assert.equal(h.images.length, 1);
  });
  test(`${c.name}: a failed image leaves no cache or loading marker and can be retried`, () => {
    const h = harness(), binding = h.bindings.get(c.name);
    h.loadTile(c.name, 'retry', true); assert.equal(binding.__cache.size, 0); assert.equal(binding.__loading.size, 0);
    assert.equal(h.loadTile(c.name, 'retry').started, true); assert.equal(binding.__cache.size, 1);
    assert.equal(h.timers.size, 0);
  });
}

test('existing LRU get/set/clear behavior keeps the hot item and releases image sources', () => {
  const h = harness(), cache = new h.lru.LRUTileCache(2), a = { src: 'a' }, b = { src: 'b' }, c = { src: 'c' };
  cache.set('a', a); cache.set('b', b); cache.get('a'); cache.set('c', c);
  assert.equal(cache.size, 2); assert.equal(cache.has('b'), false); assert.equal(b.src, '');
  cache.clear(); assert.equal(a.src, ''); assert.equal(c.src, '');
});
test('the existing registry reuses a named cache and isolates distinct names', () => {
  const h = harness(), a = h.lru.getOrCreateLRUCache('control-a', 2);
  assert.equal(h.lru.getOrCreateLRUCache('control-a', 99), a);
  assert.notEqual(h.lru.getOrCreateLRUCache('control-b', 2), a);
});
test('the actual loader still admits six concurrent images and drains queued work', () => {
  const h = harness(), name = consumers[0].name;
  for (let i = 0; i < 8; i++) h.enqueue(name, `concurrent-${i}`);
  assert.equal(h.images.length, 6);
  for (let i = 0; i < 8; i++) h.settle(h.images[i]);
  assert.equal(h.images.length, 8); assert.equal(h.bindings.get(name).__loading.size, 0);
  assert.equal(h.timers.size, 0);
});
