window.sitePret = true;
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  reveals.forEach((item, index) => { item.style.transitionDelay = `${index * 60}ms`; observer.observe(item); });
} else reveals.forEach(item => item.classList.add('visible'));

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
  button.classList.add('active'); button.setAttribute('aria-pressed', 'true');
  document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));

const content = document.querySelector('#booking-content');
const next = document.querySelector('#next');
const back = document.querySelector('#back');
const summary = document.querySelector('#summary');
const stepNumber = document.querySelector('#step-number');
let step = 0, day = '', hour = '', firstName = '', phone = '';
const fmt = new Intl.DateTimeFormat('fr-FR', {weekday:'short', day:'numeric', month:'short'});
const fullFmt = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
const days = Array.from({length: 14}, (_, i) => { const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate() + i); return date; });
function localKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function escapeText(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML; }
function selectedDate() { return days.find(date => localKey(date) === day); }
function render(focus = false) {
  stepNumber.textContent = step < 4 ? `0${step+1} / 04` : 'TERMINÉ';
  back.hidden = step === 0 || step === 4;
  next.hidden = step === 4;
  next.innerHTML = step === 3 ? 'Confirmer la simulation <span>→</span>' : 'Continuer <span>→</span>';
  let html = '';
  if (step === 0) html = `<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p>Une première étape avant votre balayage.</p><label class="choice"><input type="radio" name="service" checked> Consultation préalable · 30 min</label>`;
  if (step === 1) html = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Exemples sur les prochains jours. Horaires à confirmer.</p><div class="day-grid">${days.map(date => {const key=localKey(date), closed=date.getDay()===0||date.getDay()===1; const fin=new Date(date); fin.setHours(date.getDay()===6?16:19,0,0,0); const passed=fin.getTime()-Date.now()<30*60*1000; return `<label class="choice"><input type="radio" name="jour" value="${key}" ${closed||passed?'disabled':''} ${day===key?'checked':''}> ${fmt.format(date)}${closed?' · fermé':passed?' · terminé':''}</label>`;}).join('')}</div>`;
  if (step === 2) { const date = selectedDate(); const closing = date.getDay()===6?16:19; const now = new Date(); let slots=[]; for(let h=9;h<closing;h++) for(let m of [0,30]) {let t=new Date(date);t.setHours(h,m,0,0);if(t<=now) continue; let value=`${String(h).padStart(2,'0')} h ${String(m).padStart(2,'0')}`;slots.push(`<label class="choice"><input type="radio" name="heure" value="${value}" ${hour===value?'checked':''}> ${value}</label>`);} html=`<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>Créneaux d’exemple, sans lien avec les disponibilités réelles.</p><div class="slot-grid">${slots.join('') || 'Aucun exemple disponible pour ce jour.'}</div>`; }
  if (step === 3) html=`<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer la dernière étape. Ces informations restent dans votre navigateur.</p><label class="field">Prénom<input id="first-name" autocomplete="given-name" value="${escapeText(firstName)}" aria-describedby="error"></label><label class="field">Téléphone<input id="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(phone)}" aria-describedby="error"></label>`;
  if (step === 4) html=`<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(firstName)}. Votre choix&nbsp;: consultation préalable, le ${fullFmt.format(selectedDate())} à ${escapeText(hour)}.</p><p><strong>Rien n’a été envoyé et aucun rendez-vous n’a été pris.</strong></p><a class="button dark" href="https://www.planity.com/lappart-des-coiffeurs-31000-toulouse">Réserver sur Planity ↗</a>`;
  content.innerHTML = `<div class="step-enter">${html}<p class="error" id="error" role="status"></p></div>`;
  requestAnimationFrame(() => content.querySelector('.step-enter')?.classList.add('step-ready'));
  const date = selectedDate(); summary.textContent = `Consultation préalable · 30 min${date?' · '+fullFmt.format(date):''}${hour?' · '+hour:''}`;
  if(focus) content.querySelector('h3').focus();
}
next.addEventListener('click', () => {
  const error = document.querySelector('#error');
  if (step===1) { const input=content.querySelector('input[name="jour"]:checked'); if(!input){error.textContent='Choisissez un jour.';return;} if(day!==input.value) hour=''; day=input.value; }
  if (step===2) { const input=content.querySelector('input[name="heure"]:checked'); if(!input){error.textContent='Choisissez une heure.';return;} hour=input.value; }
  if (step===3) { firstName=document.querySelector('#first-name').value.trim();phone=document.querySelector('#phone').value.trim();const prenom=document.querySelector('#first-name'), telephone=document.querySelector('#phone'); const validPhone=/^(?:(?:\+|00)33|0)[1-9](?:[ .-]?\d{2}){4}$/.test(phone); prenom.setAttribute('aria-invalid', String(!firstName)); telephone.setAttribute('aria-invalid', String(!validPhone)); if(!firstName || !validPhone){error.textContent='Indiquez votre prénom et un numéro de téléphone français valide.';(!firstName?prenom:telephone).focus();return;} }
  step++; render(true);
});
back.addEventListener('click', () => { if(step===3){firstName=document.querySelector('#first-name').value;phone=document.querySelector('#phone').value;} step--; render(true); });
render();
