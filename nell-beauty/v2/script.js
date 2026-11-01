document.documentElement.classList.add('js');
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
  reveals.forEach(item => observer.observe(item));
} else reveals.forEach(item => item.classList.add('visible'));

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'toutes' && row.dataset.category !== button.dataset.filter; });
}));

const services = ['Microshading', 'Microblading', 'Candy Lips', 'Eye-liner'];
const state = { step: 0, furthest: 0, service: '', date: '', time: '', name: '', phone: '' };
const content = document.querySelector('#booking-content');
const summary = document.querySelector('#summary');
const count = document.querySelector('#step-count');
const progress = document.querySelector('#progress-bar');
const formatDate = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const parseDate = value => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };
function updateSummary() {
  const pieces = [state.service, state.date ? formatDate(parseDate(state.date)) : '', state.time].filter(Boolean);
  summary.textContent = pieces.length ? pieces.join(' · ') : 'Choisissez une prestation pour commencer.';
}
function render(focus = false) {
  document.querySelectorAll('[data-step]').forEach(button => { const step = Number(button.dataset.step); button.disabled = step > state.furthest || state.step === 4; button.setAttribute('aria-current', step === state.step ? 'step' : 'false'); });
  count.textContent = state.step < 4 ? `0${state.step + 1} / 04` : 'TERMINÉ';
  progress.style.transform = `scaleX(${(Math.min(state.step, 3) + 1) / 4})`;
  let html = '';
  if (state.step === 0) {
    html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Simulation · durée publiée sur PagesJaunes&nbsp;: 120 min par prestation, à confirmer.</p><fieldset><legend>Maquillage permanent</legend>${services.map(s => `<label class="choice"><input type="radio" name="service" value="${s}" ${state.service === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</fieldset><div class="booking-actions"><button class="next" type="button" data-action="next" ${state.service ? '' : 'disabled'}>Choisir un jour →</button></div>`;
  } else if (state.step === 1) {
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Array.from({length:14}, (_, i) => {const d = new Date(today); d.setDate(d.getDate()+i); return d;});
    html = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours de simulation selon les horaires PagesJaunes, à confirmer par téléphone.</p><div class="date-grid">${days.map(d => `<button type="button" data-date="${localDate(d)}" class="${state.date === localDate(d) ? 'selected' : ''}" aria-pressed="${state.date === localDate(d)}">${formatDate(d)}</button>`).join('')}</div><div class="booking-actions"><button type="button" data-action="back">← Prestation</button><button class="next" type="button" data-action="next" ${state.date ? '' : 'disabled'}>Choisir une heure →</button></div>`;
  } else if (state.step === 2) {
    const day = parseDate(state.date); const start = day.getDay() === 0 ? 11 : 10; const now = new Date();
    const times = Array.from({length: 17-start}, (_, i) => `${String(start+i).padStart(2,'0')}:00`);
    const hasFuture = times.some(t => { const [h,m] = t.split(':').map(Number); const slot = new Date(day); slot.setHours(h,m); return slot > now; });
    html = `<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux de simulation selon les horaires PagesJaunes, sans disponibilité réelle. À confirmer par téléphone.</p>${hasFuture ? '' : '<p>Les heures proposées pour ce jour sont passées. Choisissez un autre jour.</p>'}<div class="slot-grid">${times.map(t => {const [h,m] = t.split(':').map(Number); const slot = new Date(day); slot.setHours(h,m); return `<button type="button" data-time="${t}" class="${state.time === t ? 'selected' : ''}" aria-pressed="${state.time === t}" ${slot <= now ? 'disabled' : ''}>${t.replace(':',' h ')}</button>`;}).join('')}</div><div class="booking-actions"><button type="button" data-action="back">← Jour</button><button class="next" type="button" data-action="next" ${state.time ? '' : 'disabled'}>Vos coordonnées →</button></div>`;
  } else if (state.step === 3) {
    html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer le parcours uniquement. Rien ne sera transmis.</p><form id="demo-form" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" required aria-describedby="form-error"></label><label class="field">Téléphone<input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="form-error"></label><p class="error" id="form-error" role="status"></p><div class="booking-actions"><button type="button" data-action="back">← Heure</button><button class="next" type="submit">Confirmer la simulation →</button></div></form>`;
  } else {
    html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Aucun rendez-vous n’a été pris et aucune information n’a été envoyée. Pour réserver, appelez directement Nell Beauty.</p><a class="button black" href="tel:+33648486536">Appeler le 06 48 48 65 36 ↗</a><div class="booking-actions"><button type="button" data-action="restart">Recommencer</button></div>`;
  }
  content.innerHTML = `<div class="booking-view entering">${html}</div>`;
  if (state.step === 3) { content.querySelector('[name=prenom]').value = state.name; content.querySelector('[name=telephone]').value = state.phone; }
  const view = content.firstElementChild;
  requestAnimationFrame(() => requestAnimationFrame(() => view.classList.remove('entering')));
  if (focus) content.querySelector('h3').focus({preventScroll:true});
  updateSummary();
}
content.addEventListener('input', event => { if (event.target.name === 'prenom') state.name = event.target.value; if (event.target.name === 'telephone') state.phone = event.target.value; });
document.querySelector('.booking-steps').addEventListener('click', event => { const button = event.target.closest('[data-step]'); if (button && !button.disabled) { state.step = Number(button.dataset.step); render(true); } });
content.addEventListener('change', event => { if (event.target.name === 'service') { state.service = event.target.value; content.querySelector('[data-action="next"]').disabled = false; updateSummary(); } });
content.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.date) { state.date = button.dataset.date; state.time = ''; state.furthest = Math.min(state.furthest, 2); render(); content.querySelector(`[data-date="${state.date}"]`).focus(); }
  if (button.dataset.time) { state.time = button.dataset.time; render(); content.querySelector(`[data-time="${state.time}"]`).focus(); }
  if (button.dataset.action === 'next') { state.step++; state.furthest = Math.max(state.furthest, state.step); render(true); }
  if (button.dataset.action === 'back') { state.step--; render(true); }
  if (button.dataset.action === 'restart') { Object.assign(state,{step:0,furthest:0,service:'',date:'',time:'',name:'',phone:''}); render(true); }
});
content.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target; const name = form.elements.prenom.value.trim(); const phone = form.elements.telephone.value.trim();
  if (!name || !/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(phone)) { document.querySelector('#form-error').textContent = 'Indiquez votre prénom et un numéro de téléphone français valide.'; return; }
  state.name = name; state.phone = phone; state.step = 4; render(true);
});
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => { state.service = link.dataset.service; state.step = 0; state.furthest = 0; state.date = ''; state.time = ''; render(); }));
render();
