// Contrôles sans navigateur sur les fonctions réellement écrites dans script.js.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const script = fs.readFileSync(path.resolve(__dirname, '../script.js'), 'utf8');
let clock = '2026-11-19T09:30:00Z';
class ClockDate extends Date {
  constructor(...args) { super(...(args.length ? args : [clock])); }
  static now() { return +new Date(clock); }
}
const prefix = script.slice(script.indexOf("  'use strict';"), script.indexOf("  $$('.service-chip').forEach(button => button.addEventListener"));
const fields = Object.fromEntries(['#erreur-prenom', '#erreur-telephone'].map(id => [id, { textContent: '' }]));
const context = {
  document: { documentElement: {}, querySelector: selector => fields[selector], querySelectorAll: () => [] },
  matchMedia: () => ({ matches: false }), Intl, Date: ClockDate,
};
vm.createContext(context);
vm.runInContext(prefix + '\nglobalThis.subject = { nowParis, slotExpired, withinHours, allowedDay, validTime, state, setDays: value => {days = value;} };', context);
const api = context.subject;
const results = [];
assert.equal(api.nowParis().iso, '2026-11-19');
assert.equal(api.nowParis().minutes, 630);
results.push('Heure de Paris en hiver : 10 h 30 pour 09:30 UTC');
assert.equal(api.slotExpired('2026-11-19', 600), true);
assert.equal(api.slotExpired('2026-11-19', 660), false);
assert.equal(api.slotExpired('2026-11-18', 1080), true);
results.push('Heures et jours passés refusés');
const days = [];
for (let offset = 0; offset < 14; offset++) {
  const date = new Date(Date.UTC(2026, 10, 19 + offset, 12));
  const day = { iso: date.toISOString().slice(0, 10), date };
  days.push(day);
  assert.equal(api.allowedDay(day), [3,4,5,6].includes(date.getUTCDay()));
}
api.setDays(days);
assert.equal(days.length, 14);
assert.equal(days.at(-1).iso, '2026-12-02');
results.push('Quatorze dates et passage de novembre à décembre ; mercredi–samedi seulement');
api.state.day = '2026-11-19';
for (const [time, valid] of [[null,false],[600,false],[660,true],[1080,true],[1140,false],[630,false],[1170,false]]) {
  api.state.time = time; assert.equal(api.validTime(), valid, String(time));
}
results.push('Heures entières dans la plage sourcée ; 19 h et durée inventée absentes');
clock = '2026-11-19T17:01:00Z';
assert.equal(api.allowedDay(days[0]), false);
results.push('Jour courant indisponible après la dernière heure d’essai');
clock = '2026-11-19T23:30:00Z';
assert.equal(api.nowParis().iso, '2026-11-20');
assert.equal(api.nowParis().minutes, 30);
results.push('Changement de date à minuit en Europe/Paris');
clock = '2027-06-01T23:30:00Z';
assert.equal(api.nowParis().iso, '2027-06-02');
assert.equal(api.nowParis().minutes, 90);
results.push('Heure d’été : date et heure de Paris correctes');
const validation = script.slice(script.indexOf('  function validate(field)'), script.indexOf("  $$('#prenom, #telephone').forEach"));
vm.runInContext(validation + '\nglobalThis.validateField = validate;', context);
const field = (id, value) => ({ id, value, attributes: {}, setAttribute(key,value){this.attributes[key]=value;}, removeAttribute(key){delete this.attributes[key];} });
for (const value of ['06 12 34 56 78', '07.12.34.56.78', '+33612345678', '0033712345678']) assert.equal(context.validateField(field('telephone', value)), true, value);
for (const value of ['', '0123', '04 12 34 56 78', '06 12 34 56 7', '+44 7123456789']) assert.equal(context.validateField(field('telephone', value)), false, value);
assert.equal(context.validateField(field('prenom', 'Élodie')), true);
assert.equal(context.validateField(field('prenom', '  ')), false);
results.push('Validation des prénoms et mobiles français ; erreurs reliées aux champs');
const output = { statut: 'OK', controles: results, limite: 'Navigateur local indisponible : son démarrage échoue sur une opération système interdite. Aucun contrôle de rendu ou de téléphone réel revendiqué.' };
fs.writeFileSync(path.resolve(__dirname, 'resultats-logique.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
