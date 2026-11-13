const root = document.documentElement;
root.classList.add('js');
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: 0.12 });
  document.querySelectorAll('.reveal, .reveal-fact').forEach(el => observer.observe(el));
} else { document.querySelectorAll('.reveal, .reveal-fact').forEach(el => el.classList.add('visible')); }

const content = document.querySelector('#step-content');
const summary = document.querySelector('#summary');
const stepButtons = [...document.querySelectorAll('[data-go]')];
const selection = { service: '', day: null, time: '', firstName: '', phone: '' };
let step = 0;
let reached = 0;
let transitionTimer;
const services = ['Co-wash', 'Soin essentiel', 'Bain + coupe + coiffage cheveux courts', 'Barbe'];
const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const today = new Date(); today.setHours(0,0,0,0);
const days = Array.from({length: 14}, (_, i) => { const date = new Date(today); date.setDate(today.getDate()+i); return date; });
function options(items, name) { return items.map((item, i) => `<label class="choice"><input type="radio" name="${name}" value="${i}" ${item.disabled ? 'disabled' : ''} ${item.checked ? 'checked' : ''}><span>${item.label}</span></label>`).join(''); }
function updateSummary() { const parts = [selection.service, selection.day ? dateFormat.format(selection.day) : '', selection.time]; summary.textContent = parts.filter(Boolean).join(' · ') || 'Choisissez une prestation pour commencer.'; }
function render(focus = true) {
  stepButtons.forEach((button, i) => { button.disabled = i > reached; if (i === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
  let html = '';
  if (step === 0) html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Simulation sans envoi. Les prestations et tarifs sont à confirmer avec le salon.</p><div class="options">${options(services.map(s => ({label:s, checked:s===selection.service})), 'service')}</div><button class="action" type="button" data-next>Continuer</button><p class="error" role="status"></p>`;
  if (step === 1) html = `<h3 tabindex="-1">Choisir un jour</h3><p>Horaires à confirmer. Les jours de fermeture sont indiqués.</p><div class="options">${options(days.map(d => ({label:dateFormat.format(d)+(d.getDay()===0 || d.getDay()===1 ? ' · fermé' : ''),disabled:d.getDay()===0 || d.getDay()===1,checked:selection.day && d.getTime()===selection.day.getTime()})), 'day')}</div><button class="action" type="button" data-next>Continuer</button><p class="error" role="status"></p>`;
  if (step === 2) { const saturday = selection.day.getDay() === 6; const start = saturday ? 9 : 10; const end = saturday ? 16 : 19; const now = new Date(); const slots = Array.from({length:end-start},(_,i) => { const hour=start+i; const d=new Date(selection.day);d.setHours(hour); return {label:`${hour} h${d<=now ? ' · passé' : ((hour+selection.day.getDate())%4===0 ? ' · déjà pris (simulation)' : '')}`,disabled:d<=now || ((hour+selection.day.getDate())%4===0),checked:selection.time===`${hour} h`}; }); html = `<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs pour la simulation, disponibilité réelle à confirmer.</p><div class="options">${options(slots,'time')}</div><button class="action" type="button" data-next>Continuer</button><p class="error" role="status"></p>`; }
  if (step === 3) html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent sur cet appareil.</p><label class="field" for="first-name">Prénom</label><input class="field" id="first-name" autocomplete="given-name" aria-describedby="form-error" value=""><label class="field" for="phone">Téléphone</label><input class="field" id="phone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="form-error" value=""><p id="form-error" class="error" role="status"></p><button class="action" type="button" data-next>Confirmer la simulation</button>`;
  if (step === 4) html = `<h3 tabindex="-1">Simulation terminée</h3><p>Votre sélection est prête. Aucune demande n’a été envoyée au salon.</p><a class="text-link" href="https://www.planity.com/bruno-cote-salon-69002-lyon-1m9" target="_blank" rel="noopener">Prendre rendez-vous sur Planity ↗</a><p><button class="action" type="button" data-restart>Recommencer</button></p>`;
  content.innerHTML=html; if (step === 3) { content.querySelector('#first-name').value=selection.firstName; content.querySelector('#phone').value=selection.phone; } updateSummary(); if(focus) content.querySelector('h3').focus();
}
function changeStep(next) { clearTimeout(transitionTimer); content.classList.add('flow-changing'); const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches; transitionTimer=setTimeout(() => {step=next;render();content.classList.remove('flow-changing');}, reduced ? 0 : 180); }
content.addEventListener('click', event => {
  if(event.target.closest('[data-restart]')) { Object.assign(selection,{service:'',day:null,time:'',firstName:'',phone:''});reached=0;changeStep(0);return; }
  if(!event.target.closest('[data-next]')) return;
  const chosen=content.querySelector('input[type="radio"]:checked'); const error=content.querySelector('.error');
  if(step<3 && !chosen){error.textContent='Veuillez faire un choix pour continuer.';return;}
  if(step===0){const next=services[Number(chosen.value)]; if(next!==selection.service){selection.day=null;selection.time='';reached=0;} selection.service=next;}
  if(step===1){const next=days[Number(chosen.value)];if(!selection.day || next.getTime()!==selection.day.getTime()) { selection.time=''; reached=Math.min(reached,1); }selection.day=next;}
  if(step===2){const label=chosen.nextElementSibling.textContent;if(label!==selection.time) reached=Math.min(reached,2);selection.time=label;}
  if(step===3){const name=content.querySelector('#first-name').value.trim();const phone=content.querySelector('#phone').value.trim();if(!name || !/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[ .-]*\d{2}){4}$/.test(phone)){error.textContent='Indiquez votre prénom et un numéro de téléphone français valide.';return;}selection.firstName=name;selection.phone=phone;}
  reached=Math.max(reached,step+1); changeStep(step+1);
});
stepButtons.forEach(button=>button.addEventListener('click',()=>{const target=Number(button.dataset.go);if(target!==step && target<=reached) { if(step===3) {selection.firstName=content.querySelector('#first-name').value;selection.phone=content.querySelector('#phone').value;} changeStep(target); }}));
render(false);
