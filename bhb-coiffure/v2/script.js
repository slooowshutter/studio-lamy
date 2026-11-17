document.documentElement.classList.add('js');
const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('shown'); revealObserver.unobserve(entry.target); } }), { threshold: 0.12 }) : null;
document.querySelectorAll('.reveal').forEach((item, index) => { if (revealObserver) { item.style.transitionDelay = `${(index % 4) * 60}ms`; revealObserver.observe(item); } else item.classList.add('shown'); });

const services = ['Shampooing, coupe, soin et brushing', 'Couleur, shampooing, coupe, soin et brushing', 'Mèches, shampooing, coupe, soin et brushing', 'Coupe, shampooing et coiffage'];
const state = { step: 0, service: '', day: '', time: '', name: '', phone: '' };
const content = document.querySelector('#booking-content');
const summary = document.querySelector('#resume');
const progress = document.querySelector('#progression');
const formatDay = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const parseDay = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); };
const hours = day => day === 0 || day === 1 ? null : day === 6 ? [8,17] : day === 5 ? [9,19] : [9,18];
function escapeText(value) { const el = document.createElement('span'); el.textContent = value; return el.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function render(focus = false) {
  progress.textContent = state.step === 4 ? 'Simulation terminée' : `Étape ${state.step + 1} / 4`;
  summary.textContent = `Votre sélection : ${[state.service, state.day && formatDay(parseDay(state.day)), state.time].filter(Boolean).join(' · ') || 'à compléter'}`;
  let html = '';
  if (state.step === 0) {
    html = `<h3 tabindex="-1">Votre prestation</h3><p>Choisissez une prestation pour cette simulation. Les tarifs et durées sont à confirmer auprès du salon.</p><div class="choices">${services.map((s,i) => `<label class="choice"><input type="radio" name="service" value="${i}" ${state.service === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div>`;
  } else if (state.step === 1) {
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Array.from({length:14},(_,i) => { const day = new Date(today); day.setDate(today.getDate()+i); return day; });
    html = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Jours et horaires publiés, à confirmer auprès du salon.</p><div class="choices">${days.map(day => {const key=dateKey(day), range=hours(day.getDay()), closed=!range, lastSlot=new Date(day); if(range) lastSlot.setHours(range[1]-1,0,0,0); const elapsed=range && lastSlot <= new Date(); return `<label class="choice"><input type="radio" name="jour" value="${key}" ${closed || elapsed ? 'disabled' : ''} ${state.day === key ? 'checked' : ''}><span>${formatDay(day)}${closed ? ' · fermé' : elapsed ? ' · horaires passés' : ''}</span></label>`;}).join('')}</div>`;
  } else if (state.step === 2) {
    const day = parseDay(state.day); const range = hours(day.getDay()); const now = new Date();
    const slots = []; for(let h=range[0]; h<range[1]; h++) { const date = new Date(day); date.setHours(h,0,0,0); if(date > now) slots.push(`${String(h).padStart(2,'0')} h 00`); }
    html = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>Horaires proposés pour la simulation, sans indication de disponibilité réelle.</p>${slots.length ? `<div class="choices">${slots.map(slot => `<label class="choice"><input type="radio" name="heure" value="${slot}" ${state.time === slot ? 'checked' : ''}><span>${slot}</span></label>`).join('')}</div>` : '<p>Aucun horaire proposé pour ce jour. Choisissez un autre jour.</p>'}`;
  } else if (state.step === 3) {
    html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour la démonstration uniquement&nbsp;: rien ne sera envoyé ni conservé.</p><label class="form-field" for="prenom">Prénom<input id="prenom" name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur"></label><label class="form-field" for="telephone">Téléphone<input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="erreur"></label><p id="erreur" class="error" role="status"></p>`;
  } else {
    html = `<h3 tabindex="-1">Simulation terminée.</h3><p>${escapeText(state.name)}, votre choix est affiché ci-dessus. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.</p><p>Pour réserver réellement, rendez-vous sur <a href="https://www.planity.com/bhb-coiffure-57000-metz-y06">Planity</a> ou appelez le <a href="tel:+33387750550">03 87 75 05 50</a>.</p>`;
  }
  if(state.step < 4) html += `<p id="erreur-choix" class="error" role="status"></p><div class="booking-actions">${state.step > 0 ? '<button class="secondary" type="button" data-action="retour">Retour</button>' : ''}<button type="button" data-action="suite">${state.step === 3 ? 'Terminer la simulation' : 'Continuer'}</button></div>`;
  else html += '<div class="booking-actions"><button type="button" data-action="recommencer">Recommencer</button></div>';
  content.innerHTML = `<div class="booking-panel">${html}</div>`;
  if(focus) content.querySelector('h3').focus({preventScroll:true});
}
content.addEventListener('change', event => {
  const el=event.target;
  if(el.name==='service') { state.service=services[Number(el.value)]; state.day=''; state.time=''; }
  if(el.name==='jour') { state.day=el.value; state.time=''; }
  if(el.name==='heure') state.time=el.value;
  summary.textContent = `Votre sélection : ${[state.service, state.day && formatDay(parseDay(state.day)), state.time].filter(Boolean).join(' · ') || 'à compléter'}`;
});
content.addEventListener('click', event => {
  const action=event.target.closest('button')?.dataset.action; if(!action)return;
  if(action==='recommencer'){Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:''}); render(true); return;}
  if(action==='retour'){state.step--;render(true);return;}
  if(state.step===3){state.name=content.querySelector('#prenom').value.trim();state.phone=content.querySelector('#telephone').value.trim();const digits=state.phone.replace(/[\s.()-]/g,'');if(!state.name || !/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)){content.querySelector('#erreur').textContent='Indiquez votre prénom et un numéro de téléphone français valide.';return;}}
  if((state.step===0&&!state.service)||(state.step===1&&!state.day)||(state.step===2&&!state.time)){content.querySelector('#erreur-choix').textContent='Choisissez une option pour continuer.';return;}
  state.step++;render(true);
});
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {state.service=link.dataset.service;state.day='';state.time='';state.step=0;render();}));
render();
