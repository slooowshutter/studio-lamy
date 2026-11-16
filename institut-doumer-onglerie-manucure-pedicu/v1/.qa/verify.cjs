const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
let focused = null;
class Element {
  constructor(tag = 'div', attrs = {}) {
    this.tagName = tag; this.attrs = { ...attrs }; this.children = []; this.listeners = {};
    this.hidden = 'hidden' in attrs; this.disabled = 'disabled' in attrs; this.checked = false;
    this.text = ''; this.value = attrs.value || ''; this.parent = null;
    this.classList = { add: (...values) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...values])].join(' '); }, remove: (...values) => { this.className = this.className.split(' ').filter(v => !values.includes(v)).join(' '); } };
  }
  get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = v; }
  get name() { return this.attrs.name || ''; } set name(v) { this.attrs.name = v; }
  get type() { return this.attrs.type || ''; } set type(v) { this.attrs.type = v; }
  get className() { return this.attrs.class || ''; } set className(v) { this.attrs.class = v; }
  get dataset() { return Object.fromEntries(Object.entries(this.attrs).filter(([k]) => k.startsWith('data-')).map(([k,v]) => [k.slice(5), v])); }
  get textContent() { return this.text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.text = String(v); this.children = []; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...items) { items.forEach(item => { item.parent = this; this.children.push(item); }); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(el => el !== this); }
  matches(selector) {
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1));
    if (selector.startsWith('[')) {
      const match = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
      return match && (match[2] === undefined ? match[1] in this.attrs : this.attrs[match[1]] === match[2]);
    }
    return this.tagName === selector;
  }
  querySelectorAll(selector) {
    const selectors = selector.split(',').map(s => s.trim());
    const found = [];
    const visit = el => el.children.forEach(child => { if (selectors.some(s => child.matches(s))) found.push(child); visit(child); });
    visit(this); return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  dispatch(type, target = this) { const event = { target, preventDefault() {}, key: '' }; (this.listeners[type] || []).forEach(callback => callback(event)); }
  focus() { focused = this; }
  reset() { this.querySelectorAll('input').forEach(input => { input.checked = false; input.value = input.attrs.value || ''; }); }
}
const document = new Element('document');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const tokens = html.match(/<!--[^]*?-->|<[^>]+>|[^<]+/g);
const stack = [document];
const voids = new Set(['meta', 'link', 'input', 'br', 'path']);
for (const token of tokens) {
  if (token.startsWith('<!--') || token.startsWith('<!')) continue;
  if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
  if (token.startsWith('<')) {
    const tag = token.match(/^<([^\s/>]+)/)[1];
    const attrs = Object.fromEntries([...token.matchAll(/([^\s=<>/]+)(?:="([^"]*)")?/g)].slice(1).map(m => [m[1], m[2] || '']));
    const el = new Element(tag, attrs); stack.at(-1).append(el);
    if (!voids.has(tag) && !token.endsWith('/>')) stack.push(el);
  } else stack.at(-1).text += token;
}
document.documentElement = document.querySelector('html');
document.createElement = tag => new Element(tag);
document.getElementById = id => document.querySelector(`#${id}`);
class Observer { observe() {} unobserve() {} }
const context = { document, Intl, Date, console, window: { matchMedia: () => ({ matches: true, addEventListener() {} }) }, IntersectionObserver: Observer, requestAnimationFrame: callback => callback() };
vm.createContext(context);
const code = fs.readFileSync(path.join(base, 'script.js'), 'utf8').replace(/\}\)\(\);\s*$/, 'globalThis.qa = { getSlots, parisNow, services, opening, state, showStep }; })();');
vm.runInContext(code, context);
const qa = context.qa;
const form = document.querySelector('#reservation');
const q = selector => { const el = document.querySelector(selector); assert(el, selector); return el; };
const click = selector => { const el = q(selector); assert(!el.disabled, `disabled: ${selector}`); el.dispatch('click'); };
const change = input => { input.checked = true; form.dispatch('change', input); };
assert.equal(q('#simulateur').hidden, false);
assert.equal(document.querySelectorAll('[name="jour"]').length, 14);
assert.equal(document.querySelectorAll('[name="prestation"]').length, 4);

for (const service of Object.values(qa.services)) {
  for (let day = 16; day <= 22; day++) {
    const slots = qa.getSlots(`2026-11-${day}`, service.minutes, new Date('2026-11-01T00:00:00Z'));
    assert(slots.length > 15);
    slots.forEach(slot => { assert(slot.minute >= 630); assert(slot.minute + service.minutes <= 1200); });
  }
}
assert.equal(qa.parisNow(new Date('2026-11-15T23:30:00Z')).key, '2026-11-16');
assert.equal(qa.parisNow(new Date('2026-07-15T22:30:00Z')).key, '2026-07-16');
assert.equal(qa.parisNow(new Date('2026-11-16T09:30:00Z')).minute, 630);
assert.equal(qa.parisNow(new Date('2026-07-16T08:30:00Z')).minute, 630);
assert(qa.getSlots('2026-11-16', 45, new Date('2026-11-16T19:01:00Z')).every(slot => slot.disabled));
assert(qa.getSlots('2026-11-16', 45, new Date('2026-11-16T10:45:00Z')).filter(slot => !slot.disabled).every(slot => slot.minute > 705));
console.log('OK : 4 durées, 7 jours, fermeture respectée, heures passées, changement de date et heure été/hiver Paris.');

change(q('[name="prestation"]').parent.querySelector('input'));
click('[data-next="1"]');
assert.equal(qa.state.step, 1);
assert.equal(focused.id, 'etape-jour');
const tomorrow = document.querySelectorAll('[name="jour"]')[1];
change(tomorrow); click('[data-next="2"]');
const slot = document.querySelectorAll('[name="heure"]').find(input => !input.disabled);
assert(slot); change(slot); click('[data-next="3"]');
assert.equal(focused.id, 'etape-vous');
form.dispatch('submit'); assert.equal(focused.id, 'prenom');
assert.equal(q('#prenom').getAttribute('aria-invalid'), 'true');
q('#prenom').value = 'Essai'; q('#telephone').value = '123'; form.dispatch('submit');
assert.equal(focused.id, 'telephone');
q('#telephone').value = '+33 6 12 34 56 78'; form.dispatch('submit');
assert.equal(q('#resultat').hidden, false);
assert.equal(form.hidden, true);
assert.equal(focused.id, 'titre-resultat');
assert.equal(q('#prenom').value, ''); assert.equal(q('#telephone').value, '');
assert(q('#texte-resultat').textContent.includes('exemple'));
console.log('OK : parcours complet, récapitulatif, focus, erreurs prénom/mobile, format +33, succès sans envoi, effacement des coordonnées.');
click('#recommencer'); assert.equal(qa.state.service, null); assert.equal(qa.state.step, 0);
click('[data-service="pieds"]'); assert.equal(qa.state.service, 'pieds'); assert.equal(qa.state.step, 1);
change(document.querySelectorAll('[name="jour"]')[2]); click('[data-next="2"]');
change(document.querySelectorAll('[name="heure"]').find(input => !input.disabled));
click('[data-back="1"]');
change(document.querySelectorAll('[name="jour"]')[3]);
assert.equal(qa.state.time, null);
click('[data-back="0"]');
const semi = document.querySelectorAll('[name="prestation"]').find(input => input.value === 'semi');
change(semi); assert.equal(qa.state.date, ''); assert.equal(qa.state.time, null);
assert.equal(q('#resume-jour').textContent, 'À choisir');
console.log('OK : reprise, préselection depuis les soins, retour, changement de jour et de soin, invalidation des choix dépendants.');
assert(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon/.test(code));
console.log('OK : aucune requête de données et aucun stockage persistant.');

// Deuxième initialisation isolée pour les observateurs et la préférence de mouvement.
const observations = [];
let preferenceChanged;
const preference = { matches: false, addEventListener: (name, callback) => { preferenceChanged = callback; } };
class MotionObserver {
  constructor(callback) { this.callback = callback; this.targets = []; observations.push(this); }
  observe(element) { this.targets.push(element); }
  unobserve(element) { this.targets = this.targets.filter(target => target !== element); }
}
const motionContext = { ...context, window: { IntersectionObserver: MotionObserver, matchMedia: () => preference }, IntersectionObserver: MotionObserver };
vm.createContext(motionContext);
vm.runInContext(code, motionContext);
assert.equal(observations.length, 2);
const reveal = observations[0];
const first = reveal.targets[0];
reveal.callback([{ target: first, isIntersecting: true }]);
assert(first.className.includes('is-visible'));
assert(!reveal.targets.includes(first));
const actions = observations[1];
actions.callback([{ target: q('#actions-hero'), isIntersecting: false }]);
assert.equal(q('#barre-mobile').hidden, false);
actions.callback([{ target: q('#rendez-vous'), isIntersecting: true }]);
assert.equal(q('#barre-mobile').hidden, true);
assert(document.documentElement.className.includes('motion-ready'));
preference.matches = true; preferenceChanged();
assert(!document.documentElement.className.includes('motion-ready'));
console.log('OK : révélations uniques, barre mobile masquée sur la réservation, mouvement réduit pris en compte.');
