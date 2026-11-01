/* File-only verification. No browser, network, dependencies or site writes. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const base = process.argv[2] || __dirname;
const html = fs.readFileSync(`${base}/index.html`, 'utf8');
let source = fs.readFileSync(`${base}/script.js`, 'utf8');
const nodes = new Map();
class Node {
  constructor(id = '') { this.id = id; this.value = ''; this.hidden = false; this.dataset = {}; this.listeners = {}; this.attrs = {}; this.style = {}; this.classes = new Set(); this.classList = { add: c => this.classes.add(c), remove: c => this.classes.delete(c), toggle: (c, b) => b ? this.classes.add(c) : this.classes.delete(c) }; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  fire(name, event = {}) { for (const fn of this.listeners[name] || []) fn({ target: this, preventDefault() {}, ...event }); }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  hasAttribute(name) { return name in this.attrs; }
  scrollIntoView() {}
  focus() { document.activeElement = this; }
  reset() { for (const node of nodes.values()) { node.value = ''; node.checked = false; } }
}
for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes.set(`#${match[1]}`, new Node(match[1]));
const grouped = {};
for (const [selector, attr, values] of [
  ['[data-next]', 'next', [1, 2, 3]], ['[data-step]', 'step', [0, 1, 2, 3]],
  ['[data-back]', 'back', [1]], ['.step-panel', 'panel', [0, 1, 2, 3]],
  ['[data-weekday]', 'weekday', [0, 1, 2, 3, 4, 5, 6]], ['[data-pick]', 'pick', ['coupe', 'barbe', 'duo']]
]) {
  grouped[selector] = values.map(value => { const n = new Node(); n.dataset[attr] = String(value); nodes.set(`[data-${attr}="${value}"]`, n); return n; });
}
grouped['.field input'] = [nodes.get('#first-name'), nodes.get('#phone')];
grouped['[data-open]'] = [new Node()];
for (const id of ['coupe', 'barbe', 'duo']) nodes.set(`input[name="service"][value="${id}"]`, new Node());
const document = new Node();
document.documentElement = new Node();
document.querySelector = selector => { assert(nodes.has(selector), `Unhandled selector ${selector}`); return nodes.get(selector); };
document.querySelectorAll = selector => grouped[selector] || [];
let clock = '2026-11-02T10:00:00Z';
class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } }
const context = {
  document, window: {}, Date: TestDate, Intl, console,
  matchMedia: () => ({ matches: true, addEventListener() {} }),
  requestAnimationFrame: fn => { fn(); return 1; }, cancelAnimationFrame() {}
};
source = source.replace(/\}\)\(\);\s*$/, 'globalThis.test = { state, slotsFor, parisNow, isHoliday, hours, services, selectService, showStep, renderDays, reset };\n})();');
vm.runInNewContext(source, context);
const api = context.test;
assert.equal(api.parisNow(new Date('2026-03-29T00:30:00Z')).minute, 90);
assert.equal(api.parisNow(new Date('2026-03-29T01:30:00Z')).minute, 210);
assert.equal(api.parisNow(new Date('2026-10-25T00:30:00Z')).minute, 150);
assert.equal(api.parisNow(new Date('2026-10-25T01:30:00Z')).minute, 150);
assert.equal(api.isHoliday(new Date('2026-04-03T00:00:00Z')), true);
assert.equal(api.isHoliday(new Date('2026-12-26T00:00:00Z')), true);
assert.equal(api.isHoliday(new Date('2026-11-11T00:00:00Z')), true);
for (let day = 1; day <= 14; day++) {
  const date = new Date(Date.UTC(2026, 10, day));
  for (const [id, service] of Object.entries(api.services)) {
    const slots = api.slotsFor(date, id);
    const range = api.hours[date.getUTCDay()];
    if (!range) { assert.equal(slots.length, 0); continue; }
    for (const slot of slots) {
      assert(slot.minute >= range[0]);
      assert(slot.minute + service.duration <= range[1]);
      if (+date < +api.parisNow().date || (+date === +api.parisNow().date && slot.minute <= api.parisNow().minute)) assert(slot.disabled);
    }
  }
}
for (const id of Object.keys(api.services)) {
  api.reset(false);
  api.selectService(id); api.showStep(1);
  document.fire('change', { target: { name: 'day', value: '1' } });
  api.showStep(2);
  const available = api.slotsFor(api.state.day, id).find(s => !s.disabled);
  document.fire('change', { target: { name: 'time', value: String(available.minute) } });
  api.showStep(3);
  nodes.get('#first-name').value = 'A'; nodes.get('#phone').value = '123';
  nodes.get('#booking-form').fire('submit');
  assert.equal(api.state.completed, false); assert.equal(nodes.get('#name-error').hidden, false);
  nodes.get('#first-name').value = 'Camille'; nodes.get('#phone').value = '+33 6 12 34 56 78';
  nodes.get('#booking-form').fire('submit');
  assert.equal(api.state.completed, true); assert.equal(nodes.get('#success').hidden, false);
  assert(nodes.get('#success-recap').textContent.includes(api.services[id].name));
  assert.equal(nodes.get('#phone').value, '');
  nodes.get('#restart').fire('click');
  assert.equal(api.state.service, null); assert.equal(nodes.get('#success').hidden, true);
}
api.selectService('coupe'); api.showStep(1);
document.fire('change', { target: { name: 'day', value: '1' } });
api.showStep(2);
const available = api.slotsFor(api.state.day, 'coupe').find(s => !s.disabled);
document.fire('change', { target: { name: 'time', value: String(available.minute) } });
api.showStep(3);
nodes.get('#first-name').value = 'Camille'; nodes.get('#phone').value = '0712345678';
clock = '2026-11-04T23:00:00Z';
nodes.get('#booking-form').fire('submit');
assert.equal(api.state.completed, false); assert.equal(api.state.step, 2); assert.equal(api.state.time, null);
api.selectService('duo'); assert.equal(api.state.day, null); assert.equal(api.state.time, null);
assert(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|sendBeacon)\s*[.(]/.test(source));
console.log('PASS: 3 full booking flows; validation; reset; service invalidation; expired slots; 14-day duration/hours bounds; closed Sundays; deterministic occupancy; Paris DST; Alsace holidays; no data transport/storage.');

// Verify the public preset/step handlers and preservation when navigating back.
clock = '2026-11-02T10:00:00Z';
for (const preset of grouped['[data-pick]']) {
  api.reset(false);
  preset.fire('click');
  assert.equal(api.state.service, preset.dataset.pick);
  assert.equal(api.state.step, 1);
}
api.reset(false); api.selectService('coupe'); api.showStep(1);
document.fire('change', { target: { name: 'day', value: '2' } });
nodes.get('[data-next="2"]').fire('click');
const chosen = api.slotsFor(api.state.day, 'coupe').find(s => !s.disabled).minute;
assert.equal(JSON.stringify(api.slotsFor(api.state.day, 'coupe')), JSON.stringify(api.slotsFor(api.state.day, 'coupe')));
document.fire('change', { target: { name: 'time', value: String(chosen) } });
nodes.get('[data-next="3"]').fire('click');
nodes.get('[data-step="1"]').fire('click');
assert.equal(api.state.step, 1); assert.equal(api.state.time, chosen);
nodes.get('[data-next="2"]').fire('click');
assert.equal(api.state.time, chosen);
document.fire('change', { target: { name: 'day', value: '3' } });
assert.equal(api.state.time, null);
console.log('PASS: preset link handlers, step button handlers, back navigation preserves selection, day change invalidates time.');
