document.documentElement.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tiles = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduced) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.12 });
  tiles.forEach((tile, index) => { tile.style.transitionDelay = `${index * 60}ms`; observer.observe(tile); });
} else tiles.forEach(tile => tile.classList.add('visible'));
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); });
  document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));

const services = [
  { name: 'Coupe homme · cheveux courts', detail: 'Shampoing, coupe, coiffage', duration: 30, price: 29 },
  { name: 'Coupe femme · cheveux courts', detail: 'Shampoing, coupe, brushing', duration: 45, price: 44 },
  { name: 'Coupe femme · cheveux longs', detail: 'Shampoing, coupe, brushing', duration: 60, price: 59 },
  { name: 'Brushing · cheveux courts', detail: 'Coiffage', duration: 30, price: 32 }
];
const state = { step: 0, service: null, date: null, time: null, firstName: '', phone: '', done: false };
const content = document.getElementById('booking-content');
const summary = document.getElementById('summary');
const progress = document.getElementById('progress');
const stepButtons = [...document.querySelectorAll('[data-go]')];
const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday:'short', day:'numeric', month:'short' });
const longDate = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
function makeDays() {
  const today = new Date(); today.setHours(0,0,0,0);
  return Array.from({length:14}, (_, i) => { const date = new Date(today); date.setDate(today.getDate()+i); return date; });
}
function timeLabel(minutes) { return `${String(Math.floor(minutes / 60)).padStart(2,'0')} h ${String(minutes % 60).padStart(2,'0')}`; }
function updateSummary() {
  const parts = [];
  if (state.service !== null) { const s = services[state.service]; parts.push(`${s.name} · ${s.duration} min · ${s.price} €`); }
  if (state.date) parts.push(longDate.format(state.date));
  if (state.time !== null) parts.push(timeLabel(state.time));
  summary.textContent = parts.length ? parts.join(' / ') : 'Choisissez une prestation pour commencer.';
}
function render(focus = true) {
  progress.textContent = state.done ? 'TERMINÉ' : `0${state.step + 1} / 04`;
  const max = state.service === null ? 0 : !state.date ? 1 : state.time === null ? 2 : 3;
  stepButtons.forEach((button, i) => { button.disabled = state.done || i > max; button.classList.toggle('current', !state.done && i === state.step); if (i === state.step && !state.done) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
  updateSummary();
  content.classList.remove('booking-enter'); void content.offsetWidth; content.classList.add('booking-enter');
  if (state.done) {
    content.innerHTML = '<h3 tabindex="-1">Simulation terminée.</h3><p>Merci <span id="result-name"></span>. Aucun rendez-vous n’a été envoyé ni enregistré.</p><p>Téléphone saisi&nbsp;: <span id="result-phone"></span>.</p><p>Pour réserver réellement, contactez le salon ou utilisez sa page Planity.</p><div class="booking-actions"><a class="button dark" href="https://www.planity.com/the-workshop-coiffure-14000-caen">Voir les disponibilités sur Planity ↗</a><button class="restart" type="button">Recommencer</button></div>';
    document.getElementById('result-name').textContent = state.firstName;
    document.getElementById('result-phone').textContent = state.phone;
    content.querySelector('.restart').addEventListener('click', () => { Object.assign(state,{step:0,service:null,date:null,time:null,firstName:'',phone:'',done:false}); render(); });
  } else if (state.step === 0) {
    content.innerHTML = '<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p>Tarifs indicatifs, à confirmer avec The Workshop coiffure. Pour un éclaircissement, appelez le salon.</p><fieldset><legend>Choisissez une prestation pour la simulation.</legend>' + services.map((s,i) => `<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service === i ? 'checked' : ''}><span><strong>${s.name}</strong><br>${s.detail} · ${s.duration} min</span><strong>${s.price} €</strong></label>`).join('') + '</fieldset><div class="booking-actions"><button type="button" class="next" '+(state.service === null ? 'disabled' : '')+'>Choisir un jour →</button></div>';
    content.querySelectorAll('input').forEach(input => input.addEventListener('change', () => { const next = Number(input.value); if (state.service !== next) { state.date = null; state.time = null; } state.service = next; updateSummary(); content.querySelector('.next').disabled = false; }));
    content.querySelector('.next').addEventListener('click', () => { state.step=1; render(); });
  } else if (state.step === 1) {
    const days = makeDays();
    content.innerHTML = '<h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Horaires selon Planity. Le mercredi est fermé dans cette simulation, mais reste à confirmer.</p><div class="day-grid">' + days.map((date,i) => { const closed = date.getDay() === 0 || date.getDay() === 3; const selected = state.date && date.toDateString() === state.date.toDateString(); return `<button type="button" data-day="${i}" ${closed?'disabled':''} class="${selected?'selected':''}" aria-pressed="${selected?'true':'false'}">${dateFormat.format(date)}<small>${closed?'fermé':''}</small></button>`; }).join('') + '</div><div class="booking-actions"><button type="button" class="back">← Prestation</button><button type="button" class="next" '+(!state.date?'disabled':'')+'>Choisir une heure →</button></div>';
    content.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => { state.date = days[Number(button.dataset.day)]; state.time = null; render(false); content.querySelector('[data-day="' + button.dataset.day + '"]').focus({preventScroll:true}); }));
    content.querySelector('.back').addEventListener('click', () => {state.step=0;render();}); content.querySelector('.next').addEventListener('click', () => {state.step=2;render();});
  } else if (state.step === 2) {
    const now = new Date(); const isToday = state.date.toDateString() === now.toDateString(); const slots=[];
    for (let m=540; m + services[state.service].duration <= 1140; m+=30) { const taken = (Math.floor(m/30)+state.date.getDate())%5===0; const past = isToday && m <= now.getHours()*60+now.getMinutes(); slots.push({m,taken,past}); }
    content.innerHTML = '<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>Créneaux fictifs pour le '+longDate.format(state.date)+'. Les disponibilités réelles sont à vérifier auprès du salon.</p><div class="slot-grid">'+slots.map(({m,taken,past})=>`<button type="button" data-time="${m}" ${taken||past?'disabled':''} class="${state.time===m?'selected':''}" aria-pressed="${state.time===m?'true':'false'}">${timeLabel(m)}${taken?' <small>déjà pris</small>':past?' <small>passé</small>':''}</button>`).join('')+'</div><div class="booking-actions"><button type="button" class="back">← Jour</button><button type="button" class="next" '+(state.time===null?'disabled':'')+'>Vos coordonnées →</button></div>';
    content.querySelectorAll('[data-time]').forEach(button=>button.addEventListener('click',()=>{state.time=Number(button.dataset.time);render(false);content.querySelector('[data-time="' + button.dataset.time + '"]').focus({preventScroll:true});}));
    content.querySelector('.back').addEventListener('click',()=>{state.step=1;render();}); content.querySelector('.next').addEventListener('click',()=>{state.step=3;render();});
  } else {
    content.innerHTML = '<h3 tabindex="-1">Vos coordonnées.</h3><p>Ces informations restent dans votre navigateur et ne sont pas transmises.</p><form novalidate><label class="field"><span>Prénom</span><input name="prenom" autocomplete="given-name" required aria-describedby="erreur-prenom"><small class="error" id="erreur-prenom"></small></label><label class="field"><span>Téléphone</span><input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="erreur-telephone"><small class="error" id="erreur-telephone"></small></label><div class="booking-actions"><button type="button" class="back">← Heure</button><button type="submit">Confirmer la simulation →</button></div></form>';
    const form=content.querySelector('form'); const prenom=form.querySelector('[name=prenom]'); const telephone=form.querySelector('[name=telephone]'); prenom.value=state.firstName; telephone.value=state.phone;
    prenom.addEventListener('input',()=>{state.firstName=prenom.value;}); telephone.addEventListener('input',()=>{state.phone=telephone.value;});
    form.querySelector('.back').addEventListener('click',()=>{state.firstName=prenom.value;state.phone=telephone.value;state.step=2;render();});
    form.addEventListener('submit',event=>{event.preventDefault(); const name=prenom.value.trim(); const phone=telephone.value.trim(); const normalized=phone.replace(/[\s.()-]/g,''); const validPhone=/^(?:(?:\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/.test(normalized); document.getElementById('erreur-prenom').textContent=name?'':'Indiquez votre prénom.'; document.getElementById('erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.'; prenom.setAttribute('aria-invalid',String(!name)); telephone.setAttribute('aria-invalid',String(!validPhone)); if(!name||!validPhone){(name?telephone:prenom).focus();return;} state.firstName=name;state.phone=phone;state.done=true;render();});
  }
  if(focus) content.querySelector('h3')?.focus({preventScroll:true});
}
stepButtons.forEach(button=>button.addEventListener('click',()=>{state.step=Number(button.dataset.go);render();}));
render(false);
