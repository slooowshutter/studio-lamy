const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const tiles = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
  tiles.forEach((tile, index) => { tile.style.transitionDelay = `${index * 60}ms`; observer.observe(tile); });
} else tiles.forEach(tile => tile.classList.add('visible'));
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); });
  document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));
const area = document.getElementById('booking-content');
let keyboardAction = false;
document.addEventListener('keydown', () => { keyboardAction = true; });
document.addEventListener('pointerdown', () => { keyboardAction = false; });
const state = { step: 0, colour: '', day: '', time: '', name: '', phone: '' };
const formatDay = day => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(new Date(`${day}T12:00:00`));
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function render(focusSelector = '') {
  const summary = `<div class="summary"><strong>Votre sélection</strong><br>Henné pour une main${state.colour ? ` · ${state.colour}` : ''}${state.day ? ` · ${formatDay(state.day)}` : ''}${state.time ? ` · ${state.time.replace(':',' h ')}` : ''}${state.step > 0 && state.step < 3 ? `<div class="summary-actions"><button type="button" data-goto="0">Modifier la couleur</button>${state.step > 1 ? '<button type="button" data-goto="1">Modifier le moment</button>' : ''}</div>` : ''}</div>`;
  let content = '';
  if (state.step === 0) content = `<p>ÉTAPE 1 / 3 · PRESTATION</p><h3 tabindex="-1">Henné pour une main</h3><p>Choisissez une couleur pour cette simulation.</p><div class="choices"><button type="button" data-colour="rouge" class="${state.colour === 'rouge' ? 'selected' : ''}" aria-pressed="${state.colour === 'rouge'}">Rouge</button><button type="button" data-colour="noir" class="${state.colour === 'noir' ? 'selected' : ''}" aria-pressed="${state.colour === 'noir'}">Noir</button></div><button class="next" type="button" data-next ${state.colour ? '' : 'disabled'}>Choisir un jour →</button>`;
  if (state.step === 1) { const dates = Array.from({length: 10}, (_,i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+i); const key = dateKey(d); return `<button type="button" data-day="${key}" class="${state.day === key ? 'selected' : ''}" aria-pressed="${state.day === key}">${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d)}</button>`; }).join(''); content = `<p>ÉTAPE 2 / 3 · JOUR ET HEURE</p><h3 tabindex="-1">Choisir un moment</h3><p>Créneaux fictifs entre 10 h et 20 h. Ouverture du lundi à confirmer.</p><div class="choices">${dates}</div>${state.day ? `<p>Heure fictive</p><div class="choices">${['10:00','12:00','14:00','16:00','18:00','19:00'].map(time => {const past = new Date(`${state.day}T${time}:00`) <= new Date(); return `<button type="button" data-time="${time}" class="${state.time === time ? 'selected' : ''}" aria-pressed="${state.time === time}" ${past ? 'disabled' : ''}>${time.replace(':',' h ')}</button>`;}).join('')}</div>` : ''}<button class="back" type="button" data-back>← Retour</button><button class="next" type="button" data-next ${state.time ? '' : 'disabled'}>Continuer →</button>`; }
  if (state.step === 2) content = `<p>ÉTAPE 3 / 3 · COORDONNÉES</p><h3 tabindex="-1">Pour terminer l’essai</h3><p>Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form id="booking-form" novalidate><label for="name">Prénom</label><input id="name" name="name" type="text" autocomplete="given-name" required><label for="phone">Téléphone</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" aria-describedby="form-error" required><p class="error" id="form-error" role="status"></p><button class="back" type="button" data-back>← Retour</button><button class="next" type="submit">Terminer la simulation →</button></form>`;
  if (state.step === 3) content = `<p>SIMULATION TERMINÉE</p><h3 tabindex="-1">Votre essai est prêt.</h3><p>Rien n’a été envoyé et aucun rendez-vous n’a été pris. Pour réserver, contactez le salon.</p><a class="button light" href="https://salondebeauteindienne.mytreatwell.co.uk/">Réserver sur Treatwell ↗</a> <a href="tel:+33173716723">Appeler le salon</a><br><button class="back" type="button" data-reset>Recommencer</button>`;
  area.innerHTML = `<div class="${focusSelector || keyboardAction ? '' : 'step-enter'}">${content}${summary}</div>`;
  (focusSelector ? area.querySelector(focusSelector) : area.querySelector('h3'))?.focus({preventScroll:true});
}
area.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.colour) { state.colour=button.dataset.colour; render(`[data-colour="${state.colour}"]`); }
  if (button.dataset.day) { state.day=button.dataset.day; state.time=''; render(`[data-day="${state.day}"]`); }
  if (button.dataset.time) { state.time=button.dataset.time; render(`[data-time="${state.time}"]`); }
  if (button.hasAttribute('data-goto')) { state.step=Number(button.dataset.goto); render(); }
  if (button.hasAttribute('data-next')) { state.step++; render(); }
  if (button.hasAttribute('data-back')) { state.step--; render(); }
  if (button.hasAttribute('data-reset')) { Object.assign(state,{step:0,colour:'',day:'',time:'',name:'',phone:''}); render(); }
});
area.addEventListener('submit', event => { event.preventDefault(); const name=area.querySelector('#name').value.trim(); const phone=area.querySelector('#phone').value.trim(); if (!name || !/^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}$/.test(phone)) { area.querySelector('#form-error').textContent='Indiquez votre prénom et un numéro de téléphone français valide.'; return; } state.name=name; state.phone=phone; state.step=3; render(); });
render();

const count = document.querySelector('.count');
if (count && !reduceMotion.matches && 'IntersectionObserver' in window) {
  const counter = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    counter.disconnect();
    let value = 1;
    count.textContent = value;
    const timer = setInterval(() => { value++; count.textContent = value; if (value >= 7) clearInterval(timer); }, 65);
  }), {threshold: .5});
  counter.observe(count);
}
