document.documentElement.classList.add('js');
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, obs) => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
  }), { threshold: .12 });
  reveals.forEach(item => observer.observe(item));
} else reveals.forEach(item => item.classList.add('visible'));

const content = document.getElementById('booking-content');
const message = document.getElementById('booking-message');
const count = document.getElementById('step-count');
const selection = { service: '', day: '', time: '', name: '', phone: '' };
let step = 0;
let furthest = 0;
let transition;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const days = [];
for (let offset = 1; days.length < 10; offset++) {
  const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + offset);
  if (date.getDay() !== 0 && date.getDay() !== 6) days.push(date);
}
const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
const safe = text => { const el = document.createElement('span'); el.textContent = text; return el.innerHTML; };
function summary() {
  document.getElementById('sum-service').textContent = selection.service || '—';
  document.getElementById('sum-day').textContent = selection.day || '—';
  document.getElementById('sum-time').textContent = selection.time || '—';
  document.querySelectorAll('[data-step]').forEach(button => { button.disabled = Number(button.dataset.step) > furthest; });
}
function choices(name, items, selected) {
  return '<div class="choices">' + items.map((item, i) => `<label class="choice"><input type="radio" name="${name}" value="${safe(item)}" ${item === selected ? 'checked' : ''}><span>${safe(item)}</span></label>`).join('') + '</div>';
}
function actions(back = true, next = 'Continuer →') {
  return `<div class="booking-actions">${back ? '<button type="button" class="back" data-action="back">← Retour</button>' : ''}<button type="button" data-action="next">${next}</button></div>`;
}
function render(focus = true, animate = false) {
  message.textContent = ''; summary(); count.textContent = step < 4 ? `0${step + 1} / 04` : 'FIN / 04';
  let html = '';
  if (step === 0) html = `<h3 tabindex="-1">Choisissez une activité.</h3><fieldset><legend>Pour cette simulation</legend>${choices('service', ['Coiffure', 'Barbier'], selection.service)}</fieldset>${actions(false)}`;
  if (step === 1) html = `<h3 tabindex="-1">Choisissez un jour.</h3><p>Jours proposés pour l’exemple, horaires à confirmer.</p><fieldset><legend>Jour fictif</legend>${choices('day', days.map(dateLabel), selection.day)}</fieldset>${actions()}`;
  if (step === 2) html = `<h3 tabindex="-1">Choisissez une heure.</h3><p>Ces heures illustrent le parcours&nbsp;: elles ne reflètent pas les disponibilités du salon.</p><fieldset><legend>Heure fictive</legend>${choices('time', ['11 h 00', '14 h 00', '17 h 00'], selection.time)}</fieldset>${actions()}`;
  if (step === 3) html = `<h3 tabindex="-1">Vos coordonnées.</h3><p>Pour tester la dernière étape. Rien ne sera transmis.</p><label class="field">Prénom<input id="first-name" autocomplete="given-name" value="${safe(selection.name)}" aria-describedby="name-error"><span id="name-error" class="field-error"></span></label><label class="field">Téléphone<input id="phone" type="tel" autocomplete="tel" inputmode="tel" value="${safe(selection.phone)}" aria-describedby="phone-error"><span id="phone-error" class="field-error"></span></label>${actions(true, 'Terminer la simulation →')}`;
  if (step === 4) html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${safe(selection.name)}. Votre sélection&nbsp;: ${safe(selection.service)}, ${safe(selection.day)} à ${safe(selection.time)}.</p><p><strong>Aucun rendez-vous n’a été pris et rien n’a été envoyé.</strong> Pour joindre le salon&nbsp;: <a href="tel:+33667156659">06 67 15 66 59</a>.</p><div class="booking-actions"><button type="button" data-action="restart">Recommencer</button></div>`;
  if (transition) transition.cancel();
  content.innerHTML = html;
  if (animate && !reducedMotion.matches && content.animate) transition = content.animate([{ opacity: .5, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
  if (focus) content.querySelector('h3').focus();
}
content.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  if (button.dataset.action === 'restart') { Object.keys(selection).forEach(key => selection[key] = ''); step = 0; furthest = 0; render(true, event.detail !== 0); return; }
  if (button.dataset.action === 'back') { step--; render(true, event.detail !== 0); return; }
  if (step < 3) {
    const key = ['service', 'day', 'time'][step]; const selected = content.querySelector(`input[name="${key}"]:checked`);
    if (!selected) { message.textContent = 'Choisissez une option pour continuer.'; return; }
    selection[key] = selected.value;
  } else {
    selection.name = document.getElementById('first-name').value.trim(); selection.phone = document.getElementById('phone').value.trim();
    const validPhone = /^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[ .-]?\d{2}){4}$/.test(selection.phone);
    document.getElementById('name-error').textContent = selection.name ? '' : 'Indiquez votre prénom.';
    document.getElementById('phone-error').textContent = validPhone ? '' : 'Indiquez un numéro français valide.';
    if (!selection.name || !validPhone) { message.textContent = 'Vérifiez les champs indiqués.'; return; }
  }
  step++; furthest = Math.max(furthest, step); render(true, event.detail !== 0);
});
content.addEventListener('change', event => {
  if (['service', 'day', 'time'].includes(event.target.name)) { selection[event.target.name] = event.target.value; summary(); }
});
document.querySelector('.summary').addEventListener('click', event => {
  const button = event.target.closest('[data-step]');
  if (button && !button.disabled) { step = Number(button.dataset.step); render(true, event.detail !== 0); }
});
document.querySelector('.filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]'); if (!button) return;
  document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  document.querySelectorAll('[data-category]').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
});
render(false);
