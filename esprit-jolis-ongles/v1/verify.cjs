/* Run: node preview-esprit-jolis-ongles/verify.cjs
   Behavioral checks; the small DOM adapter does not replace browser visual QA. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const logic = require('./script.js');
const { SERVICES, todayKey, makeDays, makeSlots, addDays, validPhone, validName, parisInstant, resolveNavigation } = logic;
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
const start = new Date('2026-11-01T23:30:00Z');
check(todayKey(start) === '2026-11-02', 'Paris date, not UTC date');
check(addDays('2028-02-28', 1) === '2028-02-29', 'Leap day');
check(addDays('2026-12-31', 1) === '2027-01-01', 'Year rollover');
check(makeDays(start).length === 14, '14 calendar days');
check(makeDays(start).filter(d => d.closed).length === 4, 'Both weekends disabled');
check(parisInstant('2026-11-02', 540).toISOString() === '2026-11-02T08:00:00.000Z', 'Winter offset');
check(parisInstant('2027-07-02', 540).toISOString() === '2027-07-02T07:00:00.000Z', 'Summer offset');
check(parisInstant('2027-03-29', 540).toISOString() === '2027-03-29T07:00:00.000Z', 'Day after DST start');
check(parisInstant('2027-10-29', 540).toISOString() === '2027-10-29T07:00:00.000Z', 'Before DST end');
check(parisInstant('2027-11-01', 540).toISOString() === '2027-11-01T08:00:00.000Z', 'After DST end');
for (const item of SERVICES) {
  for (const day of makeDays(start)) {
    const slots = makeSlots(day.key, item.duration, start);
    if (day.closed) check(slots.length === 0, 'No weekend slots');
    else {
      check(slots.every(s => s.minute >= 540 && s.minute + item.duration <= 1080), 'Service fits before close');
      check(slots.some(s => s.disabled && s.reason === 'Déjà pris'), 'Visible simulated unavailable slots');
      check(slots.some(s => !s.disabled), 'A usable example remains');
      check(JSON.stringify(slots) === JSON.stringify(makeSlots(day.key, item.duration, start)), 'Deterministic availability');
    }
  }
}
check(makeSlots('2026-11-02', 45, new Date('2026-11-02T16:30:00Z')).every(s => s.disabled), 'No start after latest duration fit');
check(makeSlots('2026-11-02', 45, new Date('2026-11-03T00:00:00Z')).every(s => s.reason === 'Passé'), 'Yesterday never bookable');
for (const value of ['06 63 67 07 29', '+33 6 63 67 07 29', '0033 7 12 34 56 78', '07.12.34.56.78']) check(validPhone(value), `Valid mobile ${value}`);
for (const value of ['', '01 23 45 67 89', '06abc12345678', '+33 06 12 34 56 78', '<script>']) check(!validPhone(value), 'Invalid phone rejected');
for (const value of ['Élodie', 'Anne-Marie', 'Léa', 'O’Neill', '李']) check(validName(value), 'Unicode name accepted');
for (const value of ['', '   ', '<img src=x>', '4', 'A'.repeat(61)]) check(!validName(value), 'Invalid name rejected');
const session = { service: 'balneo', day: '2026-11-02', time: 540 };
check(resolveNavigation(session, 3, new Date('2026-11-03T00:01Z')).step === 1, 'After midnight returns to days');
check(resolveNavigation(session, 3, new Date('2026-11-02T08:01Z')).step === 2, 'Expired time returns to slots');

function createHarness({ reduce = true } = {}) {
  let time = Date.parse('2026-11-02T07:30:00Z');
  let timerId = 0;
  const timers = new Map();
  const downloads = [];
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : [time])); }
    static now() { return time; }
  }
  class Element {
    constructor() {
      this.listeners = {}; this.dataset = {}; this.attributes = {}; this.style = {};
      this.disabled = false; this.hidden = false; this.textContent = ''; this.value = '';
      const classes = new Set();
      this.classList = { add: (...v) => v.forEach(c => classes.add(c)), remove: (...v) => v.forEach(c => classes.delete(c)), toggle: (v, yes) => yes ? classes.add(v) : classes.delete(v), contains: v => classes.has(v) };
    }
    addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
    emit(type, target = this) { for (const callback of this.listeners[type] || []) callback({ target, preventDefault() {} }); }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k]; }
    hasAttribute(k) { return k in this.attributes; }
    removeAttribute(k) { delete this.attributes[k]; }
    closest() { return this; }
    focus() { this.focused = true; }
    getBoundingClientRect() { return { top: -20, bottom: 20 }; }
    scrollIntoView() { this.scrolled = true; }
    remove() {}
    click() { downloads.push(this); }
    append() {}
  }
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const panel = get('booking-panel');
  let html = '';
  Object.defineProperty(panel, 'innerHTML', {
    get: () => html,
    set(value) {
      html = value;
      const heading = new Element();
      heading.textContent = value.match(/<h3[^>]*>(.*?)<\/h3>/s)?.[1].replace(/&nbsp;/g, ' ') || '';
      elements.set('step-heading', heading);
      for (const id of ['first-name', 'phone', 'name-error', 'phone-error']) if (value.includes(`id="${id}"`)) elements.set(id, new Element());
      panel.next = new Element();
      panel.next.disabled = /data-go="\d" disabled/.test(value);
    }
  });
  panel.querySelector = selector => {
    if (selector === '#step-heading') return get('step-heading');
    if (selector === '[aria-invalid="true"]') return [get('first-name'), get('phone')].find(e => e.getAttribute('aria-invalid') === 'true');
    if (selector === '.panel-actions .button') return panel.next;
    return null;
  };
  const controls = [];
  for (const type of ['step', 'edit']) for (let i = 0; i < (type === 'step' ? 4 : 3); i++) {
    const el = new Element(); el.dataset[type] = String(i); el.attributes[`data-${type}`] = String(i); controls.push(el);
  }
  const preselect = SERVICES.map(s => { const el = new Element(); el.dataset.preselect = s.id; return el; });
  const doc = new Element();
  doc.documentElement = new Element(); doc.body = new Element();
  doc.getElementById = get;
  doc.querySelector = selector => get(selector);
  doc.querySelectorAll = selector => selector === '[data-step], [data-edit]' ? controls : selector === '[data-preselect]' ? preselect : [];
  doc.createElement = () => new Element();
  const media = { matches: reduce, addEventListener() {} };
  const window = { matchMedia: () => media, innerHeight: 844 };
  const context = {
    window, document: doc, Date: TestDate, Intl, module: { exports: {} }, Blob, TextEncoder,
    URL: { createObjectURL: blob => { downloads.blob = blob; return 'blob:test'; }, revokeObjectURL() {} },
    requestAnimationFrame: callback => { callback(); return ++timerId; }, cancelAnimationFrame() {},
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, due: time + delay }); return id; },
    clearTimeout: id => timers.delete(id)
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8'), context);
  return {
    get, panel, preselect, downloads,
    change(name, value) { const el = new Element(); el.name = name; el.value = String(value); panel.emit('change', el); },
    input(name, value) { const el = new Element(); el.name = name; el.value = value; panel.emit('input', el); },
    click(type, value = '') { const el = new Element(); el.dataset[type] = String(value); el.attributes[`data-${type}`] = String(value); get('booking-app').emit('click', el); },
    submit() { panel.emit('submit'); },
    now() { return new Date(time); },
    setTime(value) { time = Date.parse(value); },
    advance(ms) {
      const end = time + ms;
      while (true) {
        const due = [...timers].filter(([, t]) => t.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
        if (!due) break;
        timers.delete(due[0]); time = due[1].due; due[1].callback();
      }
      time = end;
    }
  };
}
(async () => {
  const h = createHarness();
  check(!h.get('booking-app').hidden && h.panel.innerHTML.includes('Quel soin'), 'App boots with service choice');
  h.preselect.find(p => p.dataset.preselect === 'extensions').emit('click');
  check(h.get('summary-service').textContent === 'Extensions d’ongles', 'Menu preselection updates summary');
  h.click('go', 1);
  check(h.panel.innerHTML.includes('Un jour') && h.panel.innerHTML.includes('Fermé'), 'Calendar and closures rendered');
  h.change('day', '2026-11-02'); h.click('go', 2);
  const slot = makeSlots('2026-11-02', 90, h.now()).find(s => !s.disabled).minute;
  h.change('time', slot); h.click('go', 3);
  check(h.panel.innerHTML.includes('booking-form'), 'Contact step reachable');
  check(h.get('step-heading').focused && h.get('step-heading').scrolled, 'New step focused and made visible');
  h.input('first-name', '<script>'); h.input('phone', '123'); h.submit();
  check(h.get('name-error').textContent.length && h.get('phone-error').textContent.length, 'Inline validation rejects both invalid fields');
  check(!h.panel.innerHTML.includes('Simulation terminée'), 'Invalid input cannot complete');
  h.input('first-name', 'Élodie'); h.input('phone', '06 00 00 00 00');
  h.click('edit', 2); h.click('go', 3);
  check(h.panel.innerHTML.includes('value="Élodie"'), 'Contact data survives back navigation');
  h.submit();
  check(h.panel.innerHTML.includes('Aucun rendez-vous n’a été réservé'), 'Honest success state');
  h.click('calendar');
  const calendar = await h.downloads.blob.text();
  check(calendar.includes('SUMMARY:SIMULATION'), 'Calendar clearly labelled simulation');
  check(calendar.split('\r\n').every(line => Buffer.byteLength(line) <= 75), 'ICS lines folded by UTF-8 bytes');
  check(/DTEND:\d{8}T\d{6}Z/.test(calendar), 'ICS uses explicit UTC times');
  h.click('restart');
  check(h.get('summary-service').textContent.includes('balnéo') && h.panel.innerHTML.includes('Quel soin'), 'Restart clears flow');

  const expired = createHarness();
  expired.click('go', 1); expired.change('day', '2026-11-02'); expired.click('go', 2);
  const earliest = makeSlots('2026-11-02', 45, expired.now()).find(s => !s.disabled).minute;
  expired.change('time', earliest);
  expired.setTime(parisInstant('2026-11-02', earliest + 1).toISOString()); expired.click('go', 3);
  check(expired.panel.innerHTML.includes('À quelle heure') && expired.panel.innerHTML.includes('n’est plus disponible'), 'Expired Continue button recovers to slots');
  expired.change('time', makeSlots('2026-11-02', 45, expired.now()).find(s => !s.disabled).minute); expired.click('go', 3);
  expired.input('first-name', 'Camille'); expired.input('phone', '07 00 00 00 00');
  expired.setTime('2026-11-03T00:01:00Z'); expired.submit();
  check(expired.panel.innerHTML.includes('Un jour') && expired.panel.innerHTML.includes('n’est plus dans les dates'), 'Midnight during contact form recovers to calendar');

  const fast = createHarness({ reduce: false });
  fast.click('go', 1); fast.click('go', 0); fast.advance(80);
  check(fast.panel.innerHTML.includes('Quel soin'), 'Rapid navigation commits only latest view');
  console.log(`${checks} behavioral checks passed. Logic and DOM-adapter flow verified; no browser visual test.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
