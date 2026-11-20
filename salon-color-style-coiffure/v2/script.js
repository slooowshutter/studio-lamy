const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .08 });
  reveals.forEach(item => observer.observe(item));
} else reveals.forEach(item => item.classList.add('visible'));

const content = document.querySelector('#booking-content');
const selection = document.querySelector('#selection');
const count = document.querySelector('#step-count');
const steps = [...document.querySelectorAll('[data-goto]')];
const services = ['Coupe et brushing', 'Coloration', 'Mèches', 'Permanente', 'Coiffure homme', 'Barbe'];
const state = { step: 0, reached: 0, service: '', day: '', time: '', name: '', phone: '' };
const days = Array.from({length: 14}, (_, i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
const dateLabel = d => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(d);
const keyFor = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(focus = false) {
  count.textContent = `${String(Math.min(state.step + 1, 4)).padStart(2,'0')} / 04`;
  const day = days.find(d => keyFor(d) === state.day);
  selection.textContent = 'Votre sélection : ' + [state.service, day && dateLabel(day), state.time].filter(Boolean).join(' · ') || 'Votre sélection : à compléter';
  if (!state.service) selection.textContent = 'Votre sélection : à compléter';
  steps.forEach((button, index) => { button.disabled = index > Math.min(state.reached, 3); });
  let body = '';
  if (state.step === 0) body = `<h3 tabindex="-1">Quelle prestation ?</h3><div class="choices">${services.map(s => `<label class="choice"><input type="radio" name="prestation" value="${s}" ${state.service === s ? 'checked' : ''}>${s}</label>`).join('')}</div><p class="error" id="erreur"></p><div class="actions"><button class="action" data-next>Continuer →</button></div>`;
  if (state.step === 1) body = `<h3 tabindex="-1">Quel jour ?</h3><p class="note">Dates fictives pour la simulation. Mardi : horaire à confirmer.</p><div class="choices">${days.map(d => { const closed = d.getDay() === 0 || d.getDay() === 1; const key = keyFor(d); return `<label class="choice ${closed?'disabled':''}"><input type="radio" name="jour" value="${key}" ${closed?'disabled':''} ${state.day===key?'checked':''}><span>${dateLabel(d)}${closed?'<small>Fermé</small>':''}</span></label>`; }).join('')}</div><p class="error" id="erreur"></p><div class="actions"><button class="action secondary" data-back>Retour</button><button class="action" data-next>Continuer →</button></div>`;
  if (state.step === 2) { const candidates = day.getDay() === 6 ? ['09:00','11:00','14:00','16:00'] : day.getDay() === 2 ? ['09:30','11:00'] : ['09:30','11:00','14:00','16:00']; body = `<h3 tabindex="-1">À quelle heure ?</h3><p class="note">Heures d’exemple, sans indication de disponibilité réelle. Si elles sont toutes passées, choisissez un autre jour.</p><div class="choices">${candidates.map(t => {const [h,m]=t.split(':').map(Number); const when=new Date(day); when.setHours(h,m,0,0); const past=when<=new Date(); return `<label class="choice ${past?'disabled':''}"><input type="radio" name="heure" value="${t}" ${past?'disabled':''} ${state.time===t&&!past?'checked':''}>${t.replace(':',' h ')}${past?' · passé':''}</label>`}).join('')}</div><p class="error" id="erreur"></p><div class="actions"><button class="action secondary" data-back>Retour</button><button class="action" data-next>Continuer →</button></div>`; }
  if (state.step === 3) body = `<h3 tabindex="-1">Vos coordonnées</h3><p class="note">Ces informations restent dans cette page et ne sont pas envoyées.</p><label class="field">Prénom<input name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur-prenom"></label><p class="error" id="erreur-prenom"></p><label class="field">Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="erreur-telephone"></label><p class="error" id="erreur-telephone"></p><div class="actions"><button class="action secondary" data-back>Retour</button><button class="action" data-next>Terminer la simulation</button></div>`;
  if (state.step === 4) body = `<h3 tabindex="-1">Simulation terminée.</h3><p>${escapeText(state.name)}, votre choix : ${escapeText(state.service)}, ${dateLabel(day)} à ${state.time.replace(':',' h ')}.</p><p>Aucun rendez-vous n’a été transmis. Pour réserver, utilisez Planity ou appelez le salon.</p><div class="actions"><a class="action" href="https://www.planity.com/color-styl-51100-reims">Réserver sur Planity ↗</a><button class="action secondary" data-restart>Recommencer</button></div>`;
  content.innerHTML = `<div class="step-enter">${body}</div>`;
  requestAnimationFrame(() => content.firstElementChild?.classList.add('shown'));
  if (focus) content.querySelector('h3')?.focus({preventScroll:true});
}
content.addEventListener('click', e => {
  if (e.target.closest('[data-back]')) { state.step--; render(true); return; }
  if (e.target.closest('[data-restart]')) { Object.assign(state,{step:0,reached:0,service:'',day:'',time:'',name:'',phone:''}); render(true); return; }
  if (!e.target.closest('[data-next]')) return;
  if (state.step < 3) { const selected = content.querySelector('input:checked'); if (!selected) { content.querySelector('#erreur').textContent = 'Choisissez une option pour continuer.'; return; } if (state.step === 0 && state.service !== selected.value) { state.service = selected.value; state.day = ''; state.time = ''; state.reached = 0; } if (state.step === 1 && state.day !== selected.value) { state.day = selected.value; state.time = ''; state.reached = 1; } if (state.step === 2 && state.time !== selected.value) { state.time = selected.value; state.reached = 2; } }
  else { state.name = content.querySelector('[name=prenom]').value.trim(); state.phone = content.querySelector('[name=telephone]').value.trim(); const validPhone = /^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone); content.querySelector('#erreur-prenom').textContent = state.name ? '' : 'Indiquez votre prénom.'; content.querySelector('#erreur-telephone').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.'; if (!state.name || !validPhone) return; }
  state.step++; state.reached = Math.max(state.reached, state.step); render(true);
});
steps.forEach(button => button.addEventListener('click', () => { state.step = Number(button.dataset.goto); render(true); }));
render();
