// Dependency-free behavioral verification. Run: node preview-art-et-detente/verify.mjs
// This DOM harness verifies state and scheduling; it does not claim browser rendering coverage.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const folder = new URL('./', import.meta.url);
const html = fs.readFileSync(new URL('index.html', folder), 'utf8');
const source = fs.readFileSync(new URL('script.js', folder), 'utf8');
const decode = text => text.replace(/&nbsp;/g, '\u00a0').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
let document;
class Element {
  constructor(tag = 'div', attrs = {}) {
    this.tagName = tag.toLowerCase(); this.attrs = { ...attrs }; this.children = []; this.parent = null;
    this._text = ''; this.events = {}; this.style = {}; this.hidden = 'hidden' in attrs;
    this.value = attrs.value ?? ''; this.checked = false; this.disabled = 'disabled' in attrs;
    this.className = attrs.class ?? ''; this.dataset = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
      if (['name', 'id', 'type'].includes(key)) this[key] = value;
    }
    this.classList = {
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/), ...names])].filter(Boolean).join(' '); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter(x => !names.includes(x)).join(' '); },
      contains: name => this.className.split(/\s+/).includes(name)
    };
  }
  append(...nodes) { for (let node of nodes) { if (typeof node === 'string') { const t = new Element('#text'); t._text = node; node = t; } node.parent = this; this.children.push(node); } }
  prepend(node) { node.parent = this; this.children.unshift(node); }
  replaceChildren(...nodes) { this.children = []; this._text = ''; for (const node of nodes) { if (node.tagName === '#fragment') this.append(...node.children); else this.append(node); } }
  get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] ?? null; }
  hasAttribute(name) { return name in this.attrs; }
  removeAttribute(name) { delete this.attrs[name]; }
  addEventListener(type, callback) { (this.events[type] ??= []).push(callback); }
  dispatch(type, event = {}) {
    event.target ??= this; event.preventDefault ??= () => {}; event.detail ??= 0;
    for (const callback of this.events[type] ?? []) callback(event);
    if (this.parent) this.parent.dispatch(type, event);
  }
  descendants() { return this.children.flatMap(node => [node, ...node.descendants()]); }
  querySelectorAll(selector) {
    const groups = selector.split(',').map(x => x.trim().split(/\s+/));
    return this.descendants().filter(node => groups.some(parts => {
      if (!matches(node, parts.at(-1))) return false;
      let parent = node.parent;
      for (let i = parts.length - 2; i >= 0; i--) {
        while (parent && !matches(parent, parts[i])) parent = parent.parent;
        if (!parent) return false;
        parent = parent.parent;
      }
      return true;
    }));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  focus() { document.activeElement = this; }
  scrollIntoView() {}
  animate() { return { cancel() {}, finish() {} }; }
  reset() { for (const node of this.querySelectorAll('input')) { node.value = node.type === 'radio' ? node.value : ''; node.checked = false; } }
}
function matches(node, selector) {
  const tag = selector.match(/^[a-zA-Z][\w-]*/)?.[0];
  if (tag && node.tagName !== tag) return false;
  const id = selector.match(/#([\w-]+)/)?.[1]; if (id && node.id !== id) return false;
  for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!node.className.split(/\s+/).includes(name)) return false;
  for (const [, attr, quote, value] of selector.matchAll(/\[([\w-]+)(?:=(["']?)([^\]"']+)\2)?\]/g)) {
    const actual = node.attrs[attr];
    const reflected = ['name', 'id', 'type', 'value'].includes(attr) ? node[attr] : actual;
    if (value !== undefined ? reflected !== value : reflected === undefined) return false;
  }
  return true;
}
document = new Element('#document');
document.createElement = tag => new Element(tag);
document.createDocumentFragment = () => new Element('#fragment');
document.getAnimations = () => [];
const stack = [document];
const voidTags = new Set(['meta', 'link', 'input', 'br', 'hr']);
for (const token of html.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+/g)) {
  const text = token[0];
  if (text.startsWith('<!')) continue;
  if (text.startsWith('</')) {
    const tag = text.match(/^<\/([\w-]+)/)[1].toLowerCase();
    const index = stack.findLastIndex(node => node.tagName === tag);
    if (index > 0) stack.length = index;
  } else if (text.startsWith('<')) {
    const tag = text.match(/^<([\w-]+)/)[1].toLowerCase();
    const attrs = {};
    for (const [, key, a, b, c] of text.slice(tag.length + 1, -1).matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[key] = decode(a ?? b ?? c ?? '');
    const node = new Element(tag, attrs); stack.at(-1).append(node);
    if (!voidTags.has(tag)) stack.push(node);
  } else {
    const node = new Element('#text'); node._text = decode(text); stack.at(-1).append(node);
  }
}
document.documentElement = document.querySelector('html');
let clock = Date.parse('2026-11-01T15:12:00Z');
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
const media = { matches: false, addEventListener() {} };
const context = vm.createContext({ document, window: { matchMedia: () => media }, Date: FixedDate, Intl, setTimeout, clearTimeout, requestAnimationFrame: callback => setTimeout(callback, 0), cancelAnimationFrame: clearTimeout });
vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.logic = { slotsFor, services, openingHours, holidays, parisNow };})();'), context);
const $ = selector => document.querySelector(selector), $$ = selector => document.querySelectorAll(selector);
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
function click(node, detail = 0) { check(!!node, 'click target exists'); if (node.disabled) return; if (node.type === 'radio') { $$('input').filter(input => input.name === node.name).forEach(input => { input.checked = input === node; }); node.dispatch('change'); } else node.dispatch('click', { detail }); }
function submit() { $('#booking-form').dispatch('submit'); }
function setField(id, value) { $(id).value = value; $(id).dispatch('input'); }
function firstAvailable(name) { return $$('input').find(node => node.name === name && !node.disabled); }
function chooseDayTime() {
  click(firstAvailable('day')); click($('[data-next="2"]'));
  click(firstAvailable('time')); click($('[data-next="3"]'));
}
check(!$('.booking-app').hidden, 'JS booking initialized');
check($$('input[name="service"]').length === 6, 'six sourced services');
check($('[data-next="1"]').disabled, 'cannot advance without service');
click($('[data-service="meches"]'));
check(! $('[data-panel="1"]').hidden, 'menu preselect reaches day');
check($('#summary-service').textContent.includes('Mèches'), 'summary follows menu selection');
check($$('input[name="day"]').length === 14, '14 calendar days');
check($$('input[name="day"]').filter(input => new Date(input.value).getUTCDay() === 0).every(input => input.disabled), 'Sundays disabled');
check($$('input[name="day"]').find(input => input.value === '2026-11-11').parent.textContent.includes('Férié'), 'public holiday disclosed');
check(document.activeElement.id === 'step-title-1', 'focus follows step');
chooseDayTime();
check($('#summary-price').textContent.includes('À partir de'), 'minimum price retained in recap');
submit();
check(!$('#name-error').hidden && !$('#phone-error').hidden, 'inline validation both fields');
check(document.activeElement.id === 'first-name', 'focus on first invalid field');
setField('#first-name', 'Exemple'); setField('#phone', '01 23 45 67 89'); submit();
check(document.activeElement.id === 'phone', 'landline rejected for mobile field');
setField('#phone', '+33 (0)6 12 34 56 78'); submit();
check(!$('#booking-success').hidden, 'success with loose French mobile format');
check($('#success-message').textContent.includes('Mèches'.toLowerCase()), 'success has service recap');
check($('#booking-success').textContent.includes('Aucun rendez-vous'), 'simulation never presented as real booking');
check($('#phone').value === '' && $('#first-name').value === '', 'contact fields cleared after simulation');
click($('#restart'));
check(!$('#booking-form').hidden && $('#summary-service').textContent === 'À choisir', 'restart clears selection');
click($$('input[name="service"]')[0]); click($('[data-next="1"]')); chooseDayTime();
click($('[data-step="0"]')); click($$('input[name="service"]')[5]);
check($('#summary-day').textContent === 'À choisir' && $('#summary-time').textContent === 'À choisir', 'service change invalidates day and time');
check($('[data-step="2"]').disabled && $('[data-step="3"]').disabled, 'future steps relock');
click($('[data-next="1"]')); chooseDayTime();
setField('#first-name', 'Exemple'); setField('#phone', '0712345678');
clock = Date.parse('2026-11-20T23:00:00Z'); submit();
check(!$('#availability-error').hidden, 'stale date has persistent visible error');
check(!$('[data-panel="1"]').hidden, 'stale date returns to days');
click(firstAvailable('day'));
check($('#availability-error').hidden, 'new choice clears stale error');
const { slotsFor, services, holidays } = context.logic;
const now = { key: '2026-11-03', minutes: 675 };
for (const service of services) {
  const tuesday = slotsFor('2026-11-03', service, now);
  check(tuesday.every(slot => slot.start + service.duration <= 1140 && slot.start >= 540), 'duration fits weekday opening hours');
  check(tuesday.filter(slot => slot.start <= now.minutes).every(slot => slot.disabled && slot.reason === 'Passé'), 'past slots are disabled');
  const saturday = slotsFor('2026-11-07', service, now);
  check(saturday.every(slot => slot.start + service.duration <= 1020), 'Saturday ends at 17 h');
  const monday = slotsFor('2026-11-02', service, { key: '2026-11-01', minutes: 0 });
  check(monday[0].start === 600, 'Monday starts at 10 h');
  check(tuesday.some(slot => slot.reason === 'Déjà pris'), 'deterministic occupied slots');
  check(slotsFor('2026-11-08', service, now).length === 0, 'no Sunday slots');
}
check(holidays(2027).has('2027-03-29') && holidays(2027).has('2027-05-06'), 'movable holidays in another year');
// Pointer transitions: a second request cancels an unfinished first request.
clock = Date.parse('2026-11-01T15:12:00Z');
click($('#restart'));
click($('[data-service="homme"]'), 1);
click($('[data-step="0"]'), 1);
await new Promise(resolve => setTimeout(resolve, 300));
check(!$('[data-panel="0"]').hidden && !$('form').classList.contains('is-leaving'), 'rapid step changes settle correctly');
media.matches = true;
click($('[data-next="1"]'), 1);
check(!$('[data-panel="1"]').hidden, 'reduced motion step changes are immediate');
check(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|sendBeacon)\b/.test(source), 'no network submission or contact storage');
console.log(`PASS — ${checks} assertions. Flow, focus, validation, hours, holidays, stale dates, interruption and reduced motion.`);
