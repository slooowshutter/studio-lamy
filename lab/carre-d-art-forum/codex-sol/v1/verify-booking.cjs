/* Integration harness for the actual vanilla script; no browser dependencies. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const folder = process.argv[2] || __dirname;
const html = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
let clock = '2026-11-03T09:15:00Z';
class TestDate extends Date { constructor(...a) { super(...(a.length ? a : [clock])); } }
const selectors = new Map(), groups = new Map();
let focused = null;
class Element {
  constructor(dataset = {}) { this.dataset = dataset; this.attrs = {}; this.events = {}; this.disabled = false; this.checked = false; this.value = ''; this.hidden = false; this.textContent = ''; const classes = new Set(); this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x, yes) => yes ? classes.add(x) : classes.delete(x) }; }
  setAttribute(k,v) { this.attrs[k] = v; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(k, cb) { this.events[k] = cb; }
  focus() { focused = this; }
  reset() { get('#prenom').value = ''; get('#telephone').value = ''; }
  querySelector(s) { if (s === 'h3') { this.heading ||= new Element(); this.heading.textContent = `Étape ${this.dataset.panel}`; return this.heading; } return get(s); }
  set innerHTML(value) {
    this.markup = value;
    this.inputs = [...value.matchAll(/<input\b([^>]+)>/g)].map(m => {
      const a = Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a => [a[1], a[2]]));
      const e = new Element(); Object.assign(e, a); e.disabled = /\bdisabled\b/.test(m[1]); e.checked = /\bchecked\b/.test(m[1]); return e;
    });
  }
}
function get(s) {
  const input = s.match(/^\[name="([^"]+)"\]\[value="([^"]+)"\]$/);
  if (input) return [...selectors.values()].flatMap(e => e.inputs || []).find(e => e.name === input[1] && e.value === input[2]);
  if (!selectors.has(s)) selectors.set(s, new Element());
  return selectors.get(s);
}
const services = [...html.matchAll(/<article\b([^>]*data-service[^>]*)>/g)].map(m => {
  const ds = Object.fromEntries([...m[1].matchAll(/data-([\w-]+)="([^"]*)"/g)].map(a => [a[1], a[2]]));
  return new Element(ds);
});
groups.set('[data-service]', services);
for (const [group, key, n] of [['[data-step]', 'step', 4], ['[data-panel]', 'panel', 5], ['[data-next]', 'next', 3]]) {
  const elements = Array.from({ length: n }, (_, i) => new Element({ [key]: String(key === 'next' ? i + 1 : i) }));
  groups.set(group, elements); elements.forEach(e => selectors.set(`[data-${key}="${e.dataset[key]}"]`, e));
}
groups.set('[data-dow]', []); groups.set('[data-reveal]', []);
const bookLinks = [...html.matchAll(/data-book="([^"]+)"/g)].map(m => new Element({book: m[1]}));
groups.set('[data-book]', bookLinks);
const durationInputs = [...html.matchAll(/value="([^"]+)" data-duration-choice/g)].map(m => { const e = new Element(); e.value = m[1]; return e; });
groups.set('[data-duration-choice]', durationInputs);
if (durationInputs.length) {
  assert.match(html, /<fieldset class="tempo-selector" disabled>/, 'duration controls must be disabled without JS');
  get('.tempo-selector').disabled = true;
}
const document = { documentElement: new Element(), addEventListener() {}, querySelector: get, querySelectorAll: s => groups.get(s) || [] };
const sandbox = { document, Date: TestDate, Intl, console, setInterval() {}, requestAnimationFrame: cb => { cb(); return 1; }, cancelAnimationFrame() {}, window: { matchMedia: () => ({ matches: true, addEventListener() {} }) } };
let code = fs.readFileSync(path.join(folder, 'script.js'), 'utf8');
code = code.replace(/\}\)\(\);\s*$/, 'globalThis.api = {state, hours, slotsFor, holiday, renderDays, renderSlots, showStep, selectService}; })();');
vm.runInNewContext(code, sandbox);
const { api } = sandbox;
const click = s => get(s).events.click({ preventDefault() {} });
const change = (name, value) => get('[data-booking]').events.change({ target: { name, value } });
const submit = () => get('[data-form]').events.submit({ preventDefault() {} });
assert.equal(get('[data-booking]').hidden, false);
// Entering from the public price list must cancel the anchor and focus the step.
let prevented = false;
bookLinks[0].events.click({ preventDefault() { prevented = true; } });
assert(prevented); assert.equal(api.state.service.id, 'entretien');
assert.equal(focused, get('[data-panel="0"]').heading);
click('[data-restart]');
if (durationInputs.length) {
  assert.equal(get('.tempo-selector').disabled, false);
  for (const input of durationInputs) {
    input.events.change();
    assert.equal(api.state.service.id, input.value);
    assert.equal(get('[data-tempo-number]').textContent, String(api.state.service.duration));
    assert.equal(get('[data-tempo-name]').textContent, api.state.service.name);
    assert.equal(durationInputs.filter(i => i.checked).length, 1);
    assert(get('[data-tempo-price]').textContent.includes(String(api.state.service.price)));
  }
  api.selectService('style');
  assert.equal(get('[data-tempo-name]').textContent, 'Coupe stylisée femme');
  assert.equal(durationInputs.find(i => i.checked).value, 'barbe'); // same 60-minute group
  click('[data-time-book]');
  assert.equal(api.state.step, 1); assert.equal(focused, get('[data-panel="1"]').heading);
  click('[data-restart]');
  assert.equal(get('[data-tempo-number]').textContent, '30');
  assert.equal(get('[data-tempo-name]').textContent, 'Brushing cheveux courts');
  assert.equal(durationInputs.find(i => i.checked).value, 'brushing');
}

api.selectService('meches'); click('[data-next="1"]');
let days = get('[data-days]').inputs;
assert.equal(days.length, 14);
assert(days.filter(i => /2026-11-(08|09|15|16)/.test(i.value)).every(i => i.disabled));
assert(get('[data-days]').markup.includes('férié, à confirmer'));
change('jour', '2026-11-07'); click('[data-next="2"]');
let slots = get('[data-slots]').inputs;
assert(slots.length > 0);
assert(slots.every(i => +i.value + 165 <= 1080));
assert(slots.some(i => i.disabled));
const chosen = slots.find(i => !i.disabled).value;
change('heure', chosen); click('[data-next="3"]');
click('[data-step="2"]');
assert(get('[data-slots]').inputs.some(i => i.value === chosen && i.checked));
click('[data-step="1"]');
assert(get('[data-days]').inputs.some(i => i.value === '2026-11-07' && i.checked));
click('[data-step="3"]');
get('#prenom').value = 'A'; get('#telephone').value = '123'; submit();
assert.equal(api.state.step, 3); assert.equal(get('#prenom').attrs['aria-invalid'], 'true'); assert.equal(focused, get('#prenom'));
get('#prenom').value = '<Élodie>'; get('#telephone').value = '+33 6 12 34 56 78'; submit();
assert.equal(api.state.step, 4); assert(get('[data-success]').textContent.includes('<Élodie>')); // textContent, never parsed as HTML
assert.equal(focused, get('[data-panel="4"]').heading);
click('[data-restart]');
assert.equal(api.state.service, null); assert.equal(get('#telephone').value, '');
api.selectService('homme');
const tuesday = new Date('2026-11-03T12:00:00Z');
assert(api.slotsFor(tuesday, api.state.service).filter(s => s.time <= 615).every(s => s.disabled));
assert.equal(api.slotsFor(new Date('2026-11-08T12:00:00Z'), api.state.service).length, 0);
api.state.date = tuesday; api.state.time = 660; api.state.reached = 3;
clock = '2026-11-04T21:00:00Z'; api.renderDays();
assert.equal(api.state.date, null); assert.equal(api.state.time, null);
console.log(`${folder}: catalogue focus${durationInputs.length ? ' + duration sync/reset' : ''} PASS; booking integration PASS — 14 days, closures, holidays, duration fit, past slots, back navigation, validation, success, safe text, reset and stale dates.`);
