'use strict';
document.documentElement.classList.add('js');
requestAnimationFrame(() => document.documentElement.classList.add('ready'));
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  reveals.forEach((item, index) => { item.style.transitionDelay = `${index * 50}ms`; observer.observe(item); });
} else reveals.forEach(item => item.classList.add('visible'));

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));
const services = {
  brushing: { name: 'Shampoing & brushing' },
  homme: { name: 'Coupe homme' },
  barbe: { name: 'Coupe & entretien de barbe' },
  ombre: { name: 'Ombré hair, cheveux mi-longs' },
  racines: { name: 'Couleur racines, coupe & brushing' }
};
const state = { step: 0, service: '', date: null, time: '', name: '', phone: '' };
let keyboardAction = false;
document.addEventListener('keydown', () => { keyboardAction = true; });
document.addEventListener('pointerdown', () => { keyboardAction = false; });
const content = document.querySelector('#booking-content');
const summary = document.querySelector('#booking-summary');
const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
function escapeText(value) { const span = document.createElement('span'); span.textContent = value; return span.innerHTML; }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function makeDays() { const start = new Date(); start.setHours(0, 0, 0, 0); return Array.from({length: 14}, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; }); }
function sampleSlot() {
  for (const date of makeDays()) {
    if (date.getDay() === 0 || date.getDay() === 1) continue;
    for (let minutes = 480; minutes < 1140; minutes += 30) {
      const candidate = new Date(date); candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (candidate > new Date() && (date.getDate() * 7 + minutes / 30) % 5 !== 0) return `${shortDay.format(date)} · ${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;
    }
  }
  return 'À choisir';
}
document.querySelector('#sample-slot').textContent = sampleSlot();
function dayFromKey(key) { return makeDays().find(d => dateKey(d) === key); }
function renderSummary() {
  if (!state.service) { summary.innerHTML = '<p>Choisissez une prestation pour commencer.</p>'; return; }
  const service = services[state.service];
  summary.innerHTML = `<p><strong>Prestation</strong>${service.name}</p>${state.date ? `<p><strong>Jour</strong>${dayFormat.format(state.date)}</p>` : ''}${state.time ? `<p><strong>Heure</strong>${state.time.replace(':', ' h ')}</p>` : ''}`;
}
function render(focus = true, animate = true, restoreSelector = '') {
  renderSummary();
  const service = services[state.service];
  let html = '';
  if (state.step === 0) {
    html = `<p class="step-label">ÉTAPE 01 / 04</p><h3 class="step-title" tabindex="-1">Votre prestation</h3><p class="step-note">Tarifs et durées : appelez le salon au 05 56 08 16 74.</p><fieldset class="choices"><legend>Choisissez une prestation</legend>${Object.entries(services).map(([id, item]) => `<label class="choice"><input type="radio" name="prestation" value="${id}" ${state.service === id ? 'checked' : ''}><span>${item.name}<small>Simulation</small></span><strong>À confirmer</strong></label>`).join('')}</fieldset><div class="actions"><span></span><button class="action" type="button" data-next="1">Choisir un jour →</button></div><p class="error" id="choice-error" aria-live="polite"></p>`;
  } else if (state.step === 1) {
    html = `<p class="step-label">ÉTAPE 02 / 04</p><h3 class="step-title" tabindex="-1">Quel jour&nbsp;?</h3><p class="step-note">Mardi à samedi, 08 h–19 h. Lundi non proposé dans cette simulation&nbsp;: ouverture à confirmer.</p><div class="days" aria-label="Choisir un jour">${makeDays().map(d => { const closed = d.getDay() === 0 || d.getDay() === 1; return `<button type="button" data-day="${dateKey(d)}" class="${state.date && dateKey(state.date) === dateKey(d) ? 'selected' : ''}" ${closed ? 'disabled' : ''} aria-pressed="${Boolean(state.date && dateKey(state.date) === dateKey(d))}">${shortDay.format(d)}${closed ? `<small>${d.getDay() === 1 ? 'À confirmer' : 'Fermé'}</small>` : ''}</button>`; }).join('')}</div><div class="actions"><button class="back" type="button" data-back="0">← Prestation</button><button class="action" type="button" data-next="2">Choisir une heure →</button></div><p class="error" id="choice-error" aria-live="polite"></p>`;
  } else if (state.step === 2) {
    const slots = [];
    for (let minutes = 8 * 60; minutes < 19 * 60; minutes += 30) {
      const hour = Math.floor(minutes / 60); const minute = minutes % 60;
      const time = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
      const when = new Date(state.date); when.setHours(hour, minute, 0, 0);
      const taken = ((state.date.getDate() * 7 + minutes / 30) % 5 === 0);
      const past = when <= new Date();
      slots.push(`<button type="button" data-time="${time}" class="${state.time === time ? 'selected' : ''}" ${taken || past ? 'disabled' : ''} aria-pressed="${state.time === time}">${time.replace(':',' h ')}${taken || past ? `<small>${past ? 'Passé' : 'Déjà pris'}</small>` : ''}</button>`);
    }
    html = `<p class="step-label">ÉTAPE 03 / 04</p><h3 class="step-title" tabindex="-1">À quelle heure&nbsp;?</h3><p class="step-note">${dayFormat.format(state.date)} · disponibilités fictives pour l’exemple.</p><div class="slots" aria-label="Choisir une heure">${slots.join('')}</div><div class="actions"><button class="back" type="button" data-back="1">← Jour</button><button class="action" type="button" data-next="3">Vos coordonnées →</button></div><p class="error" id="choice-error" aria-live="polite"></p>`;
  } else if (state.step === 3) {
    html = `<p class="step-label">ÉTAPE 04 / 04</p><h3 class="step-title" tabindex="-1">Vos coordonnées</h3><p class="step-note">Pour cette démonstration, aucune information n’est transmise.</p><form id="details" novalidate><label class="field">Prénom <input name="prenom" autocomplete="given-name" required aria-describedby="name-error"><span class="error" id="name-error" aria-live="polite"></span></label><label class="field">Téléphone <input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"><span class="error" id="phone-error" aria-live="polite"></span></label><div class="actions"><button class="back" type="button" data-back="2">← Heure</button><button class="action" type="submit">Confirmer la simulation →</button></div></form>`;
  } else {
    html = `<p class="step-label">SIMULATION TERMINÉE</p><h3 class="step-title" tabindex="-1">C’est noté,<br>${escapeText(state.name)}.</h3><p>Votre exemple&nbsp;: ${service.name}, le ${dayFormat.format(state.date)} à ${state.time.replace(':',' h ')}.</p><p><strong>Aucun rendez-vous n’a été envoyé ni réservé.</strong> Pour joindre le salon, appelez le <a href="tel:+33556081674">05 56 08 16 74</a>.</p><button class="action" type="button" data-restart>Recommencer</button>`;
  }
  const maxStep = state.time ? 3 : state.date ? 2 : state.service ? 1 : 0;
  const stepNames = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
  const nav = state.step < 4 ? `<nav class="step-nav" aria-label="Étapes de la réservation">${stepNames.map((name, index) => `<button type="button" data-goto="${index}" ${index > maxStep ? 'disabled' : ''} ${index === state.step ? 'aria-current="step"' : ''}>${index + 1}. ${name}</button>`).join('')}</nav>` : '';
  content.innerHTML = `${nav}<div class="step-panel${animate && focus && !keyboardAction ? ' entering' : ''}">${html}</div>`;
  if (animate && focus && !keyboardAction) requestAnimationFrame(() => requestAnimationFrame(() => content.querySelector('.step-panel')?.classList.remove('entering')));
  if (state.step === 3) { content.querySelector('[name="prenom"]').value = state.name; content.querySelector('[name="telephone"]').value = state.phone; }
  if (focus) content.querySelector('.step-title').focus({preventScroll:true});
  else if (restoreSelector) content.querySelector(restoreSelector)?.focus({preventScroll:true});
}
content.addEventListener('change', event => { if (event.target.name === 'prestation') { state.service = event.target.value; state.date = null; state.time = ''; renderSummary(); } });
content.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.day) { state.date = dayFromKey(button.dataset.day); state.time = ''; render(false, false, `[data-day="${button.dataset.day}"]`); }
  if (button.dataset.time) { state.time = button.dataset.time; render(false, false, `[data-time="${button.dataset.time}"]`); }
  if (button.dataset.goto !== undefined && !button.disabled) { if (state.step === 3) { state.name = content.querySelector('[name="prenom"]').value; state.phone = content.querySelector('[name="telephone"]').value; } state.step = Number(button.dataset.goto); render(); }
  if (button.dataset.back !== undefined) { if (state.step === 3) { state.name = content.querySelector('[name="prenom"]').value; state.phone = content.querySelector('[name="telephone"]').value; } state.step = Number(button.dataset.back); render(); }
  if (button.dataset.next !== undefined) {
    const next = Number(button.dataset.next);
    if ((next === 1 && !state.service) || (next === 2 && !state.date) || (next === 3 && !state.time)) { content.querySelector('#choice-error').textContent = next === 1 ? 'Choisissez une prestation.' : next === 2 ? 'Choisissez un jour.' : 'Choisissez une heure.'; return; }
    state.step = next; render();
  }
  if (button.hasAttribute('data-restart')) { Object.assign(state, {step:0, service:'', date:null, time:'', name:'', phone:''}); render(); }
});
content.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target; const name = form.elements.prenom; const phone = form.elements.telephone;
  state.name = name.value.trim(); state.phone = phone.value.trim();
  const validName = state.name.length >= 2; const digits = state.phone.replace(/[\s.()\-]/g, ''); const validPhone = /^(?:(?:\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/.test(digits);
  form.querySelector('#name-error').textContent = validName ? '' : 'Indiquez votre prénom (au moins deux caractères).';
  form.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro français à dix chiffres.';
  name.setAttribute('aria-invalid', String(!validName)); phone.setAttribute('aria-invalid', String(!validPhone));
  if (!validName || !validPhone) { (validName ? phone : name).focus(); return; }
  state.step = 4; render();
});
document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
  state.service = button.dataset.service; state.date = null; state.time = ''; state.step = 1; render(); document.querySelector('#reserver').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}));
render(false);
