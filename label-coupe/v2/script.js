document.documentElement.classList.add('js');
const motionOkay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && motionOkay) {
  reveals.forEach((el, i) => { el.classList.add('pending'); el.style.transitionDelay = `${i * 70}ms`; });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('pending'); observer.unobserve(entry.target); } }), { threshold: .12 });
  reveals.forEach(el => observer.observe(el));
}
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'toutes' && row.dataset.category !== button.dataset.filter; });
}));
const content = document.getElementById('booking-content');
const summary = document.getElementById('summary-text');
const stepButtons = [...document.querySelectorAll('.steps button')];
const state = { service: '', date: '', time: '', name: '', phone: '' };
let currentStep = 0, furthest = 0;
const services = ['Coupe femme', 'Coloration', 'Cheveux bouclés'];
const dateLabel = value => { const [year, month, day] = value.split('-').map(Number); return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day)); };
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function updateSummary() { summary.textContent = [state.service, state.date && dateLabel(state.date), state.time].filter(Boolean).join(' · ') || 'Rien de sélectionné pour le moment.'; }
function setStep(step) { if ((step >= 1 && !state.service) || (step >= 2 && !state.date) || (step >= 3 && !state.time)) return; currentStep = step; furthest = Math.max(furthest, step); render(); content.querySelector('h3')?.focus(); }
function render() {
  stepButtons.forEach((button, i) => { button.disabled = i > furthest; if (i === currentStep) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
  content.classList.remove('step-enter'); void content.offsetWidth; content.classList.add('step-enter');
  if (currentStep === 0) {
    content.innerHTML = '<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p>Catégories d’annuaire, à confirmer. Aucun tarif n’est renseigné.</p><div class="choice-grid" id="choices"></div>';
    services.forEach(service => addChoice(service, state.service === service, () => { if (state.service !== service) { state.date = ''; state.time = ''; furthest = 1; } state.service = service; updateSummary(); setStep(1); }));
  } else if (currentStep === 1) {
    content.innerHTML = '<h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Exemple de parcours selon les horaires d’annuaire, à confirmer. Ces dates ne sont pas des disponibilités.</p><div class="choice-grid" id="choices"></div>';
    for (let i = 0; i < 14; i++) { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + i); const value = localDate(date); const closed = date.getDay() === 0; const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date); addChoice(label + (closed ? ' · fermé' : ''), state.date === value, () => { if (state.date !== value) { state.time = ''; furthest = 2; } state.date = value; updateSummary(); setStep(2); }, closed); }
  } else if (currentStep === 2) {
    content.innerHTML = '<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>Heures de simulation, sans disponibilité réelle. Horaires et durée à confirmer avec le salon.</p><div class="choice-grid" id="choices"></div>';
    for (let hour = 9; hour < 19; hour++) { const time = `${String(hour).padStart(2,'0')} h 00`; const now = new Date(); const past = state.date === localDate(now) && hour <= now.getHours(); addChoice(time, state.time === time, () => { state.time = time; updateSummary(); setStep(3); }, past); }
  } else if (currentStep === 3) {
    content.innerHTML = '<h3 tabindex="-1">Vos coordonnées</h3><p>Pour cette démonstration, rien ne sera transmis.</p><form id="booking-form" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" required aria-describedby="form-error"></label><label class="field">Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="form-error"></label><p id="form-error" class="error" role="status"></p><button class="next-button" type="submit">Terminer la simulation →</button></form>';
    const form = document.getElementById('booking-form'); form.elements.prenom.value = state.name; form.elements.telephone.value = state.phone;
    form.addEventListener('submit', event => { event.preventDefault(); state.name = form.elements.prenom.value.trim(); state.phone = form.elements.telephone.value.trim(); const digits = state.phone.replace(/[\s.()-]/g, ''); const nameInvalid = !state.name; const phoneInvalid = !/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits); form.elements.prenom.setAttribute('aria-invalid', String(nameInvalid)); form.elements.telephone.setAttribute('aria-invalid', String(phoneInvalid)); if (nameInvalid || phoneInvalid) { document.getElementById('form-error').textContent = nameInvalid ? 'Indiquez votre prénom.' : 'Indiquez un numéro de téléphone français valide.'; (nameInvalid ? form.elements.prenom : form.elements.telephone).focus(); return; } setStep(4); });
  } else {
    content.innerHTML = '<h3 tabindex="-1">Simulation terminée.</h3><p>Aucun rendez-vous n’a été pris et aucune information n’a été envoyée. Pour réserver, appelez le salon.</p><a class="next-button button" href="tel:+33651080580">Appeler le 06 51 08 05 80 ↗</a><button class="next-button" id="restart" type="button">Recommencer</button>';
    document.getElementById('restart').addEventListener('click', () => { Object.assign(state, { service: '', date: '', time: '', name: '', phone: '' }); furthest = 0; updateSummary(); setStep(0); });
  }
}
function addChoice(label, selected, action, disabled = false) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.classList.toggle('selected', selected); button.disabled = disabled; button.addEventListener('click', action); document.getElementById('choices').appendChild(button); }
stepButtons.forEach(button => button.addEventListener('click', () => setStep(Number(button.dataset.step))));
render();

if ('IntersectionObserver' in window) { const bar = document.querySelector('.mobile-bar'); const visible = new Set(); const barObserver = new IntersectionObserver(entries => { entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)); bar.classList.toggle('is-hidden', visible.size > 0); }, { threshold: .1 }); document.querySelectorAll('#rendez-vous, footer').forEach(el => barObserver.observe(el)); }
