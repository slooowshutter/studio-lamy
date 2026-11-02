document.documentElement.classList.add('js');
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), {threshold: .12});
  reveals.forEach((el, index) => { el.style.transitionDelay = `${index % 3 * 60}ms`; observer.observe(el); });
} else reveals.forEach(el => el.classList.add('visible'));

const filters = document.querySelectorAll('.filter');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); });
  document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));
const steps = [...document.querySelectorAll('.step')];
const progress = document.querySelector('#progress');
const recap = document.querySelector('#recap');
const daySelect = document.querySelector('#jour');
const serviceError = document.querySelector('#erreur-prestation');
const dayError = document.querySelector('#erreur-jour');
const error = document.querySelector('#erreur');
let current = 0;
const selectedService = () => document.querySelector('input[name="service"]:checked')?.value || '';
const updateRecap = () => { recap.textContent = [selectedService(), daySelect.value ? daySelect.selectedOptions[0]?.textContent : ''].filter(Boolean).join(' · ') || 'Votre prestation apparaîtra ici.'; };
function showStep(index) {
  current = index;
  steps.forEach((step, i) => { step.hidden = i !== index; step.classList.remove('enter'); });
  const step = steps[index];
  void step.offsetWidth;
  step.classList.add('enter');
  progress.textContent = index === 3 ? 'TERMINÉ' : `0${index + 1} — 03`;
  updateRecap();
  step.querySelector('h3').focus();
}
const opening = {2:[10,19],3:[11,19],4:[11,19.5],5:[10,19],6:[11,19]};
const formatter = new Intl.DateTimeFormat('fr-FR', {weekday:'long',day:'numeric',month:'long'});
const today = new Date(); today.setHours(0,0,0,0);
for (let i=0; i<14; i++) {
  const date = new Date(today); date.setDate(today.getDate()+i);
  const option = document.createElement('option');
  option.value = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  option.textContent = formatter.format(date) + (opening[date.getDay()] ? '' : ' — fermé');
  option.disabled = !opening[date.getDay()]; daySelect.append(option);
}
daySelect.addEventListener('change', () => { dayError.textContent = ''; updateRecap(); });
document.querySelectorAll('input[name="service"]').forEach(input => input.addEventListener('change', () => { serviceError.textContent = ''; updateRecap(); }));
document.querySelectorAll('.next').forEach(button => button.addEventListener('click', () => {
  if (current === 0 && !selectedService()) { serviceError.textContent = 'Choisissez une prestation pour continuer.'; return; }
  if (current === 1 && !daySelect.value) { dayError.textContent = 'Choisissez un jour pour continuer.'; return; }
  showStep(current+1);
}));
document.querySelectorAll('.back:not(.restart)').forEach(button => button.addEventListener('click', () => showStep(current-1)));
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
  const radio = [...document.querySelectorAll('input[name="service"]')].find(input => input.value === link.dataset.service);
  if (radio) radio.checked = true;
  showStep(0);
}));
document.querySelector('#confirm').addEventListener('click', () => {
  const first = document.querySelector('#prenom'); const phone = document.querySelector('#telephone');
  if (!first.value.trim()) { error.textContent = 'Indiquez votre prénom.'; first.focus(); return; }
  if (!/^(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}$/.test(phone.value.trim())) { error.textContent = 'Indiquez un numéro de téléphone français valide.'; phone.focus(); return; }
  error.textContent = ''; showStep(3);
});
document.querySelector('.restart').addEventListener('click', () => { document.querySelectorAll('input').forEach(input => { if(input.type === 'radio') input.checked = false; else input.value = ''; }); daySelect.value = ''; showStep(0); });

const number = document.querySelector('.street-number');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const counterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    counterObserver.disconnect();
    const start = performance.now();
    function count(now) { const fraction = Math.min((now - start) / 400, 1); number.textContent = String(Math.round(19 * fraction)); if (fraction < 1) requestAnimationFrame(count); }
    requestAnimationFrame(count);
  }), {threshold: .5});
  counterObserver.observe(number);
}
if ('IntersectionObserver' in window) {
  const bookingObserver = new IntersectionObserver(entries => { document.body.classList.toggle('in-booking', entries[0].isIntersecting); }, {threshold: .05});
  bookingObserver.observe(document.querySelector('#rendez-vous'));
}
