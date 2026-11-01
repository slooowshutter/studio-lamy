/* Local, dependency-free checks. No browser rendering is claimed. Run: node verify.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const core = require('./script.js');
let assertions = 0;
function check(value, message) { assert(value, message); assertions++; }

for (const anchor of ['2026-01-01T12:00:00Z', '2026-03-28T23:30:00Z', '2026-10-24T23:30:00Z', '2026-12-28T23:30:00Z']) {
  const now = new Date(anchor);
  const days = core.nextDays(now);
  check(days.length === 14 && new Set(days).size === 14, 'fourteen distinct Paris dates');
  for (const iso of days) for (const service of core.SERVICES) {
    const slots = core.slotsFor(iso, service.minutes, now);
    const hours = core.hoursFor(iso);
    if (!hours) { check(slots.length === 0, 'Sunday has no example slots'); continue; }
    for (const slot of slots) {
      check(slot.minute >= hours[0], 'not before opening');
      check(slot.minute + service.minutes <= hours[1], 'service ends before closing');
      if (iso === core.parisNow(now).iso && slot.minute <= core.parisNow(now).minutes) check(slot.disabled, 'past slot disabled');
    }
  }
}
for (const phone of ['06 00 00 00 00', '+33 7 12 34 56 78', '0033671234567']) check(core.validPhone(phone), 'valid mobile');
for (const phone of ['01 42 00 00 00', '123', '06000000000', '+4407000000000']) check(!core.validPhone(phone), 'invalid mobile');
for (const date of ['2026-04-06', '2026-05-14', '2026-05-25', '2026-11-11']) check(core.holiday(date), 'French public holiday');
check(!core.holiday('2026-11-02'), 'ordinary day');

// Small event/DOM adapter to execute the actual source and actual HTML together.
// It verifies selectors and state transitions; it does not implement layout or CSS.
let document;
class Element {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase(); this.attrs = attrs; this.children = []; this.events = {};
    this.style = {}; this.hidden = 'hidden' in attrs; this.disabled = 'disabled' in attrs;
    this.checked = false; this.value = attrs.value || ''; this._text = '';
    this.tabIndex = 'tabindex' in attrs ? Number(attrs.tabindex) : 0;
    this.dataset = Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase()), value]));
    const classes = new Set((attrs.class || '').split(' ').filter(Boolean));
    this.classList = { add: (...items) => items.forEach(x => classes.add(x)), remove: (...items) => items.forEach(x => classes.delete(x)), contains: x => classes.has(x) };
    this.rect = { top: 100, bottom: 150, height: tag === 'nav' && attrs.class === 'mobile-bar' ? 70 : 50 };
  }
  set className(value) { value.split(' ').forEach(x => this.classList.add(x)); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(x => x.textContent).join(''); }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  get all() { return this.children.flatMap(node => [node, ...node.all]); }
  querySelectorAll(selector) { return this.all.filter(node => node.matches(selector)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  matches(selector) {
    if (selector.includes(':not(:disabled)') && this.disabled) return false;
    selector = selector.replace(':not(:disabled)', '');
    if (selector.startsWith('#')) return this.attrs.id === selector.slice(1);
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    const tag = selector.match(/^[\w-]+/);
    if (tag && this.tagName !== tag[0].toUpperCase()) return false;
    for (const match of selector.matchAll(/\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]/g)) {
      const value = match[1] === 'name' ? this.name || this.attrs.name : match[1] === 'value' ? this.value : this.attrs[match[1]];
      if (match[2] === undefined ? value === undefined : value !== match[2]) return false;
    }
    return true;
  }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(type, callback) { (this.events[type] ||= []).push(callback); }
  emit(type, target = this) { for (const callback of this.events[type] || []) callback({ target, preventDefault() {} }); }
  getBoundingClientRect() { return this.rect; }
  focus() { document.activeElement = this; }
  scrollIntoView() { this.scrolled = true; }
  contains(node) { return this === node || this.all.includes(node); }
  reset() { this.querySelectorAll('input').forEach(input => { input.checked = false; input.value = ''; }); }
}
document = new Element('document');
const stack = [document];
const voids = new Set(['meta', 'link', 'input', 'br', 'hr']);
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
for (const token of html.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/([\w-]+)\s*>|<([\w-]+)([^>]*)>|([^<]+)/g)) {
  if (token[1]) { if (stack.length > 1) stack.pop(); }
  else if (token[2]) {
    const attrs = {};
    for (const match of token[3].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g)) attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
    const element = new Element(token[2], attrs); stack.at(-1).append(element);
    if (!voids.has(token[2])) stack.push(element);
  } else if (token[4]) stack.at(-1)._text += token[4].replaceAll('&nbsp;', '\u00a0').replaceAll('&amp;', '&');
}
document.documentElement = document.querySelector('html');
document.createElement = tag => new Element(tag);
document.createDocumentFragment = () => new Element('fragment');
const media = { matches: true, addEventListener() {} };
const window = { innerHeight: 844, matchMedia: () => media };
let timerId = 0;
const timers = new Map();
const context = vm.createContext({ document, window, Intl, Date,
  setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
  clearTimeout: id => timers.delete(id),
  requestAnimationFrame: callback => { callback(); return 1; }, cancelAnimationFrame() {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8'), context);
const $ = selector => document.querySelector(selector);
const click = selector => { check(!!$(selector), `selector ${selector}`); $(selector).emit('click'); };
const form = $('#booking-form');
function choose(name, value) {
  const input = $(`input[name="${name}"][value="${value}"]`);
  check(!!input && !input.disabled, `enabled ${name} ${value}`);
  input.checked = true; form.emit('change', input);
}
check(window.salonReady && !$('#booking-app').hidden, 'app initializes');
click('[data-next="1"]'); check($('#service-error').textContent.length > 0, 'missing service error');
choose('service', 'pose');
$('#step-title-1').rect = { top: 1100, bottom: 1150, height: 50 };
click('[data-next="1"]');
check(!document.querySelector('[data-panel="1"]').hidden, 'day step visible');
check($('#step-title-1').scrolled, 'offscreen heading scrolled into view');
const firstDay = $('input[name="day"]:not(:disabled)'); choose('day', firstDay.value);
click('[data-next="2"]');
const firstTime = $('input[name="time"]:not(:disabled)'); choose('time', firstTime.value);
click('[data-next="3"]'); form.emit('submit');
check($('#firstname-error').textContent.length > 0 && $('#phone-error').textContent.length > 0, 'inline contact errors');
$('#firstname').value = 'Camille'; $('#phone').value = '06 00 00 00 00'; form.emit('submit');
check(!$('#success').hidden && form.hidden, 'success visible');
check($('#success-recap').textContent.includes('Camille') && $('#success-recap').textContent.includes('Pose gel'), 'success has chosen data');
check($('#booking-status').textContent.includes('aucun créneau'), 'simulation announced');
click('#restart'); check(!form.hidden && $('#success').hidden, 'restart restores form');
check($('#summary-service').textContent.includes('choisir'), 'restart clears summary');
click('[data-service="semi"]');
check($('#summary-service').textContent.includes('semi-permanent'), 'menu preselection');
const selectedDay = $('input[name="day"]:not(:disabled)'); choose('day', selectedDay.value);
click('[data-next="2"]'); choose('time', $('input[name="time"]:not(:disabled)').value);
click('[data-back="1"]'); click('[data-back="0"]'); choose('service', 'remplissage');
check($('#summary-date').textContent.includes('choisir') && $('#summary-time').textContent.includes('choisir'), 'service change clears dependent choices');
click('[data-next="1"]');
// Simulate an old selection surviving across a date change.
const old = $('input[name="day"]:not(:disabled)'); old.value = '2020-01-06'; form.emit('change', old);
click('[data-next="2"]');
check(!document.querySelector('[data-panel="1"]').hidden && $('#day-error').textContent.length > 0, 'stale date rejected before time step');
click('#restart');
media.matches = false;
choose('service', 'pose'); click('[data-next="1"]');
check(document.querySelector('[data-panel="0"]').inert && !document.querySelector('[data-panel="1"]').hidden, 'crossfade keeps outgoing panel inert');
click('[data-back="0"]');
for (const [id, callback] of [...timers]) { timers.delete(id); callback(); }
check(!document.querySelector('[data-panel="0"]').hidden && document.querySelector('[data-panel="1"]').hidden, 'interrupted transition settles on latest step');
check(document.querySelectorAll('[data-panel]').every(panel => !panel.inert), 'no lingering inert panel after transition');
console.log(`${assertions} assertions passed. Calendar boundaries, selectors, full booking, validation, focus, restart, menu preselection, dependency invalidation and stale dates. No browser rendering tested.`);
