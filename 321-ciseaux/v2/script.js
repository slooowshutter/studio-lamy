document.documentElement.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduced.matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.12 });
  reveals.forEach(el => observer.observe(el));
} else reveals.forEach(el => el.classList.add('visible'));
let pointerInput = false;
document.addEventListener('pointerdown', () => { pointerInput = true; });
document.addEventListener('keydown', () => { pointerInput = false; });
const filters = document.querySelectorAll('.filter');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
  button.classList.add('active'); button.setAttribute('aria-pressed', 'true');
  let visibleCount = 0;
  document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; if (!row.hidden) visibleCount++; });
  document.getElementById('filter-status').textContent = `${visibleCount} prestation${visibleCount > 1 ? 's' : ''} affichée${visibleCount > 1 ? 's' : ''}.`;
}));
const steps = document.querySelectorAll('.step');
const selection = document.getElementById('selection');
const count = document.getElementById('step-count');
let service = '';
function showStep(number) {
  steps.forEach(step => { step.hidden = Number(step.dataset.step) !== number; step.classList.remove('entering'); });
  const current = document.querySelector(`[data-step="${number}"]`);
  if (!reduced.matches && pointerInput) current.classList.add('entering');
  count.textContent = number === 4 ? 'TERMINÉ' : `0${number} / 03`;
  current.querySelector('h3').focus({preventScroll:true});
}
document.getElementById('choose-service').addEventListener('click', () => {
  const chosen = document.querySelector('input[name="prestation"]:checked');
  const error = document.getElementById('service-error');
  if (!chosen) { error.textContent = 'Choisissez une prestation pour continuer.'; return; }
  error.textContent = ''; service = chosen.value; selection.textContent = service; showStep(2);
});
document.getElementById('choose-details').addEventListener('click', () => {
  const name = document.getElementById('first-name'); const phone = document.getElementById('phone');
  const error = document.getElementById('phone-error'); const nameError = document.getElementById('name-error'); const digits = phone.value.replace(/\D/g, '');
  if (!name.value.trim()) { nameError.textContent = 'Indiquez votre prénom.'; name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
  if (!(digits.length === 10 && digits.startsWith('0')) && !(digits.length === 11 && digits.startsWith('33'))) { error.textContent = 'Indiquez un numéro de téléphone français valide.'; phone.setAttribute('aria-invalid', 'true'); phone.focus(); return; }
  error.textContent = ''; document.getElementById('recap-service').textContent = service;
  document.getElementById('recap-name').textContent = name.value.trim(); document.getElementById('recap-phone').textContent = phone.value.trim(); showStep(3);
});
document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
document.getElementById('finish').addEventListener('click', () => { document.getElementById('success-service').textContent = service; showStep(4); });
[['first-name', 'name-error'], ['phone', 'phone-error']].forEach(([fieldId, errorId]) => document.getElementById(fieldId).addEventListener('input', event => { event.target.removeAttribute('aria-invalid'); document.getElementById(errorId).textContent = ''; }));
if ('IntersectionObserver' in window) { const footerObserver = new IntersectionObserver(entries => document.querySelector('.mobile-bar').classList.toggle('is-hidden', entries[0].isIntersecting)); footerObserver.observe(document.querySelector('footer')); }
document.querySelector('.restart').addEventListener('click', () => { document.querySelectorAll('input').forEach(input => { if (input.type === 'radio') input.checked = false; else input.value = ''; }); service = ''; selection.textContent = 'Prestation à choisir'; showStep(1); });
