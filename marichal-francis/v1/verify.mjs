// Node-only functional checks against the actual script and HTML. No browser, network or packages.
// This DOM adapter checks behavior and semantics; it does not check rendering or CSS layout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const parse = spawnSync('python3', ['-c', `
import json, sys
from html.parser import HTMLParser
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.nodes=[]; self.stack=[]
    def handle_starttag(self, tag, attrs):
        node={'tag':tag,'attrs':dict(attrs),'text':''}; self.nodes.append(node)
        if tag not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:
            self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]['tag']==tag:
                self.stack=self.stack[:i]; break
    def handle_data(self, data):
        for node in self.stack: node['text']+=data
p=Parser(); p.feed(open(sys.argv[1],encoding='utf-8').read()); print(json.dumps(p.nodes))
`, path.join(directory, 'index.html')], { encoding: 'utf8' });
assert.equal(parse.status, 0, parse.stderr);
const entries = JSON.parse(parse.stdout);
const registry = [];
const documentHandlers = new Map();
const classes = initial => {
  const values = new Set(initial.split(/\s+/).filter(Boolean));
  return { add: (...names) => names.forEach(name => values.add(name)), remove: (...names) => names.forEach(name => values.delete(name)), contains: name => values.has(name), toggle: (name, force) => force ? values.add(name) : values.delete(name) };
};
let document;
class Element {
  constructor(tag, attrs = {}, text = '') {
    this.tagName = tag.toUpperCase(); this.attrs = { ...attrs }; this.dataset = {};
    for (const [key, value] of Object.entries(attrs)) if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    this.id = attrs.id || ''; this.name = attrs.name || ''; this.value = attrs.value || '';
    this.hidden = 'hidden' in attrs; this.disabled = 'disabled' in attrs;
    this._checked = 'checked' in attrs; this._text = text; this.children = [];
    this.classList = classes(attrs.class || ''); this.handlers = new Map(); registry.push(this);
  }
  get className() { return this.attrs.class || ''; }
  set className(value) { this.attrs.class = value; this.classList = classes(value); }
  get checked() { return this._checked; }
  set checked(value) {
    if (value && this.name) registry.filter(element => element.name === this.name).forEach(element => { element._checked = false; });
    this._checked = value;
  }
  get textContent() { return this._text + this.children.map(element => element.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] ?? null; }
  removeAttribute(key) { delete this.attrs[key]; }
  append(...elements) { this.children.push(...elements); }
  replaceChildren() {
    const remove = element => { element.children.forEach(remove); const index = registry.indexOf(element); if (index !== -1) registry.splice(index, 1); };
    this.children.forEach(remove); this.children = []; this._text = '';
  }
  addEventListener(type, callback) { if (!this.handlers.has(type)) this.handlers.set(type, []); this.handlers.get(type).push(callback); }
  emit(type, event = {}) {
    if (this.disabled) return;
    for (const callback of this.handlers.get(type) || []) callback({ target: this, preventDefault() {}, ...event });
  }
  focus(options) { document.activeElement = this; this.focusOptions = options; }
  scrollIntoView(options) { this.scrollOptions = options; }
  reset() { registry.filter(element => element.tagName === 'INPUT').forEach(element => { element._checked = false; element.value = element.attrs.value || ''; }); }
}
entries.forEach(entry => new Element(entry.tag, entry.attrs, entry.text));
function matches(element, selector) {
  if (selector.startsWith('#')) return element.id === selector.slice(1);
  if (selector.startsWith('.')) return element.classList.contains(selector.slice(1));
  const tag = selector.match(/^[a-z]+/)?.[0];
  if (tag && element.tagName !== tag.toUpperCase()) return false;
  return [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(([, key, value]) => {
    const actual = key.startsWith('data-') ? element.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] : key === 'name' ? element.name : key === 'value' ? String(element.value) : element.attrs[key];
    return value === undefined ? actual !== undefined : actual === value;
  });
}
document = {
  documentElement: registry.find(element => element.tagName === 'HTML'), activeElement: null,
  querySelector: selector => registry.find(element => matches(element, selector)) || null,
  querySelectorAll: selector => registry.filter(element => matches(element, selector)),
  createElement: tag => new Element(tag),
  addEventListener: (type, callback) => documentHandlers.set(type, callback)
};
let mediaChange;
const media = { matches: false, addEventListener: (_, callback) => { mediaChange = callback; } };
const observers = [];
class Observer {
  constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
  observe(element) { this.targets.add(element); }
  unobserve(element) { this.targets.delete(element); }
}
let fixedInstant = '2026-11-03T09:07:00Z';
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [fixedInstant])); } static now() { return Date.parse(fixedInstant); } }
const context = vm.createContext({ document, window: { matchMedia: () => media, setTimeout, IntersectionObserver: Observer }, IntersectionObserver: Observer, Date: FixedDate, Intl, setTimeout, clearTimeout, requestAnimationFrame: callback => setTimeout(callback, 0) });
const production = fs.readFileSync(path.join(directory, 'script.js'), 'utf8');
vm.runInContext(production.replace(/\}\)\(\);\s*$/, 'globalThis.logic = { SERVICES, HOURS, parisNow, nextDays, simulatedSlots, validMobile }; })();'), context);
const { logic } = context;
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const wait = () => new Promise(resolve => setTimeout(resolve, 145));
function choose(name, value) {
  const input = $(`input[name="${name}"][value="${value}"]`);
  assert.ok(input && !input.disabled, `Selectable ${name}: ${value}`);
  input.checked = true; $('#booking-form').emit('change', { target: input });
}
async function click(selector) { const element = $(selector); assert.ok(element && !element.disabled, selector); element.emit('click'); await wait(); }

assert.equal(logic.parisNow(new Date('2026-11-03T23:30:00Z')).key, '2026-11-04');
assert.equal(logic.parisNow(new Date('2026-03-29T00:30:00Z')).minutes, 90);
assert.equal(logic.parisNow(new Date('2026-03-29T01:30:00Z')).minutes, 210);
assert.equal(logic.nextDays({ key: '2026-12-31' }).at(-1).key, '2027-01-13');
for (const service of Object.values(logic.SERVICES)) {
  for (const day of logic.nextDays()) {
    const slots = logic.simulatedSlots(day.key, service);
    if ([0, 1].includes(day.weekday)) assert.equal(slots.length, 0);
    else for (const slot of slots) {
      assert.ok(slot.minute >= logic.HOURS[day.weekday][0]);
      assert.ok(slot.minute + service.duration <= logic.HOURS[day.weekday][1]);
      if (day.key === '2026-11-03' && slot.minute <= 607) assert.ok(slot.disabled);
    }
    assert.equal(JSON.stringify(slots), JSON.stringify(logic.simulatedSlots(day.key, service)));
  }
}
for (const phone of ['06 00 00 00 00', '+33 7 00 00 00 00', '0033600000000']) assert.equal(logic.validMobile(phone), true);
for (const phone of ['03 20 31 01 28', '0612', 'abc', '06abcdefgh']) assert.equal(logic.validMobile(phone), false);
console.log('PASS — Paris dates, DST, year rollover, closed days, duration fit, past slots, deterministic availability, mobile validation.');

for (const service of ['coupe', 'coiffage', 'soin']) {
  await click(`[data-service="${service}"]`);
  assert.equal($(`input[name="service"][value="${service}"]`).checked, true);
  await click('[data-next="1"]');
  assert.equal($$('input[name="day"]').length, 14);
  for (const radio of $$('input[name="day"]')) if ([0, 1].includes(new Date(`${radio.value}T12:00:00Z`).getUTCDay())) assert.equal(radio.disabled, true);
  choose('day', $$('input[name="day"]').find(input => !input.disabled).value);
  await click('[data-next="2"]');
  choose('time', $$('input[name="time"]').find(input => !input.disabled).value);
  await click('[data-next="3"]');
  assert.equal(document.activeElement.id, 'step-title-3');
  assert.equal(document.activeElement.focusOptions.preventScroll, false);
  $('#first-name').value = 'Essai'; $('#phone').value = 'incorrect';
  $('#booking-form').emit('submit');
  assert.equal($('#phone').getAttribute('aria-invalid'), 'true');
  assert.equal(document.activeElement.id, 'phone');
  assert.equal($('#first-name').value, 'Essai');
  $('#phone').value = '06 00 00 00 00';
  $('#booking-form').emit('submit'); await wait();
  assert.equal($('#success').hidden, false);
  assert.equal(document.activeElement.id, 'success-title');
  assert.equal($('#phone').value, ''); assert.equal($('#first-name').value, '');
  assert.ok($('#success-recap').textContent.includes(logic.SERVICES[service].name));
  await click('#restart');
  assert.equal($('[data-panel="0"]').hidden, false);
  assert.equal($('#summary-service').textContent, 'À choisir');
  assert.equal($('[data-next="1"]').disabled, true);
}
console.log('PASS — All three services: menu selection, 14 days, time selection, validation errors, success, data clearing, restart.');

choose('service', 'coupe'); await click('[data-next="1"]');
choose('day', $$('input[name="day"]').find(input => !input.disabled).value);
await click('[data-next="2"]'); choose('time', $$('input[name="time"]').find(input => !input.disabled).value);
await click('[data-next="3"]'); await click('[data-step="1"]');
choose('day', $$('input[name="day"]').filter(input => !input.disabled)[1].value);
assert.equal($('#summary-time').textContent, 'À choisir'); assert.equal($('[data-step="3"]').disabled, true);
await click('[data-step="0"]'); choose('service', 'coiffage');
assert.equal($('#summary-day').textContent, 'À choisir'); assert.equal($('[data-step="2"]').disabled, true);
console.log('PASS — Back navigation and service/day changes invalidate dependent selections.');

$('[data-next="1"]').emit('click');
media.matches = true; mediaChange({ matches: true });
assert.equal($('[data-panel="1"]').hidden, false);
assert.equal($('[data-panel="0"]').classList.contains('is-leaving'), false);
await wait();
documentHandlers.get('keydown')();
$('[data-step="0"]').emit('click');
assert.equal($('[data-panel="0"]').hidden, false);
assert.equal(document.activeElement.id, 'step-title-0');
assert.equal($('[data-panel="0"]').classList.contains('is-entering'), false);
console.log('PASS — Mid-transition reduced-motion change completes the requested step; keyboard navigation is immediate.');

const actions = observers.find(observer => observer.targets.has($('#hero-actions')));
const intersect = (id, isIntersecting, bottom = 0) => actions.callback([{ target: $(id), isIntersecting, boundingClientRect: { bottom } }]);
intersect('#hero-actions', false, 1100); assert.equal($('.mobile-bar').hidden, true);
intersect('#hero-actions', true, 600); assert.equal($('.mobile-bar').hidden, true);
intersect('#hero-actions', false, -20); assert.equal($('.mobile-bar').hidden, false);
intersect('#essayer', true); assert.equal($('.mobile-bar').hidden, true);
intersect('#essayer', false); intersect('#pied', true); assert.equal($('.mobile-bar').hidden, true);
intersect('#pied', false); assert.equal($('.mobile-bar').hidden, false);
intersect('#hero-actions', true, 600); assert.equal($('.mobile-bar').hidden, true);
const reveals = observers.find(observer => observer.targets.has($('[data-reveal="quote"]')));
const quote = $('[data-reveal="quote"]');
reveals.callback([{ target: quote, isIntersecting: true }]);
assert.equal(quote.classList.contains('is-visible'), true); assert.equal(reveals.targets.has(quote), false);
console.log('PASS — Mobile actions show only after the hero, hide over form/footer, and scroll reveals unobserve after one entrance.');

assert.equal((production.match(/fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon/g) || []).length, 0);
console.log('PASS — No network submission or browser storage API. Rendering and native-browser behavior remain unverified.');
await wait();
